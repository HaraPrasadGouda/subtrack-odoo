// ─────────────────────────────────────────────
// API Layer — Quotation Templates endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextTemplateId = 4;
let nextTemplateLineId = 10;

const MOCK_TEMPLATES = [
  {
    id: 1,
    name: 'SaaS Starter Bundle',
    validity_days: 30,
    plan_id: 1, // Starter Monthly
    plan: {
      id: 1,
      name: 'Starter Monthly',
      price: 149900,
      billing_period: 'monthly',
    },
    lines: [
      {
        id: 1,
        template_id: 1,
        product_id: 1,
        variant_id: 1,
        qty: 1,
        product: { id: 1, name: 'Cloud Hosting – Basic', sales_price: 149900, cost_price: 45000 },
        variant: { id: 1, attribute: 'Region', value: 'Mumbai', extra_price: 0 },
      },
      {
        id: 2,
        template_id: 1,
        product_id: 3,
        variant_id: null,
        qty: 1,
        product: { id: 3, name: 'SSL Certificate', sales_price: 29900, cost_price: 8000 },
        variant: null,
      },
    ],
  },
  {
    id: 2,
    name: 'Enterprise Cloud Package',
    validity_days: 60,
    plan_id: 4, // Enterprise Monthly
    plan: {
      id: 4,
      name: 'Enterprise Monthly',
      price: 999900,
      billing_period: 'monthly',
    },
    lines: [
      {
        id: 3,
        template_id: 2,
        product_id: 2,
        variant_id: 5,
        qty: 2,
        product: { id: 2, name: 'Cloud Hosting – Pro', sales_price: 449900, cost_price: 135000 },
        variant: { id: 5, attribute: 'Region', value: 'Mumbai', extra_price: 0 },
      },
      {
        id: 4,
        template_id: 2,
        product_id: 6,
        variant_id: 10,
        qty: 1,
        product: { id: 6, name: 'Managed Database – PostgreSQL', sales_price: 349900, cost_price: 100000 },
        variant: { id: 10, attribute: 'Size', value: '50 GB', extra_price: 15000 },
      },
      {
        id: 5,
        template_id: 2,
        product_id: 5,
        variant_id: null,
        qty: 3,
        product: { id: 5, name: 'CDN Bandwidth Pack', sales_price: 99900, cost_price: 30000 },
        variant: null,
      },
    ],
  },
  {
    id: 3,
    name: 'Workspace Suite Quickstart',
    validity_days: 15,
    plan_id: 1,
    plan: {
      id: 1,
      name: 'Starter Monthly',
      price: 149900,
      billing_period: 'monthly',
    },
    lines: [
      {
        id: 6,
        template_id: 3,
        product_id: 4,
        variant_id: 7,
        qty: 5,
        product: { id: 4, name: 'Email Suite – Business', sales_price: 19900, cost_price: 6000 },
        variant: { id: 7, attribute: 'Storage', value: '50 GB', extra_price: 0 },
      },
    ],
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /templates
 */
export async function getTemplates(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_TEMPLATES];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter((t) => t.name.toLowerCase().includes(q));
    }
    return items;
  }
  const { data } = await apiClient.get('/templates', { params });
  return data;
}

/**
 * GET /templates/:id
 */
export async function getTemplate(id) {
  if (USE_MOCK) {
    await delay(300);
    const tmpl = MOCK_TEMPLATES.find((t) => t.id === Number(id));
    if (!tmpl) {
      const err = new Error('Template not found');
      err.response = { status: 404, data: { detail: 'Template not found.' } };
      throw err;
    }
    return tmpl;
  }
  const { data } = await apiClient.get(`/templates/${id}`);
  return data;
}

/**
 * POST /templates
 */
export async function createTemplate(payload) {
  if (USE_MOCK) {
    await delay(400);
    const tmpl = {
      id: nextTemplateId++,
      name: payload.name,
      validity_days: Number(payload.validity_days) || 30,
      plan_id: payload.plan_id ? Number(payload.plan_id) : null,
      plan: payload.plan || null,
      lines: (payload.lines || []).map((l) => ({
        id: nextTemplateLineId++,
        template_id: nextTemplateId,
        product_id: Number(l.product_id),
        variant_id: l.variant_id ? Number(l.variant_id) : null,
        qty: Number(l.qty) || 1,
        product: l.product || null,
        variant: l.variant || null,
      })),
    };
    MOCK_TEMPLATES.push(tmpl);
    return tmpl;
  }
  const { data } = await apiClient.post('/templates', payload);
  return data;
}

/**
 * PUT /templates/:id
 */
export async function updateTemplate(id, payload) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_TEMPLATES.findIndex((t) => t.id === Number(id));
    if (idx === -1) {
      const err = new Error('Template not found');
      err.response = { status: 404, data: { detail: 'Template not found.' } };
      throw err;
    }
    MOCK_TEMPLATES[idx] = {
      ...MOCK_TEMPLATES[idx],
      name: payload.name,
      validity_days: Number(payload.validity_days) || MOCK_TEMPLATES[idx].validity_days,
      plan_id: payload.plan_id ? Number(payload.plan_id) : MOCK_TEMPLATES[idx].plan_id,
      plan: payload.plan || MOCK_TEMPLATES[idx].plan,
      lines: payload.lines || MOCK_TEMPLATES[idx].lines,
    };
    return MOCK_TEMPLATES[idx];
  }
  const { data } = await apiClient.put(`/templates/${id}`, payload);
  return data;
}

/**
 * DELETE /templates/:id
 */
export async function deleteTemplate(id) {
  if (USE_MOCK) {
    await delay(300);
    const idx = MOCK_TEMPLATES.findIndex((t) => t.id === Number(id));
    if (idx !== -1) MOCK_TEMPLATES.splice(idx, 1);
    return { message: 'Template deleted.' };
  }
  const { data } = await apiClient.delete(`/templates/${id}`);
  return data;
}
