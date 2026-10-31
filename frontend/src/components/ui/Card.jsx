import clsx from 'clsx';

/**
 * White card with soft shadow.
 */
export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-100',
        'shadow-[0_1px_3px_0_rgb(0,0,0,0.08),0_1px_2px_-1px_rgb(0,0,0,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

