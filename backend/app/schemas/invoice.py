from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)


class BillingRunOut(BaseModel):
    created_count: int
    skipped_count: int
    invoices: List[InvoiceOut] = []


class SendInvoiceResponse(BaseModel):
    message: str
    email: str
    invoice_number: str

