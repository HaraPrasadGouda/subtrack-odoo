import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, Pencil, Trash2, X, ChevronDown,
  AlertCircle, BoxSelect,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { formatINR } from '@/utils/format';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getVariants, createVariant, deleteVariant,
} from '@/api/products';

// ── Product Form Modal ──────────────────────────────

function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name || '',
    type: product?.type || 'service',
    sales_price: product ? String(product.sales_price) : '',
    cost_price: product ? String(product.cost_price) : '',
    notes: product?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.sales_price || Number(form.sales_price) < 0) e.sales_price = 'Enter a valid sales price';
    if (!form.cost_price || Number(form.cost_price) < 0) e.cost_price = 'Enter a valid cost price';
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
        sales_price: Math.round(Number(form.sales_price)),
        cost_price: Math.round(Number(form.cost_price)),
      };
      if (isEdit) {
        await updateProduct(product.id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save product');
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
          <h3 className="text-base font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'New Product'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="e.g. Cloud Hosting – Basic"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 appearance-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="service">Service</option>
                <option value="consumable">Consumable</option>
                <option value="physical">Physical</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sales Price (paise)"
              type="number"
              min="0"
              value={form.sales_price}
              onChange={(e) => handleChange('sales_price', e.target.value)}
              error={errors.sales_price}
              placeholder="149900"
              helper={form.sales_price ? formatINR(Number(form.sales_price)) : undefined}
            />
            <Input
              label="Cost Price (paise)"
              type="number"
              min="0"
              value={form.cost_price}
              onChange={(e) => handleChange('cost_price', e.target.value)}
              error={errors.cost_price}
              placeholder="45000"
              helper={form.cost_price ? formatINR(Number(form.cost_price)) : undefined}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Optional description or notes…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Variants Panel ──────────────────────────────────

function VariantsPanel({ product, onClose }) {
  const [variants, setVariants] = useState(product.variants || []);
  const [newVariant, setNewVariant] = useState({ attribute: '', value: '', extra_price: '' });
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    getVariants(product.id)
      .then((data) => {
        if (active && Array.isArray(data)) {
          setVariants(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load variants:', err);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  async function handleAdd(e) {
    e.preventDefault();
    const errs = {};
    if (!newVariant.attribute.trim()) errs.attribute = 'Required';
    if (!newVariant.value.trim()) errs.value = 'Required';
    if (newVariant.extra_price === '' || Number(newVariant.extra_price) < 0) errs.extra_price = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setAdding(true);
    try {
      const created = await createVariant(product.id, {
        attribute: newVariant.attribute,
        value: newVariant.value,
        extra_price: Math.round(Number(newVariant.extra_price)),
      });
      setVariants((prev) => [...prev, created]);
      setNewVariant({ attribute: '', value: '', extra_price: '' });
      toast.success('Variant added');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add variant');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(variantId) {
    try {
      await deleteVariant(product.id, variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      toast.success('Variant removed');
    } catch (err) {
      console.error('Failed to delete variant:', err);
      toast.error('Failed to delete variant');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Variants — {product.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Variants table */}
          {variants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Attribute</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Value</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Extra Price</th>
                    <th className="px-6 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-gray-900 font-medium">{v.attribute}</td>
                      <td className="px-6 py-3 text-gray-600">{v.value}</td>
                      <td className="px-6 py-3 text-right text-gray-900">{formatINR(v.extra_price)}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                          title="Remove variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                <BoxSelect size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No variants yet</p>
              <p className="text-xs text-gray-300 mt-1">Add attributes like Region, Storage, or Support tier</p>
            </div>
          )}
        </div>

        {/* Add variant form */}
        <form
          onSubmit={handleAdd}
          className="shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50/50"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Variant</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
            <Input
              placeholder="Attribute"
              value={newVariant.attribute}
              onChange={(e) => {
                setNewVariant((p) => ({ ...p, attribute: e.target.value }));
                if (errors.attribute) setErrors((p) => ({ ...p, attribute: null }));
              }}
              error={errors.attribute}
            />
            <Input
              placeholder="Value"
              value={newVariant.value}
              onChange={(e) => {
                setNewVariant((p) => ({ ...p, value: e.target.value }));
                if (errors.value) setErrors((p) => ({ ...p, value: null }));
              }}
              error={errors.value}
            />
            <Input
              placeholder="Extra (paise)"
              type="number"
              min="0"
              value={newVariant.extra_price}
              onChange={(e) => {
                setNewVariant((p) => ({ ...p, extra_price: e.target.value }));
                if (errors.extra_price) setErrors((p) => ({ ...p, extra_price: null }));
              }}
              error={errors.extra_price}
            />
            <Button type="submit" loading={adding} className="mt-0 sm:mt-0">
              <Plus size={14} />
              Add
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────

function DeleteConfirmModal({ productName, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Delete Product</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-semibold text-gray-700">{productName}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting}>Delete</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Type Badge ──────────────────────────────────────

function TypeBadge({ type }) {
  const styles = {
    service: 'bg-blue-50 text-blue-700 border-blue-100',
    consumable: 'bg-amber-50 text-amber-700 border-amber-100',
    physical: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return (
    <span className={clsx('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border', styles[type] || 'bg-gray-50 text-gray-600 border-gray-100')}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

// ── Main ProductsPage ───────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [variantsProduct, setVariantsProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProducts({ search });
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleEdit(product) {
    setEditProduct(product);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditProduct(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your product catalog and variants
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New Product
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Products table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Product</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Sales Price</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cost Price</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Variants</th>
                <th className="px-6 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                        <Package size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No products found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? 'Try a different search term' : 'Create your first product to get started'}
                      </p>
                      {!search && (
                        <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                          <Plus size={14} />
                          Add Product
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{product.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge type={product.type} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatINR(product.sales_price)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {formatINR(product.cost_price)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setVariantsProduct(product)}
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                          product.variants?.length > 0
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                        )}
                      >
                        <BoxSelect size={12} />
                        {product.variants?.length || 0}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit product"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete product"
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
        <ProductFormModal
          product={editProduct}
          onClose={handleCloseForm}
          onSaved={fetchProducts}
        />
      )}

      {variantsProduct && (
        <VariantsPanel
          product={variantsProduct}
          onClose={() => {
            setVariantsProduct(null);
            fetchProducts();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          productName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
