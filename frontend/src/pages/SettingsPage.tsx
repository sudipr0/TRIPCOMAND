import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { SettingsIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAgencyProfile, useUpdateAgencyProfile } from '@/features/workspace/hooks/useWorkspaces';

const tabs = ['Agency Profile', 'Members', 'Roles', 'Audit Log'] as const;
type Tab = (typeof tabs)[number];
interface Values {
  name: string;
  currency: string;
  timezone: string;
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Agency Profile');
  const profile = useAgencyProfile();
  const updateProfile = useUpdateAgencyProfile();
  const form = useForm<Values>({ defaultValues: { name: '', currency: 'NPR', timezone: 'Asia/Kathmandu' } });

  useEffect(() => {
    if (profile.data) {
      form.reset({ name: profile.data.name, currency: profile.data.currency, timezone: profile.data.timezone });
    }
  }, [form, profile.data]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Settings</h1>
        <p className="mt-2 text-sm text-fg-muted">Manage the agency details your team sees.</p>
      </header>
      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-border" role="tablist" aria-label="Settings sections">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={tab === item ? 'border-b-2 border-accent px-1 pb-3 text-sm font-medium text-accent' : 'border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-fg-muted transition-colors duration-fast hover:text-fg'}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === 'Agency Profile' ? (
        <Card>
          <CardHeader>
            <CardTitle>Agency profile</CardTitle>
            <CardDescription>Use these defaults when you create operational records.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.isLoading ? <p className="text-sm text-fg-muted">Loading agency profile...</p> : (
              <form onSubmit={form.handleSubmit((values) => updateProfile.mutate(values))} className="max-w-xl space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace name<span className="ml-1 text-danger">*</span></Label>
                  <Input id="workspace-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name', { required: 'Workspace name is required', minLength: { value: 2, message: 'Workspace name must be at least 2 characters' } })} />
                  {form.formState.errors.name ? <p className="text-xs text-danger">{form.formState.errors.name.message}</p> : null}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select id="currency" {...form.register('currency')}>
                      <option value="NPR">NPR — Nepalese rupee</option>
                      <option value="USD">USD — US dollar</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select id="timezone" {...form.register('timezone')}>
                      <option value="Asia/Kathmandu">Asia/Kathmandu</option>
                      <option value="UTC">UTC</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <EmptyState icon={SettingsIcon} title="Coming in Phase 1" description={`${tab} will be available in the next phase.`} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
