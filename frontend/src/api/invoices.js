// ─────────────────────────────────────────────
// API Layer — Invoices & Billing endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let nextInvoiceId = 1046;
let nextPaymentId = 501;

const MOCK_INVOICES = [
  {
    id: 1042,
    number: 'INV-1042',
    subscription_id: 101,
    customer_id: 1,
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
    status: 'overdue',
    created_at: '2026-10-01T00:00:00Z',
    customer: {
      id: 1,
      name: 'TechNova Solutions Pvt Ltd',
      email: 'billing@technova.io',
      phone: '+91 98765 43210',
      address: 'Plot 42, Hitec City, Hyderabad, Telangana - 500081',
      gstin: '36AAACT1234F1Z8',
    },
    lines: [
      {
        id: 1,
        invoice_id: 1042,
        product_id: 2,
        description: 'Cloud Hosting – Pro (Mumbai Region)',
        qty: 1,
        unit_price: 449900,
        discount_amount: 0,
        tax_amount: 80982,
        amount: 530882,
        product: { id: 2, name: 'Cloud Hosting – Pro' },
      },
    ],
    payments: [],
  },
  {
    id: 1043,
    number: 'INV-1043',
    subscription_id: 102,
    customer_id: 2,
    invoice_date: '2026-10-05',
    due_date: '2026-10-20',
    period_start: '2026-10-05',
    period_end: '2026-11-04',
    subtotal: 999900,
    discount_total: 50000,
    tax_total: 170982,
    cgst: 0,
    sgst: 0,
    igst: 170982,
    total: 1120882,
    amount_paid: 1120882,
    status: 'paid',
    created_at: '2026-10-05T09:30:00Z',
    customer: {
      id: 2,
      name: 'GreenLeaf Organics Ltd',
      email: 'accounts@greenleaf.in',
      phone: '+91 91234 56789',
      address: '14 MG Road, Bengaluru, Karnataka - 560001',
      gstin: '29ABCDE1234F2Z5',
    },
    lines: [
      {
        id: 2,
        invoice_id: 1043,
        product_id: 4,
        description: 'Enterprise Monthly Subscription + Email Suite',
        qty: 1,
        unit_price: 999900,
        discount_amount: 50000,
        tax_amount: 170982,
        amount: 1120882,
        product: { id: 4, name: 'Enterprise Monthly' },
      },
    ],
    payments: [
      {
        id: 501,
        invoice_id: 1043,
        method: 'upi',
        amount: 1120882,
        date: '2026-10-07',
        note: 'UPI ref #987214918234 via PhonePe',
      },
    ],
  },
  {
    id: 1044,
    number: 'INV-1044',
    subscription_id: 103,
    customer_id: 3,
    invoice_date: '2026-10-18',
    due_date: '2026-11-02',
    period_start: '2026-10-18',
    period_end: '2026-11-17',
    subtotal: 149900,
    discount_total: 0,
    tax_total: 26982,
    cgst: 13491,
    sgst: 13491,
    igst: 0,
    total: 176882,
    amount_paid: 100000,
    status: 'confirmed',
    created_at: '2026-10-18T11:00:00Z',
    customer: {
      id: 3,
      name: 'Pinnacle Consulting',
      email: 'finance@pinnacle.co',
      phone: '+91 99887 76655',
      address: '77 Sector 18, Gurugram, Haryana - 122002',
      gstin: '06AABCP9999R1Z2',
    },
    lines: [
      {
        id: 3,
        invoice_id: 1044,
        product_id: 1,
        description: 'Starter Monthly Cloud Hosting',
        qty: 1,
        unit_price: 149900,
        discount_amount: 0,
        tax_amount: 26982,
        amount: 176882,
        product: { id: 1, name: 'Cloud Hosting – Basic' },
      },
    ],
    payments: [
      {
        id: 502,
        invoice_id: 1044,
        method: 'card',
        amount: 100000,
        date: '2026-10-20',
        note: 'HDFC Corporate Card ending 4412',
      },
    ],
  },
  {
    id: 1045,
    number: 'INV-1045',
    subscription_id: 101,
    customer_id: 1,
    invoice_date: '2026-10-25',
    due_date: '2026-11-10',
    period_start: '2026-10-25',
    period_end: '2026-11-24',
    subtotal: 29900,
    discount_total: 0,
    tax_total: 5382,
    cgst: 2691,
    sgst: 2691,
    igst: 0,
    total: 35282,
    amount_paid: 0,
    status: 'draft',
    created_at: '2026-10-25T14:15:00Z',
    customer: {
      id: 1,
      name: 'TechNova Solutions Pvt Ltd',
      email: 'billing@technova.io',
      phone: '+91 98765 43210',
      address: 'Plot 42, Hitec City, Hyderabad, Telangana - 500081',
      gstin: '36AAACT1234F1Z8',
    },
    lines: [
      {
        id: 4,
        invoice_id: 1045,
        product_id: 3,
        description: 'Wildcard SSL Certificate Addon',
        qty: 1,
        unit_price: 29900,
        discount_amount: 0,
        tax_amount: 5382,
        amount: 35282,
        product: { id: 3, name: 'SSL Certificate' },
      },
    ],
    payments: [],
  },
];

// ── API functions ────────────────────────────────

/**
 * GET /invoices
 */
