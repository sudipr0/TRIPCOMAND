import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-bg px-3 text-base text-fg transition-colors duration-fast ease-standard placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-fg-subtle aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
