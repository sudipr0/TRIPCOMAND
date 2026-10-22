import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = ({ delayDuration = 200, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
);
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-50 rounded-md bg-bg-inverse px-2 py-1 text-xs text-white shadow-xs data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0', className)}
      {...props}
    >{children}<TooltipPrimitive.Arrow className="fill-bg-inverse" /></TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
