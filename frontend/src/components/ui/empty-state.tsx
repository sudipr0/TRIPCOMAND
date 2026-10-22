import { EmptyIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = EmptyIcon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('py-16 text-center', className)}>
      <Icon size={32} weight="regular" className="mx-auto text-fg-subtle" />
      <h3 className="mt-4 text-base font-medium text-fg-muted">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-fg-subtle">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
