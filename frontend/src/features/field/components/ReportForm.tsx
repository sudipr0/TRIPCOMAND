import { useState } from 'react';
import type { CreateFieldReportInput, ReportType } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_LABELS, SEVERITY_LABELS, useCreateReport } from '@/features/field/useField';

interface ReportFormProps {
  tripId: string;
  initialType?: ReportType;
  clientId: string;
  onDone: () => void;
  onCancel: () => void;
}

const REPORT_OPTIONS = Object.keys(REPORT_LABELS) as ReportType[];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export function ReportForm({ tripId, initialType = 'PROGRESS_UPDATE', clientId, onDone, onCancel }: ReportFormProps) {
  const createReport = useCreateReport(tripId);
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('MEDIUM');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [touched, setTouched] = useState(false);

  const missingDescription = touched && description.trim().length === 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!description.trim()) return;
    const payload: CreateFieldReportInput = {
      reportType,
      severity,
      description: description.trim(),
      location: location.trim() || null,
      photoUrls: [],
      recordedAt: new Date().toISOString(),
      clientId,
    };
    createReport.mutate(payload, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="report-type" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Report type
        </label>
        <Select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="h-11 text-md">
          {REPORT_OPTIONS.map((option) => (
            <option key={option} value={option}>{REPORT_LABELS[option]}</option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="report-severity" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Severity
        </label>
        <Select id="report-severity" value={severity}
          onChange={(event) => setSeverity(event.target.value as (typeof SEVERITIES)[number])} className="h-11 text-md">
          {SEVERITIES.map((option) => (
            <option key={option} value={option}>{SEVERITY_LABELS[option]}</option>
          ))}
        </Select>
        {reportType === 'EMERGENCY' ? (
          <p className="mt-2 rounded-md border border-danger/40 bg-[hsl(var(--danger)/0.06)] px-3 py-2 text-xs text-danger">
            Emergencies are always sent at Urgent severity and alert the office immediately.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="report-location" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Location
        </label>
        <Input id="report-location" value={location} onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Dingboche" className="h-11 text-md" />
      </div>

      <div>
        <label htmlFor="report-description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Description
        </label>
        <Textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)}
          placeholder="What happened?" rows={4} aria-invalid={missingDescription}
          className="text-md" />
        {missingDescription ? <p className="mt-1 text-xs text-danger">Describe what happened before sending.</p> : null}
      </div>

      <div className="flex gap-3">
        <Button type="submit" size="lg" className="h-12 flex-1 text-md" disabled={createReport.isPending}>
          {createReport.isPending ? 'Sending...' : 'Send report'}
        </Button>
        <Button type="button" size="lg" variant="secondary" className="h-12" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
