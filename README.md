# SubTrack: Subscription Management System

Odoo x Make-A-Ton 9.0 | Problem: Subscription Management System for *Brightloop Software*

SubTrack handles the full subscription lifecycle: products and plans, quotations to active subscriptions, recurring invoices with GST, payments, dunning and a customer self-service portal.

## Demo video
[Watch the demo](https://drive.google.com/file/d/1nbyKOA9Y_cDGiphaE8NYkOm98yEo_MNN/view?usp=sharing)

## Features
- *Auth & roles:* Admin, Internal staff, Portal customer. JWT login, signup, forgot/reset password, strong password rule
- *Dashboard:* KPI cards, MRR trend, charts, overdue invoices table
- *Products & plans:* products with variants, recurring plans (billing period, price)
- *Taxes & discounts:* GST (CGST + SGST) and discount rules
- *Quotation templates:* create a subscription from a template
- *Subscriptions:* Draft > Quotation > Confirmed > Active, plus pause, renew, change plan, cancel, close, timeline
- *Invoices:* generated from subscriptions, tax lines, PDF download
- *Payments:* record full/partial payments (UPI, card, bank, cash), auto status update to PAID
- *Dunning:* overdue reminders on Day 1 / 3 / 7 with a reminder log
- *Customers:* search, churn-risk filter
- *Users:* manage admin, staff and portal users
- *Customer portal:* My Subscriptions, My Invoices, pay invoice, pause/cancel

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite |
| Auth | JWT (PyJWT), bcrypt |
| PDF | ReportLab |
| Tests | pytest (45 tests) |

## Run locally
*Backend* (from repo root)

pip install -r backend/requirements.txt
python backend/seed.py
uvicorn backend.app.main:app --port 8000

API docs: http://localhost:8000/docs

*Frontend*

cd frontend
npm install
npm run dev

Open http://localhost:5173

## Demo logins (seed data)
| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.com | Admin@1234 |
| Staff | staff@brightloop.com | Staff@1234 |
| Portal | portal@brightloop.com | Portal@1234 |

## Tests

pytest -q


## Team
- Hara Prasad Gouda: Backend + API integration ([@HaraPrasadGouda](https://github.com/HaraPrasadGouda))
- Omprakash Swain: Frontend ([@swainomprakash594-debug](https://github.com/swainomprakash594-debug))
