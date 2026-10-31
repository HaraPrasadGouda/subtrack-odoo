# SubTrack - Subscription Management System Backend
Brightloop Software (Odoo Hackathon)

## Stack
- **Framework**: Python FastAPI
- **ORM & Database**: SQLAlchemy + SQLite (`subtrack.db`)
- **Authentication**: JWT Bearer Tokens with Role-Based Access Control (`admin`, `internal`, `portal`)
- **Password Security**: Bcrypt hashing with policy enforcement
- **Validation**: Pydantic v2
- **Testing**: Pytest + FastAPI TestClient
- **PDF Generation**: ReportLab

---

## Directory Structure
```
backend/
├── app/
│   ├── core/           # Configuration, database engine, security & JWT, dependencies
│   ├── models/         # SQLAlchemy ORM models (User, Contact, Product, Plan, Tax, Discount, Template, Subscription, ActivityLog, Invoice, Payment, Reminder)
│   ├── schemas/        # Pydantic request/response validation schemas
│   ├── services/       # Business logic (AuthService, ProductService, PlanService, SubscriptionService, InvoiceService, etc.)
│   ├── routers/        # FastAPI endpoints (/api/auth, /api/users, /api/products, /api/subscriptions, /api/invoices, /api/billing, etc.)
│   ├── init_db.py      # Database bootstrap & admin seeder
│   └── main.py         # FastAPI application entry point & CORS configuration
├── tests/              # Pytest test suite (test_auth.py, test_crud.py, test_subscriptions.py, test_invoices.py, test_payments.py)
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules (.venv, .env, *.db)
├── pytest.ini          # Pytest configuration
├── requirements.txt    # Project dependencies
└── README.md           # Documentation
```

---

## Setup & Running Locally

### 1. Create and Activate Virtual Environment
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Seed Admin & Run Server
When starting the server, `init_db` automatically verifies and provisions the default seed admin:
- **Email**: `admin@brightloop.com`
- **Password**: `Admin@1234`
- **Role**: `admin`

Start server:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Interactive API documentation: `http://localhost:8000/docs`

---

## Implemented Endpoints

### Step 1: Auth & User Management
- `POST /api/auth/signup`: Customer/portal user registration (with strict password rules).
- `POST /api/auth/login`: Authenticates credentials, returns JWT token with user role.
- `POST /api/auth/forgot-password`: Generates reset token and prints demo reset URL to console.
- `POST /api/auth/reset-password`: Resets password using token.
- `GET /api/auth/me`: Retrieves authenticated user profile.
- `POST /api/users`: Admin-only endpoint to create `internal`, `admin`, or `portal` users.
- `GET /api/users`: Admin-only endpoint to list all users.

### Step 2: Core Master Data CRUD
- `/api/products` (+ `/variants`): Products and variants (e.g. Brand=Odoo +560) CRUD (internal/admin).
- `/api/plans`: Recurring subscription plans CRUD (daily/weekly/monthly/yearly, auto_close, pausable, renewable) (internal/admin).
- `/api/taxes`: Taxes CRUD (Internal has read access; edits restricted to admin).
- `/api/discounts`: Discounts CRUD (admin only).
- `/api/templates`: Quotation templates and template lines CRUD (internal/admin).
- `/api/customers`: Customer contacts CRUD with state/GST details (internal/admin).

### Step 3: Subscriptions Management
- `GET /api/subscriptions`: List subscriptions with status/customer filters and pagination.
- `POST /api/subscriptions`: Create subscription with auto numbering (`SUB-0001`), line calculations (variant extra price + tax + discount), and activity logging.
- `GET /api/subscriptions/{id}`: Detailed subscription view with lines, customer, and plan.
- `POST /api/subscriptions/from-template/{id}`: Create pre-filled quotation subscription directly from quotation template lines.
- `POST /api/subscriptions/{id}/status`: State machine transition validation (`draft` -> `quotation` -> `confirmed` -> `active` -> `paused`/`closed`).
- `POST /api/subscriptions/{id}/pause`: Pauses subscription (enforces `plan.pausable`).
- `POST /api/subscriptions/{id}/renew`: Renews subscription by advancing `next_billing_date` and `expiry_date` (enforces `plan.renewable`).
- `POST /api/subscriptions/{id}/close`: Closes subscription (enforces `plan.closable`).
- `GET /api/subscriptions/{id}/timeline`: Audit activity timeline tracking all status/price modifications.
- Automatic plan closure: Subscriptions tied to plans with `auto_close=True` close automatically after plan `end_date`.

### Step 4: Invoicing & Billing Engine
- `POST /api/subscriptions/{id}/invoice`: Generates invoice for subscription's current billing period, automatically applying discounts (with usage limits & dates check), computing taxes, calculating GST split (CGST/SGST for Odisha vs IGST for interstate), and advancing `next_billing_date`. Prevents double billing.
- `POST /api/billing/run`: Automated batch billing run across all active subscriptions due (`next_billing_date <= today`). Never bills twice; returns `created_count` and `skipped_count`.
- `GET /api/invoices`: List invoices with filters (`status`, `customer_id`, `overdue`, `outstanding`, pagination).
- `GET /api/invoices/{id}`: Get single invoice with line breakdown and payment records.
- `POST /api/invoices/{id}/confirm`: Status transition `draft` -> `confirmed`.
- `POST /api/invoices/{id}/cancel`: Cancel invoice (`draft`/`confirmed` -> `cancelled`).
- `POST /api/invoices/{id}/send`: Mock invoice email dispatch logged to console for demo.
- `GET /api/invoices/{id}/pdf`: Downloads professional styled invoice PDF generated using ReportLab.

