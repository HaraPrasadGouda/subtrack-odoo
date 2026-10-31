import { Calendar } from 'lucide-react';
import clsx from 'clsx';

const PRESETS = [
  { label: 'This Month',    value: 'this_month' },
  { label: 'Last Month',    value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3' },
  { label: 'Last 6 Months', value: 'last_6' },
  { label: 'This Year',     value: 'this_year' },
];

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-gray-400" />
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(preset.value)}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-100',
            value === preset.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

