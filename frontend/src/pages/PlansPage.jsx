import { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Search, Pencil, Trash2, X, ChevronDown,
  AlertCircle, Calendar, Clock, Check, Pause, RefreshCcw, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/api/plans';

// ── Toggle component ─────────────────────────────

function Toggle({ label, checked, onChange, helpText }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={clsx(
          'w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-200 group-hover:bg-gray-300',
        )} />
        <div className={clsx(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked && 'translate-x-4',
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {helpText && <p className="text-xs text-gray-400 mt-0.5">{helpText}</p>}
      </div>
    </label>
  );
}

// ── Plan Form Modal ──────────────────────────────

function PlanFormModal({ plan, onClose, onSaved }) {
  const isEdit = Boolean(plan);
  const [form, setForm] = useState({
    name: plan?.name || '',
    price: plan ? String(plan.price) : '',
    billing_period: plan?.billing_period || 'monthly',
    min_qty: plan ? String(plan.min_qty) : '1',
    start_date: plan?.start_date || '',
    end_date: plan?.end_date || '',
    auto_close: plan?.auto_close ?? false,
    closable: plan?.closable ?? true,
    pausable: plan?.pausable ?? true,
    renewable: plan?.renewable ?? true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Plan name is required';
    if (form.price === '' || Number(form.price) < 0) e.price = 'Enter a valid price';
    if (!form.min_qty || Number(form.min_qty) < 1) e.min_qty = 'Minimum 1';
    if (!form.start_date) e.start_date = 'Start date is required';
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = 'End date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Math.round(Number(form.price)),
        min_qty: Number(form.min_qty),
        end_date: form.end_date || null,
      };
      if (isEdit) {
        await updatePlan(plan.id, payload);
        toast.success('Plan updated');
      } else {
        await createPlan(payload);
        toast.success('Plan created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Plan' : 'New Plan'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <Input
            label="Plan Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Professional Monthly"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (paise)"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              error={errors.price}
              placeholder="449900"
              helper={form.price !== '' ? formatINR(Number(form.price)) : undefined}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Billing Period</label>
              <div className="relative">
                <select
                  value={form.billing_period}
                  onChange={(e) => handleChange('billing_period', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Input
            label="Minimum Quantity"
            type="number"
            min="1"
            value={form.min_qty}
            onChange={(e) => handleChange('min_qty', e.target.value)}
            error={errors.min_qty}
            placeholder="1"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              error={errors.start_date}
            />
            <Input
              label="End Date (optional)"
              type="date"
              value={form.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              error={errors.end_date}
              helper="Leave blank for no end date"
            />
          </div>

          {/* Toggles */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Options</p>
            <Toggle
              label="Auto Close"
              checked={form.auto_close}
              onChange={(v) => handleChange('auto_close', v)}
              helpText="Automatically close subscription at end of billing period"
            />
            <Toggle
              label="Closable"
              checked={form.closable}
              onChange={(v) => handleChange('closable', v)}
              helpText="Allow customer or staff to manually close"
            />
            <Toggle
              label="Pausable"
              checked={form.pausable}
              onChange={(v) => handleChange('pausable', v)}
              helpText="Allow pausing and resuming the subscription"
            />
            <Toggle
              label="Renewable"
              checked={form.renewable}
              onChange={(v) => handleChange('renewable', v)}
              helpText="Allow renewal after expiry or closure"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────

function DeleteConfirmModal({ planName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete Plan</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-semibold text-gray-700">{planName}</span>? Active subscriptions using this plan may be affected.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>Delete</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Period Badge ─────────────────────────────────────

function PeriodBadge({ period }) {
  const styles = {
    daily: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    weekly: 'bg-purple-50 text-purple-700 border-purple-100',
    monthly: 'bg-blue-50 text-blue-700 border-blue-100',
    yearly: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  const icons = {
    daily: Clock,
    weekly: Calendar,
    monthly: Calendar,
    yearly: Calendar,
  };
  const Icon = icons[period] || Calendar;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', styles[period] || 'bg-gray-50 text-gray-600 border-gray-100')}>
      <Icon size={10} />
      {period.charAt(0).toUpperCase() + period.slice(1)}
    </span>
  );
}

// ── Feature Pill ─────────────────────────────────────

function FeaturePill({ label, active, icon: Icon }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded',
        active
          ? 'bg-green-50 text-green-600'
          : 'bg-gray-50 text-gray-400 line-through',
      )}
      title={active ? `${label} enabled` : `${label} disabled`}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

// ── Main PlansPage ───────────────────────────────────

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlans({ search });
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function handleEdit(plan) {
    setEditPlan(plan);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditPlan(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      toast.success('Plan deleted');
      setDeleteTarget(null);
      fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan:', err);
      toast.error('Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Plans</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure billing plans with pricing, periods and options
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Plan
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plans…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Plans table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Plan</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Price</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Period</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Min Qty</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Dates</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Options</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Layers size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No plans found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? 'Try a different search term' : 'Create your first billing plan'}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                          <Plus size={14} />
                          Add Plan
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{plan.name}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {plan.price === 0 ? 'Free' : formatINR(plan.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PeriodBadge period={plan.billing_period} />
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">
                      {plan.min_qty}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>From: {formatDate(plan.start_date)}</p>
                        <p>To: {plan.end_date ? formatDate(plan.end_date) : '∞ Open-ended'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <FeaturePill label="Auto close" active={plan.auto_close} icon={Ban} />
                        <FeaturePill label="Closable" active={plan.closable} icon={Check} />
                        <FeaturePill label="Pausable" active={plan.pausable} icon={Pause} />
                        <FeaturePill label="Renewable" active={plan.renewable} icon={RefreshCcw} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit plan"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(plan)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {showForm && (
        <PlanFormModal
          plan={editPlan}
          onClose={handleCloseForm}
          onSaved={fetchPlans}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          planName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
