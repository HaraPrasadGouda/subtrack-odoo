import io
import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.app.models.invoice import Invoice, InvoiceLine, InvoiceStatus, Payment
from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.contact import Contact
from backend.app.models.tax import Tax
from backend.app.models.discount import Discount, DiscountType
from backend.app.models.activity import ActivityLog
from backend.app.schemas.invoice import InvoiceOut, BillingRunOut, SendInvoiceResponse, PaymentCreate, PaymentOut
from backend.app.services.subscription_service import SubscriptionService


class InvoiceService:
    COMPANY_STATE = "odisha"

    @staticmethod
    def generate_number(db: Session) -> str:
        """Generate auto invoice number in sequence INV-0001, INV-0002, ..."""
        invoices = db.query(Invoice.number).filter(Invoice.number.like("INV-%")).all()
        max_num = 0
        for (num_str,) in invoices:
            match = re.search(r"INV-(\d+)", num_str)
            if match:
                val = int(match.group(1))
                if val > max_num:
                    max_num = val
        return f"INV-{max_num + 1:04d}"

    @staticmethod
    def calculate_line_item(
        db: Session,
        sub_line,
        invoice_date: date,
    ) -> Tuple[float, float, float, float]:
        """
        Calculates unit_price, discount_amount, tax_amount, line_total for an invoice line.
        Checks discount conditions:
        - dates (start_date <= invoice_date <= end_date)
        - min_qty (sub_line.qty >= discount.min_qty)
        - min_purchase (subtotal >= discount.min_purchase)
        - usage_limit (discount.used_count < discount.usage_limit)
        If eligible, increments discount.used_count.
        Returns: (unit_price, discount_amount, tax_amount, line_total)
        """
        unit_price = sub_line.unit_price
        subtotal = sub_line.qty * unit_price

        # Check and apply discount automatically
        discount_amount = 0.0
        if sub_line.discount_id:
            discount = db.query(Discount).filter(Discount.id == sub_line.discount_id).first()
            if discount:
                eligible = True
                if discount.start_date and discount.start_date > invoice_date:
                    eligible = False
                if discount.end_date and discount.end_date < invoice_date:
                    eligible = False
                if sub_line.qty < discount.min_qty:
                    eligible = False
                if subtotal < discount.min_purchase:
                    eligible = False
                if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
                    eligible = False

                if eligible:
                    if discount.type == DiscountType.PERCENT.value:
                        discount_amount = subtotal * (discount.value / 100.0)
                    else:
                        discount_amount = min(discount.value, subtotal)
                    # Increment used count
                    discount.used_count += 1

        discounted_amount = max(0.0, subtotal - discount_amount)

        # Tax calculation
        tax_amount = 0.0
        if sub_line.tax_id:
            tax = db.query(Tax).filter(Tax.id == sub_line.tax_id).first()
            if tax:
                tax_amount = discounted_amount * (tax.rate_percent / 100.0)

        line_total = round(discounted_amount + tax_amount, 2)
        return (
            unit_price,
            round(discount_amount, 2),
            round(tax_amount, 2),
            line_total,
        )

    @staticmethod
    def create_invoice_for_subscription(
        db: Session,
        subscription_id: int,
        user_id: Optional[int] = None,
    ) -> InvoiceOut:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Subscription {subscription_id} not found")

        period_start = sub.next_billing_date or date.today()
        period_end = SubscriptionService.calculate_next_date(period_start, sub.plan.billing_period) - timedelta(days=1)

        # Check unique constraint (subscription_id, period_start)
        existing_invoice = db.query(Invoice).filter(
            Invoice.subscription_id == sub.id,
            Invoice.period_start == period_start,
        ).first()
        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription {sub.number} already has an invoice for period starting {period_start}.",
            )

        invoice_date = date.today()
        # Default due date 15 days out
        due_date = invoice_date + timedelta(days=15)

        inv_number = InvoiceService.generate_number(db)
        invoice = Invoice(
            number=inv_number,
            subscription_id=sub.id,
            customer_id=sub.customer_id,
            invoice_date=invoice_date,
            due_date=due_date,
            period_start=period_start,
            period_end=period_end,
            status=InvoiceStatus.DRAFT.value,
        )
        db.add(invoice)
        db.flush()

        subtotal_sum = 0.0
        discount_sum = 0.0
        tax_sum = 0.0

        for l in sub.lines:
            u_price, d_amt, t_amt, l_total = InvoiceService.calculate_line_item(db, l, invoice_date)
            subtotal_sum += l.qty * u_price
            discount_sum += d_amt
            tax_sum += t_amt

            # Construct description
            desc = l.product.name
            if l.variant:
                desc += f" ({l.variant.attribute}: {l.variant.value})"

            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=l.product_id,
                description=desc,
                qty=l.qty,
                unit_price=u_price,
                discount_amount=d_amt,
                tax_amount=t_amt,
                amount=l_total,
            )
            db.add(inv_line)

        # GST calculation: if customer state is Odisha, split CGST + SGST, else IGST
        customer = db.query(Contact).filter(Contact.id == sub.customer_id).first()
        customer_state = (customer.gst_state or "").strip().lower()

        invoice.subtotal = round(subtotal_sum, 2)
        invoice.discount_total = round(discount_sum, 2)
        invoice.tax_total = round(tax_sum, 2)
        invoice.total = round(subtotal_sum - discount_sum + tax_sum, 2)
        invoice.amount_paid = 0.0

        if customer_state == InvoiceService.COMPANY_STATE:
            half_tax = round(invoice.tax_total / 2.0, 2)
            invoice.cgst = half_tax
            invoice.sgst = half_tax
            invoice.igst = 0.0
        else:
            invoice.cgst = 0.0
            invoice.sgst = 0.0
            invoice.igst = invoice.tax_total

        # Advance subscription next_billing_date
        sub.next_billing_date = SubscriptionService.calculate_next_date(period_start, sub.plan.billing_period)

        # Log activity
        log = ActivityLog(
            entity_type="subscription",
            entity_id=sub.id,
            action="invoice_created",
            old_value=None,
            new_value=f"Generated {invoice.number} for total {invoice.total}",
            user_id=user_id,
        )
        db.add(log)

        db.commit()
        db.refresh(invoice)
        return InvoiceOut.model_validate(invoice)

    @staticmethod
    def run_billing(db: Session, user_id: Optional[int] = None) -> BillingRunOut:
        """
        Bills all active subscriptions where next_billing_date <= today.
        Never bills twice (unique constraint on subscription_id, period_start).
        Returns created_count, skipped_count, and list of created invoices.
        """
        today = date.today()
        active_subs = db.query(Subscription).filter(
            Subscription.status == SubscriptionStatus.ACTIVE.value,
            Subscription.next_billing_date <= today,
        ).all()

        created_invoices: List[InvoiceOut] = []
        skipped_count = 0
        created_count = 0

        for sub in active_subs:
            period_start = sub.next_billing_date
            existing = db.query(Invoice).filter(
                Invoice.subscription_id == sub.id,
                Invoice.period_start == period_start,
            ).first()
            if existing:
                skipped_count += 1
                continue

            try:
                inv_out = InvoiceService.create_invoice_for_subscription(db, sub.id, user_id)
                created_invoices.append(inv_out)
                created_count += 1
            except HTTPException:
                skipped_count += 1

        return BillingRunOut(
            created_count=created_count,
            skipped_count=skipped_count,
            invoices=created_invoices,
        )

    @staticmethod
    def get_invoices(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        overdue: Optional[bool] = None,
    ) -> List[InvoiceOut]:
        query = db.query(Invoice)

        if status:
            if status.lower() == "outstanding":
                # Invoices not paid and not cancelled, where amount_paid < total
                query = query.filter(
                    Invoice.status.notin_([InvoiceStatus.PAID.value, InvoiceStatus.CANCELLED.value]),
                    Invoice.amount_paid < Invoice.total,
                )
            else:
                query = query.filter(Invoice.status == status)

        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)

        if overdue is True:
            today = date.today()
            query = query.filter(
                Invoice.due_date < today,
                Invoice.status.notin_([InvoiceStatus.PAID.value, InvoiceStatus.CANCELLED.value]),
            )

        invoices = query.order_by(Invoice.id.desc()).offset(skip).limit(limit).all()
        return [InvoiceOut.model_validate(inv) for inv in invoices]

    @staticmethod
    def get_invoice_by_id(db: Session, invoice_id: int) -> Invoice:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Invoice {invoice_id} not found")
        return invoice

    @staticmethod
    def confirm_invoice(db: Session, invoice_id: int, user_id: Optional[int] = None) -> InvoiceOut:
        invoice = InvoiceService.get_invoice_by_id(db, invoice_id)
        if invoice.status != InvoiceStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only draft invoices can be confirmed. Current status: '{invoice.status}'",
            )
        invoice.status = InvoiceStatus.CONFIRMED.value
        db.commit()
        db.refresh(invoice)
        return InvoiceOut.model_validate(invoice)

    @staticmethod
    def cancel_invoice(db: Session, invoice_id: int, user_id: Optional[int] = None) -> InvoiceOut:
        invoice = InvoiceService.get_invoice_by_id(db, invoice_id)
        if invoice.status == InvoiceStatus.PAID.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paid invoices cannot be cancelled.",
            )
        invoice.status = InvoiceStatus.CANCELLED.value
        db.commit()
        db.refresh(invoice)
        return InvoiceOut.model_validate(invoice)

    @staticmethod
    def send_invoice(db: Session, invoice_id: int, user_id: Optional[int] = None) -> SendInvoiceResponse:
        invoice = InvoiceService.get_invoice_by_id(db, invoice_id)
        customer_email = invoice.customer.email if invoice.customer else "unknown@customer.com"
        print(f"\n=======================================================", flush=True)
        print(f"[INVOICE EMAIL] Sent invoice {invoice.number} to {customer_email}", flush=True)
        print(f"Total Amount: ${invoice.total:.2f} | Status: {invoice.status}", flush=True)
        print(f"=======================================================\n", flush=True)
        return SendInvoiceResponse(
            message=f"Invoice {invoice.number} email sent successfully.",
            email=customer_email,
            invoice_number=invoice.number,
        )

    @staticmethod
    def record_payment(
        db: Session,
        invoice_id: int,
        data: PaymentCreate,
        user_id: Optional[int] = None,
    ) -> PaymentOut:
        invoice = InvoiceService.get_invoice_by_id(db, invoice_id)
        if invoice.status == InvoiceStatus.CANCELLED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot record payment for a cancelled invoice.",
            )

        valid_methods = ["upi", "card", "bank", "cash"]
        if data.method.lower() not in valid_methods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payment method '{data.method}'. Allowed: {', '.join(valid_methods)}",
            )

        payment_date = data.date or date.today()
        payment = Payment(
            invoice_id=invoice.id,
            method=data.method.lower(),
            amount=data.amount,
            date=payment_date,
            note=data.note,
        )
        db.add(payment)

        # Update amount_paid
        invoice.amount_paid = round(invoice.amount_paid + data.amount, 2)

        # Auto set paid when amount_paid >= total
        old_status = invoice.status
        if invoice.amount_paid >= invoice.total:
            invoice.status = InvoiceStatus.PAID.value
        elif invoice.status == InvoiceStatus.DRAFT.value:
            invoice.status = InvoiceStatus.CONFIRMED.value

        # Log activity
        log = ActivityLog(
            entity_type="invoice",
            entity_id=invoice.id,
            action="payment_received",
            old_value=f"status: {old_status}, paid: {invoice.amount_paid - data.amount}",
            new_value=f"Paid {data.amount} via {data.method}. Status: {invoice.status}, Total paid: {invoice.amount_paid}/{invoice.total}",
            user_id=user_id,
        )
        db.add(log)

        db.commit()
        db.refresh(payment)
        db.refresh(invoice)
        return PaymentOut.model_validate(payment)

    @staticmethod
    def get_invoice_payments(db: Session, invoice_id: int) -> List[PaymentOut]:
        InvoiceService.get_invoice_by_id(db, invoice_id)
        payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).order_by(Payment.date.desc()).all()
        return [PaymentOut.model_validate(p) for p in payments]

    @staticmethod
    def generate_pdf(db: Session, invoice_id: int) -> bytes:
        """Generate PDF for an invoice using ReportLab."""
        invoice = InvoiceService.get_invoice_by_id(db, invoice_id)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#2C3E50"),
        )
        normal_style = styles["Normal"]
        bold_style = ParagraphStyle(name="Bold", parent=normal_style, fontName="Helvetica-Bold")

        story = []

        # Header
        story.append(Paragraph("SubTrack - Brightloop Software", title_style))
        story.append(Paragraph("Subscription Management & Invoicing System", styles["Italic"]))
        story.append(Spacer(1, 15))

        # Metadata Table
        meta_data = [
            [Paragraph("<b>Invoice Number:</b>", normal_style), Paragraph(invoice.number, bold_style)],
            [Paragraph("<b>Invoice Date:</b>", normal_style), Paragraph(str(invoice.invoice_date), normal_style)],
            [Paragraph("<b>Due Date:</b>", normal_style), Paragraph(str(invoice.due_date), normal_style)],
            [Paragraph("<b>Billing Period:</b>", normal_style), Paragraph(f"{invoice.period_start} to {invoice.period_end}", normal_style)],
            [Paragraph("<b>Status:</b>", normal_style), Paragraph(invoice.status.upper(), bold_style)],
        ]
        meta_table = Table(meta_data, colWidths=[120, 400])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # Customer Details
        story.append(Paragraph("<b>Billed To:</b>", bold_style))
        cust_name = invoice.customer.name if invoice.customer else "N/A"
        cust_email = invoice.customer.email if invoice.customer else "N/A"
        cust_state = invoice.customer.gst_state if (invoice.customer and invoice.customer.gst_state) else "N/A"
        story.append(Paragraph(f"{cust_name} ({cust_email})", normal_style))
        story.append(Paragraph(f"GST State: {cust_state}", normal_style))
        story.append(Spacer(1, 15))

        # Line Items Table
        table_data = [["Item Description", "Qty", "Unit Price", "Discount", "Tax", "Amount"]]
        for l in invoice.lines:
            table_data.append([
                l.description,
                str(l.qty),
                f"${l.unit_price:.2f}",
                f"${l.discount_amount:.2f}",
                f"${l.tax_amount:.2f}",
                f"${l.amount:.2f}",
            ])

        lines_table = Table(table_data, colWidths=[200, 40, 75, 70, 65, 80])
        lines_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C3E50")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F9")]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(lines_table)
        story.append(Spacer(1, 15))

        # Totals Summary Table
        summary_data = [
            ["Subtotal:", f"${invoice.subtotal:.2f}"],
            ["Discount Total:", f"-${invoice.discount_total:.2f}"],
            ["Tax Total:", f"${invoice.tax_total:.2f}"],
        ]
        if invoice.cgst > 0 or invoice.sgst > 0:
            summary_data.append(["CGST (50%):", f"${invoice.cgst:.2f}"])
            summary_data.append(["SGST (50%):", f"${invoice.sgst:.2f}"])
        elif invoice.igst > 0:
            summary_data.append(["IGST (100%):", f"${invoice.igst:.2f}"])

        summary_data.extend([
            ["Total:", f"${invoice.total:.2f}"],
            ["Amount Paid:", f"${invoice.amount_paid:.2f}"],
            ["Balance Due:", f"${(invoice.total - invoice.amount_paid):.2f}"],
        ])

        summary_table = Table(summary_data, colWidths=[420, 110])
        summary_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, -3), (-1, -1), "Helvetica-Bold"),
            ("LINEABOVE", (0, -3), (-1, -3), 1, colors.HexColor("#2C3E50")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(summary_table)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

