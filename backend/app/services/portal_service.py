from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from backend.app.models.user import User
from backend.app.models.contact import Contact
from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.activity import ActivityLog
from backend.app.models.invoice import Invoice, InvoiceStatus
from backend.app.schemas.subscription import SubscriptionOut
from backend.app.schemas.invoice import InvoiceOut, PaymentCreate, PaymentOut
from backend.app.schemas.portal import PortalPaymentRequest
from backend.app.services.invoice_service import InvoiceService


class PortalService:
    @staticmethod
    def get_contact_for_user(db: Session, user: User) -> Contact:
        """Find or associate contact record for portal user."""
        contact = db.query(Contact).filter(Contact.user_id == user.id).first()
        if not contact:
            contact = db.query(Contact).filter(func.lower(Contact.email) == user.email.lower()).first()
            if contact:
                contact.user_id = user.id
                db.commit()
                db.refresh(contact)
        if not contact:
            contact = Contact(
                user_id=user.id,
                name=user.name,
                email=user.email.lower(),
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
        return contact

    @staticmethod
    def get_subscriptions(
        db: Session,
        user: User,
        page: int = 1,
        size: int = 50,
    ) -> List[SubscriptionOut]:
        contact = PortalService.get_contact_for_user(db, user)
        offset = (page - 1) * size
        subs = (
            db.query(Subscription)
            .options(
                selectinload(Subscription.customer),
                selectinload(Subscription.plan),
                selectinload(Subscription.lines),
            )
            .filter(Subscription.customer_id == contact.id)
            .order_by(Subscription.id.desc())
            .offset(offset)
            .limit(size)
            .all()
        )
        return [SubscriptionOut.model_validate(s) for s in subs]

    @staticmethod
    def get_subscription_by_id(db: Session, subscription_id: int, user: User) -> SubscriptionOut:
        contact = PortalService.get_contact_for_user(db, user)
        sub = (
            db.query(Subscription)
            .options(
                selectinload(Subscription.customer),
                selectinload(Subscription.plan),
                selectinload(Subscription.lines),
            )
            .filter(Subscription.id == subscription_id, Subscription.customer_id == contact.id)
            .first()
        )
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription {subscription_id} not found in your portal account.",
            )
        return SubscriptionOut.model_validate(sub)

    @staticmethod
    def pause_subscription(db: Session, subscription_id: int, user: User) -> SubscriptionOut:
        contact = PortalService.get_contact_for_user(db, user)
        sub = db.query(Subscription).filter(
            Subscription.id == subscription_id,
            Subscription.customer_id == contact.id,
        ).first()

        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription {subscription_id} not found in your portal account.",
            )

        if not sub.plan.pausable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your current recurring plan does not permit pausing.",
            )

        if sub.status != SubscriptionStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot pause a subscription that is currently '{sub.status}'.",
            )

        old_status = sub.status
        sub.status = SubscriptionStatus.PAUSED.value

        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="portal_paused",
            old_value=old_status,
            new_value=sub.status,
            user_id=user.id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        return SubscriptionOut.model_validate(sub)

    @staticmethod
    def cancel_subscription(db: Session, subscription_id: int, user: User) -> SubscriptionOut:
        contact = PortalService.get_contact_for_user(db, user)
        sub = db.query(Subscription).filter(
            Subscription.id == subscription_id,
            Subscription.customer_id == contact.id,
        ).first()

        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription {subscription_id} not found in your portal account.",
            )

        if not sub.plan.closable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your current recurring plan does not permit cancellation.",
            )

        if sub.status == SubscriptionStatus.CLOSED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription is already closed/cancelled.",
            )

        old_status = sub.status
        sub.status = SubscriptionStatus.CLOSED.value

        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="portal_cancelled",
            old_value=old_status,
            new_value=sub.status,
            user_id=user.id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        return SubscriptionOut.model_validate(sub)

    @staticmethod
    def get_invoices(
        db: Session,
        user: User,
        page: int = 1,
        size: int = 50,
    ) -> List[InvoiceOut]:
        contact = PortalService.get_contact_for_user(db, user)
        offset = (page - 1) * size
        invoices = (
            db.query(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.lines),
                selectinload(Invoice.payments),
            )
            .filter(Invoice.customer_id == contact.id)
            .order_by(Invoice.id.desc())
            .offset(offset)
            .limit(size)
            .all()
        )
        return [InvoiceOut.model_validate(i) for i in invoices]

    @staticmethod
    def get_invoice_by_id(db: Session, invoice_id: int, user: User) -> InvoiceOut:
        contact = PortalService.get_contact_for_user(db, user)
        inv = (
            db.query(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.lines),
                selectinload(Invoice.payments),
            )
            .filter(Invoice.id == invoice_id, Invoice.customer_id == contact.id)
            .first()
        )
        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice {invoice_id} not found in your portal account.",
            )
        return InvoiceOut.model_validate(inv)

    @staticmethod
    def pay_invoice(
        db: Session,
        invoice_id: int,
        data: PortalPaymentRequest,
        user: User,
    ) -> PaymentOut:
        contact = PortalService.get_contact_for_user(db, user)
        inv = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.customer_id == contact.id,
        ).first()

        if not inv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice {invoice_id} not found in your portal account.",
            )

        if inv.status == InvoiceStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot pay a cancelled invoice.",
            )

        remaining_balance = round(inv.total - inv.amount_paid, 2)
        if remaining_balance <= 0 or inv.status == InvoiceStatus.PAID.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice is already fully settled.",
            )

        pay_amount = data.amount if data.amount is not None else remaining_balance
        if pay_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than 0.",
            )

        payment_create = PaymentCreate(
            method=data.method,
            amount=pay_amount,
            note=data.note or "Portal Payment",
        )
        return InvoiceService.record_payment(db, invoice_id, payment_create, user_id=user.id)
