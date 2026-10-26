import type { TrekTemplateDetail } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><dt className="text-sm text-fg-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-fg">{value === '' || value == null ? '—' : value}</dd></div>;
}

function Chips({ title, items, variant = 'default' }: { title: string; items: string[]; variant?: 'default' | 'success' | 'info' }) {
  return <div><h3 className="text-sm font-medium text-fg">{title}</h3>
    {items.length ? <ul className="mt-2 flex flex-wrap gap-2">{items.map((item, index) => <li key={`${item}-${index}`}><Badge variant={variant} className="h-auto min-h-6 whitespace-normal py-1">{item}</Badge></li>)}</ul>
      : <p className="mt-2 text-sm text-fg-muted">None added.</p>}
  </div>;
}

export function TemplateOverview({ template }: { template: TrekTemplateDetail }) {
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>About this trek</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="whitespace-pre-wrap text-sm text-fg-muted">{template.description || 'No description added.'}</p>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Duration" value={`${template.durationDays} days`} />
          <Detail label="Max altitude" value={template.maxAltitude === null ? null : `${template.maxAltitude.toLocaleString()} m`} />
          <Detail label="Base price" value={template.basePrice === null ? null : `${template.basePriceCurrency} ${Number(template.basePrice).toLocaleString()}`} />
          <Detail label="Region" value={template.region} />
          <Detail label="Code" value={template.code} />
          <Detail label="Destination" value={template.destination?.name} />
        </dl>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>What's included</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <Chips title="Inclusions" items={template.inclusions} variant="success" />
        <Chips title="Exclusions" items={template.exclusions} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Plan ahead</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <Chips title="Best seasons" items={template.bestSeasons} variant="info" />
        <Chips title="Required documents" items={template.requiredDocuments} />
      </CardContent>
    </Card>
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle>Preparation & terms</CardTitle></CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div><h3 className="text-sm font-medium text-fg">Preparation notes</h3><p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{template.preparationNotes || 'None added.'}</p></div>
        <div><h3 className="text-sm font-medium text-fg">Terms</h3><p className="mt-2 whitespace-pre-wrap text-sm text-fg-muted">{template.terms || 'None added.'}</p></div>
        {template.packingList != null ? <div className="sm:col-span-2"><h3 className="text-sm font-medium text-fg">Packing list</h3><pre className="mt-2 whitespace-pre-wrap break-words text-sm text-fg-muted">{typeof template.packingList === 'string' ? template.packingList : JSON.stringify(template.packingList, null, 2)}</pre></div> : null}
      </CardContent>
    </Card>
  </div>;
}
