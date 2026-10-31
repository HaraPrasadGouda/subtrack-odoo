import { Construction } from 'lucide-react';

/**
 * Generic "Coming soon" placeholder for unimplemented pages.
 * Each page imports this and provides its title + description.
 */
export default function PlaceholderPage({ title, description, icon: Icon = Construction }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
        <Icon size={28} className="text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <p className="mt-2 text-sm text-gray-400 max-w-sm">
        {description ?? 'This page is under construction and will be available in the next iteration.'}
      </p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Coming soon
      </span>
    </div>
  );
}

