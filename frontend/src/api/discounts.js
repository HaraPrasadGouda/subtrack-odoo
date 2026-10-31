// ─────────────────────────────────────────────
// API Layer — Discounts endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextDiscountId = 6;

const MOCK_DISCOUNTS = [
  {
    id: 1,
    name: 'WELCOME20',
    type: 'percent',
    value: 20,
    min_purchase: 100000, // ₹1,000 in paise
    min_qty: 1,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    usage_limit: 500,
    used_count: 214,
    applies_to: 'subscription',
    product_id: null,
  },
  {
    id: 2,
    name: 'FLAT500',
    type: 'fixed',
    value: 50000, // ₹500 in paise
    min_purchase: 250000, // ₹2,500 in paise
    min_qty: 1,
    start_date: '2026-03-01',
    end_date: null,
    usage_limit: 1000,
    used_count: 780,
    applies_to: 'subscription',
    product_id: null,
  },
  {
    id: 3,
    name: 'ANNUAL15',
    type: 'percent',
    value: 15,
    min_purchase: 500000, // ₹5,000 in paise
    min_qty: 1,
    start_date: '2026-02-15',
    end_date: '2026-11-30',
    usage_limit: 100,
    used_count: 88,
    applies_to: 'subscription',
    product_id: null,
  },
  {
    id: 4,
    name: 'STARTUP50',
    type: 'percent',
    value: 50,
    min_purchase: 0,
    min_qty: 1,
    start_date: '2026-05-01',
    end_date: '2026-06-30',
    usage_limit: 50,
    used_count: 50, // exhausted
    applies_to: 'subscription',
    product_id: null,
  },
  {
    id: 5,
    name: 'CLOUDHOSTING10',
    type: 'percent',
    value: 10,
    min_purchase: 100000,
    min_qty: 2,
    start_date: '2026-06-01',
    end_date: null,
    usage_limit: null, // unlimited
    used_count: 32,
    applies_to: 'product',
    product_id: 1,
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /discounts
 */
export async function getDiscounts(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_DISCOUNTS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.applies_to.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/discounts', { params });
  return data;
}

/**
 * GET /discounts/:id
 */
export async function getDiscount(id) {
  if (USE_MOCK) {
    await delay(300);
    const disc = MOCK_DISCOUNTS.find((d) => d.id === Number(id));
    if (!disc) {
      const err = new Error('Discount not found');
      err.response = { status: 404, data: { detail: 'Discount not found.' } };
      throw err;
    }
    return disc;
  }
  const { data } = await apiClient.get(`/discounts/${id}`);
  return data;
}

/**
 * POST /discounts
 */
export async function createDiscount(payload) {
  if (USE_MOCK) {
    await delay(400);
    const disc = {
      id: nextDiscountId++,
      name: payload.name.toUpperCase(),
      type: payload.type || 'percent',
      value: Number(payload.value),
      min_purchase: Number(payload.min_purchase) || 0,
      min_qty: Number(payload.min_qty) || 0,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      usage_limit: payload.usage_limit ? Number(payload.usage_limit) : null,
      used_count: 0,
      applies_to: payload.applies_to || 'subscription',
      product_id: payload.product_id ? Number(payload.product_id) : null,
    };
    MOCK_DISCOUNTS.push(disc);
    return disc;
  }
  const { data } = await apiClient.post('/discounts', payload);
  return data;
}

/**
 * PUT /discounts/:id
 */
export async function updateDiscount(id, payload) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_DISCOUNTS.findIndex((d) => d.id === Number(id));
    if (idx === -1) {
      const err = new Error('Discount not found');
      err.response = { status: 404, data: { detail: 'Discount not found.' } };
      throw err;
    }
    MOCK_DISCOUNTS[idx] = {
      ...MOCK_DISCOUNTS[idx],
      name: payload.name.toUpperCase(),
      type: payload.type || MOCK_DISCOUNTS[idx].type,
      value: Number(payload.value),
      min_purchase: Number(payload.min_purchase) || 0,
      min_qty: Number(payload.min_qty) || 0,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      usage_limit: payload.usage_limit ? Number(payload.usage_limit) : null,
      applies_to: payload.applies_to || MOCK_DISCOUNTS[idx].applies_to,
      product_id: payload.product_id ? Number(payload.product_id) : null,
    };
    return MOCK_DISCOUNTS[idx];
  }
  const { data } = await apiClient.put(`/discounts/${id}`, payload);
  return data;
}

/**
 * DELETE /discounts/:id
 */
export async function deleteDiscount(id) {
  if (USE_MOCK) {
    await delay(300);
    const idx = MOCK_DISCOUNTS.findIndex((d) => d.id === Number(id));
    if (idx !== -1) MOCK_DISCOUNTS.splice(idx, 1);
    return { message: 'Discount deleted.' };
  }
  const { data } = await apiClient.delete(`/discounts/${id}`);
  return data;
}
