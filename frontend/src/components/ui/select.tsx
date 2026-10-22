import { forwardRef } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn('flex h-9 w-full appearance-none rounded-md border border-border bg-bg px-3 pr-9 text-base text-fg transition-colors duration-fast hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-fg-subtle', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon size={16} weight="regular" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
    </div>
  ),
);
Select.displayName = 'Select';
