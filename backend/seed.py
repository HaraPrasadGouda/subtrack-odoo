import argparse
import random
import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.user import User, UserRole
from backend.app.models.contact import Contact
from backend.app.models.product import Product, ProductVariant
from backend.app.models.plan import RecurringPlan, BillingPeriod
from backend.app.models.tax import Tax, TaxType
from backend.app.models.discount import Discount, DiscountType, DiscountAppliesTo
from backend.app.models.template import QuotationTemplate, TemplateLine
from backend.app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from backend.app.models.invoice import Invoice, InvoiceLine, InvoiceStatus, Payment


STATES = ["Odisha", "Karnataka", "Maharashtra", "Delhi", "Telangana", "Tamil Nadu", "Gujarat"]


def seed_core_data(db):
    print("Seeding core database tables...")
    Base.metadata.create_all(bind=engine)

    # 1. Admin & Staff
    admin = db.query(User).filter(User.email == "admin@brightloop.com").first()
    if not admin:
        admin = User(
            name="Brightloop Admin",
            email="admin@brightloop.com",
            password_hash=get_password_hash("Admin@1234"),
            role=UserRole.ADMIN.value,
        )
        db.add(admin)

    staff = db.query(User).filter(User.email == "staff@brightloop.com").first()
    if not staff:
        staff = User(
            name="Support Staff",
            email="staff@brightloop.com",
            password_hash=get_password_hash("Staff@1234"),
            role=UserRole.INTERNAL.value,
        )
        db.add(staff)
    db.commit()

    # 2. Taxes
    taxes = [
        {"name": "GST 18%", "rate_percent": 18.0, "type": TaxType.GST.value},
        {"name": "GST 12%", "rate_percent": 12.0, "type": TaxType.GST.value},
        {"name": "GST 5%", "rate_percent": 5.0, "type": TaxType.GST.value},
        {"name": "Service Tax 10%", "rate_percent": 10.0, "type": TaxType.OTHER.value},
    ]
    tax_objs = []
    for t_data in taxes:
        t = db.query(Tax).filter(Tax.name == t_data["name"]).first()
        if not t:
            t = Tax(**t_data)
            db.add(t)
            db.flush()
        tax_objs.append(t)
    db.commit()

    # 3. Discounts
    discounts = [
        {"name": "LAUNCH20", "type": DiscountType.PERCENT.value, "value": 20.0, "usage_limit": 100},
        {"name": "FLAT100", "type": DiscountType.FIXED.value, "value": 100.0, "min_purchase": 500.0, "usage_limit": 50},
        {"name": "FESTIVE10", "type": DiscountType.PERCENT.value, "value": 10.0, "min_qty": 2, "usage_limit": 200},
    ]
    disc_objs = []
    for d_data in discounts:
        d = db.query(Discount).filter(Discount.name == d_data["name"]).first()
        if not d:
            d = Discount(**d_data, applies_to=DiscountAppliesTo.SUBSCRIPTION.value)
            db.add(d)
            db.flush()
        disc_objs.append(d)
    db.commit()

    # 4. Products & Variants
    p1 = db.query(Product).filter(Product.name == "SubTrack Core Platform").first()
    if not p1:
        p1 = Product(name="SubTrack Core Platform", type="service", sales_price=1000.0, cost_price=400.0)
        db.add(p1)
        db.flush()
        v1 = ProductVariant(product_id=p1.id, attribute="Brand", value="Odoo", extra_price=560.0)
        v2 = ProductVariant(product_id=p1.id, attribute="Edition", value="Enterprise", extra_price=800.0)
        db.add_all([v1, v2])

    p2 = db.query(Product).filter(Product.name == "Cloud Storage Expansion").first()
    if not p2:
        p2 = Product(name="Cloud Storage Expansion", type="service", sales_price=150.0, cost_price=50.0)
        db.add(p2)
        db.flush()
        v3 = ProductVariant(product_id=p2.id, attribute="Capacity", value="500GB", extra_price=100.0)
        db.add(v3)

    p3 = db.query(Product).filter(Product.name == "24/7 Dedicated Support").first()
    if not p3:
        p3 = Product(name="24/7 Dedicated Support", type="service", sales_price=300.0, cost_price=100.0)
        db.add(p3)

    db.commit()
    products = [p1, p2, p3]

    # 5. Recurring Plans
    plan1 = db.query(RecurringPlan).filter(RecurringPlan.name == "Monthly Standard").first()
    if not plan1:
        plan1 = RecurringPlan(
            name="Monthly Standard",
            price=299.0,
            billing_period=BillingPeriod.MONTHLY.value,
            pausable=True,
            closable=True,
            renewable=True,
        )
        db.add(plan1)

    plan2 = db.query(RecurringPlan).filter(RecurringPlan.name == "Annual Enterprise").first()
    if not plan2:
        plan2 = RecurringPlan(
            name="Annual Enterprise",
            price=2999.0,
            billing_period=BillingPeriod.YEARLY.value,
            pausable=True,
            closable=True,
            renewable=True,
        )
        db.add(plan2)

    plan3 = db.query(RecurringPlan).filter(RecurringPlan.name == "Weekly Sprint").first()
    if not plan3:
        plan3 = RecurringPlan(
            name="Weekly Sprint",
            price=99.0,
            billing_period=BillingPeriod.WEEKLY.value,
            pausable=True,
            closable=True,
            renewable=True,
        )
        db.add(plan3)

    plan4 = db.query(RecurringPlan).filter(RecurringPlan.name == "Flash Promo (Auto-Close)").first()
    if not plan4:
        plan4 = RecurringPlan(
            name="Flash Promo (Auto-Close)",
            price=49.0,
            billing_period=BillingPeriod.MONTHLY.value,
            auto_close=True,
            end_date=date.today() - timedelta(days=2),
            pausable=True,
            closable=True,
            renewable=False,
        )
        db.add(plan4)

    db.commit()
    plans = [plan1, plan2, plan3, plan4]

    # 6. Quotation Templates
    tpl = db.query(QuotationTemplate).filter(QuotationTemplate.name == "Enterprise Onboarding Pack").first()
    if not tpl:
        tpl = QuotationTemplate(name="Enterprise Onboarding Pack", validity_days=30, plan_id=plan2.id)
        db.add(tpl)
        db.flush()
        db.add(TemplateLine(template_id=tpl.id, product_id=p1.id, qty=1))
        db.add(TemplateLine(template_id=tpl.id, product_id=p3.id, qty=1))
        db.commit()

    # 7. Seed 50 Customers
    print("Seeding 50 customers...")
    customers = []
    existing_contacts = {c.email: c for c in db.query(Contact).all()}
    for i in range(1, 51):
        email = f"customer{i}@brightloop.demo"
        if email not in existing_contacts:
            c = Contact(
                name=f"Enterprise Client {i:02d}",
                email=email,
                phone=f"+91 98765 {i:05d}",
                address=f"Tech Zone {i}, Industrial Corridor",
                gst_state=random.choice(STATES),
            )
            db.add(c)
            customers.append(c)
        else:
            customers.append(existing_contacts[email])
    db.commit()

    # 8. Seed Subscriptions across all statuses
    print("Seeding representative subscriptions across all statuses...")
    statuses = [
        SubscriptionStatus.ACTIVE.value,
        SubscriptionStatus.CONFIRMED.value,
        SubscriptionStatus.QUOTATION.value,
        SubscriptionStatus.DRAFT.value,
        SubscriptionStatus.PAUSED.value,
        SubscriptionStatus.CLOSED.value,
    ]

    today = date.today()
    existing_sub_count = db.query(Subscription).count()
    if existing_sub_count < 30:
        for i, cust in enumerate(customers[:30]):
            sub_status = statuses[i % len(statuses)]
            chosen_plan = plans[i % len(plans)]
            next_bill = today - timedelta(days=random.randint(-15, 15))

            sub = Subscription(
                number=f"SUB-{(existing_sub_count + i + 1):04d}",
                customer_id=cust.id,
                plan_id=chosen_plan.id,
                start_date=today - timedelta(days=60),
                next_billing_date=next_bill,
                status=sub_status,
                created_by=admin.id,
            )
            db.add(sub)
            db.flush()

            # Add lines
            l1 = SubscriptionLine(
                subscription_id=sub.id,
                product_id=p1.id,
                qty=1,
                unit_price=1000.0,
                tax_id=tax_objs[0].id,
                discount_id=disc_objs[0].id if (i % 2 == 0) else None,
                amount=1000.0,
            )
            db.add(l1)

            # Create invoices for some active and confirmed subs
            if sub_status in (SubscriptionStatus.ACTIVE.value, SubscriptionStatus.CONFIRMED.value):
                is_overdue = (i % 3 == 0)
                inv_due = today - timedelta(days=10) if is_overdue else today + timedelta(days=15)
                inv = Invoice(
                    number=f"INV-{(existing_sub_count + i + 1):04d}",
                    subscription_id=sub.id,
                    customer_id=cust.id,
                    invoice_date=today - timedelta(days=25),
                    due_date=inv_due,
                    period_start=today - timedelta(days=30),
                    period_end=today - timedelta(days=1),
                    subtotal=1000.0,
                    discount_total=100.0 if (i % 2 == 0) else 0.0,
                    tax_total=162.0,
                    total=1062.0 if (i % 2 == 0) else 1180.0,
                    amount_paid=0.0,
                    status=InvoiceStatus.CONFIRMED.value,
                )
                if cust.gst_state.lower() == "odisha":
                    inv.cgst = inv.tax_total / 2.0
                    inv.sgst = inv.tax_total / 2.0
                    inv.igst = 0.0
                else:
                    inv.cgst = 0.0
                    inv.sgst = 0.0
                    inv.igst = inv.tax_total

                db.add(inv)
                db.flush()

                # Add some payments
                if not is_overdue and (i % 2 == 0):
                    # Pay full
                    inv.amount_paid = inv.total
                    inv.status = InvoiceStatus.PAID.value
                    pay = Payment(
                        invoice_id=inv.id,
                        method="upi",
                        amount=inv.total,
                        date=today - timedelta(days=5),
                        note="Seeded full payment",
                    )
                    db.add(pay)
                elif is_overdue and (i % 4 == 0):
                    # Partial payment on overdue
                    inv.amount_paid = 300.0
                    pay = Payment(
                        invoice_id=inv.id,
                        method="bank",
                        amount=300.0,
                        date=today - timedelta(days=2),
                        note="Seeded partial payment",
                    )
                    db.add(pay)

        db.commit()
    print("Core database seeding complete!")


