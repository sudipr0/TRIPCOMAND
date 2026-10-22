import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AddIcon, SpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateWorkspace } from '@/features/workspace/hooks/useWorkspaces';

const schema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters'),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});
type Values = z.infer<typeof schema>;

function slugify(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'workspace'}-${Math.random().toString(36).slice(2, 7)}`;
}

export function CreateWorkspaceDialog() {
  const createWorkspace = useCreateWorkspace();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'NPR', timezone: 'Asia/Kathmandu' },
  });

  const onSubmit = (values: Values) => {
    createWorkspace.mutate({ ...values, slug: slugify(values.name) }, { onSuccess: () => form.reset() });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start px-2.5">
          <AddIcon size={16} weight="regular" />
          Create workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>Set up another operating space for your agency.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField htmlFor="dialog-workspace-name" label="Workspace name" required error={form.formState.errors.name?.message}>
            <Input id="dialog-workspace-name" autoComplete="organization" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField htmlFor="dialog-currency" label="Currency" required>
              <Select id="dialog-currency" {...form.register('currency')}>
                <option value="NPR">NPR — Nepalese rupee</option>
                <option value="USD">USD — US dollar</option>
              </Select>
            </FormField>
            <FormField htmlFor="dialog-timezone" label="Timezone" required>
              <Select id="dialog-timezone" {...form.register('timezone')}>
                <option value="Asia/Kathmandu">Asia/Kathmandu</option>
                <option value="UTC">UTC</option>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => form.reset()}>Cancel</Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? <SpinnerIcon size={16} weight="bold" className="animate-spin" /> : null}
              {createWorkspace.isPending ? 'Creating...' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