export async function getInvoices(params = {}) {
  if (USE_MOCK) {
    await delay();
    let items = [...MOCK_INVOICES];
    if (params.status && params.status !== 'all') {
      if (params.status === 'overdue') {
        items = items.filter((i) => i.status === 'overdue');
      } else {
        items = items.filter((i) => i.status.toLowerCase() === params.status.toLowerCase());
      }
    }
    if (params.customer_id) {
      items = items.filter((i) => i.customer_id === Number(params.customer_id));
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          i.customer?.name.toLowerCase().includes(q) ||
          i.customer?.email.toLowerCase().includes(q)
      );
    }
    return items;
  }
  const { data } = await apiClient.get('/invoices', { params });
  return data;
}

/**
 * GET /invoices/:id
 */
export async function getInvoice(id) {
  if (USE_MOCK) {
    await delay(300);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    if (!inv) {
      const err = new Error('Invoice not found');
      err.response = { status: 404, data: { detail: 'Invoice not found.' } };
      throw err;
    }
    return inv;
  }
  const { data } = await apiClient.get(`/invoices/${id}`);
  return data;
}

/**
 * POST /invoices/:id/confirm
 */
export async function confirmInvoice(id) {
  if (USE_MOCK) {
    await delay(400);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    if (inv) inv.status = 'confirmed';
    return inv;
  }
  const { data } = await apiClient.post(`/invoices/${id}/confirm`);
  return data;
}

/**
 * POST /invoices/:id/cancel
 */
export async function cancelInvoice(id) {
  if (USE_MOCK) {
    await delay(400);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    if (inv) inv.status = 'cancelled';
    return inv;
  }
  const { data } = await apiClient.post(`/invoices/${id}/cancel`);
  return data;
}

/**
 * POST /invoices/:id/send
 */
export async function sendInvoice(id) {
  if (USE_MOCK) {
    await delay(500);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    return {
      message: 'Invoice sent successfully',
      email: inv?.customer?.email || 'customer@example.com',
      invoice_number: inv?.number || 'INV-0000',
    };
  }
  const { data } = await apiClient.post(`/invoices/${id}/send`);
  return data;
}

/**
 * POST /invoices/:id/payments
 */
export async function recordPayment(id, payload) {
  if (USE_MOCK) {
    await delay(500);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    if (!inv) throw new Error('Invoice not found');
    const payment = {
      id: nextPaymentId++,
      invoice_id: inv.id,
      method: payload.method,
      amount: Number(payload.amount),
      date: payload.date || new Date().toISOString().split('T')[0],
      note: payload.note || '',
    };
    inv.payments.push(payment);
    inv.amount_paid += payment.amount;
    if (inv.amount_paid >= inv.total) {
      inv.status = 'paid';
    }
    return payment;
  }
  const formatted = {
    method: payload.method || 'bank',
    amount: Number(payload.amount),
    date: payload.date || null,
    note: payload.note || null,
  };
  const { data } = await apiClient.post(`/invoices/${id}/payments`, formatted);
  return data;
}

/**
 * GET /invoices/:id/payments
 */
export async function getInvoicePayments(id) {
  if (USE_MOCK) {
    await delay(300);
    const inv = MOCK_INVOICES.find((i) => i.id === Number(id));
    return inv?.payments || [];
  }
  const { data } = await apiClient.get(`/invoices/${id}/payments`);
  return data;
}

/**
 * GET all payments (for Payments Page)
 */
export async function getAllPayments() {
  if (USE_MOCK) {
    await delay(400);
    const all = [];
    MOCK_INVOICES.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        all.push({
          ...p,
          invoice_number: inv.number,
          customer_name: inv.customer?.name,
          customer_email: inv.customer?.email,
        });
      });
    });
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  const { data: invoices } = await apiClient.get('/invoices', { params: { limit: 500 } });
  const all = [];
  (invoices || []).forEach((inv) => {
    (inv.payments || []).forEach((p) => {
      all.push({
        id: p.id,
        invoice_id: inv.id,
        invoice_number: inv.number,
        customer_name: inv.customer?.name || `Customer #${inv.customer_id}`,
        customer_email: inv.customer?.email,
        amount: p.amount,
        method: p.method,
        date: p.date,
        note: p.note,
      });
    });
  });
  return all.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Download Invoice PDF
 */
export async function downloadInvoicePdf(id, invoiceNumber = 'invoice') {
  if (USE_MOCK) {
    await delay(300);
    // In mock mode trigger browser print view for PDF export
    window.print();
    return;
  }
  const response = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * POST /billing/run
 */
export async function runBilling() {
  if (USE_MOCK) {
    await delay(800);
    const newInvoice = {
      id: nextInvoiceId++,
      number: `INV-${nextInvoiceId}`,
      subscription_id: 101,
      customer_id: 1,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      subtotal: 449900,
      discount_total: 0,
      tax_total: 80982,
      cgst: 40491,
      sgst: 40491,
      igst: 0,
      total: 530882,
      amount_paid: 0,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      customer: {
        id: 1,
        name: 'TechNova Solutions Pvt Ltd',
        email: 'billing@technova.io',
        phone: '+91 98765 43210',
        address: 'Hyderabad, India',
        gstin: '36AAACT1234F1Z8',
      },
      lines: [
        {
          id: 5,
          invoice_id: nextInvoiceId,
          product_id: 2,
          description: 'Cloud Hosting – Pro (Automated Billing Cycle)',
          qty: 1,
          unit_price: 449900,
          discount_amount: 0,
          tax_amount: 80982,
          amount: 530882,
        },
      ],
      payments: [],
    };
    MOCK_INVOICES.unshift(newInvoice);
    return {
      created_count: 1,
      skipped_count: 3,
      invoices: [newInvoice],
    };
  }
  const { data } = await apiClient.post('/billing/run');
  return data;
}
