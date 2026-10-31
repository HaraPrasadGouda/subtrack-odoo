from datetime import date, timedelta
from typing import List, Dict, Tuple, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.contact import Contact
from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.invoice import Invoice, InvoiceStatus, Payment
from backend.app.schemas.risk import CustomerRiskOut
from backend.app.schemas.contact import ContactOut


class RiskService:
    @staticmethod
    def evaluate_customer_risk(db: Session, customer_id: int) -> CustomerRiskOut:
        """
        Calculates churn risk score and factors for a customer:
        - Overdue invoices: unpaid invoices past due_date.
        - Late payments: payments completed after invoice due_date.
        - Paused subscriptions: count of subscriptions currently paused.
        - Subscriptions expiring within 15 days.
        Produces High / Medium / Low score with actionable reasons.
        """
        customer = db.query(Contact).filter(Contact.id == customer_id).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id} not found",
            )

        today = date.today()
        score = 0
        reasons: List[str] = []

        # 1. Overdue Invoices
        overdue_invoices = db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.notin_([InvoiceStatus.PAID.value, InvoiceStatus.CANCELLED.value]),
            Invoice.due_date < today,
            Invoice.amount_paid < Invoice.total,
        ).all()
        overdue_count = len(overdue_invoices)
        if overdue_count > 0:
            balance = sum(inv.total - inv.amount_paid for inv in overdue_invoices)
            pts = min(40, overdue_count * 20)
            score += pts
            reasons.append(f"{overdue_count} overdue invoice(s) with total unpaid balance of ₹{balance:.2f}")

        # 2. Late Payments
        # Check payments made on customer's invoices where payment.date > invoice.due_date
        late_payments = (
            db.query(Payment)
            .join(Invoice, Payment.invoice_id == Invoice.id)
            .filter(
                Invoice.customer_id == customer_id,
                Payment.date > Invoice.due_date,
            )
            .all()
        )
        late_count = len(late_payments)
        if late_count > 0:
            pts = min(25, late_count * 10)
            score += pts
            reasons.append(f"{late_count} payment(s) settled after due date")

        # 3. Paused Subscriptions
        paused_subs = db.query(Subscription).filter(
            Subscription.customer_id == customer_id,
            Subscription.status == SubscriptionStatus.PAUSED.value,
        ).all()
        paused_count = len(paused_subs)
        if paused_count > 0:
            pts = min(25, paused_count * 15)
            score += pts
            reasons.append(f"{paused_count} subscription(s) currently in paused state")

        # 4. Expiry within 15 days
        expiring_limit = today + timedelta(days=15)
        expiring_subs = db.query(Subscription).filter(
            Subscription.customer_id == customer_id,
            Subscription.expiry_date.isnot(None),
            Subscription.expiry_date >= today,
            Subscription.expiry_date <= expiring_limit,
            Subscription.status.in_([SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PAUSED.value]),
        ).all()
        expiring_count = len(expiring_subs)
        if expiring_count > 0:
            pts = min(20, expiring_count * 10)
            score += pts
            reasons.append(f"{expiring_count} subscription(s) expiring within 15 days")

        # Cap total score at 100
        final_score = min(100, score)

        if final_score >= 50:
            level = "High"
        elif final_score >= 25:
            level = "Medium"
        else:
            level = "Low"

        if not reasons:
            reasons.append("Account in healthy standing with on-time payments and active subscriptions")

        return CustomerRiskOut(
            customer_id=customer.id,
            customer_name=customer.name,
            risk_level=level,
            risk_score=final_score,
            reasons=reasons,
            overdue_invoices_count=overdue_count,
            paused_subscriptions_count=paused_count,
            expiring_subscriptions_count=expiring_count,
            late_payments_count=late_count,
        )

    @staticmethod
    def get_risk_for_contacts(db: Session, contacts: List[Contact]) -> List[ContactOut]:
        """Annotates a list of contacts with their calculated risk_level and risk_score."""
        results: List[ContactOut] = []
        for c in contacts:
            risk = RiskService.evaluate_customer_risk(db, c.id)
            c_out = ContactOut.model_validate(c)
            c_out.risk_level = risk.risk_level
            c_out.risk_score = risk.risk_score
            results.append(c_out)
        return results

