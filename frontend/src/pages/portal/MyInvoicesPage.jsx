import { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Download, CreditCard, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import { getPortalInvoices, payPortalInvoice } from '@/api/portal';
import { downloadInvoicePdf } from '@/api/invoices';

// ── Pay Now Modal ───────────────────────────────────

function PayNowModal({ invoice, onClose, onPaid }) {
  const balance = Math.max(0, invoice.total - invoice.amount_paid);
  const [method, setMethod] = useState('upi');
  const [amount, setAmount] = useState(String(balance));
  const [paying, setPaying] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      await payPortalInvoice(invoice.id, {
        method,
        amount: Number(amount) || balance,
        note: `Customer portal payment via ${method.toUpperCase()}`,
      });
      toast.success(`Payment of ${formatINR(Number(amount) || balance)} successful!`);
      onPaid();
      onClose();
    } catch (err) {
      console.error('Payment failed:', err);
      toast.error('Payment processing failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-sm p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 className="text-base font-bold text-gray-900">Pay Invoice</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handlePay} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
            <div className="flex justify-between">
              <span>Invoice</span>
              <span className="font-mono font-bold">{invoice.number}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-blue-950 pt-1 border-t border-blue-200">
              <span>Outstanding Balance</span>
              <span>{formatINR(balance)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Choose Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {['upi', 'card', 'bank', 'cash'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={clsx(
                    'py-2 text-xs font-bold uppercase rounded-lg border transition-all',
                    method === m
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Payment Amount (paise)"
            type="number"
            min="1"
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            helper={amount ? formatINR(Number(amount)) : undefined}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={paying}>
              Pay Now
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Main MyInvoicesPage ──────────────────────────────

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPortalInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load portal invoices:', err);
      toast.error('Failed to load your invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function handleDownload(inv) {
    downloadInvoicePdf(inv.id, inv.number);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Invoices</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          View billing history, download tax invoice receipts, and pay online
        </p>
      </div>

      {/* Invoices Table Card */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Billing Period</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Due Date</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Balance</th>
                <th className="px-6 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Receipt size={32} className="mx-auto text-gray-300 mb-2" />
                    No invoices recorded for your account.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const bal = Math.max(0, inv.total - inv.amount_paid);
                  const isPaid = inv.status === 'paid' || bal === 0;

                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-blue-600">
                        {inv.number}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {formatDate(inv.period_start)} to {formatDate(inv.period_end)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx(
                          'text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border',
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.status === 'overdue'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}>
                          {isPaid ? 'Paid' : inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatINR(inv.total)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={bal > 0 ? (inv.status === 'overdue' ? 'text-red-600' : 'text-gray-900') : 'text-emerald-600'}>
                          {bal > 0 ? formatINR(bal) : 'Settled'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => setPayTarget(inv)}
                              className="text-xs py-1 px-2.5"
                            >
                              <CreditCard size={13} /> Pay now
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(inv)}
                            className="text-xs py-1 px-2 text-gray-600 hover:text-gray-900"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {payTarget && (
        <PayNowModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={fetchInvoices}
        />
      )}
    </div>
  );
}
