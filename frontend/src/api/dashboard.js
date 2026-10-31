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
  const { data } = await apiClient.get('/dashboard/summary', { params });
  return data;
}

/**
 * GET /analytics
 */
export async function getAnalytics(params = {}) {
  if (USE_MOCK) {
    await delay(700);
    return MOCK_ANALYTICS;
  }
  const { data } = await apiClient.get('/analytics', { params });
  return data;
}

