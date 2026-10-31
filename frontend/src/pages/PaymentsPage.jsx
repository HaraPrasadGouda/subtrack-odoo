import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import { getAllPayments } from '@/api/invoices';

function MethodBadge({ method }) {
  const m = method?.toLowerCase();
  const styles = {
    upi:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    card: 'bg-blue-50 text-blue-700 border-blue-200',
    bank: 'bg-purple-50 text-purple-700 border-purple-200',
    cash: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={clsx('inline-flex items-center text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border', styles[m] || 'bg-gray-50 text-gray-700 border-gray-200')}>
      {method}
    </span>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPayments();
      let list = Array.isArray(data) ? data : [];
      if (methodFilter !== 'all') {
        list = list.filter((p) => p.method?.toLowerCase() === methodFilter);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.invoice_number?.toLowerCase().includes(q) ||
            p.customer_name?.toLowerCase().includes(q) ||
            p.note?.toLowerCase().includes(q)
        );
      }
      setPayments(list);
    } catch (err) {
      console.error('Failed to load payments:', err);
      toast.error('Failed to load payment transactions');
    } finally {
      setLoading(false);
    }
  }, [search, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const METHODS = ['all', 'upi', 'card', 'bank', 'cash'];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Payments</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          History of all recorded invoice settlements and collections
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-full uppercase transition-colors',
                methodFilter === m
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <Card className="p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice # or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Receipt ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Invoice</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Method</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Reference / Note</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <CreditCard size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No payment receipts found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Payments recorded on confirmed invoices will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      REC-{String(p.id).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 text-xs">
                      {p.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{p.customer_name || 'Customer'}</p>
                        <p className="text-xs text-gray-400">{p.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <MethodBadge method={p.method} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                      {p.note || '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
