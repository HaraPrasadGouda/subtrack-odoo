// ─────────────────────────────────────────────
// API Layer — Subscriptions endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextSubId = 104;

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Acme Technologies Pvt Ltd', email: 'billing@acme.io', phone: '+91 98765 43210' },
  { id: 2, name: 'InfraCorp India', email: 'accounts@infracorp.in', phone: '+91 91234 56789' },
  { id: 3, name: 'BluePeak Digital', email: 'hello@bluepeak.dev', phone: '+91 99887 76655' },
  { id: 4, name: 'Zenith Labs', email: 'finance@zenithlabs.com', phone: '+91 98111 22334' },
];

const MOCK_SUBSCRIPTIONS = [
  {
    id: 101,
    number: 'SUB-0101',
    customer_id: 1,
    plan_id: 3, // Professional Monthly
    start_date: '2026-10-01',
    expiry_date: '2027-09-30',
    next_billing_date: '2026-11-01',
    payment_terms: 'Net 15',
    status: 'active',
    created_at: '2026-09-28T10:00:00Z',
    total_amount: 530882, // in paise
    customer: MOCK_CUSTOMERS[0],
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
        subscription_id: 101,
        product_id: 2,
        variant_id: 5,
        qty: 1,
        unit_price: 449900,
        tax_id: 1, // GST 18%
        discount_id: null,
        amount: 530882,
        product: { id: 2, name: 'Cloud Hosting – Pro' },
        variant: { id: 5, attribute: 'Region', value: 'Mumbai' },
        tax: { id: 1, name: 'GST 18%', rate_percent: 18.0 },
        discount: null,
      },
    ],
  },
  {
    id: 102,
    number: 'SUB-0102',
    customer_id: 2,
    plan_id: 4, // Enterprise Monthly
    start_date: '2026-09-15',
    expiry_date: '2027-09-14',
    next_billing_date: '2026-11-15',
    payment_terms: 'Immediate',
    status: 'quotation',
    created_at: '2026-09-12T14:30:00Z',
    total_amount: 1179882,
    customer: MOCK_CUSTOMERS[1],
    plan: {
      id: 4,
      name: 'Enterprise Monthly',
      price: 999900,
      billing_period: 'monthly',
      closable: false,
      pausable: false,
      renewable: true,
    },
    lines: [
      {
        id: 2,
        subscription_id: 102,
        product_id: 2,
        variant_id: 5,
        qty: 1,
        unit_price: 999900,
        tax_id: 1,
        discount_id: null,
        amount: 1179882,
        product: { id: 2, name: 'Cloud Hosting – Pro' },
        variant: { id: 5, attribute: 'Region', value: 'Mumbai' },
        tax: { id: 1, name: 'GST 18%', rate_percent: 18.0 },
        discount: null,
      },
    ],
  },
  {
    id: 103,
    number: 'SUB-0103',
    customer_id: 3,
    plan_id: 1,
    start_date: '2026-10-10',
    expiry_date: '2027-10-09',
    next_billing_date: '2026-11-10',
    payment_terms: 'Net 30',
    status: 'draft',
    created_at: '2026-10-10T09:15:00Z',
    total_amount: 176882,
    customer: MOCK_CUSTOMERS[2],
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
        id: 3,
        subscription_id: 103,
        product_id: 1,
        variant_id: 1,
        qty: 1,
        unit_price: 149900,
        tax_id: 1,
        discount_id: null,
        amount: 176882,
        product: { id: 1, name: 'Cloud Hosting – Basic' },
        variant: { id: 1, attribute: 'Region', value: 'Mumbai' },
        tax: { id: 1, name: 'GST 18%', rate_percent: 18.0 },
        discount: null,
      },
    ],
  },
];

