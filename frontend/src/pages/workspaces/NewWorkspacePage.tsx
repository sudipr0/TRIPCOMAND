import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';

import { BuildingsIcon, SpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateWorkspace } from '@/features/workspace/hooks/useWorkspaces';
import { useSession } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters'),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});
type Values = z.infer<typeof schema>;

function slugify(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'workspace'}-${Math.random().toString(36).slice(2, 7)}`;
}

export function NewWorkspacePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const session = useSession();
  const createWorkspace = useCreateWorkspace();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'NPR', timezone: 'Asia/Kathmandu' },
  });

  if (session.isPending || (session.isFetching && !isAuthenticated)) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-fg-muted">Loading account...</div>;
  }
  if (!isAuthenticated && !session.data) return <Navigate to="/login" replace />;
  const onSubmit = (values: Values) => createWorkspace.mutate({ ...values, slug: slugify(values.name) });

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-subtle text-accent">
            <BuildingsIcon size={32} weight="regular" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fg">Create your workspace</h1>
          <p className="mt-2 text-md text-fg-muted">A workspace is where your agency manages trips, staff, and customers.</p>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <FormField htmlFor="workspace-name" label="Workspace name" required error={form.formState.errors.name?.message}>
              <Input id="workspace-name" autoComplete="organization" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField htmlFor="workspace-currency" label="Currency" required>
                <Select id="workspace-currency" {...form.register('currency')}>
                  <option value="NPR">NPR — Nepalese rupee</option>
                  <option value="USD">USD — US dollar</option>
                </Select>
              </FormField>
              <FormField htmlFor="workspace-timezone" label="Timezone" required>
                <Select id="workspace-timezone" {...form.register('timezone')}>
                  <option value="Asia/Kathmandu">Asia/Kathmandu</option>
                  <option value="UTC">UTC</option>
                </Select>
              </FormField>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? <SpinnerIcon size={16} weight="bold" className="animate-spin" /> : null}
              {createWorkspace.isPending ? 'Creating workspace...' : 'Create workspace'}
            </Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-sm text-fg-muted">Already have an account? <Link to="/login" className="font-medium text-accent hover:text-accent-hover hover:underline">Sign in</Link></p>
      </div>
    </main>
  );
}
