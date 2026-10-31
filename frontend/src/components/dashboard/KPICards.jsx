import clsx from 'clsx';
import {
  TrendingUp, TrendingDown, Activity, IndianRupee,
  CreditCard, AlertTriangle, BarChart3, RefreshCcw,
} from 'lucide-react';
import { formatINR, formatINRCompact, formatChange } from '@/utils/format';
import { KPICardSkeleton } from '@/components/ui/Skeleton';

const ICON_MAP = {
  active_subscriptions: RefreshCcw,
  revenue_this_month:   IndianRupee,
  payments_received:    CreditCard,
  outstanding:          BarChart3,
  overdue_invoices:     AlertTriangle,
  mrr:                  Activity,
  arr:                  TrendingUp,
};

const LABEL_MAP = {
  active_subscriptions: 'Active Subscriptions',
  revenue_this_month:   'Revenue This Month',
  payments_received:    'Payments Received',
  outstanding:          'Outstanding',
  overdue_invoices:     'Overdue Invoices',
  mrr:                  'MRR',
  arr:                  'ARR',
};

function formatValue(key, val) {
  if (key === 'active_subscriptions' || key === 'overdue_invoices') return val.toLocaleString('en-IN');
  if (key === 'arr') return formatINRCompact(val);
  return formatINR(val);
}

export default function KPICards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
    );
  }
  if (!summary) return null;

  const cards = [
    'active_subscriptions',
    'revenue_this_month',
    'payments_received',
    'outstanding',
    'overdue_invoices',
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((key) => {
        const change = summary[key + '_change'];
        const isPositive = change > 0;
        const Icon = ICON_MAP[key];
        const isGood = (key === 'outstanding' || key === 'overdue_invoices') ? !isPositive : isPositive;

        return (
          <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {LABEL_MAP[key]}
              </p>
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                key === 'overdue_invoices' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500',
              )}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {formatValue(key, summary[key])}
            </p>
            {change != null && (
              <div className="flex items-center gap-1 mt-2">
                {isGood ? (
                  <TrendingUp size={12} className="text-green-500" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span className={clsx('text-xs font-medium', isGood ? 'text-green-600' : 'text-red-600')}>
                  {formatChange(change)}
                </span>
                <span className="text-xs text-gray-400 ml-0.5">vs last month</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MRRARRCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
    );
  }
  if (!summary) return null;

  const items = [
    { key: 'mrr', label: 'Monthly Recurring Revenue (MRR)', color: 'bg-indigo-50 text-indigo-500' },
    { key: 'arr', label: 'Annual Recurring Revenue (ARR)',  color: 'bg-emerald-50 text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(({ key, label, color }) => {
        const Icon = ICON_MAP[key];
        const change = summary[key + '_change'];
        const isPositive = change > 0;
        return (
          <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                <Icon size={18} />
              </div>
              <p className="text-sm font-medium text-gray-600">{label}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {key === 'arr' ? formatINRCompact(summary[key]) : formatINR(summary[key])}
            </p>
            {change != null && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp size={12} className="text-green-500" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span className={clsx('text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                  {formatChange(change)}
                </span>
                <span className="text-xs text-gray-400 ml-0.5">vs last month</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