const MOCK_TIMELINES = {
  101: [
    { id: 1, action: 'created', detail: 'Quotation created from template', timestamp: '2026-09-28T10:00:00Z', user: 'Arjun Sharma' },
    { id: 2, action: 'quotation_sent', detail: 'Quotation sent to billing@acme.io', timestamp: '2026-09-28T10:05:00Z', user: 'Arjun Sharma' },
    { id: 3, action: 'confirmed', detail: 'Quotation confirmed by customer', timestamp: '2026-09-30T16:20:00Z', user: 'Priya Mehta' },
    { id: 4, action: 'activated', detail: 'Subscription activated and live', timestamp: '2026-10-01T00:00:00Z', user: 'System' },
    { id: 5, action: 'invoice_generated', detail: 'Invoice INV-1042 generated (₹5,309)', timestamp: '2026-10-01T00:01:00Z', user: 'System' },
  ],
  102: [
    { id: 6, action: 'created', detail: 'Draft created manually', timestamp: '2026-09-12T14:30:00Z', user: 'Priya Mehta' },
    { id: 7, action: 'quotation_sent', detail: 'Quotation sent to customer', timestamp: '2026-09-15T09:00:00Z', user: 'Priya Mehta' },
  ],
  103: [
    { id: 8, action: 'created', detail: 'Draft initialized', timestamp: '2026-10-10T09:15:00Z', user: 'Arjun Sharma' },
  ],
};

// ── Helpers ─────────────────────────────────────

function calculateTotal(lines) {
  return lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
}

// ── API functions ────────────────────────────────

/**
 * GET /subscriptions
 */
export async function getSubscriptions(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_SUBSCRIPTIONS];
    if (params.status && params.status !== 'all') {
      items = items.filter((s) => s.status.toLowerCase() === params.status.toLowerCase());
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.number.toLowerCase().includes(q) ||
          s.customer?.name.toLowerCase().includes(q) ||
          s.plan?.name.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/subscriptions', { params });
  return data;
}

/**
 * GET /subscriptions/:id
 */
export async function getSubscription(id) {
  if (USE_MOCK) {
    await delay(300);
    const sub = MOCK_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) {
      const err = new Error('Subscription not found');
      err.response = { status: 404, data: { detail: 'Subscription not found.' } };
      throw err;
    }
    return sub;
  }
  const { data } = await apiClient.get(`/subscriptions/${id}`);
  return data;
}

/**
 * POST /subscriptions
 */
export async function createSubscription(payload) {
  if (USE_MOCK) {
    await delay(500);
    const sub = {
      id: nextSubId++,
      number: `SUB-${String(nextSubId).padStart(4, '0')}`,
      customer_id: Number(payload.customer_id),
      plan_id: Number(payload.plan_id),
      start_date: payload.start_date || new Date().toISOString().split('T')[0],
      expiry_date: payload.expiry_date || null,
      next_billing_date: payload.start_date || new Date().toISOString().split('T')[0],
      payment_terms: payload.payment_terms || 'Immediate',
      status: payload.status || 'draft',
      created_at: new Date().toISOString(),
      customer: MOCK_CUSTOMERS.find((c) => c.id === Number(payload.customer_id)) || {
        id: Number(payload.customer_id),
        name: 'Customer ' + payload.customer_id,
        email: 'customer@example.com',
      },
      plan: payload.plan || {
        id: Number(payload.plan_id),
        name: 'Selected Plan',
        price: 149900,
        billing_period: 'monthly',
        closable: true,
        pausable: true,
        renewable: true,
      },
      lines: payload.lines || [],
      total_amount: calculateTotal(payload.lines || []),
    };
    MOCK_SUBSCRIPTIONS.unshift(sub);
    MOCK_TIMELINES[sub.id] = [
      { id: Date.now(), action: 'created', detail: 'Subscription created', timestamp: new Date().toISOString(), user: 'Current User' },
    ];
    return sub;
  }
  const { data } = await apiClient.post('/subscriptions', payload);
  return data;
}

/**
 * POST /subscriptions/from-template/:templateId
 */
export async function createFromTemplate(templateId, payload) {
  if (USE_MOCK) {
    await delay(500);
    const sub = {
      id: nextSubId++,
      number: `SUB-${String(nextSubId).padStart(4, '0')}`,
      customer_id: Number(payload.customer_id),
      plan_id: 1,
      start_date: payload.start_date || new Date().toISOString().split('T')[0],
      expiry_date: null,
      next_billing_date: payload.start_date || new Date().toISOString().split('T')[0],
      payment_terms: payload.payment_terms || 'Immediate',
      status: 'quotation',
      created_at: new Date().toISOString(),
      customer: MOCK_CUSTOMERS.find((c) => c.id === Number(payload.customer_id)) || {
        id: Number(payload.customer_id),
        name: 'Customer',
        email: 'customer@example.com',
      },
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
          id: Date.now(),
          subscription_id: nextSubId,
          product_id: 1,
          variant_id: 1,
          qty: 1,
          unit_price: 149900,
          tax_id: 1,
          discount_id: null,
          amount: 176882,
          product: { id: 1, name: 'Cloud Hosting – Basic' },
          variant: { id: 1, attribute: 'Region', value: 'Mumbai' },
          tax: { id: 1, name: 'GST 18%', rate_percent: 18.0 },
          discount: null,
        },
      ],
      total_amount: 176882,
    };
    MOCK_SUBSCRIPTIONS.unshift(sub);
    MOCK_TIMELINES[sub.id] = [
      { id: Date.now(), action: 'created', detail: `Quotation created from template #${templateId}`, timestamp: new Date().toISOString(), user: 'Current User' },
    ];
    return sub;
  }
  const { data } = await apiClient.post(`/subscriptions/from-template/${templateId}`, payload);
  return data;
}

