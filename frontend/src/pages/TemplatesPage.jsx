import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Pencil, Trash2, X, ChevronDown,
  AlertCircle, Layers, Calendar, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR } from '@/utils/format';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
} from '@/api/templates';
import { getPlans } from '@/api/plans';
import { getProducts } from '@/api/products';
import { createFromTemplate, getCustomers } from '@/api/subscriptions';

// ── Template Form Modal ─────────────────────────────

function TemplateFormModal({ template, onClose, onSaved }) {
  const isEdit = Boolean(template);
  const [name, setName] = useState(template?.name || '');
  const [validityDays, setValidityDays] = useState(template ? String(template.validity_days) : '30');
  const [planId, setPlanId] = useState(template?.plan_id ? String(template.plan_id) : '');
  const [lines, setLines] = useState(template?.lines || []);

  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // New line draft state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [lineQty, setLineQty] = useState('1');

  useEffect(() => {
    let active = true;
    Promise.all([getPlans(), getProducts()])
      .then(([plansData, prodsData]) => {
        if (!active) return;
        setAvailablePlans(plansData.plans || []);
        const prods = prodsData.products || [];
        setAvailableProducts(prods);
        if (prods.length > 0 && !selectedProductId) {
          setSelectedProductId(String(prods[0].id));
        }
      })
      .catch((err) => {
        console.error('Failed to load options:', err);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentProduct = availableProducts.find((p) => p.id === Number(selectedProductId));
  const currentVariants = currentProduct?.variants || [];

  function handleAddLine() {
    if (!currentProduct) return;
    const variant = currentVariants.find((v) => v.id === Number(selectedVariantId));
    const qty = Math.max(1, parseInt(lineQty, 10) || 1);

    const newLine = {
      id: Date.now(),
      product_id: currentProduct.id,
      variant_id: variant ? variant.id : null,
      qty,
      product: {
        id: currentProduct.id,
        name: currentProduct.name,
        sales_price: currentProduct.sales_price,
      },
      variant: variant || null,
    };

    setLines((prev) => [...prev, newLine]);
    setLineQty('1');
    setSelectedVariantId('');
  }

  function handleRemoveLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Template name is required';
    if (!validityDays || Number(validityDays) <= 0) e.validityDays = 'Must be at least 1 day';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const selectedPlan = availablePlans.find((p) => p.id === Number(planId));
      const payload = {
        name: name.trim(),
        validity_days: parseInt(validityDays, 10),
        plan_id: planId ? Number(planId) : null,
        plan: selectedPlan || null,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id,
          qty: l.qty,
          product: l.product,
          variant: l.variant,
        })),
      };

      if (isEdit) {
        await updateTemplate(template.id, payload);
        toast.success('Template updated');
      } else {
        await createTemplate(payload);
        toast.success('Template created');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error('Failed to save quotation template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Quotation Template' : 'New Quotation Template'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Pre-bundle billing plans and product lines for fast quoting
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <Input
            label="Template Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
            }}
            error={errors.name}
            placeholder="e.g. SaaS Starter Bundle"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Validity (Days)"
              type="number"
              min="1"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              error={errors.validityDays}
              placeholder="30"
              helper="Days before quotation expires"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Billing Plan (Optional)</label>
              <div className="relative">
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No pre-selected plan</option>
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatINR(p.price)}/{p.billing_period})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Product Lines Section */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800">Included Product Lines</label>
              <span className="text-xs text-gray-400">{lines.length} line(s) added</span>
            </div>

            {/* Line addition card */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 sm:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Product</span>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedVariantId('');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-1">
                  <span className="text-xs text-gray-500 font-medium">Variant</span>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={currentVariants.length === 0}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                  >
                    <option value="">{currentVariants.length === 0 ? 'Standard / No variant' : 'Select variant'}</option>
                    {currentVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.attribute}: {v.value} (+{formatINR(v.extra_price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2 sm:col-span-1">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-gray-500 font-medium">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddLine}
                    disabled={!selectedProductId}
                    className="shrink-0 text-xs py-1.5"
                  >
                    <Plus size={13} />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Added lines list */}
            {lines.length > 0 ? (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Product / Line</th>
                      <th className="text-center px-3 py-2 font-medium w-16">Qty</th>
                      <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lines.map((line, idx) => {
                      const basePrice = line.product?.sales_price || 0;
                      const extra = line.variant?.extra_price || 0;
                      const linePrice = basePrice + extra;
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-800">{line.product?.name || `Product #${line.product_id}`}</span>
                            {line.variant && (
                              <span className="text-gray-400 ml-1.5">
                                ({line.variant.attribute}: {line.variant.value})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 font-medium">{line.qty}</td>
                          <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatINR(linePrice)}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-gray-400 hover:text-red-500 p-1 rounded"
                            >
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No lines added yet. Add products to include in this quote bundle.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving || loadingOptions}>
              {isEdit ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Instantiate from Template Modal ─────────────────

function InstantiateModal({ template, onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Immediate');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    getCustomers().then((data) => {
      if (!active) return;
      setCustomers(data);
      if (data.length > 0) setCustomerId(String(data[0].id));
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!customerId) {
      toast.error('Select a customer');
      return;
    }
    setCreating(true);
    try {
      const created = await createFromTemplate(template.id, {
        customer_id: Number(customerId),
        start_date: startDate,
        payment_terms: paymentTerms,
      });
      toast.success(`Subscription quotation ${created.number} created`);
      onCreated(created);
      onClose();
    } catch (err) {
      console.error('Failed to create subscription from template:', err);
      toast.error('Failed to instantiate quotation');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">
          Create Quote from Template
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Using <span className="font-semibold text-gray-700">{template.name}</span>
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Customer</label>
            <div className="relative">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Terms</label>
            <div className="relative">
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Immediate">Immediate</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Quotation
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────

function DeleteConfirmModal({ templateName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete Template</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete template <span className="font-semibold text-gray-700">{templateName}</span>?
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>Delete</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main TemplatesPage ───────────────────────────────

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [instantiateTarget, setInstantiateTarget] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplates({ search });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function handleEdit(tmpl) {
    setEditTemplate(tmpl);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditTemplate(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success('Template deleted');
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Quotation Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-configured subscription templates with plans and product lines
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Template
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Templates Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Template Name</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Billing Plan</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Validity</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Included Lines</th>
                <th className="px-6 py-3 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <FileText size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No quotation templates found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? 'Try a different search term' : 'Create reusable bundles for sales staff'}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                          <Plus size={14} />
                          Add Template
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                templates.map((tmpl) => (
                  <tr key={tmpl.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{tmpl.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      {tmpl.plan ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Layers size={13} className="text-blue-500" />
                          <span className="font-medium">{tmpl.plan.name}</span>
                          <span className="text-gray-400">({formatINR(tmpl.plan.price)}/{tmpl.plan.billing_period})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-100">
                        <Calendar size={11} className="text-gray-400" />
                        {tmpl.validity_days} days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">
                        {tmpl.lines?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tmpl.lines.map((l) => (
                              <span key={l.id} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                {l.qty}x {l.product?.name || `Prod #${l.product_id}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">0 lines</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs px-2.5 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setInstantiateTarget(tmpl)}
                          title="Generate quotation"
                        >
                          Use
                          <ArrowRight size={12} />
                        </Button>
                        <button
                          onClick={() => handleEdit(tmpl)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit template"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tmpl)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete template"
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
        <TemplateFormModal
          template={editTemplate}
          onClose={handleCloseForm}
          onSaved={fetchTemplates}
        />
      )}

      {instantiateTarget && (
        <InstantiateModal
          template={instantiateTarget}
          onClose={() => setInstantiateTarget(null)}
          onCreated={() => {
            navigate('/subscriptions');
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          templateName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
