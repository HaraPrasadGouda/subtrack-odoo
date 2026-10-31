import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, ChevronRight, ArrowLeft,
  AlertTriangle, ShieldCheck, ShieldAlert,
  Layers, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  getCustomers, getCustomer, createCustomer,
} from '@/api/customers';
import { getSubscriptions } from '@/api/subscriptions';
import { getInvoices } from '@/api/invoices';

// ── Churn Risk Badge with Tooltip ────────────────────

function ChurnRiskBadge({ risk }) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!risk) return null;

  const level = risk.risk_level?.toLowerCase() || 'low';

  const badgeStyle = {
    high:   'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-100',
    low:    'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-100',
  }[level];

  const Icon = {
    high:   ShieldAlert,
    medium: AlertTriangle,
    low:    ShieldCheck,
  }[level] || ShieldCheck;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip((v) => !v);
      }}
    >
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full border cursor-pointer transition-transform hover:scale-105',
          badgeStyle
        )}
      >
        <Icon size={13} />
        {risk.risk_level} Risk ({risk.risk_score}%)
      </span>

      {/* Tooltip Popover */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-gray-200">
              <Icon size={14} className={level === 'high' ? 'text-red-400' : level === 'medium' ? 'text-amber-400' : 'text-emerald-400'} />
              Churn Risk: {risk.risk_level}
            </span>
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
              Score: {risk.risk_score}/100
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="font-semibold text-gray-400 block text-[10px] uppercase tracking-wider">
              Trigger Reasons:
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-gray-300">
              {risk.reasons?.map((r, i) => (
                <li key={i} className="leading-snug">{r}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-800 text-[10px] text-gray-400">
            <div>Overdue Invoices: <span className="font-bold text-gray-200">{risk.overdue_invoices_count || 0}</span></div>
            <div>Paused Subs: <span className="font-bold text-gray-200">{risk.paused_subscriptions_count || 0}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Customer Modal ───────────────────────────

function CreateCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Customer name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await createCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
      });
      toast.success('Customer profile created');
      onCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error('Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Add New Customer</h3>
        <p className="text-xs text-gray-500 mb-4">Register client profile with billing and GST details</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company / Customer Name"
            placeholder="e.g. Acme Technologies Pvt Ltd"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={errors.name}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="billing@acme.io"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            error={errors.email}
          />

          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />

          <Input
            label="Billing Address"
            placeholder="Plot 42, Hitec City, Hyderabad"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />

          <Input
            label="GSTIN (Optional)"
            placeholder="36AAACT1234F1Z8"
            value={form.gstin}
            onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Customer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Customer Detail View ────────────────────────────

function CustomerDetailView({ customerId, onBack }) {
  const [customer, setCustomer] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [custData, subsData, invsData] = await Promise.all([
        getCustomer(customerId),
        getSubscriptions({ customer_id: customerId }),
        getInvoices({ customer_id: customerId }),
      ]);
      setCustomer(custData);
      setSubscriptions(subsData || []);
      setInvoices(invsData || []);
    } catch (err) {
      console.error('Failed to load customer detail:', err);
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Card className="p-8 text-center text-gray-400">Loading customer details…</Card>
      </div>
    );
  }

  if (!customer) return null;

  const risk = customer.risk;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <ChurnRiskBadge risk={risk} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer ID #{customer.id} • Registered {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Profile & Churn Risk Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="p-5 lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Details</h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block">Email</span>
              <span className="font-semibold text-gray-900">{customer.email}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Phone</span>
              <span className="font-semibold text-gray-900">{customer.phone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Address</span>
              <span className="font-semibold text-gray-900">{customer.address || 'India'}</span>
            </div>
            {customer.gstin && (
              <div>
                <span className="text-gray-400 block">GSTIN</span>
                <span className="font-mono font-bold text-gray-900">{customer.gstin}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Churn Risk Analysis Card */}
        <Card className="p-5 lg:col-span-2 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Churn Risk & Retention Intelligence
            </h3>
            <span className={clsx(
              'text-xs font-bold px-2 py-0.5 rounded-full uppercase',
              risk?.risk_level === 'High' ? 'bg-red-100 text-red-700' : risk?.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            )}>
              {risk?.risk_level} Risk • {risk?.risk_score}/100
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-700">Identified Behavioral Factors:</p>
            <ul className="space-y-1 list-disc list-inside text-xs text-gray-600">
              {risk?.reasons?.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-center">
            <div className="p-2 bg-white rounded-lg border border-gray-100">
              <span className="text-[10px] text-gray-400 block">Overdue Invoices</span>
              <span className="text-base font-bold text-red-600">{risk?.overdue_invoices_count || 0}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-100">
              <span className="text-[10px] text-gray-400 block">Paused Subs</span>
              <span className="text-base font-bold text-amber-600">{risk?.paused_subscriptions_count || 0}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-100">
              <span className="text-[10px] text-gray-400 block">Expiring Subs</span>
              <span className="text-base font-bold text-blue-600">{risk?.expiring_subscriptions_count || 0}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-100">
              <span className="text-[10px] text-gray-400 block">Late Payments</span>
              <span className="text-base font-bold text-gray-700">{risk?.late_payments_count || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers size={16} className="text-blue-500" />
            Active & Past Subscriptions ({subscriptions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
              <tr>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Number</th>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Plan</th>
                <th className="text-center px-6 py-2.5 font-medium uppercase">Status</th>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Next Billing</th>
                <th className="text-right px-6 py-2.5 font-medium uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No subscriptions found for this customer</td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-mono font-bold text-blue-600">{s.number}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{s.plan?.name}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{formatDate(s.next_billing_date)}</td>
                    <td className="px-6 py-3 text-right font-bold text-gray-900">{formatINR(s.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={16} className="text-blue-500" />
            Invoices & Billing History ({invoices.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
              <tr>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Number</th>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Date</th>
                <th className="text-left px-6 py-2.5 font-medium uppercase">Due Date</th>
                <th className="text-center px-6 py-2.5 font-medium uppercase">Status</th>
                <th className="text-right px-6 py-2.5 font-medium uppercase">Total</th>
                <th className="text-right px-6 py-2.5 font-medium uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No invoices recorded for this customer</td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const bal = Math.max(0, inv.total - inv.amount_paid);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-mono font-bold text-blue-600">{inv.number}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDate(inv.invoice_date)}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDate(inv.due_date)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={clsx(
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">{formatINR(inv.total)}</td>
                      <td className="px-6 py-3 text-right font-bold text-gray-900">
                        {bal > 0 ? (
                          <span className={inv.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}>
                            {formatINR(bal)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Main CustomersPage (List View) ───────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers({ search });
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (selectedCustomerId) {
    return (
      <CustomerDetailView
        customerId={selectedCustomerId}
        onBack={() => {
          setSelectedCustomerId(null);
          fetchCustomers();
        }}
      />
    );
  }

  const filteredCustomers = customers.filter((c) => {
    if (riskFilter === 'all') return true;
    return c.risk?.risk_level?.toLowerCase() === riskFilter;
  });

  const RISK_TABS = ['all', 'high', 'medium', 'low'];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Client directory, subscription health, and churn risk monitoring
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          New Customer
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {RISK_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setRiskFilter(tab)}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors',
                riskFilter === tab
                  ? tab === 'high'
                    ? 'bg-red-600 text-white shadow-sm'
                    : tab === 'medium'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : tab === 'low'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {tab === 'all' ? 'All Customers' : `${tab} Risk`}
            </button>
          ))}
        </div>

        <Card className="p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>
      </div>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Billing Details</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Churn Risk</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Users size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No customers found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search || riskFilter !== 'all' ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <p>{c.phone || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <p className="truncate max-w-xs">{c.address || 'India'}</p>
                      {c.gstin && <p className="font-mono text-gray-400">GST: {c.gstin}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <ChurnRiskBadge risk={c.risk} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={16} className="text-gray-400 inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchCustomers}
        />
      )}
    </div>
  );
}
