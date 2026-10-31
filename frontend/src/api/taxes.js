// ─────────────────────────────────────────────
// API Layer — Taxes endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextTaxId = 6;

const MOCK_TAXES = [
  {
    id: 1,
    name: 'GST 18% (Standard SaaS)',
    rate_percent: 18.0,
    type: 'gst',
  },
  {
    id: 2,
    name: 'CGST 9% (Intra-state Central)',
    rate_percent: 9.0,
    type: 'gst',
  },
  {
    id: 3,
    name: 'SGST 9% (Intra-state State)',
    rate_percent: 9.0,
    type: 'gst',
  },
  {
    id: 4,
    name: 'IGST 18% (Inter-state Integrated)',
    rate_percent: 18.0,
    type: 'gst',
  },
  {
    id: 5,
    name: 'GST 12% (Hardware/Appliances)',
    rate_percent: 12.0,
    type: 'gst',
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /taxes
 */
export async function getTaxes(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_TAXES];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/taxes', { params });
  return data;
}

/**
 * GET /taxes/:id
 */
export async function getTax(id) {
  if (USE_MOCK) {
    await delay(300);
    const tax = MOCK_TAXES.find((t) => t.id === Number(id));
    if (!tax) {
      const err = new Error('Tax not found');
      err.response = { status: 404, data: { detail: 'Tax not found.' } };
      throw err;
    }
    return tax;
  }
  const { data } = await apiClient.get(`/taxes/${id}`);
  return data;
}

/**
 * POST /taxes
 */
export async function createTax(payload) {
  if (USE_MOCK) {
    await delay(400);
    const tax = {
      id: nextTaxId++,
      name: payload.name,
      rate_percent: Number(payload.rate_percent),
      type: payload.type || 'gst',
    };
    MOCK_TAXES.push(tax);
    return tax;
  }
  const { data } = await apiClient.post('/taxes', payload);
  return data;
}

/**
 * PUT /taxes/:id
 */
export async function updateTax(id, payload) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_TAXES.findIndex((t) => t.id === Number(id));
    if (idx === -1) {
      const err = new Error('Tax not found');
      err.response = { status: 404, data: { detail: 'Tax not found.' } };
      throw err;
    }
    MOCK_TAXES[idx] = {
      ...MOCK_TAXES[idx],
      name: payload.name,
      rate_percent: Number(payload.rate_percent),
      type: payload.type || MOCK_TAXES[idx].type,
    };
    return MOCK_TAXES[idx];
  }
  const { data } = await apiClient.put(`/taxes/${id}`, payload);
  return data;
}

/**
 * DELETE /taxes/:id
 */
export async function deleteTax(id) {
  if (USE_MOCK) {
    await delay(300);
    const idx = MOCK_TAXES.findIndex((t) => t.id === Number(id));
    if (idx !== -1) MOCK_TAXES.splice(idx, 1);
    return { message: 'Tax deleted.' };
  }
  const { data } = await apiClient.delete(`/taxes/${id}`);
  return data;
}
