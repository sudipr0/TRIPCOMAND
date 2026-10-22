import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-20 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-base text-fg transition-colors duration-fast ease-standard placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-fg-subtle aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
