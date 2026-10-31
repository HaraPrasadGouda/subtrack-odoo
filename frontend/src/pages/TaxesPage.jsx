import { useState, useEffect, useCallback } from 'react';
import {
  Percent, Plus, Search, Pencil, Trash2, X, ChevronDown,
  AlertCircle, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { getTaxes, createTax, updateTax, deleteTax } from '@/api/taxes';

// ── Common GST Presets ─────────────────────────────

const PRESETS = [
  { name: 'GST 18% (Standard SaaS)', rate_percent: 18, type: 'gst' },
  { name: 'CGST 9% (Intra-state Central)', rate_percent: 9, type: 'gst' },
  { name: 'SGST 9% (Intra-state State)', rate_percent: 9, type: 'gst' },
  { name: 'IGST 18% (Inter-state Integrated)', rate_percent: 18, type: 'gst' },
  { name: 'GST 12% (Telecom / Hardware)', rate_percent: 12, type: 'gst' },
  { name: 'GST 5% (Concessional)', rate_percent: 5, type: 'gst' },
  { name: 'Zero Tax (Export / Exempt)', rate_percent: 0, type: 'gst' },
];

// ── Tax Form Modal ─────────────────────────────────

function TaxFormModal({ tax, onClose, onSaved }) {
  const isEdit = Boolean(tax);
  const [form, setForm] = useState({
    name: tax?.name || '',
    rate_percent: tax ? String(tax.rate_percent) : '',
    type: tax?.type || 'gst',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Tax name is required';
    if (form.rate_percent === '' || isNaN(form.rate_percent)) {
      e.rate_percent = 'Rate percentage is required';
    } else {
      const num = Number(form.rate_percent);
      if (num < 0 || num > 100) {
        e.rate_percent = 'Rate must be between 0% and 100%';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function applyPreset(preset) {
    setForm({
      name: preset.name,
      rate_percent: String(preset.rate_percent),
      type: preset.type,
    });
    setErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        rate_percent: parseFloat(Number(form.rate_percent).toFixed(2)),
        type: form.type,
      };
      if (isEdit) {
        await updateTax(tax.id, payload);
        toast.success('Tax rule updated');
      } else {
        await createTax(payload);
        toast.success('Tax rule created');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save tax:', err);
      toast.error(err.response?.data?.detail || 'Failed to save tax rule');
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
      <Card className="relative z-10 w-full max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Tax Rule' : 'New Tax Rule'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure GST or other applicable tax rates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets (only for new) */}
        {!isEdit && (
          <div className="px-6 pt-4 pb-1 border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Sparkles size={13} className="text-blue-500" />
              Quick Presets
            </div>
            <div className="flex flex-wrap gap-1.5 pb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-xs px-2.5 py-1 rounded-md border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Tax Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. GST 18% (Standard SaaS)"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.rate_percent}
              onChange={(e) => handleChange('rate_percent', e.target.value)}
              error={errors.rate_percent}
              placeholder="18"
              helper={form.rate_percent ? `${form.rate_percent}% applied on subtotal` : undefined}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gst">GST (Goods & Services Tax)</option>
                  <option value="other">Other / Custom</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Tax Rule'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────

function DeleteConfirmModal({ taxName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete Tax Rule</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-semibold text-gray-700">{taxName}</span>? Subscriptions or invoices using this tax rule may be affected.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>Delete</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main TaxesPage ───────────────────────────────────

export default function TaxesPage() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTax, setEditTax] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTaxes({ search });
      setTaxes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load taxes:', err);
      toast.error('Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  function handleEdit(tax) {
    setEditTax(tax);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditTax(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTax(deleteTarget.id);
      toast.success('Tax rule deleted');
      setDeleteTarget(null);
      fetchTaxes();
    } catch (err) {
      console.error('Failed to delete tax:', err);
      toast.error('Failed to delete tax rule');
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
            <h2 className="text-lg font-bold text-gray-900">Taxes</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure GST and sales tax rates for subscription invoicing
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Tax Rule
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search taxes by name or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Taxes table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Tax Name</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Rate</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={4} />
                ))
              ) : taxes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Percent size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No tax rules found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? 'Try a different search term' : 'Add your first GST or sales tax rate'}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                          <Plus size={14} />
                          Add Tax Rule
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                taxes.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{t.name}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center text-sm font-bold text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-md border border-gray-100">
                        {t.rate_percent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        'text-xs font-semibold uppercase px-2 py-0.5 rounded-full border',
                        t.type === 'gst'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit tax"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete tax"
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
        <TaxFormModal
          tax={editTax}
          onClose={handleCloseForm}
          onSaved={fetchTaxes}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          taxName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