def seed_bulk_subscriptions(db, count=5000):
    print(f"Bulk seeding {count} subscriptions for performance testing...")
    admin = db.query(User).filter(User.email == "admin@brightloop.com").first()
    plan = db.query(RecurringPlan).first()
    customer = db.query(Contact).first()
    product = db.query(Product).first()

    if not plan or not customer or not product:
        print("Please run basic seed first.")
        return

    current_count = db.query(Subscription).count()
    start_num = current_count + 1
    today = date.today()

    batch_size = 1000
    sub_lines_batch = []
    
    for i in range(count):
        sub_num = f"SUB-{(start_num + i):05d}"
        sub = Subscription(
            number=sub_num,
            customer_id=customer.id,
            plan_id=plan.id,
            start_date=today,
            next_billing_date=today + timedelta(days=30),
            status=SubscriptionStatus.ACTIVE.value if (i % 2 == 0) else SubscriptionStatus.PAUSED.value,
            created_by=admin.id if admin else None,
        )
        db.add(sub)
        
        if (i + 1) % batch_size == 0:
            db.commit()
            print(f"  Committed {i + 1}/{count} subscriptions...")

    db.commit()
    print(f"Bulk seeding of {count} subscriptions finished successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SubTrack database.")
    parser.add_argument("--bulk", type=int, default=0, help="Number of bulk subscriptions to seed for performance testing (e.g. 5000)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_core_data(db)
        if args.bulk > 0:
            seed_bulk_subscriptions(db, count=args.bulk)
    finally:
        db.close()

