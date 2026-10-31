// ─────────────────────────────────────────────
// API Layer — Dashboard & Analytics endpoints
// ─────────────────────────────────────────────

import { apiClient, USE_MOCK } from './auth';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ────────────────────────────────────

const MOCK_SUMMARY = {
  active_subscriptions: 248,
  revenue_this_month: 1847500,
  payments_received: 1623400,
  outstanding: 224100,
  overdue_invoices: 12,
  mrr: 1847500,
  arr: 22170000,
  active_change: 5.2,
  revenue_change: 8.7,
  payments_change: 6.1,
  outstanding_change: -3.4,
  overdue_change: -14.3,
  mrr_change: 8.7,
  arr_change: 8.7,
};

const MOCK_ANALYTICS = {
  revenue_chart: [
    { month: 'May',  revenue: 1320000,  expenses: 440000 },
    { month: 'Jun',  revenue: 1485000,  expenses: 462000 },
    { month: 'Jul',  revenue: 1530000,  expenses: 478000 },
    { month: 'Aug',  revenue: 1698000,  expenses: 495000 },
    { month: 'Sep',  revenue: 1756000,  expenses: 510000 },
    { month: 'Oct',  revenue: 1847500,  expenses: 523000 },
  ],
  subscription_status: [
    { name: 'Active',    value: 248, color: '#22c55e' },
    { name: 'Paused',    value: 18,  color: '#f59e0b' },
    { name: 'Cancelled', value: 34,  color: '#ef4444' },
    { name: 'Draft',     value: 12,  color: '#94a3b8' },
    { name: 'Expired',   value: 8,   color: '#6b7280' },
  ],
  overdue_invoices: [
    { id: 'INV-1042', customer: 'TechNova Solutions',     amount: 45000,  due_date: '2026-10-14', days_overdue: 17, status: 'Overdue' },
    { id: 'INV-1038', customer: 'GreenLeaf Organics',     amount: 22500,  due_date: '2026-10-18', days_overdue: 13, status: 'Overdue' },
    { id: 'INV-1051', customer: 'Pinnacle Consulting',    amount: 67800,  due_date: '2026-10-22', days_overdue: 9,  status: 'Overdue' },
    { id: 'INV-1055', customer: 'Skyline Developers',     amount: 31200,  due_date: '2026-10-25', days_overdue: 6,  status: 'Overdue' },
    { id: 'INV-1060', customer: 'Rapid Logistics',        amount: 18900,  due_date: '2026-10-27', days_overdue: 4,  status: 'Overdue' },
    { id: 'INV-1063', customer: 'Zenith Pharmaceuticals', amount: 54200,  due_date: '2026-10-28', days_overdue: 3,  status: 'Overdue' },
  ],
};

// ── API functions ────────────────────────────────

/**
 * GET /dashboard/summary
 */
export async function getDashboardSummary(params = {}) {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_SUMMARY;
  }
  const [summaryRes, analyticsRes] = await Promise.all([
    apiClient.get('/dashboard/summary', { params }),
    apiClient.get('/analytics', { params }).catch(() => ({ data: {} })),
  ]);

  const s = summaryRes.data;
  const a = analyticsRes.data || {};

  return {
    ...s,
    active_subscriptions: s.active_subscriptions,
    revenue_this_month: s.revenue_this_month,
    payments_received: s.payments_total ?? s.payments_received ?? 0,
    outstanding: s.outstanding_amount ?? s.outstanding ?? 0,
    overdue_invoices: s.overdue_count ?? s.overdue_invoices ?? 0,
    mrr: a.mrr ?? 0,
    arr: a.arr ?? 0,
  };
}

/**
 * GET /analytics
 */
export async function getAnalytics(params = {}) {
  if (USE_MOCK) {
    await delay(700);
    return MOCK_ANALYTICS;
  }

  const [analyticsRes, summaryRes, overdueRes] = await Promise.all([
    apiClient.get('/analytics', { params }).catch(() => ({ data: {} })),
    apiClient.get('/dashboard/summary', { params }).catch(() => ({ data: {} })),
    apiClient.get('/invoices', { params: { overdue: true } }).catch(() => ({ data: [] })),
  ]);

  const a = analyticsRes.data || {};
  const s = summaryRes.data || {};
  const overdueList = Array.isArray(overdueRes.data) ? overdueRes.data : [];

  const STATUS_COLORS = {
    active: '#22c55e',
    paused: '#f59e0b',
    closed: '#ef4444',
    cancelled: '#ef4444',
    draft: '#94a3b8',
    expired: '#6b7280',
  };

  const revenue_chart = (a.monthly_revenue_last_6_months || []).map((m) => ({
    month: m.month_name || m.month,
    revenue: m.revenue,
    expenses: 0,
  }));

  const subscription_status = Object.entries(s.status_breakdown || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status.toLowerCase()] || '#3b82f6',
  }));

  const today = new Date();
  const overdue_invoices = overdueList.map((inv) => {
    const due = inv.due_date ? new Date(inv.due_date) : today;
    const diffDays = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    return {
      id: inv.number || `INV-${inv.id}`,
      customer: inv.contact?.name || `Customer #${inv.contact_id || inv.id}`,
      amount: inv.total || 0,
      due_date: inv.due_date,
      days_overdue: diffDays,
      status: 'Overdue',
    };
  });

  return {
    ...a,
    revenue_chart,
    subscription_status,
    overdue_invoices,
  };
}

