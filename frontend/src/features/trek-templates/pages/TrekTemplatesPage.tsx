import { PERMISSION_CODES, TEMPLATE_STATUSES, TREK_DIFFICULTIES, type ListTrekTemplatesQuery, type TemplateStatus, type TrekDifficulty } from '@trailcomand/shared';
import { useEffect, useState, type FormEvent } from 'react';

import { AddIcon, SearchIcon, TemplateIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateCard } from '@/features/trek-templates/components/TemplateCard';
import { TemplateForm } from '@/features/trek-templates/components/TemplateForm';
import { useTrekTemplateList } from '@/features/trek-templates/hooks/useTrekTemplates';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

export function TrekTemplatesPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TEMPLATE_CREATE));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<TrekDifficulty | ''>('');
  const [status, setStatus] = useState<TemplateStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const filters: ListTrekTemplatesQuery = {
    limit: PAGE_SIZE, offset,
    ...(search ? { search } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(status ? { status } : {}),
  };
  const list = useTrekTemplateList(filters);

  useEffect(() => { setOffset(0); }, [workspaceId]);
  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) {
      setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
    }
  }, [list.data, offset]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setOffset(0);
  }

  const filtered = Boolean(search || difficulty || status);
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight text-fg">Trek templates</h1><p className="mt-2 text-sm text-fg-muted">Plan reusable treks and their daily itineraries.</p></div>
      {canCreate ? <TemplateForm trigger={<Button type="button"><AddIcon size={16} />Add template</Button>} /> : null}
    </header>
    <div className="flex flex-wrap gap-3">
      <form onSubmit={submitSearch} className="flex min-w-52 flex-1 gap-2 sm:max-w-sm">
        <Input aria-label="Search trek templates" placeholder="Search templates" maxLength={120} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        <Button type="submit" variant="secondary" aria-label="Search"><SearchIcon size={16} /></Button>
      </form>
      <Select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => { setDifficulty(event.target.value as TrekDifficulty | ''); setOffset(0); }}>
        <option value="">All difficulties</option>
        {TREK_DIFFICULTIES.map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}
      </Select>
      <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as TemplateStatus | ''); setOffset(0); }}>
        <option value="">All statuses</option>
        {TEMPLATE_STATUSES.map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}
      </Select>
    </div>
    {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view trek templates.</p>
      : list.isError ? <Card className="p-6 text-sm text-fg-muted" role="alert">Could not load trek templates. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button></Card>
        : <>
          {list.isPending ? <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-64 w-full" />)}</div>
            : list.data?.items.length ? <div className="grid gap-4 lg:grid-cols-2">{list.data.items.map((template) => <TemplateCard key={template.id} template={template} />)}</div>
              : <Card><EmptyState icon={TemplateIcon} title={filtered ? 'No matching templates' : 'No trek templates yet'}
                description={filtered ? 'Try another search or filter.' : 'Add your first trek template to start planning.'}
                action={canCreate && !filtered ? <TemplateForm trigger={<Button type="button">Add template</Button>} /> : undefined} /></Card>}
          {list.data && list.data.total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
            <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
              <Button type="button" size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
            </div>
          </div> : null}
        </>}
  </div>;
}
