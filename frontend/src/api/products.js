// ─────────────────────────────────────────────
// API Layer — Products & Variants endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextProductId = 7;
let nextVariantId = 20;

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Cloud Hosting – Basic',
    type: 'service',
    sales_price: 149900,
    cost_price: 45000,
    notes: 'Entry-level cloud hosting plan with 1 vCPU and 2 GB RAM.',
    created_at: '2026-06-15',
    variants: [
      { id: 1, attribute: 'Region', value: 'Mumbai', extra_price: 0 },
      { id: 2, attribute: 'Region', value: 'Singapore', extra_price: 2500 },
      { id: 3, attribute: 'Support', value: 'Standard', extra_price: 0 },
      { id: 4, attribute: 'Support', value: 'Priority 24/7', extra_price: 15000 },
    ],
  },
  {
    id: 2,
    name: 'Cloud Hosting – Pro',
    type: 'service',
    sales_price: 449900,
    cost_price: 135000,
    notes: 'Professional hosting with 4 vCPU, 16 GB RAM, 100 GB SSD.',
    created_at: '2026-06-15',
    variants: [
      { id: 5, attribute: 'Region', value: 'Mumbai', extra_price: 0 },
      { id: 6, attribute: 'Region', value: 'US East', extra_price: 5000 },
    ],
  },
  {
    id: 3,
    name: 'SSL Certificate',
    type: 'service',
    sales_price: 29900,
    cost_price: 8000,
    notes: 'Wildcard SSL certificate for all subdomains.',
    created_at: '2026-07-01',
    variants: [],
  },
  {
    id: 4,
    name: 'Email Suite – Business',
    type: 'service',
    sales_price: 19900,
    cost_price: 6000,
    notes: '50 GB mailbox per user with calendar and contacts.',
    created_at: '2026-07-10',
    variants: [
      { id: 7, attribute: 'Storage', value: '50 GB', extra_price: 0 },
      { id: 8, attribute: 'Storage', value: '100 GB', extra_price: 5000 },
    ],
  },
  {
    id: 5,
    name: 'CDN Bandwidth Pack',
    type: 'consumable',
    sales_price: 99900,
    cost_price: 30000,
    notes: '500 GB monthly bandwidth via global CDN.',
    created_at: '2026-08-05',
    variants: [],
  },
  {
    id: 6,
    name: 'Managed Database – PostgreSQL',
    type: 'service',
    sales_price: 349900,
    cost_price: 100000,
    notes: 'Fully managed PostgreSQL with daily backups and read replicas.',
    created_at: '2026-09-12',
    variants: [
      { id: 9, attribute: 'Size', value: '10 GB', extra_price: 0 },
      { id: 10, attribute: 'Size', value: '50 GB', extra_price: 15000 },
      { id: 11, attribute: 'Size', value: '200 GB', extra_price: 45000 },
    ],
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /products
 */
export async function getProducts(params = {}) {
  if (USE_MOCK) {
    await delay(500);
    let items = [...MOCK_PRODUCTS];
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
      );
    }
    return { products: items, total: items.length };
  }
  const { data } = await apiClient.get('/products', { params });
  return data;
}

/**
 * GET /products/:id
 */
export async function getProduct(id) {
  if (USE_MOCK) {
    await delay(400);
    const product = MOCK_PRODUCTS.find((p) => p.id === Number(id));
    if (!product) {
      const err = new Error('Product not found');
      err.response = { status: 404, data: { detail: 'Product not found.' } };
      throw err;
    }
    return product;
  }
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
}

/**
 * POST /products
 */
export async function createProduct(payload) {
  if (USE_MOCK) {
    await delay(500);
    const product = {
      id: nextProductId++,
      ...payload,
      sales_price: Number(payload.sales_price),
      cost_price: Number(payload.cost_price),
      created_at: new Date().toISOString().split('T')[0],
      variants: [],
    };
    MOCK_PRODUCTS.push(product);
    return product;
  }
  const { data } = await apiClient.post('/products', payload);
  return data;
}

/**
 * PUT /products/:id
 */
export async function updateProduct(id, payload) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === Number(id));
    if (idx === -1) {
      const err = new Error('Product not found');
      err.response = { status: 404, data: { detail: 'Product not found.' } };
      throw err;
    }
    MOCK_PRODUCTS[idx] = {
      ...MOCK_PRODUCTS[idx],
      ...payload,
      sales_price: Number(payload.sales_price),
      cost_price: Number(payload.cost_price),
    };
    return MOCK_PRODUCTS[idx];
  }
  const { data } = await apiClient.put(`/products/${id}`, payload);
  return data;
}

/**
 * DELETE /products/:id
 */
export async function deleteProduct(id) {
  if (USE_MOCK) {
    await delay(400);
    const idx = MOCK_PRODUCTS.findIndex((p) => p.id === Number(id));
    if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
    return { message: 'Product deleted.' };
  }
  const { data } = await apiClient.delete(`/products/${id}`);
  return data;
}

// ── Variants ────────────────────────────────────

/**
 * GET /products/:id/variants
 */
export async function getVariants(productId) {
  if (USE_MOCK) {
    await delay(300);
    const product = MOCK_PRODUCTS.find((p) => p.id === Number(productId));
    return product?.variants || [];
  }
  const { data } = await apiClient.get(`/products/${productId}/variants`);
  return data;
}

/**
 * POST /products/:id/variants
 */
export async function createVariant(productId, payload) {
  if (USE_MOCK) {
    await delay(400);
    const product = MOCK_PRODUCTS.find((p) => p.id === Number(productId));
    if (!product) {
      const err = new Error('Product not found');
      err.response = { status: 404, data: { detail: 'Product not found.' } };
      throw err;
    }
    const variant = {
      id: nextVariantId++,
      attribute: payload.attribute,
      value: payload.value,
      extra_price: Number(payload.extra_price),
    };
    product.variants.push(variant);
    return variant;
  }
  const { data } = await apiClient.post(`/products/${productId}/variants`, payload);
  return data;
}

/**
 * DELETE /products/:id/variants/:variantId
 */
export async function deleteVariant(productId, variantId) {
  if (USE_MOCK) {
    await delay(300);
    const product = MOCK_PRODUCTS.find((p) => p.id === Number(productId));
    if (product) {
      product.variants = product.variants.filter((v) => v.id !== Number(variantId));
    }
    return { message: 'Variant deleted.' };
  }
  const { data } = await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  return data;
}

