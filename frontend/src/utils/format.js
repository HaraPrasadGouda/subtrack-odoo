/**
 * Format a number as Indian Rupee: ₹1,23,456
 */
export function formatINR(amount, decimals = 0) {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format compactly: ₹18.5L, ₹2.2Cr
 */
export function formatINRCompact(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3)  return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return formatINR(amount);
}

/**
 * Format a percentage change with + or - sign.
 */
export function formatChange(value) {
  if (value == null || isNaN(value)) return '0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format a date string: 14 Oct 2026
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