### Step 5: Payments & Settlement
- `POST /api/invoices/{id}/payments`: Record payment against an invoice (methods: `upi`, `card`, `bank`, `cash`). Increments `amount_paid` and automatically transitions invoice status to `paid` once `amount_paid >= total`.
- `GET /api/invoices/{id}/payments`: Lists all payment transaction entries recorded for an invoice.
- `GET /api/invoices?status=outstanding`: Filter for unpaid or partially paid invoices (`amount_paid < total` and status not cancelled or paid).
- `GET /api/invoices?overdue=true`: Filter for invoices with `due_date < today` that remain unpaid.

### Step 6: Dashboard Analytics, Pagination & Performance Seed
- `GET /api/dashboard/summary`: Real-time dashboard KPI summary returning:
  - `active_subscriptions`, `total_subscriptions`, and complete `status_breakdown`
  - `revenue_this_month` / `payments_total` and `payments_count` (filterable by `start_date` and `end_date`)
  - `outstanding_amount` and `outstanding_count`
  - `overdue_amount` and `overdue_count`
- Uniform pagination: Every list endpoint supports `page` and `size` query parameters (with backward-compatible `skip`/`limit` support).
- Optimized query execution: High performance queries using `selectinload` and SQL aggregation, benchmarked at `< 2.0s` for 5,000 subscriptions.
- Database Seeder (`seed.py`):
  ```bash
  # Standard demo seed (50 customers, products, plans, taxes, discounts, invoices):
  python backend/seed.py

  # Performance testing seed (adds 5,000 subscriptions):
  python backend/seed.py --bulk 5000
  ```

### Step 7: Customer Self-Service Portal
- `GET /api/portal/subscriptions`: Authenticated customer retrieves strictly their own subscriptions with full lines, status, and recurring plan details.
- `GET /api/portal/subscriptions/{id}`: Customer views their own subscription details.
- `POST /api/portal/subscriptions/{id}/pause`: Customer can pause their own subscription if the associated plan has `pausable=True`.
- `POST /api/portal/subscriptions/{id}/cancel` (or `/close`): Customer can cancel their own subscription if `closable=True`.
- `GET /api/portal/invoices`: Customer views strictly their own invoices.
- `GET /api/portal/invoices/{id}`: Detailed invoice breakdown for customer.
- `POST /api/portal/invoices/{id}/pay`: Mock online payment against customer's outstanding invoice (defaults to full remaining balance if amount not specified; automatically marks invoice as `paid` upon full settlement).

### Step 8: Smart Dunning & Overdue Recovery
- `POST /api/dunning/run`: Automated overdue dunning job.
  - Automatically identifies overdue invoices (`due_date < check_date`, status open/unpaid).
  - Triggers email reminders at milestones: **Day 1**, **Day 3**, and **Day 7** overdue.
  - Dedupes: Never sends duplicate reminders for the same invoice and milestone offset.
  - Console logging for demonstration and writes audit entries to `activity_log`.
  - Records entries in `reminders` table (`id`, `invoice_id`, `day_offset`, `sent_at`, `channel`).
- `GET /api/dunning/reminders`: Historical sent reminders list with invoice filtering and pagination.
- `GET /api/dunning/stats`: Real-time summary metrics on reminders sent, invoices reached, and `overdue_amount_recovered`.
- `GET /api/dashboard/summary`: Reflects `overdue_amount_recovered` when payments are recorded against reminded overdue invoices.

### Step 9: Customer Churn Risk Analysis
- `GET /api/customers/{id}/risk`: Detailed risk score (0-100) and classification (`High`, `Medium`, `Low`) evaluated from:
  - Overdue unpaid invoices and outstanding balance amounts
  - Historical payments completed past invoice due dates
  - Paused subscriptions indicating customer churn intent
  - Subscriptions approaching expiration within 15 days without renewal
  - Detailed diagnostic `reasons` list for actionable sales/support follow-up.
- Customer list annotation: `GET /api/customers` includes `risk_level` and `risk_score` for every customer.

### Step 10: Executive Revenue Analytics
- `GET /api/analytics`: Comprehensive executive revenue intelligence:
  - **MRR (Monthly Recurring Revenue)**: Dynamically normalized by billing frequency (`yearly/12`, `weekly*4.33`, `daily*30`, `monthly`).
  - **ARR (Annual Recurring Revenue)**: Calculated as `MRR * 12`.
  - **Monthly Churn Rate**: `(closed_subscriptions / (active + closed) * 100)`.
  - **Expected Revenue Next 30 Days**: Total recurring amount expected across all active subscriptions with upcoming billing in the next 30 days.
  - **6-Month Historical Revenue Series**: Month-by-month historical payment collections and transaction counts.

### Step 11: Plan Changes & Proration Engine
- `POST /api/subscriptions/{id}/change-plan`: Mid-cycle plan change with automatic proration:
  - Calculates unused portion and credit of current billing period: `(remaining_days / total_days) * current_charge`.
  - Prorates new plan cost for remaining days: `(remaining_days / total_days) * new_plan_price`.
  - Computes net adjustment (`new_plan_prorated - unused_credit`).
  - Generates an adjusted invoice detailing the credit and new plan charges.
  - Updates subscription plan and logs full audit details to activity timeline.

### Step 12: Activity Timeline & Price Tracking
- `GET /api/subscriptions/{id}/timeline`: Full chronological audit trail of all subscription modifications:
  - Captures subscription creation, all status stepper transitions (`draft`, `quotation`, `confirmed`, `active`, `paused`, `closed`).
  - Captures plan changes with proration credit and charge details.
  - `PUT /api/subscriptions/{id}/lines/{line_id}`: Line price or quantity adjustments update line amounts and record explicit `price_change` log entries with old and new values.

---

## Running Tests
```bash
pytest -c backend/pytest.ini backend/tests
```
