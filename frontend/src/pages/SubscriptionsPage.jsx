import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw, Plus, Search, ChevronRight, ArrowLeft,
  Calendar, CheckCircle2, Clock, FileText,
  Play, Pause, XCircle, RotateCcw, Receipt,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  getSubscriptions, getSubscription, createSubscription,
  createFromTemplate, updateSubscriptionStatus, pauseSubscription,
  renewSubscription, closeSubscription, changePlan,
  generateSubscriptionInvoice, getSubscriptionTimeline, getCustomers,
} from '@/api/subscriptions';
import { getPlans } from '@/api/plans';
import { getTemplates } from '@/api/templates';
import { getProducts } from '@/api/products';
import { getTaxes } from '@/api/taxes';

// ── Status Configuration ────────────────────────────

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
  quotation: { label: 'Quotation', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  active:    { label: 'Active',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused:    { label: 'Paused',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  closed:    { label: 'Closed',    color: 'bg-slate-100 text-slate-600 border-slate-300' },
};

const STEPPER_STAGES = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

function StatusBadge({ status }) {
  const conf = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.draft;
  return (
    <span className={clsx('inline-flex items-center text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full border', conf.color)}>
      {conf.label}
    </span>
  );
}

// ── Stepper Component ───────────────────────────────

function StatusStepper({ currentStatus }) {
  const isPaused = currentStatus === 'paused';
  const currentIndex = STEPPER_STAGES.indexOf(currentStatus);

  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-0" />
        {STEPPER_STAGES.map((stage, idx) => {
          const isDone = !isPaused && currentIndex > idx;
          const isCurrent = !isPaused && currentIndex === idx;
          const isUpcoming = !isPaused && currentIndex < idx;

          return (
            <div key={stage} className="flex flex-col items-center relative z-10">
              <div
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-200 border-2',
                  isDone && 'bg-emerald-500 border-emerald-500 text-white',
                  isCurrent && 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100',
                  isUpcoming && 'bg-white border-gray-300 text-gray-400',
                  isPaused && 'bg-amber-50 border-amber-300 text-amber-600',
                )}
              >
                {isDone ? <Check size={16} /> : idx + 1}
              </div>
              <span
                className={clsx(
                  'mt-2 text-xs font-medium capitalize',
                  isCurrent ? 'text-blue-600 font-bold' : isDone ? 'text-gray-800' : 'text-gray-400',
                )}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
      {isPaused && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
            <Pause size={12} />
            Subscription is currently PAUSED
          </span>
        </div>
      )}
    </div>
  );
}

// ── Change Plan Modal ───────────────────────────────

function ChangePlanModal({ subscription, onClose, onUpdated }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getPlans().then((data) => {
      if (!active) return;
      const list = data.plans || [];
      setPlans(list);
      if (list.length > 0) {
        const other = list.find((p) => p.id !== subscription.plan_id);
        setSelectedPlanId(String(other ? other.id : list[0].id));
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [subscription.plan_id]);

  const targetPlan = plans.find((p) => p.id === Number(selectedPlanId));
  const currentPrice = subscription.plan?.price || 0;
  const targetPrice = targetPlan?.price || 0;
  const proratedDiff = Math.max(0, targetPrice - currentPrice);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      await changePlan(subscription.id, {
        plan_id: selectedPlanId,
        plan: targetPlan,
      });
      toast.success('Subscription plan changed');
      onUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to change plan:', err);
      toast.error('Failed to update plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Change Subscription Plan</h3>
        <p className="text-xs text-gray-500 mb-4">
          Current plan: <span className="font-semibold text-gray-700">{subscription.plan?.name}</span> ({formatINR(currentPrice)}/{subscription.plan?.billing_period})
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading available plans…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Select New Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.price)} / {p.billing_period}
                  </option>
                ))}
              </select>
            </div>

            {/* Proration Summary Card */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center justify-between">
                <span>Proration Adjustment</span>
                <span>{proratedDiff > 0 ? formatINR(proratedDiff) : 'No charge (downgrade/equal)'}</span>
              </p>
              <p className="text-blue-700 text-[11px]">
                Calculated for remaining days in current billing cycle. Effective immediately.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Confirm Change
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

// ── New from Template Modal ─────────────────────────

function NewFromTemplateModal({ onClose, onCreated }) {
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Immediate');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getTemplates(), getCustomers()]).then(([tmplData, custData]) => {
      if (!active) return;
      const tmpls = Array.isArray(tmplData) ? tmplData : [];
      setTemplates(tmpls);
      if (tmpls.length > 0) setSelectedTemplateId(String(tmpls[0].id));
      setCustomers(custData || []);
      if (custData?.length > 0) setSelectedCustomerId(String(custData[0].id));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTemplateId || !selectedCustomerId) {
      toast.error('Template and Customer are required');
      return;
    }
    setCreating(true);
    try {
      const sub = await createFromTemplate(selectedTemplateId, {
        customer_id: Number(selectedCustomerId),
        start_date: startDate,
        payment_terms: paymentTerms,
      });
      toast.success(`Quotation ${sub.number} generated`);
      onCreated(sub);
      onClose();
    } catch (err) {
      console.error('Failed to create from template:', err);
      toast.error('Failed to create quotation');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">New Subscription from Template</h3>
        <p className="text-xs text-gray-500 mb-4">
          Pre-populate product lines and billing plan automatically
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading templates…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.lines?.length || 0} items)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              >
                <option value="Immediate">Immediate</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Generate Quotation
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

// ── Manual Create Subscription Modal ─────────────────

function CreateSubscriptionModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCustomers(), getPlans(), getProducts(), getTaxes()]).then(
      ([custData, planData, prodData, taxData]) => {
        if (!active) return;
        setCustomers(custData || []);
        if (custData?.length > 0) setCustomerId(String(custData[0].id));
        const pl = planData.plans || [];
        setPlans(pl);
        if (pl.length > 0) setPlanId(String(pl[0].id));
        setProducts(prodData.products || []);
        setTaxes(Array.isArray(taxData) ? taxData : []);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!customerId || !planId) {
      toast.error('Customer and Plan are required');
      return;
    }
    setSaving(true);
    try {
      const selectedPlan = plans.find((p) => p.id === Number(planId));
      const firstProduct = products[0];
      const defaultTax = taxes[0];

      const lines = firstProduct
        ? [
            {
              id: Date.now(),
              product_id: firstProduct.id,
              variant_id: null,
              qty: 1,
              unit_price: selectedPlan?.price || firstProduct.sales_price,
              tax_id: defaultTax?.id || null,
              discount_id: null,
              amount: (selectedPlan?.price || firstProduct.sales_price) * 1.18,
              product: firstProduct,
              tax: defaultTax || null,
            },
          ]
        : [];

      const created = await createSubscription({
        customer_id: customerId,
        plan_id: planId,
        start_date: startDate,
        payment_terms: paymentTerms,
        plan: selectedPlan,
        lines,
      });

      toast.success(`Draft subscription ${created.number} created`);
      onCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create subscription:', err);
      toast.error('Failed to create subscription');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">New Subscription</h3>
        <p className="text-xs text-gray-500 mb-4">Start a new draft subscription from scratch</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Billing Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatINR(p.price)}/{p.billing_period})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
            >
              <option value="Immediate">Immediate</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Draft
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Detail View Component ───────────────────────────

