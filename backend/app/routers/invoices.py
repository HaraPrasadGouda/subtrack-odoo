from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.invoice import (
    InvoiceOut,
    SendInvoiceResponse,
    PaymentCreate,
    PaymentOut,
)
from backend.app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=List[InvoiceOut])
def list_invoices(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    overdue: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    List invoices with filters and pagination (page, size):
    - status (draft, confirmed, paid, cancelled, or special: 'outstanding')
    - customer_id
    - overdue (true/false)
    - pagination (page/size or skip/limit)
    """
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return InvoiceService.get_invoices(
        db,
        skip=skip,
        limit=limit,
        status=status,
        customer_id=customer_id,
        overdue=overdue,
    )


@router.get("/{id}", response_model=InvoiceOut)
def get_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get invoice details by ID."""
    invoice = InvoiceService.get_invoice_by_id(db, id)
    return InvoiceOut.model_validate(invoice)


@router.post("/{id}/confirm", response_model=InvoiceOut)
def confirm_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Confirm a draft invoice (draft -> confirmed)."""
    return InvoiceService.confirm_invoice(db, id, current_user.id)


@router.post("/{id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Cancel an invoice (draft/confirmed -> cancelled)."""
    return InvoiceService.cancel_invoice(db, id, current_user.id)


@router.post("/{id}/send", response_model=SendInvoiceResponse)
def send_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Send invoice email (logs to console for demo)."""
    return InvoiceService.send_invoice(db, id, current_user.id)


@router.post("/{id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Record payment against an invoice.
    Automatically sets invoice status to 'paid' when amount_paid >= total.
    """
    return InvoiceService.record_payment(db, id, data, current_user.id)


@router.get("/{id}/payments", response_model=List[PaymentOut])
def list_payments(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List all payments recorded for an invoice."""
    return InvoiceService.get_invoice_payments(db, id)


@router.get("/{id}/pdf")
def get_invoice_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Download invoice as a professionally styled PDF."""
    invoice = InvoiceService.get_invoice_by_id(db, id)
    pdf_bytes = InvoiceService.generate_pdf(db, id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={invoice.number}.pdf"
        },
    )

