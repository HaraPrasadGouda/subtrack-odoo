import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Search, CheckCircle2, Clock, AlertTriangle,
  Send, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  runDunning, getDunningStats, getDunningInvoices, getDunningReminders,
} from '@/api/dunning';

// ── Milestone Status Badge ──────────────────────────

function MilestoneBadge({ milestoneDay, isSent, daysOverdue }) {
  if (isSent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={11} />
        Day {milestoneDay} Sent
      </span>
    );
  }

  const isDue = daysOverdue >= milestoneDay;
  if (isDue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
        <AlertTriangle size={11} />
        Day {milestoneDay} Due
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-50 text-gray-400 border border-gray-100">
      <Clock size={11} />
      Day {milestoneDay}
    </span>
  );
}

// ── Main DunningPage ─────────────────────────────────

export default function DunningPage() {
  const [invoices, setInvoices] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'history'

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, statData, remData] = await Promise.all([
        getDunningInvoices(),
        getDunningStats(),
        getDunningReminders(),
      ]);
      setInvoices(Array.isArray(invData) ? invData : []);
      setStats(statData);
      setReminders(Array.isArray(remData) ? remData : []);
    } catch (err) {
      console.error('Failed to load dunning data:', err);
      toast.error('Failed to load dunning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRunDunning() {
    setRunning(true);
    try {
      const res = await runDunning();
      toast.success(
        `Reminders executed! Invoices checked: ${res.invoices_checked}, Reminders created: ${res.reminders_created}`,
        { duration: 5000 }
      );
      fetchData();
    } catch (err) {
      console.error('Failed to run dunning:', err);
      toast.error('Failed to execute dunning cycle');
    } finally {
      setRunning(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.number?.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Smart Dunning & Collections</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              Automated Schedule
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Automated Day 1 / Day 3 / Day 7 reminder schedules for overdue invoice recovery
          </p>
        </div>
        <Button onClick={handleRunDunning} loading={running} className="bg-red-600 hover:bg-red-700">
          <Send size={15} />
          Send reminders now
        </Button>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bell size={22} />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Total Reminders Sent</span>
            <span className="text-2xl font-bold text-gray-900">
              {stats?.total_reminders_sent ?? 0}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Invoices Reminded</span>
            <span className="text-2xl font-bold text-amber-600">
              {stats?.invoices_reminded_count ?? 0}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 block">Overdue Recovered</span>
            <span className="text-2xl font-bold text-emerald-600">
              {formatINR(stats?.overdue_amount_recovered ?? 0)}
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overdue')}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                activeTab === 'overdue'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Overdue Milestones ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Reminder Log ({reminders.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
            />
          </div>
        </div>

        {/* Overdue Milestones Table */}
        {activeTab === 'overdue' && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Days Overdue</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Amount Due</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Milestone Reminders</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Last Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={6} />
                    ))
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-400">
                        No overdue invoices found in dunning queue
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-xs text-blue-600">
                          {inv.number}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{inv.customer?.name}</p>
                            <p className="text-xs text-gray-400">{inv.customer?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {inv.days_overdue} days
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {formatINR(inv.amount_due)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <MilestoneBadge
                              milestoneDay={1}
                              isSent={inv.milestones?.day_1}
                              daysOverdue={inv.days_overdue}
                            />
                            <MilestoneBadge
                              milestoneDay={3}
                              isSent={inv.milestones?.day_3}
                              daysOverdue={inv.days_overdue}
                            />
                            <MilestoneBadge
                              milestoneDay={7}
                              isSent={inv.milestones?.day_7}
                              daysOverdue={inv.days_overdue}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {inv.last_sent ? formatDate(inv.last_sent) : 'Never sent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Historical Reminders Log */}
        {activeTab === 'history' && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">ID</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Milestone</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Channel</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Sent At</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono text-xs text-gray-400">#{r.id}</td>
                      <td className="px-6 py-3 font-mono font-bold text-xs text-blue-600">{r.invoice_number}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{r.customer_name}</td>
                      <td className="px-6 py-3">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          Day {r.day_offset}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs capitalize text-gray-600">{r.channel}</td>
                      <td className="px-6 py-3 text-xs text-gray-500">{formatDate(r.sent_at)}</td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900">{formatINR(r.amount_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
