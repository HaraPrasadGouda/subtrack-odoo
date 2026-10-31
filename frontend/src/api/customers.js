// ─────────────────────────────────────────────
// API Layer — Customers & Churn Risk endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextCustomerId = 5;

const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: 'TechNova Solutions Pvt Ltd',
    email: 'billing@technova.io',
    phone: '+91 98765 43210',
    address: 'Plot 42, Hitec City, Hyderabad, Telangana - 500081',
    gstin: '36AAACT1234F1Z8',
    created_at: '2026-06-10T10:00:00Z',
    risk: {
      customer_id: 1,
      customer_name: 'TechNova Solutions Pvt Ltd',
      risk_level: 'High',
      risk_score: 82,
      reasons: [
        '1 invoice is 17+ days overdue (INV-1042)',
        'Payment delayed across multiple previous billing cycles',
        'Customer has not logged into portal in over 30 days',
      ],
      overdue_invoices_count: 1,
      paused_subscriptions_count: 0,
      expiring_subscriptions_count: 1,
      late_payments_count: 2,
    },
  },
  {
    id: 2,
    name: 'GreenLeaf Organics Ltd',
    email: 'accounts@greenleaf.in',
    phone: '+91 91234 56789',
    address: '14 MG Road, Bengaluru, Karnataka - 560001',
    gstin: '29ABCDE1234F2Z5',
    created_at: '2026-06-25T14:30:00Z',
    risk: {
      customer_id: 2,
      customer_name: 'GreenLeaf Organics Ltd',
      risk_level: 'Low',
      risk_score: 12,
      reasons: [
        'All invoices paid promptly via UPI',
        'Active enterprise subscription',
        'Regular usage and high engagement',
      ],
      overdue_invoices_count: 0,
      paused_subscriptions_count: 0,
      expiring_subscriptions_count: 0,
      late_payments_count: 0,
    },
  },
  {
    id: 3,
    name: 'Pinnacle Consulting',
    email: 'finance@pinnacle.co',
    phone: '+91 99887 76655',
    address: '77 Sector 18, Gurugram, Haryana - 122002',
    gstin: '06AABCP9999R1Z2',
    created_at: '2026-07-15T09:15:00Z',
    risk: {
      customer_id: 3,
      customer_name: 'Pinnacle Consulting',
      risk_level: 'Medium',
      risk_score: 54,
      reasons: [
        'Subscription due for renewal within 15 days',
        'Invoice INV-1044 partially settled (₹768 balance remaining)',
      ],
      overdue_invoices_count: 0,
      paused_subscriptions_count: 0,
      expiring_subscriptions_count: 1,
      late_payments_count: 1,
    },
  },
  {
    id: 4,
    name: 'Skyline Developers',
    email: 'contact@skylinedev.com',
    phone: '+91 98111 22334',
    address: 'Andheri East, Mumbai, Maharashtra - 400069',
    gstin: '27AABCS5555M1Z7',
    created_at: '2026-08-01T12:00:00Z',
    risk: {
      customer_id: 4,
      customer_name: 'Skyline Developers',
      risk_level: 'High',
      risk_score: 78,
      reasons: [
        'Primary compute subscription is currently paused',
        'Overdue invoice reminder sent (Day 7 milestone reached)',
      ],
      overdue_invoices_count: 1,
      paused_subscriptions_count: 1,
      expiring_subscriptions_count: 0,
      late_payments_count: 2,
    },
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /customers
 */
export async function getCustomers(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_CUSTOMERS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/customers', { params });
  return data;
}

/**
 * GET /customers/:id
 */
export async function getCustomer(id) {
  if (USE_MOCK) {
    await delay(300);
    const customer = MOCK_CUSTOMERS.find((c) => c.id === Number(id));
    if (!customer) {
      const err = new Error('Customer not found');
      err.response = { status: 404, data: { detail: 'Customer not found.' } };
      throw err;
    }
    return customer;
  }
  const { data } = await apiClient.get(`/customers/${id}`);
  return data;
}

/**
 * POST /customers
 */
export async function createCustomer(payload) {
  if (USE_MOCK) {
    await delay(400);
    const customer = {
      id: nextCustomerId++,
      ...payload,
      created_at: new Date().toISOString(),
      risk: {
        customer_id: nextCustomerId,
        customer_name: payload.name,
        risk_level: 'Low',
        risk_score: 5,
        reasons: ['Newly registered customer account'],
        overdue_invoices_count: 0,
        paused_subscriptions_count: 0,
        expiring_subscriptions_count: 0,
        late_payments_count: 0,
      },
    };
    MOCK_CUSTOMERS.push(customer);
    return customer;
  }
  const formatted = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    address: payload.address || null,
    gst_state: payload.gst_state || null,
    user_id: payload.user_id ? Number(payload.user_id) : null,
  };
  const { data } = await apiClient.post('/customers', formatted);
  return data;
}

/**
 * PUT /customers/:id
 */
export async function updateCustomer(id, payload) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === Number(id));
    if (idx === -1) {
      const err = new Error('Customer not found');
      err.response = { status: 404, data: { detail: 'Customer not found.' } };
      throw err;
    }
    MOCK_CUSTOMERS[idx] = {
      ...MOCK_CUSTOMERS[idx],
      ...payload,
    };
    return MOCK_CUSTOMERS[idx];
  }
  const formatted = { ...payload };
  if (formatted.user_id !== undefined) {
    formatted.user_id = formatted.user_id ? Number(formatted.user_id) : null;
  }
  const { data } = await apiClient.put(`/customers/${id}`, formatted);
  return data;
}

/**
 * DELETE /customers/:id
 */
export async function deleteCustomer(id) {
  if (USE_MOCK) {
    await delay(300);
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === Number(id));
    if (idx !== -1) MOCK_CUSTOMERS.splice(idx, 1);
    return { message: 'Customer deleted.' };
  }
  const { data } = await apiClient.delete(`/customers/${id}`);
  return data;
}

/**
 * GET /customers/:id/risk
 */
export async function getCustomerRisk(id) {
  if (USE_MOCK) {
    await delay(300);
    const customer = MOCK_CUSTOMERS.find((c) => c.id === Number(id));
    if (!customer) throw new Error('Customer not found');
    return customer.risk;
  }
  const { data } = await apiClient.get(`/customers/${id}/risk`);
  return data;
}
