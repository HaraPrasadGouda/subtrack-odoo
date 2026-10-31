// ─────────────────────────────────────────────
// API Layer — Customer Portal endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data for logged-in portal customer ──────

const MOCK_PORTAL_SUBSCRIPTIONS = [
  {
    id: 201,
    number: 'SUB-0201',
    customer_id: 3,
    plan_id: 3,
    start_date: '2026-08-01',
    expiry_date: '2027-07-31',
    next_billing_date: '2026-11-01',
    payment_terms: 'Immediate',
    status: 'active',
    created_at: '2026-08-01T00:00:00Z',
    total_amount: 530882,
    plan: {
      id: 3,
      name: 'Professional Monthly',
      price: 449900,
      billing_period: 'monthly',
      closable: true,
      pausable: true,
      renewable: true,
    },
    lines: [
      {
        id: 1,
        product_id: 2,
        description: 'Cloud Hosting – Pro (Mumbai)',
        qty: 1,
        unit_price: 449900,
        amount: 530882,
        product: { id: 2, name: 'Cloud Hosting – Pro' },
        variant: { id: 5, attribute: 'Region', value: 'Mumbai' },
      },
    ],
  },
  {
    id: 202,
    number: 'SUB-0202',
    customer_id: 3,
    plan_id: 1,
    start_date: '2026-09-15',
    expiry_date: null,
    next_billing_date: '2026-11-15',
    payment_terms: 'Immediate',
    status: 'paused',
    created_at: '2026-09-15T00:00:00Z',
    total_amount: 176882,
    plan: {
      id: 1,
      name: 'Starter Monthly',
      price: 149900,
      billing_period: 'monthly',
      closable: true,
      pausable: true,
      renewable: true,
    },
    lines: [
      {
        id: 2,
        product_id: 1,
        description: 'Starter Compute Node',
        qty: 1,
        unit_price: 149900,
        amount: 176882,
        product: { id: 1, name: 'Cloud Hosting – Basic' },
      },
    ],
  },
];

const MOCK_PORTAL_INVOICES = [
  {
    id: 301,
    number: 'INV-2041',
    subscription_id: 201,
    customer_id: 3,
    invoice_date: '2026-10-01',
    due_date: '2026-10-15',
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    subtotal: 449900,
    discount_total: 0,
    tax_total: 80982,
    cgst: 40491,
    sgst: 40491,
    igst: 0,
    total: 530882,
    amount_paid: 0,
    status: 'confirmed',
    created_at: '2026-10-01T00:00:00Z',
    lines: [
      {
        id: 1,
        description: 'Professional Monthly Subscription',
        qty: 1,
        unit_price: 449900,
        amount: 530882,
      },
    ],
    payments: [],
  },
  {
    id: 302,
    number: 'INV-2015',
    subscription_id: 201,
    customer_id: 3,
    invoice_date: '2026-09-01',
    due_date: '2026-09-15',
    period_start: '2026-09-01',
    period_end: '2026-09-30',
    subtotal: 449900,
    discount_total: 0,
    tax_total: 80982,
    cgst: 40491,
    sgst: 40491,
    igst: 0,
    total: 530882,
    amount_paid: 530882,
    status: 'paid',
    created_at: '2026-09-01T00:00:00Z',
    lines: [
      {
        id: 2,
        description: 'Professional Monthly Subscription',
        qty: 1,
        unit_price: 449900,
        amount: 530882,
      },
    ],
    payments: [
      { id: 91, method: 'upi', amount: 530882, date: '2026-09-03', note: 'UPI payment' },
    ],
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /portal/subscriptions
 */
export async function getPortalSubscriptions(params = {}) {
  if (USE_MOCK) {
    await delay();
    return MOCK_PORTAL_SUBSCRIPTIONS;
  }
  const { data } = await apiClient.get('/portal/subscriptions', { params });
  return data;
}

/**
 * GET /portal/subscriptions/:id
 */
export async function getPortalSubscription(id) {
  if (USE_MOCK) {
    await delay(300);
    const sub = MOCK_PORTAL_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) throw new Error('Subscription not found');
    return sub;
  }
  const { data } = await apiClient.get(`/portal/subscriptions/${id}`);
  return data;
}

/**
 * POST /portal/subscriptions/:id/pause
 */
export async function pausePortalSubscription(id) {
  if (USE_MOCK) {
    await delay(400);
    const sub = MOCK_PORTAL_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) throw new Error('Subscription not found');
    if (!sub.plan?.pausable) {
      const err = new Error('Plan does not allow pausing');
      err.response = { status: 400, data: { detail: 'This plan cannot be paused.' } };
      throw err;
    }
    sub.status = 'paused';
    return sub;
  }
  const { data } = await apiClient.post(`/portal/subscriptions/${id}/pause`);
  return data;
}

/**
 * POST /portal/subscriptions/:id/cancel
 */
export async function cancelPortalSubscription(id) {
  if (USE_MOCK) {
    await delay(400);
    const sub = MOCK_PORTAL_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) throw new Error('Subscription not found');
    if (!sub.plan?.closable) {
      const err = new Error('Plan does not allow cancellation');
      err.response = { status: 400, data: { detail: 'This plan cannot be cancelled.' } };
      throw err;
    }
    sub.status = 'closed';
    return sub;
  }
  const { data } = await apiClient.post(`/portal/subscriptions/${id}/cancel`);
  return data;
}

/**
 * GET /portal/invoices
 */
export async function getPortalInvoices(params = {}) {
  if (USE_MOCK) {
    await delay();
    return MOCK_PORTAL_INVOICES;
  }
  const { data } = await apiClient.get('/portal/invoices', { params });
  return data;
}

/**
 * GET /portal/invoices/:id
 */
export async function getPortalInvoice(id) {
  if (USE_MOCK) {
    await delay(300);
    const inv = MOCK_PORTAL_INVOICES.find((i) => i.id === Number(id));
    if (!inv) throw new Error('Invoice not found');
    return inv;
  }
  const { data } = await apiClient.get(`/portal/invoices/${id}`);
  return data;
}

/**
 * POST /portal/invoices/:id/pay (Mock Payment)
 */
export async function payPortalInvoice(id, payload = {}) {
  if (USE_MOCK) {
    await delay(600);
    const inv = MOCK_PORTAL_INVOICES.find((i) => i.id === Number(id));
    if (!inv) throw new Error('Invoice not found');
    const balance = Math.max(0, inv.total - inv.amount_paid);
    const payAmt = payload.amount ? Number(payload.amount) : balance;
    const payment = {
      id: Date.now(),
      invoice_id: inv.id,
      method: payload.method || 'upi',
      amount: payAmt,
      date: new Date().toISOString().split('T')[0],
      note: payload.note || 'Online portal payment',
    };
    inv.payments.push(payment);
    inv.amount_paid += payAmt;
    if (inv.amount_paid >= inv.total) {
      inv.status = 'paid';
    }
    return payment;
  }
  const formatted = {
    method: payload.method || 'card',
    amount: payload.amount != null ? Number(payload.amount) : undefined,
    note: payload.note || 'Portal payment',
  };
  const { data } = await apiClient.post(`/portal/invoices/${id}/pay`, formatted);
  return data;
}

