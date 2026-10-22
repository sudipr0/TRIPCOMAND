import { EmptyState } from '@/components/ui/empty-state';

export function PlaceholderPage({ title, icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">{title}</h1>
        <p className="mt-2 text-sm text-fg-muted">Keep your agency work organized in one place.</p>
      </header>
      <div className="rounded-lg border border-border bg-bg shadow-xs">
        <EmptyState icon={icon} title="Coming in Phase 1" description={`${title} will be available in the next phase.`} />
      </div>
    </div>
  );
}