/**
 * POST /subscriptions/:id/status
 */
export async function updateSubscriptionStatus(id, status) {
  if (USE_MOCK) {
    await delay(400);
    const sub = MOCK_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) throw new Error('Not found');
    sub.status = status;
    if (!MOCK_TIMELINES[id]) MOCK_TIMELINES[id] = [];
    MOCK_TIMELINES[id].push({
      id: Date.now(),
      action: status,
      detail: `Status updated to ${status}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    return sub;
  }
  const { data } = await apiClient.post(`/subscriptions/${id}/status`, { status });
  return data;
}

/**
 * POST /subscriptions/:id/pause
 */
export async function pauseSubscription(id) {
  return updateSubscriptionStatus(id, 'paused');
}

/**
 * POST /subscriptions/:id/renew
 */
export async function renewSubscription(id) {
  return updateSubscriptionStatus(id, 'active');
}

/**
 * POST /subscriptions/:id/close
 */
export async function closeSubscription(id) {
  return updateSubscriptionStatus(id, 'closed');
}

/**
 * POST /subscriptions/:id/change-plan
 */
export async function changePlan(id, { plan_id, plan }) {
  if (USE_MOCK) {
    await delay(400);
    const sub = MOCK_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    if (!sub) throw new Error('Not found');
    const oldPrice = sub.plan?.price || 0;
    const newPrice = plan?.price || oldPrice;
    const proratedDiff = Math.max(0, newPrice - oldPrice);
    sub.plan_id = Number(plan_id);
    if (plan) sub.plan = plan;
    if (!MOCK_TIMELINES[id]) MOCK_TIMELINES[id] = [];
    MOCK_TIMELINES[id].push({
      id: Date.now(),
      action: 'plan_changed',
      detail: `Plan changed to ${plan?.name || plan_id}. Proration adjustment: ₹${(proratedDiff / 100).toFixed(2)}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    return {
      subscription: sub,
      prorated_amount: proratedDiff,
      effective_date: new Date().toISOString().split('T')[0],
    };
  }
  const { data } = await apiClient.post(`/subscriptions/${id}/change-plan`, { plan_id });
  return data;
}

/**
 * POST /subscriptions/:id/invoice
 */
export async function generateSubscriptionInvoice(id) {
  if (USE_MOCK) {
    await delay(600);
    const sub = MOCK_SUBSCRIPTIONS.find((s) => s.id === Number(id));
    const invNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!MOCK_TIMELINES[id]) MOCK_TIMELINES[id] = [];
    MOCK_TIMELINES[id].push({
      id: Date.now(),
      action: 'invoice_generated',
      detail: `Invoice ${invNumber} generated for ₹${((sub?.total_amount || 0) / 100).toFixed(2)}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
    });
    return {
      id: Math.floor(100 + Math.random() * 900),
      number: invNumber,
      amount: sub?.total_amount || 0,
      status: 'confirmed',
    };
  }
  const { data } = await apiClient.post(`/subscriptions/${id}/invoice`);
  return data;
}

/**
 * GET /subscriptions/:id/timeline
 */
export async function getSubscriptionTimeline(id) {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_TIMELINES[Number(id)] || [];
  }
  const { data } = await apiClient.get(`/subscriptions/${id}/timeline`);
  return data;
}

/**
 * Helper to fetch customers list for dropdowns
 */
export async function getCustomers() {
  if (USE_MOCK) {
    await delay(200);
    return MOCK_CUSTOMERS;
  }
  const { data } = await apiClient.get('/customers');
  return data;
}