function SubscriptionDetailView({ subscriptionId, onBack }) {
  const [sub, setSub] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [subData, timelineData] = await Promise.all([
        getSubscription(subscriptionId),
        getSubscriptionTimeline(subscriptionId),
      ]);
      setSub(subData);
      setTimeline(timelineData || []);
    } catch (err) {
      console.error('Failed to load subscription details:', err);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleStatusTransition(nextStatus) {
    setActionLoading(true);
    try {
      await updateSubscriptionStatus(sub.id, nextStatus);
      toast.success(`Subscription moved to ${nextStatus}`);
      fetchDetail();
    } catch (err) {
      console.error('Status transition failed:', err);
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      await pauseSubscription(sub.id);
      toast.success('Subscription paused');
      fetchDetail();
    } catch (err) {
      console.error('Failed to pause:', err);
      toast.error('Failed to pause subscription');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRenew() {
    setActionLoading(true);
    try {
      await renewSubscription(sub.id);
      toast.success('Subscription renewed and active');
      fetchDetail();
    } catch (err) {
      console.error('Failed to renew:', err);
      toast.error('Failed to renew subscription');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose() {
    setActionLoading(true);
    try {
      await closeSubscription(sub.id);
      toast.success('Subscription closed');
      fetchDetail();
    } catch (err) {
      console.error('Failed to close:', err);
      toast.error('Failed to close subscription');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGenerateInvoice() {
    setActionLoading(true);
    try {
      const inv = await generateSubscriptionInvoice(sub.id);
      toast.success(`Invoice ${inv.number} generated successfully!`);
      fetchDetail();
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      toast.error('Failed to generate invoice');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Card className="p-8 text-center text-gray-400">Loading subscription details…</Card>
      </div>
    );
  }

  if (!sub) return null;

  const lines = sub.lines || [];
  const subtotal = lines.reduce((acc, l) => acc + (l.unit_price * l.qty), 0);
  const totalTax = lines.reduce((acc, l) => {
    const rate = l.tax?.rate_percent || 0;
    return acc + Math.round((l.unit_price * l.qty * rate) / 100);
  }, 0);
  const grandTotal = sub.total_amount || (subtotal + totalTax);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{sub.number}</h2>
              <StatusBadge status={sub.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Customer: <span className="font-semibold text-gray-800">{sub.customer?.name}</span> • Created {formatDate(sub.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex flex-wrap items-center gap-2">
          {sub.status === 'draft' && (
            <Button size="sm" onClick={() => handleStatusTransition('quotation')} loading={actionLoading}>
              <FileText size={14} /> Send Quotation
            </Button>
          )}

          {sub.status === 'quotation' && (
            <Button size="sm" onClick={() => handleStatusTransition('confirmed')} loading={actionLoading}>
              <CheckCircle2 size={14} /> Confirm Quotation
            </Button>
          )}

          {sub.status === 'confirmed' && (
            <Button size="sm" onClick={() => handleStatusTransition('active')} loading={actionLoading}>
              <Play size={14} /> Activate Subscription
            </Button>
          )}

          {sub.status === 'active' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setShowChangePlan(true)}>
                <RotateCcw size={14} /> Change Plan
              </Button>
              <Button size="sm" variant="secondary" onClick={handlePause} loading={actionLoading}>
                <Pause size={14} /> Pause
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClose} loading={actionLoading}>
                <XCircle size={14} /> Close
              </Button>
              <Button size="sm" onClick={handleGenerateInvoice} loading={actionLoading}>
                <Receipt size={14} /> Generate Invoice
              </Button>
            </>
          )}

          {sub.status === 'paused' && (
            <>
              <Button size="sm" onClick={handleRenew} loading={actionLoading}>
                <Play size={14} /> Resume Subscription
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClose} loading={actionLoading}>
                <XCircle size={14} /> Close
              </Button>
            </>
          )}

          {sub.status === 'closed' && (
            <Button size="sm" onClick={handleRenew} loading={actionLoading}>
              <RotateCcw size={14} /> Renew Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Card */}
      <Card className="p-4 sm:p-6">
        <StatusStepper currentStatus={sub.status} />
      </Card>

      {/* 2-Column Content: Left = Info & Lines, Right = Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Subscription Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Customer</span>
                <span className="font-semibold text-gray-800">{sub.customer?.name}</span>
                <span className="text-gray-400 block">{sub.customer?.email}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Billing Plan</span>
                <span className="font-semibold text-gray-800">{sub.plan?.name}</span>
                <span className="text-gray-500 block capitalize">{sub.plan?.billing_period} billing</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Start Date</span>
                <span className="font-semibold text-gray-800">{formatDate(sub.start_date)}</span>
                <span className="text-gray-400 block">Next: {formatDate(sub.next_billing_date)}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Payment Terms</span>
                <span className="font-semibold text-gray-800">{sub.payment_terms || 'Immediate'}</span>
              </div>
            </div>
          </Card>

          {/* Lines Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Subscription Line Items</h3>
              <span className="text-xs text-gray-400">{lines.length} items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium uppercase">Product</th>
                    <th className="text-center px-4 py-2.5 font-medium uppercase">Qty</th>
                    <th className="text-right px-4 py-2.5 font-medium uppercase">Unit Price</th>
                    <th className="text-center px-4 py-2.5 font-medium uppercase">Tax</th>
                    <th className="text-center px-4 py-2.5 font-medium uppercase">Discount</th>
                    <th className="text-right px-5 py-2.5 font-medium uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-gray-800 block">{l.product?.name || `Product #${l.product_id}`}</span>
                        {l.variant && (
                          <span className="text-[11px] text-gray-400">
                            {l.variant.attribute}: {l.variant.value}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">{l.qty}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatINR(l.unit_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {l.tax ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {l.tax.rate_percent}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.discount ? (
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {l.discount.type === 'percent' ? `${l.discount.value}%` : formatINR(l.discount.value)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">
                        {formatINR(l.amount || (l.unit_price * l.qty))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="p-5 bg-gray-50/70 border-t border-gray-100 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Tax (GST)</span>
                  <span className="font-medium text-gray-900">{formatINR(totalTax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total Recurring</span>
                  <span className="text-blue-600">{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Activity Timeline
            </h3>

            {timeline.length > 0 ? (
              <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {timeline.map((item) => (
                  <div key={item.id} className="relative">
                    <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{item.detail}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>•</span>
                        <span>{item.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No activity recorded yet.</p>
            )}
          </Card>
        </div>
      </div>

      {showChangePlan && (
        <ChangePlanModal
          subscription={sub}
          onClose={() => setShowChangePlan(false)}
          onUpdated={fetchDetail}
        />
      )}
    </div>
  );
}

// ── Main SubscriptionsPage (List View) ───────────────

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubId, setSelectedSubId] = useState(null);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscriptions({
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // If a sub is selected, show detail view
  if (selectedSubId) {
    return (
      <SubscriptionDetailView
        subscriptionId={selectedSubId}
        onBack={() => {
          setSelectedSubId(null);
          fetchList();
        }}
      />
    );
  }

  // Filtered & paginated items
  const paginatedItems = subscriptions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(subscriptions.length / PAGE_SIZE) || 1;

  const FILTER_TABS = ['all', 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Subscriptions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage subscriber lifecycle, quotations, invoicing, and plans
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => setShowTemplateModal(true)}>
            <FileText size={16} />
            New from template
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Subscription
          </Button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors',
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
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
              placeholder="Search by SUB-number, customer, or plan…"
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

      {/* Subscriptions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Number</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Billing Plan</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Next Billing</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                <th className="px-6 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <RefreshCcw size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No subscriptions found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first subscription'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="secondary" onClick={() => setShowTemplateModal(true)}>
                          From template
                        </Button>
                        <Button size="sm" onClick={() => setShowCreateModal(true)}>
                          New Subscription
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSubId(sub.id)}
                    className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-blue-600 text-xs">
                        {sub.number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sub.customer?.name || `Customer #${sub.customer_id}`}</p>
                        <p className="text-xs text-gray-400">{sub.customer?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-800">
                        <span className="font-medium">{sub.plan?.name || `Plan #${sub.plan_id}`}</span>
                        <span className="text-gray-400 block capitalize">{sub.plan?.billing_period}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {formatDate(sub.next_billing_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatINR(sub.total_amount)}
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

        {/* Pagination controls */}
        {subscriptions.length > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, subscriptions.length)} of {subscriptions.length}
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

      {/* Modals */}
      {showTemplateModal && (
        <NewFromTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onCreated={(newSub) => {
            setSelectedSubId(newSub.id);
          }}
        />
      )}

      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newSub) => {
            setSelectedSubId(newSub.id);
          }}
        />
      )}
    </div>
  );
}
