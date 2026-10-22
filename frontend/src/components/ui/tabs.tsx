import { createContext, forwardRef, useContext, useId, useState } from 'react';

import { cn } from '@/lib/utils';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  id: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be used inside Tabs');
  return context;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, defaultValue = '', onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const id = useId();
    const selectedValue = value ?? internalValue;

    function setValue(nextValue: string) {
      if (nextValue === selectedValue) return;
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    }

    return (
      <TabsContext.Provider value={{ value: selectedValue, setValue, id }}>
        <div ref={ref} className={cn('w-full', className)} {...props} />
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onKeyDown, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      role="tablist"
      aria-orientation="horizontal"
      className={cn('flex items-center gap-6 border-b border-border', className)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
        if (!tabs.length) return;
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      }}
    />
  ),
);
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
  ({ className, value, disabled, onClick, ...props }, ref) => {
    const tabs = useTabs();
    const selected = tabs.value === value;
    const itemId = `${tabs.id}-${encodeURIComponent(value)}`;

    return (
      <button
        ref={ref}
        {...props}
        type="button"
        role="tab"
        id={`${itemId}-tab`}
        aria-controls={`${itemId}-panel`}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center border-b-2 border-transparent px-1 pb-3 pt-2 text-sm font-medium text-fg-muted transition-colors duration-fast hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:border-accent data-[state=active]:text-fg',
          className,
        )}
        data-state={selected ? 'active' : 'inactive'}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !disabled) tabs.setValue(value);
        }}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, value, ...props }, ref) => {
    const tabs = useTabs();
    const selected = tabs.value === value;
    const itemId = `${tabs.id}-${encodeURIComponent(value)}`;

    return (
      <div
        ref={ref}
        {...props}
        role="tabpanel"
        id={`${itemId}-panel`}
        aria-labelledby={`${itemId}-tab`}
        tabIndex={selected ? 0 : -1}
        hidden={!selected}
        data-state={selected ? 'active' : 'inactive'}
        className={cn('mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=inactive]:hidden', className)}
      />
    );
  },
);
TabsContent.displayName = 'TabsContent';
