// ─────────────────────────────────────────────
// API Layer — Smart Dunning endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

let _nextReminderId = 101;

const MOCK_REMINDERS = [
  {
    id: 1,
    invoice_id: 1042,
    invoice_number: 'INV-1042',
    customer_id: 1,
    customer_name: 'TechNova Solutions Pvt Ltd',
    day_offset: 1,
    sent_at: '2026-10-16T10:00:00Z',
    channel: 'email',
    amount_due: 530882,
  },
  {
    id: 2,
    invoice_id: 1042,
    invoice_number: 'INV-1042',
    customer_id: 1,
    customer_name: 'TechNova Solutions Pvt Ltd',
    day_offset: 3,
    sent_at: '2026-10-18T10:00:00Z',
    channel: 'email',
    amount_due: 530882,
  },
  {
    id: 3,
    invoice_id: 1042,
    invoice_number: 'INV-1042',
    customer_id: 1,
    customer_name: 'TechNova Solutions Pvt Ltd',
    day_offset: 7,
    sent_at: '2026-10-22T10:00:00Z',
    channel: 'email',
    amount_due: 530882,
  },
  {
    id: 4,
    invoice_id: 1038,
    invoice_number: 'INV-1038',
    customer_id: 2,
    customer_name: 'GreenLeaf Organics Ltd',
    day_offset: 1,
    sent_at: '2026-10-19T09:30:00Z',
    channel: 'email',
    amount_due: 225000,
  },
  {
    id: 5,
    invoice_id: 1038,
    invoice_number: 'INV-1038',
    customer_id: 2,
    customer_name: 'GreenLeaf Organics Ltd',
    day_offset: 3,
    sent_at: '2026-10-21T09:30:00Z',
    channel: 'email',
    amount_due: 225000,
  },
  {
    id: 6,
    invoice_id: 1051,
    invoice_number: 'INV-1051',
    customer_id: 3,
    customer_name: 'Pinnacle Consulting',
    day_offset: 1,
    sent_at: '2026-10-23T11:15:00Z',
    channel: 'email',
    amount_due: 678000,
  },
];

const MOCK_OVERDUE_INVOICES = [
  {
    id: 1042,
    number: 'INV-1042',
    customer_id: 1,
    customer: { id: 1, name: 'TechNova Solutions Pvt Ltd', email: 'billing@technova.io' },
    due_date: '2026-10-14',
    days_overdue: 17,
    amount_due: 530882,
    milestones: { day_1: true, day_3: true, day_7: true },
    channel: 'email',
    last_sent: '2026-10-22T10:00:00Z',
  },
  {
    id: 1038,
    number: 'INV-1038',
    customer_id: 2,
    customer: { id: 2, name: 'GreenLeaf Organics Ltd', email: 'accounts@greenleaf.in' },
    due_date: '2026-10-18',
    days_overdue: 13,
    amount_due: 225000,
    milestones: { day_1: true, day_3: true, day_7: false },
    channel: 'email',
    last_sent: '2026-10-21T09:30:00Z',
  },
  {
    id: 1051,
    number: 'INV-1051',
    customer_id: 3,
    customer: { id: 3, name: 'Pinnacle Consulting', email: 'finance@pinnacle.co' },
    due_date: '2026-10-22',
    days_overdue: 9,
    amount_due: 678000,
    milestones: { day_1: true, day_3: false, day_7: false },
    channel: 'email',
    last_sent: '2026-10-23T11:15:00Z',
  },
  {
    id: 1055,
    number: 'INV-1055',
    customer_id: 4,
    customer: { id: 4, name: 'Skyline Developers', email: 'contact@skylinedev.com' },
    due_date: '2026-10-25',
    days_overdue: 6,
    amount_due: 312000,
    milestones: { day_1: false, day_3: false, day_7: false },
    channel: 'email',
    last_sent: null,
  },
];

// ── API functions ────────────────────────────────

/**
 * POST /dunning/run
 */
export async function runDunning(params = {}) {
  if (USE_MOCK) {
    await delay(700);
    // Mark pending milestone as sent
    let newlySent = 0;
    MOCK_OVERDUE_INVOICES.forEach((inv) => {
      if (!inv.milestones.day_1 && inv.days_overdue >= 1) {
        inv.milestones.day_1 = true;
        inv.last_sent = new Date().toISOString();
        newlySent++;
      } else if (!inv.milestones.day_3 && inv.days_overdue >= 3) {
        inv.milestones.day_3 = true;
        inv.last_sent = new Date().toISOString();
        newlySent++;
      } else if (!inv.milestones.day_7 && inv.days_overdue >= 7) {
        inv.milestones.day_7 = true;
        inv.last_sent = new Date().toISOString();
        newlySent++;
      }
    });

    return {
      check_date: new Date().toISOString().split('T')[0],
      invoices_checked: MOCK_OVERDUE_INVOICES.length,
      reminders_created: newlySent || 2,
      reminders: [],
    };
  }
  const { data } = await apiClient.post('/dunning/run', null, { params });
  return data;
}

/**
 * GET /dunning/reminders
 */
export async function getDunningReminders(params = {}) {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_REMINDERS;
  }
  const { data } = await apiClient.get('/dunning/reminders', { params });
  return data;
}

/**
 * GET /dunning/stats
 */
export async function getDunningStats() {
  if (USE_MOCK) {
    await delay(300);
    return {
      total_reminders_sent: 18,
      invoices_reminded_count: 8,
      overdue_amount_recovered: 845000, // ₹8,450
    };
  }
  const { data } = await apiClient.get('/dunning/stats');
  return data;
}

/**
 * Helper to fetch overdue invoices with reminder milestone states
 */
export async function getDunningInvoices() {
  if (USE_MOCK) {
    await delay(400);
    return MOCK_OVERDUE_INVOICES;
  }
  const [invoicesRes, remindersRes] = await Promise.all([
    apiClient.get('/invoices', { params: { overdue: true, limit: 100 } }),
    apiClient.get('/dunning/reminders', { params: { size: 500 } }).catch(() => ({ data: [] })),
  ]);

  const invoices = Array.isArray(invoicesRes.data) ? invoicesRes.data : [];
  const reminders = Array.isArray(remindersRes.data) ? remindersRes.data : [];

  const today = new Date();

  return invoices.map((inv) => {
    const due = inv.due_date ? new Date(inv.due_date) : today;
    const days_overdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    const amount_due = Math.max(0, (inv.total || 0) - (inv.amount_paid || 0));

    const invReminders = reminders.filter((r) => r.invoice_id === inv.id);
    const day_1 = invReminders.some((r) => r.day_offset === 1);
    const day_3 = invReminders.some((r) => r.day_offset === 3);
    const day_7 = invReminders.some((r) => r.day_offset === 7);

    const sortedReminders = [...invReminders].sort(
      (a, b) => new Date(b.sent_at) - new Date(a.sent_at)
    );
    const last_sent = sortedReminders.length > 0 ? sortedReminders[0].sent_at : null;

    return {
      ...inv,
      days_overdue,
      amount_due,
      milestones: { day_1, day_3, day_7 },
      last_sent,
    };
  });
}
