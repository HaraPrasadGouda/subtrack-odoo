import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload
from backend.app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from backend.app.models.contact import Contact
from backend.app.models.plan import RecurringPlan, BillingPeriod
from backend.app.models.product import Product, ProductVariant
from backend.app.models.tax import Tax
from backend.app.models.discount import Discount, DiscountType
from backend.app.models.template import QuotationTemplate
from backend.app.models.activity import ActivityLog
from backend.app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionOut,
    SubscriptionLineCreate,
    SubscriptionLineOut,
    SubscriptionFromTemplate,
    ChangePlanResponse,
)


class SubscriptionService:

    @staticmethod
    def calculate_next_date(from_date: date, billing_period: str) -> date:
        """Calculate next date based on billing period."""
        if billing_period == BillingPeriod.DAILY.value:
            return from_date + timedelta(days=1)
        elif billing_period == BillingPeriod.WEEKLY.value:
            return from_date + timedelta(weeks=1)
        elif billing_period == BillingPeriod.MONTHLY.value:
            # Add 30 days as standard monthly cycle
            return from_date + timedelta(days=30)
        elif billing_period == BillingPeriod.YEARLY.value:
            # Add 365 days as standard yearly cycle
            return from_date + timedelta(days=365)
        return from_date + timedelta(days=30)

    @staticmethod
    def generate_number(db: Session) -> str:
        """Generate auto subscription number in sequence SUB-0001, SUB-0002, ..."""
        subs = db.query(Subscription.number).filter(Subscription.number.like("SUB-%")).all()
        max_num = 0
        for (num_str,) in subs:
            match = re.search(r"SUB-(\d+)", num_str)
            if match:
                val = int(match.group(1))
                if val > max_num:
                    max_num = val
        return f"SUB-{max_num + 1:04d}"

    @staticmethod
    def calculate_line_amount(
        db: Session,
        product_id: int,
        variant_id: Optional[int],
        qty: int,
        unit_price: Optional[float],
        tax_id: Optional[int],
        discount_id: Optional[int],
    ) -> Tuple[float, float]:
        """
        Calculates line unit_price (if not specified) and total line amount:
        (variant extra price + tax + discount).
        Returns: (final_unit_price, final_amount)
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product {product_id} not found")

        variant_extra = 0.0
        if variant_id:
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == variant_id,
                ProductVariant.product_id == product_id,
            ).first()
            if not variant:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variant {variant_id} does not match product {product_id}")
            variant_extra = variant.extra_price

        # If unit_price not provided, base is product sales price + variant extra
        if unit_price is None or unit_price == 0.0:
            final_unit_price = product.sales_price + variant_extra
        else:
            final_unit_price = unit_price

        base_amount = qty * final_unit_price

        # Calculate discount
        discount_amount = 0.0
        if discount_id:
            discount = db.query(Discount).filter(Discount.id == discount_id).first()
            if discount:
                if discount.type == DiscountType.PERCENT.value:
                    discount_amount = base_amount * (discount.value / 100.0)
                elif discount.type == DiscountType.FIXED.value:
                    discount_amount = min(discount.value, base_amount)

        discounted_amount = max(0.0, base_amount - discount_amount)

        # Calculate tax
        tax_amount = 0.0
        if tax_id:
            tax = db.query(Tax).filter(Tax.id == tax_id).first()
            if tax:
                tax_amount = discounted_amount * (tax.rate_percent / 100.0)

        final_amount = round(discounted_amount + tax_amount, 2)
        return final_unit_price, final_amount

    @staticmethod
    def check_and_apply_auto_close(db: Session, sub: Subscription) -> bool:
        """
        Plans with auto_close close automatically after end_date.
        """
        if sub.plan and sub.plan.auto_close:
            today = date.today()
            should_close = False
            if sub.plan.end_date and sub.plan.end_date < today:
                should_close = True
            elif sub.expiry_date and sub.expiry_date < today:
                should_close = True

            if should_close and sub.status not in (SubscriptionStatus.CLOSED.value, SubscriptionStatus.DRAFT.value):
                old_status = sub.status
                sub.status = SubscriptionStatus.CLOSED.value
                log = ActivityLog(
                    entity_type="subscription",
                    entity_id=sub.id,
                    action="auto_close",
                    old_value=old_status,
                    new_value=SubscriptionStatus.CLOSED.value,
                    user_id=None,
                )
                db.add(log)
                db.commit()
                db.refresh(sub)
                return True
        return False

    @staticmethod
    def to_out(db: Session, sub: Subscription) -> SubscriptionOut:
        SubscriptionService.check_and_apply_auto_close(db, sub)
        total = sum(line.amount for line in sub.lines)
        out = SubscriptionOut.model_validate(sub)
        out.total_amount = round(total, 2)
        return out

    @staticmethod
    def get_subscriptions(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        customer_id: Optional[int] = None,
    ) -> List[SubscriptionOut]:
        query = db.query(Subscription).options(
            selectinload(Subscription.lines),
            selectinload(Subscription.customer),
            selectinload(Subscription.plan),
        )
        if status_filter:
            query = query.filter(Subscription.status == status_filter)
        if customer_id:
            query = query.filter(Subscription.customer_id == customer_id)

        subs = query.order_by(Subscription.id.desc()).offset(skip).limit(limit).all()
        return [SubscriptionService.to_out(db, s) for s in subs]

    @staticmethod
    def get_subscription_by_id(db: Session, sub_id: int) -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Subscription {sub_id} not found")
        SubscriptionService.check_and_apply_auto_close(db, sub)
        return sub

    @staticmethod
    def create_subscription(db: Session, data: SubscriptionCreate, user_id: Optional[int]) -> SubscriptionOut:
        customer = db.query(Contact).filter(Contact.id == data.customer_id).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Customer {data.customer_id} not found")

        plan = db.query(RecurringPlan).filter(RecurringPlan.id == data.plan_id).first()
        if not plan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Plan {data.plan_id} not found")

        sub_number = SubscriptionService.generate_number(db)
        start_date = data.start_date or date.today()
        next_billing = data.next_billing_date or start_date
        init_status = data.status or SubscriptionStatus.DRAFT.value

        sub = Subscription(
            number=sub_number,
            customer_id=data.customer_id,
            plan_id=data.plan_id,
            start_date=start_date,
            expiry_date=data.expiry_date,
            next_billing_date=next_billing,
            payment_terms=data.payment_terms or "Immediate",
            status=init_status,
            created_by=user_id,
        )
        db.add(sub)
        db.flush()

        if data.lines:
            for l_in in data.lines:
                unit_p, amt = SubscriptionService.calculate_line_amount(
                    db,
                    l_in.product_id,
                    l_in.variant_id,
                    l_in.qty,
                    l_in.unit_price,
                    l_in.tax_id,
                    l_in.discount_id,
                )
                line = SubscriptionLine(
                    subscription_id=sub.id,
                    product_id=l_in.product_id,
                    variant_id=l_in.variant_id,
                    qty=l_in.qty,
                    unit_price=unit_p,
                    tax_id=l_in.tax_id,
                    discount_id=l_in.discount_id,
                    amount=amt,
                )
                db.add(line)

        # Log creation
        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="created",
            old_value=None,
            new_value=f"Created {sub.number} in status {sub.status}",
            user_id=user_id,
        )
        db.add(log)

        db.commit()
        db.refresh(sub)
        return SubscriptionService.to_out(db, sub)

    @staticmethod
    def create_from_template(
        db: Session,
        template_id: int,
        data: SubscriptionFromTemplate,
        user_id: Optional[int],
    ) -> SubscriptionOut:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quotation template {template_id} not found")

        if not template.plan_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template does not have an associated plan")

        customer = db.query(Contact).filter(Contact.id == data.customer_id).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Customer {data.customer_id} not found")

        start_date = data.start_date or date.today()
        expiry_date = start_date + timedelta(days=template.validity_days)

        sub_create = SubscriptionCreate(
            customer_id=data.customer_id,
            plan_id=template.plan_id,
            start_date=start_date,
            expiry_date=expiry_date,
            next_billing_date=start_date,
            payment_terms=data.payment_terms or "Immediate",
            status=SubscriptionStatus.QUOTATION.value,
            lines=[
                SubscriptionLineCreate(
                    product_id=l.product_id,
                    variant_id=l.variant_id,
                    qty=l.qty,
                )
                for l in template.lines
            ],
        )
        return SubscriptionService.create_subscription(db, sub_create, user_id)

    @staticmethod
    def update_status(
        db: Session,
        sub_id: int,
        new_status: str,
        user_id: Optional[int],
    ) -> SubscriptionOut:
        sub = SubscriptionService.get_subscription_by_id(db, sub_id)
        current_status = sub.status

        valid_statuses = [s.value for s in SubscriptionStatus]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{new_status}'. Allowed values: {', '.join(valid_statuses)}",
            )

        if current_status == new_status:
            return SubscriptionService.to_out(db, sub)

        # Allowed transitions map
        allowed_transitions = {
            SubscriptionStatus.DRAFT.value: [SubscriptionStatus.QUOTATION.value, SubscriptionStatus.CONFIRMED.value, SubscriptionStatus.CLOSED.value],
            SubscriptionStatus.QUOTATION.value: [SubscriptionStatus.CONFIRMED.value, SubscriptionStatus.DRAFT.value, SubscriptionStatus.CLOSED.value],
            SubscriptionStatus.CONFIRMED.value: [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.DRAFT.value, SubscriptionStatus.CLOSED.value],
            SubscriptionStatus.ACTIVE.value: [SubscriptionStatus.PAUSED.value, SubscriptionStatus.CLOSED.value, SubscriptionStatus.ACTIVE.value],
            SubscriptionStatus.PAUSED.value: [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.CLOSED.value],
            SubscriptionStatus.CLOSED.value: [SubscriptionStatus.DRAFT.value, SubscriptionStatus.ACTIVE.value],
        }

        allowed = allowed_transitions.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition status from '{current_status}' to '{new_status}'. Allowed: {', '.join(allowed)}",
            )

        # Plan constraints verification
        plan = sub.plan
        if new_status == SubscriptionStatus.PAUSED.value:
            if not plan.pausable:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The subscription plan does not allow pausing.",
                )

        if new_status == SubscriptionStatus.CLOSED.value:
            if not plan.closable:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The subscription plan does not allow closing.",
                )

        if current_status == SubscriptionStatus.CLOSED.value and new_status == SubscriptionStatus.ACTIVE.value:
            if not plan.renewable:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The subscription plan does not allow renewal.",
                )

        # Apply status change
        sub.status = new_status
        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="status_change",
            old_value=current_status,
            new_value=new_status,
            user_id=user_id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        return SubscriptionService.to_out(db, sub)

    @staticmethod
    def pause_subscription(db: Session, sub_id: int, user_id: Optional[int]) -> SubscriptionOut:
        sub = SubscriptionService.get_subscription_by_id(db, sub_id)
        if sub.status != SubscriptionStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only active subscriptions can be paused. Current status is '{sub.status}'.",
            )
        return SubscriptionService.update_status(db, sub_id, SubscriptionStatus.PAUSED.value, user_id)

    @staticmethod
    def close_subscription(db: Session, sub_id: int, user_id: Optional[int]) -> SubscriptionOut:
        return SubscriptionService.update_status(db, sub_id, SubscriptionStatus.CLOSED.value, user_id)

    @staticmethod
    def renew_subscription(db: Session, sub_id: int, user_id: Optional[int]) -> SubscriptionOut:
        sub = SubscriptionService.get_subscription_by_id(db, sub_id)
        if not sub.plan.renewable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The subscription plan does not allow renewal.",
            )

        base_date = sub.next_billing_date or date.today()
        sub.next_billing_date = SubscriptionService.calculate_next_date(base_date, sub.plan.billing_period)
        if sub.expiry_date:
            sub.expiry_date = SubscriptionService.calculate_next_date(sub.expiry_date, sub.plan.billing_period)

        old_status = sub.status
        sub.status = SubscriptionStatus.ACTIVE.value

        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="renewed",
            old_value=f"status: {old_status}, next_billing: {base_date}",
            new_value=f"status: active, next_billing: {sub.next_billing_date}",
            user_id=user_id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        return SubscriptionService.to_out(db, sub)

    @staticmethod
    def get_timeline(db: Session, sub_id: int) -> List[ActivityLog]:
        SubscriptionService.get_subscription_by_id(db, sub_id)
        return db.query(ActivityLog).filter(
            ActivityLog.entity_type == "subscription",
            ActivityLog.entity_id == sub_id,
        ).order_by(ActivityLog.created_at.desc()).all()

    @staticmethod
    def update_line_price(
        db: Session,
        sub_id: int,
        line_id: int,
        new_unit_price: float,
        new_qty: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> SubscriptionOut:
        sub = SubscriptionService.get_subscription_by_id(db, sub_id)
        line = db.query(SubscriptionLine).filter(
            SubscriptionLine.id == line_id,
            SubscriptionLine.subscription_id == sub_id,
        ).first()
        if not line:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription line {line_id} not found on subscription {sub_id}.",
            )

        old_price = line.unit_price
        old_qty = line.qty
        old_amount = line.amount

        line.unit_price = round(new_unit_price, 2)
        if new_qty is not None and new_qty > 0:
            line.qty = new_qty

        # Recalculate line amount
        line_subtotal = line.qty * line.unit_price
        discount_val = 0.0
        if line.discount:
            if line.discount.type == "percent":
                discount_val = line_subtotal * (line.discount.value / 100.0)
            else:
                discount_val = line.discount.value
        discount_val = min(discount_val, line_subtotal)

        tax_val = 0.0
        if line.tax:
            taxable = line_subtotal - discount_val
            tax_val = taxable * (line.tax.rate_percent / 100.0)

        new_amount = round(line_subtotal - discount_val + tax_val, 2)
        line.amount = new_amount

        # Write activity log
        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="price_change",
            old_value=f"Line #{line.id}: price={old_price}, qty={old_qty}, total={old_amount}",
            new_value=f"Line #{line.id}: price={line.unit_price}, qty={line.qty}, total={line.amount}",
            user_id=user_id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        return SubscriptionService.to_out(db, sub)

    @staticmethod
    def change_plan(
        db: Session,
        sub_id: int,
        new_plan_id: int,
        user_id: Optional[int] = None,
    ) -> ChangePlanResponse:
        from backend.app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
        from backend.app.services.invoice_service import InvoiceService

        sub = SubscriptionService.get_subscription_by_id(db, sub_id)
        if sub.status == SubscriptionStatus.CLOSED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change plan of a closed subscription.",
            )

        if sub.plan_id == new_plan_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription is already enrolled in this plan.",
            )

        new_plan = db.query(RecurringPlan).filter(RecurringPlan.id == new_plan_id).first()
        if not new_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan {new_plan_id} not found.",
            )

        old_plan = sub.plan
        today = date.today()

        # Find the most recent invoice for current period
        last_invoice = (
            db.query(Invoice)
            .filter(Invoice.subscription_id == sub.id)
            .order_by(Invoice.period_start.desc())
            .first()
        )

        if last_invoice and last_invoice.period_start <= today <= last_invoice.period_end:
            total_days = max(1, (last_invoice.period_end - last_invoice.period_start).days + 1)
            used_days = max(0, min(total_days, (today - last_invoice.period_start).days))
            remaining_days = max(0, total_days - used_days)
            unused_ratio = remaining_days / float(total_days)

            # Unused credit from previous plan
            unused_credit = round(last_invoice.subtotal * unused_ratio, 2)
            new_plan_prorated = round(new_plan.price * unused_ratio, 2)
            period_start = today
            period_end = last_invoice.period_end
        else:
            total_days = 30
            remaining_days = 30
            unused_credit = 0.0
            new_plan_prorated = new_plan.price
            period_start = today
            period_end = SubscriptionService.calculate_next_date(period_start, new_plan.billing_period) - timedelta(days=1)

        net_adjusted = round(new_plan_prorated - unused_credit, 2)

        # Create adjusted invoice
        inv_number = InvoiceService.generate_number(db)
        inv_total = max(0.0, net_adjusted)
        inv_status = InvoiceStatus.PAID.value if inv_total == 0.0 else InvoiceStatus.DRAFT.value

        # Handle unique constraint on (subscription_id, period_start)
        existing = db.query(Invoice).filter(
            Invoice.subscription_id == sub.id,
            Invoice.period_start == period_start,
        ).first()
        if existing:
            adj_period_start = period_start + timedelta(days=1)
        else:
            adj_period_start = period_start

        inv = Invoice(
            number=inv_number,
            subscription_id=sub.id,
            customer_id=sub.customer_id,
            invoice_date=today,
            due_date=today + timedelta(days=15),
            period_start=adj_period_start,
            period_end=period_end,
            subtotal=inv_total,
            discount_total=round(unused_credit, 2) if net_adjusted > 0 else 0.0,
            tax_total=0.0,
            cgst=0.0,
            sgst=0.0,
            igst=0.0,
            total=inv_total,
            amount_paid=inv_total if inv_status == InvoiceStatus.PAID.value else 0.0,
            status=inv_status,
        )
        db.add(inv)
        db.flush()

        # Add invoice line item
        desc = f"Plan change adjustment: {old_plan.name} -> {new_plan.name} ({remaining_days}/{total_days} days prorated)"
        product_id_val = sub.lines[0].product_id if (sub.lines and len(sub.lines) > 0) else 1
        line_item = InvoiceLine(
            invoice_id=inv.id,
            product_id=product_id_val,
            description=desc,
            qty=1,
            unit_price=inv_total,
            discount_amount=0.0,
            tax_amount=0.0,
            amount=inv_total,
        )
        db.add(line_item)

        # Update subscription plan
        old_plan_name = old_plan.name
        old_plan_price = old_plan.price
        sub.plan_id = new_plan.id

        # Activity log entry
        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="plan_changed",
            old_value=f"Plan: {old_plan_name} (₹{old_plan_price})",
            new_value=(
                f"Plan: {new_plan.name} (₹{new_plan.price}). "
                f"Unused credit: ₹{unused_credit}, New plan charge: ₹{new_plan_prorated}, "
                f"Net adjusted: ₹{net_adjusted}. Invoice {inv_number} created."
            ),
            user_id=user_id,
        )
        db.add(log)
        db.commit()
        db.refresh(sub)
        db.refresh(inv)

        return ChangePlanResponse(
            subscription_id=sub.id,
            old_plan_id=old_plan.id,
            old_plan_name=old_plan_name,
            new_plan_id=new_plan.id,
            new_plan_name=new_plan.name,
            unused_credit=unused_credit,
            new_plan_prorated=new_plan_prorated,
            net_adjusted_amount=net_adjusted,
            invoice_id=inv.id,
            invoice_number=inv.number,
            invoice_total=inv.total,
            status=sub.status,
        )
