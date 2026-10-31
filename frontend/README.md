# SubTrack — Frontend (Subscription Management System)

A comprehensive, production-grade SaaS Subscription Management System frontend built for the **Odoo Hackathon**.

Built with **React 19**, **Vite**, **Tailwind CSS v4**, **React Router v7**, **Axios**, and **Recharts**.

---

## 🚀 Key Highlights & Architectural Features

- **Clean SaaS Design System**: White cards, soft multi-layer shadows, clean typography (`Inter`), consistent indigo/blue accent, loading skeletons (`Skeleton.jsx`), empty states, and toast notifications (`react-hot-toast`).
- **Full Indian Rupee Localization**: All monetary values formatted according to Indian numbering standards (e.g. `₹1,23,456`, `₹18.5L`, `₹2.2Cr`).
- **Zero-Dependency Mock Mode (`VITE_USE_MOCK=true`)**: Every API endpoint has a dedicated function and realistic mock JSON dataset with simulated network latency. Works seamlessly offline and before the FastAPI backend is running.
- **JWT & Role-Based Access Control**:
  - Automatically attaches `Authorization: Bearer <token>` to all requests.
  - Intercepts `401 Unauthorized` responses to clear credentials and redirect to `/login`.
  - Roles:
    - **`admin`**: Full access to all catalogue, finance, sales, dunning, customer, and staff management pages.
    - **`internal`**: Access to Dashboard, Customers, Subscriptions, Invoices, and Payments.
    - **`portal`**: Customer self-service portal restricted to *My Subscriptions* and *My Invoices*.

---

## 🧑‍💻 Demo Test Accounts (Mock Mode)

In mock mode (`VITE_USE_MOCK=true`), any non-empty password will authenticate the following demo users:

| Role | Email | Capabilities |
|---|---|---|
| **Admin** | `admin@subtrack.app` | Sees all 13 modules, taxes, discounts, users, settings |
| **Internal Staff** | `staff@subtrack.app` | Sales quotes, subscriptions, billing runs, payments |
| **Customer Portal** | `customer@example.com` | Self-service subscriptions (pause/cancel), pay invoices |

---

## 📱 Modules & Pages

1. **Authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)**:
   - Live password rules checklist (>8 characters, uppercase, lowercase, special character).
   - Duplicate email validation (e.g. `admin@subtrack.app` triggers existing email conflict).
   - Password reset flow with validation.
2. **Dashboard Overview (`/dashboard`)**:
   - Real-time KPI summary cards (Active Subscriptions, Revenue This Month, Payments Received, Outstanding, Overdue Invoices).
   - MRR / ARR metrics with month-over-month trend indicators.
   - 6-month revenue trend chart (Recharts) and subscription status donut chart.
   - Overdue invoices collection table and date range selector.
3. **Products & Catalog (`/products`)**:
   - Product list with search and type badges (`Service`, `Consumable`, `Physical`).
   - Create/edit modal (name, type, sales price, cost price, notes).
   - Product variants manager (attributes, values, and extra price surcharges).
4. **Billing Plans (`/plans`)**:
   - Recurring plans with periods (`daily`, `weekly`, `monthly`, `yearly`).
   - Plan option flags: `auto close`, `closable`, `pausable`, `renewable`.
5. **Taxes & Discounts (`/taxes`, `/discounts`) — *Admin Only*:**
   - Tax rules manager with standard GST presets (CGST 9%, SGST 9%, IGST 18%, GST 12%, GST 5%, Zero Tax).
   - Promo coupon builder with fixed/percent discount, minimum purchase threshold, and **visual usage limit progress bar**.
6. **Quotation Templates (`/templates`)**:
   - Reusable sales bundles with validity periods, billing plan presets, and included product lines.
   - "Use template" one-click quote instantiation.
7. **Subscriptions Lifecycle (`/subscriptions`)**:
   - Subscriptions directory with search, filter chips, and pagination.
   - Detail view with 5-stage status stepper (`Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`).
   - Interactive action toolbar (Send Quote, Confirm, Activate, Pause, Resume, Close, Renew, Generate Invoice).
   - Plan change modal with **real-time proration calculations**.
   - Chronological audit activity timeline.
8. **Invoices & Billing (`/invoices`)**:
   - Status badges (`Draft`, `Confirmed`, `Paid`, `Cancelled`, and **`Overdue` highlighted in red**).
   - **"Run billing" automated engine**: batch bills active subscriptions and returns `Created vs Skipped` counts.
   - **Printable Tax Invoice Detail View**: Complete tax document with GSTIN, company details, line items, CGST/SGST/IGST breakdown, and balance due.
   - Record payment modal with instant settlement and transition to `Paid`.
9. **Payments Ledger (`/payments`)**:
   - Cross-invoice payment ledger with payment method badges (`UPI`, `Card`, `Bank Transfer`, `Cash`).
10. **Customer Directory & Churn Risk (`/customers`)**:
    - Directory with contact details and billing addresses.
    - **Churn risk badge** (`High` / `Medium` / `Low`) with hover tooltip revealing risk score and behavioral reasons (overdue invoices, inactivity, renewal proximity).
    - Customer profile view with history of linked subscriptions and invoices.
11. **Smart Dunning & Collections (`/dunning`)**:
    - Overdue invoices tracking with **Day 1 / Day 3 / Day 7 milestone indicators** (`Sent`, `Due`, `Pending`).
    - Recovery stats and "Send reminders now" batch action.
12. **User Management (`/users`) — *Admin Only*:**
    - Staff directory and access provisioning (`POST /users`).
13. **Customer Portal (`/my-subscriptions`, `/my-invoices`)**:
    - Portal user self-service: pause or cancel subscriptions (based on plan permissions).
    - Invoices with **"Pay now" online payment gateway** and PDF download.

---

## 🛠️ Setup & Scripts

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start Vite dev server (defaults to port 5173)
npm run dev

# Run oxlint linter
npm run lint

# Production build
npm run build
```

---

## ⚙️ Environment Variables

Create `.env.local` if you wish to override default configuration:

```env
# Backend API Base URL
VITE_API_URL=http://localhost:8000/api

# Set to "false" when connecting to live backend, "true" for offline mock mode
VITE_USE_MOCK=true
```
