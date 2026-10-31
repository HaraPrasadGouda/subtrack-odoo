from datetime import date
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.invoice import Invoice, InvoiceStatus, Payment, Reminder
from backend.app.schemas.dashboard import DashboardSummary


class DashboardService:
    @staticmethod
    def get_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DashboardSummary:
        today = date.today()
        # Default date range: 1st day of current month to today
        if not start_date:
            start_date = date(today.year, today.month, 1)
        if not end_date:
            end_date = today

        # 1. Subscription Metrics
        active_count = db.query(func.count(Subscription.id)).filter(
            Subscription.status == SubscriptionStatus.ACTIVE.value
        ).scalar() or 0

        total_subs = db.query(func.count(Subscription.id)).scalar() or 0

        # Status breakdown
        raw_status = db.query(
            Subscription.status,
            func.count(Subscription.id)
        ).group_by(Subscription.status).all()

        breakdown = {s.value: 0 for s in SubscriptionStatus}
        for st, cnt in raw_status:
            breakdown[st] = cnt

        # 2. Payments & Revenue in date range
        payment_stats = db.query(
            func.coalesce(func.sum(Payment.amount), 0.0),
            func.count(Payment.id)
        ).filter(
            Payment.date >= start_date,
            Payment.date <= end_date,
        ).first()

        payments_total = round(float(payment_stats[0]), 2)
        payments_count = int(payment_stats[1])

        # 3. Outstanding Invoices (unpaid/partially paid, not cancelled or paid)
        outstanding_invoices = db.query(Invoice).filter(
            Invoice.status.notin_([InvoiceStatus.PAID.value, InvoiceStatus.CANCELLED.value]),
            Invoice.amount_paid < Invoice.total,
        ).all()

        outstanding_count = len(outstanding_invoices)
        outstanding_amount = round(sum(inv.total - inv.amount_paid for inv in outstanding_invoices), 2)

        # 4. Overdue Invoices (due_date < today, not paid or cancelled, amount_paid < total)
        overdue_invoices = [inv for inv in outstanding_invoices if inv.due_date < today]
        overdue_count = len(overdue_invoices)
        overdue_amount = round(sum(inv.total - inv.amount_paid for inv in overdue_invoices), 2)

        # 5. Overdue amount recovered after a reminder (Feature 8)
        reminded_invoice_ids = db.query(Reminder.invoice_id).distinct()
        recovered_query = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
            Payment.invoice_id.in_(reminded_invoice_ids)
        ).scalar() or 0.0
        overdue_amount_recovered = round(float(recovered_query), 2)

        return DashboardSummary(
            start_date=start_date,
            end_date=end_date,
            active_subscriptions=active_count,
            total_subscriptions=total_subs,
            revenue_this_month=payments_total,
            payments_total=payments_total,
            payments_count=payments_count,
            outstanding_amount=outstanding_amount,
            outstanding_count=outstanding_count,
            overdue_count=overdue_count,
            overdue_amount=overdue_amount,
            overdue_amount_recovered=overdue_amount_recovered,
            status_breakdown=breakdown,
        )
