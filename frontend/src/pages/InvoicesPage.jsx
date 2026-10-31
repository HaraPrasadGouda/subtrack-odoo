import { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Play, Search, ArrowLeft, Printer, Send,
  CreditCard, CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  getInvoices, getInvoice, confirmInvoice, cancelInvoice,
  sendInvoice, recordPayment, downloadInvoicePdf, runBilling,
} from '@/api/invoices';

// ── Status Badges ───────────────────────────────────

function InvoiceStatusBadge({ status }) {
  const s = status?.toLowerCase();
  if (s === 'overdue') {
    return (
      <span className="inline-flex items-center text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
        Overdue
      </span>
    );
  }
  if (s === 'paid') {
    return (
      <span className="inline-flex items-center text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Paid
      </span>
    );
  }
  if (s === 'confirmed') {
    return (
      <span className="inline-flex items-center text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        Confirmed
      </span>
    );
  }
  if (s === 'cancelled') {
    return (
      <span className="inline-flex items-center text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
      Draft
    </span>
  );
}

// ── Record Payment Modal ────────────────────────────

function RecordPaymentModal({ invoice, onClose, onRecorded }) {
  const balance = Math.max(0, invoice.total - invoice.amount_paid);
  const [method, setMethod] = useState('upi');
  const [amount, setAmount] = useState(String(balance));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!amount || Number(amount) <= 0) e.amount = 'Amount must be greater than 0';
    if (Number(amount) > balance) e.amount = `Amount cannot exceed balance (${formatINR(balance)})`;
    if (!date) e.date = 'Payment date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await recordPayment(invoice.id, {
        method,
        amount: Number(amount),
        date,
        note: note.trim() || undefined,
      });
      toast.success('Payment recorded successfully');
      onRecorded();
      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Record Payment</h3>
        <p className="text-xs text-gray-500 mb-4">
          Invoice <span className="font-semibold text-gray-800">{invoice.number}</span> • Outstanding: <span className="font-bold text-blue-600">{formatINR(balance)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'upi', label: 'UPI' },
                { id: 'card', label: 'Card' },
                { id: 'bank', label: 'Bank' },
                { id: 'cash', label: 'Cash' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={clsx(
                    'py-2 text-xs font-semibold rounded-lg border transition-all',
                    method === m.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
            }}
            error={errors.amount}
            helper={amount ? formatINR(Number(amount)) : undefined}
          />

          <Input
            label="Payment Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Reference / Note</label>
            <input
              type="text"
              placeholder="e.g. UPI ref #987214918234 or Check #"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Printable Invoice Detail View ───────────────────

function InvoiceDetailView({ invoiceId, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleConfirm() {
    setActionLoading(true);
    try {
      await confirmInvoice(invoice.id);
      toast.success('Invoice confirmed');
      fetchDetail();
    } catch (err) {
      console.error('Failed to confirm:', err);
      toast.error('Failed to confirm invoice');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      await cancelInvoice(invoice.id);
      toast.success('Invoice cancelled');
      fetchDetail();
    } catch (err) {
      console.error('Failed to cancel:', err);
      toast.error('Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSend() {
    setActionLoading(true);
    try {
      const res = await sendInvoice(invoice.id);
      toast.success(`Invoice sent to ${res.email}`);
    } catch (err) {
      console.error('Failed to send:', err);
      toast.error('Failed to send invoice');
    } finally {
      setActionLoading(false);
    }
  }

  function handlePrint() {
    downloadInvoicePdf(invoice.id, invoice.number);
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Card className="p-8 text-center text-gray-400">Loading invoice document…</Card>
      </div>
    );
  }

  if (!invoice) return null;

  const balance = Math.max(0, invoice.total - invoice.amount_paid);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <Button variant="secondary" size="sm" onClick={onBack} className="p-2 self-start">
          <ArrowLeft size={16} /> Back to Invoices
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <Button size="sm" onClick={handleConfirm} loading={actionLoading}>
              <CheckCircle2 size={14} /> Confirm
            </Button>
          )}

          {(invoice.status === 'draft' || invoice.status === 'confirmed') && (
            <Button size="sm" variant="secondary" onClick={handleCancel} loading={actionLoading}>
              <XCircle size={14} /> Cancel
            </Button>
          )}

          <Button size="sm" variant="secondary" onClick={handleSend} loading={actionLoading}>
            <Send size={14} /> Send Email
          </Button>

          <Button size="sm" variant="secondary" onClick={handlePrint}>
            <Printer size={14} /> Print / PDF
          </Button>

          {balance > 0 && invoice.status !== 'cancelled' && (
            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
              <CreditCard size={14} /> Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Real Printable Invoice Card */}
      <Card className="p-8 sm:p-10 bg-white border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-100 pb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-lg">
                ST
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">SubTrack Cloud</h1>
            </div>
            <p className="text-xs text-gray-500">SubTrack Technologies India Pvt. Ltd.</p>
            <p className="text-xs text-gray-500">Plot 42, Hitec City, Hyderabad - 500081</p>
            <p className="text-xs text-gray-500">GSTIN: <span className="font-semibold text-gray-700">36AABCS1234F1Z9</span></p>
            <p className="text-xs text-gray-500">Email: billing@subtrack.app</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Tax Invoice</span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{invoice.number}</h2>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <p>Invoice Date: <span className="font-medium text-gray-900">{formatDate(invoice.invoice_date)}</span></p>
              <p>Due Date: <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span></p>
              <p>Period: <span className="text-gray-500">{formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}</span></p>
            </div>
            <div className="mt-3">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Customer & Billing Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-100 text-xs">
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">Billed To</span>
            <p className="text-sm font-bold text-gray-900">{invoice.customer?.name}</p>
            <p className="text-gray-600 mt-0.5">{invoice.customer?.address || 'India'}</p>
            <p className="text-gray-600">Email: {invoice.customer?.email}</p>
            <p className="text-gray-600">Phone: {invoice.customer?.phone}</p>
            {invoice.customer?.gstin && (
              <p className="text-gray-800 font-semibold mt-1">GSTIN: {invoice.customer?.gstin}</p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">Subscription Ref</span>
            <p className="text-sm font-bold text-gray-800">SUB-{String(invoice.subscription_id).padStart(4, '0')}</p>
            <p className="text-gray-500 mt-1">Automated Recurring Billing Cycle</p>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <div className="py-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 pb-2">
                <th className="text-left font-bold uppercase pb-2">Description</th>
                <th className="text-center font-bold uppercase pb-2 w-16">Qty</th>
                <th className="text-right font-bold uppercase pb-2">Unit Price</th>
                <th className="text-right font-bold uppercase pb-2">Discount</th>
                <th className="text-right font-bold uppercase pb-2">Tax</th>
                <th className="text-right font-bold uppercase pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lines?.map((line, i) => (
                <tr key={i} className="py-2.5">
                  <td className="py-3 font-medium text-gray-900">{line.description}</td>
                  <td className="py-3 text-center text-gray-600">{line.qty}</td>
                  <td className="py-3 text-right text-gray-700">{formatINR(line.unit_price)}</td>
                  <td className="py-3 text-right text-gray-500">{line.discount_amount > 0 ? formatINR(line.discount_amount) : '—'}</td>
                  <td className="py-3 text-right text-gray-700">{formatINR(line.tax_amount)}</td>
                  <td className="py-3 text-right font-bold text-gray-900">{formatINR(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST & Totals Summary */}
        <div className="border-t border-gray-200 pt-6 flex justify-end">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatINR(invoice.subtotal)}</span>
            </div>

            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount</span>
                <span>-{formatINR(invoice.discount_total)}</span>
              </div>
            )}

            {invoice.cgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>CGST (9%)</span>
                <span>{formatINR(invoice.cgst)}</span>
              </div>
            )}

            {invoice.sgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>SGST (9%)</span>
                <span>{formatINR(invoice.sgst)}</span>
              </div>
            )}

            {invoice.igst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>IGST (18%)</span>
                <span>{formatINR(invoice.igst)}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
              <span>Total Invoice Amount</span>
              <span className="text-gray-900">{formatINR(invoice.total)}</span>
            </div>

            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
              <span>Amount Paid</span>
              <span>{formatINR(invoice.amount_paid)}</span>
            </div>

            <div className="border-t border-gray-300 pt-2 flex justify-between text-base font-black text-gray-900 bg-gray-50 p-2.5 rounded-lg">
              <span>Balance Due</span>
              <span className={clsx(balance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {formatINR(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Recorded Payments Section */}
        {invoice.payments?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Payment Receipts ({invoice.payments.length})
            </h4>
            <div className="space-y-2">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">
                      {p.method}
                    </span>
                    <span className="text-gray-600">{formatDate(p.date)}</span>
                    {p.note && <span className="text-gray-400">({p.note})</span>}
                  </div>
                  <span className="font-bold text-emerald-600">{formatINR(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onRecorded={fetchDetail}
        />
      )}
    </div>
  );
}

// ── Main InvoicesPage (List View) ───────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [runningBilling, setRunningBilling] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices({
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function handleRunBilling() {
    setRunningBilling(true);
    try {
      const res = await runBilling();
      toast.success(
        `Automated billing run complete! Created: ${res.created_count}, Skipped: ${res.skipped_count}`,
        { duration: 5000 }
      );
      fetchInvoices();
    } catch (err) {
      console.error('Billing run failed:', err);
      toast.error('Billing run failed');
    } finally {
      setRunningBilling(false);
    }
  }

  // If an invoice is clicked, show its printable detail
  if (selectedInvoiceId) {
    return (
      <InvoiceDetailView
        invoiceId={selectedInvoiceId}
        onBack={() => {
          setSelectedInvoiceId(null);
          fetchInvoices();
        }}
      />
    );
  }

  const paginatedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE) || 1;

  const TABS = ['all', 'draft', 'confirmed', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Billing cycles, tax invoices, GST splits, and payment reconciliations
          </p>
        </div>
        <Button onClick={handleRunBilling} loading={runningBilling}>
          <Play size={16} />
          Run billing
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors',
                statusFilter === tab
                  ? tab === 'overdue'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <Card className="p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice # or customer…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Number</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Due Date</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Paid</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Balance</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={8} />
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Receipt size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No invoices found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Run billing to generate invoices for active subscriptions'}
                      </p>
                      <Button size="sm" className="mt-4" onClick={handleRunBilling}>
                        <Play size={14} /> Run Billing Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const bal = Math.max(0, inv.total - inv.amount_paid);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {inv.number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{inv.customer?.name}</p>
                          <p className="text-xs text-gray-400">{inv.customer?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatINR(inv.total)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                        {formatINR(inv.amount_paid)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={clsx(bal > 0 ? (inv.status === 'overdue' ? 'text-red-600' : 'text-gray-900') : 'text-gray-400')}>
                          {formatINR(bal)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight size={16} className="text-gray-400 inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {invoices.length > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, invoices.length)} of {invoices.length}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs py-1 px-2.5"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs py-1 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
