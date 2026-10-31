from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.contact import ContactOut
from backend.app.schemas.product import ProductOut


class InvoiceLineOut(BaseModel):
    id: int
    invoice_id: int
    product_id: int
    description: str
    qty: int
    unit_price: float
    discount_amount: float
    tax_amount: float
    amount: float
    product: Optional[ProductOut] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    method: str = "bank"  # upi, card, bank, cash
    amount: float = Field(..., gt=0, description="Payment amount must be greater than 0")
    date: Optional[date] = None
    note: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    method: str
    amount: float
    date: date
    note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceOut(BaseModel):
    id: int
    number: str
    subscription_id: int
    customer_id: int
    invoice_date: date
    due_date: date
    period_start: date
    period_end: date
    subtotal: float
    discount_total: float
    tax_total: float
    cgst: float
    sgst: float
    igst: float
    total: float
    amount_paid: float
    status: str
    created_at: datetime

    customer: Optional[ContactOut] = None
    lines: List[InvoiceLineOut] = []
    payments: List[PaymentOut] = []

    model_config = ConfigDict(from_attributes=True)


class BillingRunOut(BaseModel):
    created_count: int
    skipped_count: int
    invoices: List[InvoiceOut] = []


class SendInvoiceResponse(BaseModel):
    message: str
    email: str
    invoice_number: str
