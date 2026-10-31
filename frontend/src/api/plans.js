// ─────────────────────────────────────────────
// API Layer — Plans (Billing Plans) endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextPlanId = 7;

const MOCK_PLANS = [
  {
    id: 1,
    name: 'Starter Monthly',
    price: 149900,
    billing_period: 'monthly',
    min_qty: 1,
    start_date: '2026-01-01',
    end_date: null,
    auto_close: false,
    closable: true,
    pausable: true,
    renewable: true,
    created_at: '2026-01-01',
  },
  {
    id: 2,
    name: 'Starter Yearly',
    price: 1499000,
    billing_period: 'yearly',
    min_qty: 1,
    start_date: '2026-01-01',
    end_date: null,
    auto_close: false,
    closable: true,
    pausable: false,
    renewable: true,
    created_at: '2026-01-01',
  },
  {
    id: 3,
    name: 'Professional Monthly',
    price: 449900,
    billing_period: 'monthly',
    min_qty: 1,
    start_date: '2026-03-01',
    end_date: null,
    auto_close: false,
    closable: true,
    pausable: true,
    renewable: true,
    created_at: '2026-03-01',
  },
  {
    id: 4,
    name: 'Enterprise Monthly',
    price: 999900,
    billing_period: 'monthly',
    min_qty: 5,
    start_date: '2026-04-15',
    end_date: null,
    auto_close: false,
    closable: false,
    pausable: false,
    renewable: true,
    created_at: '2026-04-15',
  },
  {
    id: 5,
    name: 'Trial – 7 Days',
    price: 0,
    billing_period: 'weekly',
    min_qty: 1,
    start_date: '2026-05-01',
    end_date: '2026-12-31',
    auto_close: true,
    closable: true,
    pausable: false,
    renewable: false,
    created_at: '2026-05-01',
  },
  {
    id: 6,
    name: 'Daily Compute',
    price: 9900,
    billing_period: 'daily',
    min_qty: 1,
    start_date: '2026-06-01',
    end_date: null,
    auto_close: false,
    closable: true,
    pausable: true,
    renewable: true,
    created_at: '2026-06-01',
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /plans
 */
export async function getPlans(params = {}) {
  if (USE_MOCK) {
    await delay(500);
    let items = [...MOCK_PLANS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.billing_period.toLowerCase().includes(q)
      );
    }
    return { plans: items, total: items.length };
  }
  const { data } = await apiClient.get('/plans', { params });
  return data;
}

/**
 * GET /plans/:id
 */
export async function getPlan(id) {
  if (USE_MOCK) {
    await delay(400);
    const plan = MOCK_PLANS.find((p) => p.id === Number(id));
    if (!plan) {
      const err = new Error('Plan not found');
      err.response = { status: 404, data: { detail: 'Plan not found.' } };
      throw err;
    }
    return plan;
  }
  const { data } = await apiClient.get(`/plans/${id}`);
  return data;
}

/**
 * POST /plans
 */
export async function createPlan(payload) {
  if (USE_MOCK) {
    await delay(500);
    const plan = {
      id: nextPlanId++,
      ...payload,
      price: Number(payload.price),
      min_qty: Number(payload.min_qty) || 1,
      auto_close: Boolean(payload.auto_close),
      closable: Boolean(payload.closable),
      pausable: Boolean(payload.pausable),
      renewable: Boolean(payload.renewable),
      created_at: new Date().toISOString().split('T')[0],
    };
    MOCK_PLANS.push(plan);
    return plan;
  }
  const { data } = await apiClient.post('/plans', payload);
  return data;
}

/**
 * PUT /plans/:id
 */
export async function updatePlan(id, payload) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_PLANS.findIndex((p) => p.id === Number(id));
    if (idx === -1) {
      const err = new Error('Plan not found');
      err.response = { status: 404, data: { detail: 'Plan not found.' } };
      throw err;
    }
    MOCK_PLANS[idx] = {
      ...MOCK_PLANS[idx],
      ...payload,
      price: Number(payload.price),
      min_qty: Number(payload.min_qty) || 1,
      auto_close: Boolean(payload.auto_close),
      closable: Boolean(payload.closable),
      pausable: Boolean(payload.pausable),
      renewable: Boolean(payload.renewable),
    };
    return MOCK_PLANS[idx];
  }
  const { data } = await apiClient.put(`/plans/${id}`, payload);
  return data;
}

/**
 * DELETE /plans/:id
 */
export async function deletePlan(id) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_PLANS.findIndex((p) => p.id === Number(id));
    if (idx !== -1) MOCK_PLANS.splice(idx, 1);
    return { message: 'Plan deleted.' };
  }
  const { data } = await apiClient.delete(`/plans/${id}`);
  return data;
}

