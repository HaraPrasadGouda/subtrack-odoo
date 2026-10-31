import { useState, useEffect, useCallback } from 'react';
import {
  Tag, Plus, Search, Pencil, Trash2, X, ChevronDown,
  AlertCircle, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  getDiscounts, createDiscount, updateDiscount, deleteDiscount,
} from '@/api/discounts';

// ── Usage Progress Bar ──────────────────────────────

function UsageProgressBar({ usedCount, usageLimit }) {
  if (usageLimit == null || usageLimit === 0) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-800">{usedCount} used</span>
          <span className="text-gray-400">Unlimited</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-400 h-1.5 rounded-full w-full opacity-40" />
        </div>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((usedCount / usageLimit) * 100));
  const isExhausted = usedCount >= usageLimit;
  const isNearLimit = percent >= 80 && !isExhausted;

  const barColor = isExhausted
    ? 'bg-red-500'
    : isNearLimit
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const badgeColor = isExhausted
    ? 'text-red-600 bg-red-50 border-red-100'
    : isNearLimit
      ? 'text-amber-600 bg-amber-50 border-amber-100'
      : 'text-gray-600 bg-gray-50 border-gray-100';

  return (
    <div className="space-y-1.5 min-w-[130px]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-800">
          {usedCount} <span className="font-normal text-gray-400">/ {usageLimit}</span>
        </span>
        <span className={clsx('text-[10px] font-bold px-1.5 py-0.2 rounded border', badgeColor)}>
          {isExhausted ? 'Exhausted' : `${percent}%`}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={clsx('h-2 rounded-full transition-all duration-300', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Discount Form Modal ─────────────────────────────

function DiscountFormModal({ discount, onClose, onSaved }) {
  const isEdit = Boolean(discount);
  const [form, setForm] = useState({
    name: discount?.name || '',
    type: discount?.type || 'percent',
    value: discount ? String(discount.value) : '',
    min_purchase: discount ? String(discount.min_purchase) : '0',
    min_qty: discount ? String(discount.min_qty) : '0',
    start_date: discount?.start_date || '',
    end_date: discount?.end_date || '',
    usage_limit: discount?.usage_limit ? String(discount.usage_limit) : '',
    applies_to: discount?.applies_to || 'subscription',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Coupon code / discount name is required';
    if (form.value === '' || Number(form.value) <= 0) {
      e.value = 'Discount value must be greater than 0';
    } else if (form.type === 'percent' && Number(form.value) > 100) {
      e.value = 'Percentage cannot exceed 100%';
    }
    if (Number(form.min_purchase) < 0) e.min_purchase = 'Cannot be negative';
    if (Number(form.min_qty) < 0) e.min_qty = 'Cannot be negative';
    if (form.usage_limit && Number(form.usage_limit) <= 0) {
      e.usage_limit = 'Usage limit must be at least 1';
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
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
        name: form.name.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_purchase: Math.round(Number(form.min_purchase) || 0),
        min_qty: Number(form.min_qty) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        applies_to: form.applies_to,
      };
      if (isEdit) {
        await updateDiscount(discount.id, payload);
        toast.success('Discount updated');
      } else {
        await createDiscount(payload);
        toast.success('Discount created');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save discount:', err);
      toast.error(err.response?.data?.detail || 'Failed to save discount');
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
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Discount' : 'New Discount / Coupon'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Set fixed or percentage discounts with rules and limits
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <Input
            label="Coupon Code / Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value.toUpperCase())}
            error={errors.name}
            placeholder="e.g. WELCOME20"
            helper="Will be converted to uppercase automatically"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Discount Type</label>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (paise)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <Input
              label={form.type === 'percent' ? 'Discount Rate (%)' : 'Amount (paise)'}
              type="number"
              min="0"
              max={form.type === 'percent' ? '100' : undefined}
              step={form.type === 'percent' ? '0.1' : '1'}
              value={form.value}
              onChange={(e) => handleChange('value', e.target.value)}
              error={errors.value}
              placeholder={form.type === 'percent' ? '20' : '50000'}
              helper={
                form.value
                  ? form.type === 'percent'
                    ? `${form.value}% off`
                    : formatINR(Number(form.value))
                  : undefined
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Purchase (paise)"
              type="number"
              min="0"
              value={form.min_purchase}
              onChange={(e) => handleChange('min_purchase', e.target.value)}
              error={errors.min_purchase}
              placeholder="0"
              helper={form.min_purchase !== '0' && form.min_purchase ? formatINR(Number(form.min_purchase)) : 'No minimum'}
            />

            <Input
              label="Min Quantity"
              type="number"
              min="0"
              value={form.min_qty}
              onChange={(e) => handleChange('min_qty', e.target.value)}
              error={errors.min_qty}
              placeholder="0"
              helper={form.min_qty === '0' || !form.min_qty ? 'No min qty' : `Min ${form.min_qty} items`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              error={errors.start_date}
            />
            <Input
              label="Valid Until (optional)"
              type="date"
              value={form.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              error={errors.end_date}
              helper="Leave blank for open-ended"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Usage Limit (optional)"
              type="number"
              min="1"
              value={form.usage_limit}
              onChange={(e) => handleChange('usage_limit', e.target.value)}
              error={errors.usage_limit}
              placeholder="e.g. 500"
              helper="Blank = unlimited redemptions"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Applies To</label>
              <div className="relative">
                <select
                  value={form.applies_to}
                  onChange={(e) => handleChange('applies_to', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="subscription">Entire Subscription</option>
                  <option value="product">Specific Product Line</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Discount'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────

function DeleteConfirmModal({ discountName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete Discount</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete discount <span className="font-semibold text-gray-700">{discountName}</span>? Future subscriptions will not be able to apply this code.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>Delete</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main DiscountsPage ───────────────────────────────

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDiscount, setEditDiscount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDiscounts({ search });
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load discounts:', err);
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  function handleEdit(item) {
    setEditDiscount(item);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditDiscount(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDiscount(deleteTarget.id);
      toast.success('Discount deleted');
      setDeleteTarget(null);
      fetchDiscounts();
    } catch (err) {
      console.error('Failed to delete discount:', err);
      toast.error('Failed to delete discount');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Discounts & Coupons</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage percentage and fixed-amount promo codes with usage limits
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Discount
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon codes or types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Discounts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Code / Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Benefit</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Min Threshold</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Validity</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide w-48">Usage Progress</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Tag size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No discounts found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? 'Try a different search term' : 'Create promo codes to boost subscription conversion'}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                          <Plus size={14} />
                          Add Discount
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                discounts.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded border border-gray-200 text-xs tracking-wider">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">
                          ({d.applies_to})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">
                        {d.type === 'percent' ? `${d.value}% OFF` : `${formatINR(d.value)} OFF`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>Min Purchase: {d.min_purchase > 0 ? formatINR(d.min_purchase) : 'None'}</p>
                        {d.min_qty > 0 && <p className="text-gray-400">Min Qty: {d.min_qty}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <Calendar size={11} className="text-gray-400" />
                          {d.start_date ? formatDate(d.start_date) : 'Immediate'}
                        </p>
                        <p className="text-gray-400">
                          to {d.end_date ? formatDate(d.end_date) : 'Ongoing'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <UsageProgressBar
                        usedCount={d.used_count || 0}
                        usageLimit={d.usage_limit}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(d)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit discount"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete discount"
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
        <DiscountFormModal
          discount={editDiscount}
          onClose={handleCloseForm}
          onSaved={fetchDiscounts}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          discountName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
