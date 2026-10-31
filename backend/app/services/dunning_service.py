from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from backend.app.models.invoice import Invoice, InvoiceStatus, Payment, Reminder
from backend.app.models.activity import ActivityLog
from backend.app.schemas.dunning import DunningRunOut, ReminderOut, DunningStatsOut


class DunningService:
    @staticmethod
    def run_dunning(
        db: Session,
        target_date: Optional[date] = None,
        channel: str = "email",
    ) -> DunningRunOut:
        """
        Executes smart dunning process:
        - Scans for overdue invoices (due_date < check_date, not paid or cancelled, balance > 0).
        - Computes days overdue.
        - Triggers reminders on milestone days: day 1, day 3, day 7.
        - Avoids duplicate reminders for the same invoice and day offset.
        - Logs to console and writes to reminders table and activity_log.
        """
        check_date = target_date or date.today()

        # Find all open overdue invoices
        overdue_invoices = (
            db.query(Invoice)
            .options(selectinload(Invoice.customer))
            .filter(
                Invoice.status.notin_([InvoiceStatus.PAID.value, InvoiceStatus.CANCELLED.value]),
                Invoice.due_date < check_date,
                Invoice.amount_paid < Invoice.total,
            )
            .order_by(Invoice.due_date.asc())
            .all()
        )

        milestones = [1, 3, 7]
        created_records: List[Reminder] = []

        for inv in overdue_invoices:
            days_overdue = (check_date - inv.due_date).days
            balance = round(inv.total - inv.amount_paid, 2)
            cust_name = inv.customer.name if inv.customer else "Unknown Customer"

            for offset in milestones:
                if days_overdue >= offset:
                    # Check if reminder for this milestone was already sent
                    exists = db.query(Reminder).filter(
                        Reminder.invoice_id == inv.id,
                        Reminder.day_offset == offset,
                    ).first()

                    if not exists:
                        reminder = Reminder(
                            invoice_id=inv.id,
                            day_offset=offset,
                            channel=channel,
                            sent_at=datetime.now(timezone.utc),
                        )
                        db.add(reminder)
                        created_records.append(reminder)

                        # Console logging for demo & audit trail
                        print(
                            f"[DUNNING] Sent day-{offset} reminder for Invoice {inv.number} "
                            f"(Customer: {cust_name}, Overdue: {days_overdue} days, Balance: {balance}) via {channel}"
                        )

                        # Activity log entry
                        activity = ActivityLog(
                            entity_type="invoice",
                            entity_id=inv.id,
                            action="dunning_reminder_sent",
                            old_value=None,
                            new_value=f"Day {offset} overdue reminder dispatched via {channel} (Overdue: {days_overdue} days, Balance: {balance})",
                            user_id=None,
                        )
                        db.add(activity)

        if created_records:
            db.commit()
            for r in created_records:
                db.refresh(r)

        # Build output objects with invoice metadata
        reminders_out = []
        for r in created_records:
            inv = db.query(Invoice).options(selectinload(Invoice.customer)).filter(Invoice.id == r.invoice_id).first()
            reminders_out.append(
                ReminderOut(
                    id=r.id,
                    invoice_id=r.invoice_id,
                    invoice_number=inv.number if inv else None,
                    customer_id=inv.customer_id if inv else None,
                    customer_name=inv.customer.name if (inv and inv.customer) else None,
                    day_offset=r.day_offset,
                    sent_at=r.sent_at,
                    channel=r.channel,
                    amount_due=round(inv.total - inv.amount_paid, 2) if inv else None,
                )
            )

        return DunningRunOut(
            check_date=check_date,
            invoices_checked=len(overdue_invoices),
            reminders_created=len(created_records),
            reminders=reminders_out,
        )

    @staticmethod
    def get_reminders(
        db: Session,
        invoice_id: Optional[int] = None,
        page: int = 1,
        size: int = 50,
    ) -> List[ReminderOut]:
        """Fetch historical sent reminders with optional invoice filter."""
        query = db.query(Reminder).order_by(Reminder.sent_at.desc())
        if invoice_id is not None:
            query = query.filter(Reminder.invoice_id == invoice_id)

        offset = (page - 1) * size
        reminders = query.offset(offset).limit(size).all()

        results = []
        for r in reminders:
            inv = db.query(Invoice).options(selectinload(Invoice.customer)).filter(Invoice.id == r.invoice_id).first()
            results.append(
                ReminderOut(
                    id=r.id,
                    invoice_id=r.invoice_id,
                    invoice_number=inv.number if inv else None,
                    customer_id=inv.customer_id if inv else None,
                    customer_name=inv.customer.name if (inv and inv.customer) else None,
                    day_offset=r.day_offset,
                    sent_at=r.sent_at,
                    channel=r.channel,
                    amount_due=round(inv.total - inv.amount_paid, 2) if inv else None,
                )
            )
        return results

    @staticmethod
    def get_dunning_stats(db: Session) -> DunningStatsOut:
        """Calculate dunning metrics including overdue amount recovered after reminders."""
        total_reminders = db.query(func.count(Reminder.id)).scalar() or 0
        invoices_reminded = db.query(func.count(func.distinct(Reminder.invoice_id))).scalar() or 0

        reminded_invoice_ids = db.query(Reminder.invoice_id).distinct()
        recovered = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
            Payment.invoice_id.in_(reminded_invoice_ids)
        ).scalar() or 0.0

        return DunningStatsOut(
            total_reminders_sent=total_reminders,
            invoices_reminded_count=invoices_reminded,
            overdue_amount_recovered=round(float(recovered), 2),
        )

