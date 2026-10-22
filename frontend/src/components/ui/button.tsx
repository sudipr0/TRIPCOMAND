import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover focus-visible:border-accent',
  secondary:
    'border border-border bg-bg-subtle text-fg hover:border-border-strong hover:bg-bg-muted focus-visible:border-accent',
  ghost:
    'border border-transparent bg-transparent text-fg-muted hover:bg-bg-muted hover:text-fg focus-visible:border-accent',
  danger:
    'bg-danger text-accent-fg hover:bg-danger/90 focus-visible:border-danger',
  link:
    'border border-transparent bg-transparent px-0 text-accent hover:text-accent-hover hover:underline focus-visible:border-accent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-2 px-3 text-sm [&>svg]:size-3.5',
  md: 'h-9 gap-2 px-4 text-sm [&>svg]:size-4',
  lg: 'h-10 gap-2 px-5 text-base [&>svg]:size-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-fast ease-standard active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
