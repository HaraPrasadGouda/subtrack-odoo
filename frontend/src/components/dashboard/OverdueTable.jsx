import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { formatINR, formatDate } from '@/utils/format';
import { TableRowSkeleton } from '@/components/ui/Skeleton';

function DaysOverdueBadge({ days }) {
  const color =
    days >= 14 ? 'bg-red-100 text-red-700' :
    days >= 7  ? 'bg-orange-100 text-orange-700' :
                 'bg-amber-100 text-amber-700';
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {days}d overdue
    </span>
  );
}

export default function OverdueTable({ invoices, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="skeleton h-4 w-40 rounded" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={5} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-3">
          <AlertTriangle size={20} className="text-green-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">No overdue invoices</p>
        <p className="text-xs text-gray-400 mt-1">All invoices are paid on time. Great job!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" />
          <p className="text-sm font-semibold text-gray-800">Overdue Invoices</p>
        </div>
        <span className="text-xs text-gray-400">{invoices.length} invoice{invoices.length > 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50/60">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium text-right">Amount</th>
              <th className="px-5 py-3 font-medium">Due Date</th>
              <th className="px-5 py-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-medium text-blue-600">{inv.id}</td>
                <td className="px-5 py-3 text-gray-700">{typeof inv.customer === 'object' ? inv.customer?.name : inv.customer}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatINR(inv.amount)}</td>
                <td className="px-5 py-3 text-gray-500">{formatDate(inv.due_date)}</td>
                <td className="px-5 py-3 text-center">
                  <DaysOverdueBadge days={inv.days_overdue} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

