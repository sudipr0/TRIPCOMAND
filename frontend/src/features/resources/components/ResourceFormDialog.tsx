import { RESOURCE_STATUSES, RESOURCE_TYPES, type ResourceDetail, type ResourceStatus, type ResourceType } from '@trailcomand/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateResource, useUpdateResource } from '@/features/resources/hooks/useResources';

const VEHICLE_TYPES = ['Hiace', 'Jeep', 'Bus', 'Land Cruiser', 'Motorcycle', 'Other'];
const resourceStatusLabel = (status: ResourceStatus) => status.charAt(0) + status.slice(1).toLowerCase();
const resourceTypeLabel = (type: ResourceType) => type.charAt(0) + type.slice(1).toLowerCase();
const orNull = (value: string) => (value.trim() ? value.trim() : null);
const intOrNull = (value: string) => (value.trim() ? Number(value) : null);

export function ResourceFormDialog({ resource, open, onOpenChange }: {
  resource?: ResourceDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(resource);
  const create = useCreateResource();
  const update = useUpdateResource(resource?.id ?? '');
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState(resource?.name ?? '');
  const [type, setType] = useState<ResourceType>((resource?.type as ResourceType) ?? 'VEHICLE');
  const [code, setCode] = useState(resource?.code ?? '');
  const [vehicleType, setVehicleType] = useState(resource?.vehicleType ?? '');
  const [licensePlate, setLicensePlate] = useState(resource?.licensePlate ?? '');
  const [capacity, setCapacity] = useState(resource?.capacity?.toString() ?? '');
  const [quantity, setQuantity] = useState(resource?.quantity?.toString() ?? '1');
  const [status, setStatus] = useState<ResourceStatus>((resource?.status as ResourceStatus) ?? 'AVAILABLE');
  const [notes, setNotes] = useState(resource?.notes ?? '');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (type === 'VEHICLE' && !vehicleType.trim() && !licensePlate.trim()) {
      setError('A vehicle needs a vehicle type or a license plate');
      return;
    }
    if (type === 'EQUIPMENT' && (!quantity.trim() || Number(quantity) < 1)) {
      setError('Quantity must be at least 1');
      return;
    }
    setError('');
    // Type-specific fields are cleared when the type changes so stale vehicle data never sticks.
    const payload = {
      name: name.trim(),
      type,
      code: orNull(code),
      vehicleType: type === 'VEHICLE' ? orNull(vehicleType) : null,
      licensePlate: type === 'VEHICLE' ? orNull(licensePlate) : null,
      capacity: type === 'VEHICLE' ? intOrNull(capacity) : null,
      quantity: type === 'EQUIPMENT' ? intOrNull(quantity) : null,
      status,
      notes: orNull(notes),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (resource) update.mutate(payload, done);
    else create.mutate(payload, done);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <DialogDescription>Vehicles and equipment can be assigned to trips and checked for availability.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-5">
          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Basic</h3>
            <FormField htmlFor="resource-name" label="Name" required>
              <Input id="resource-name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="resource-type" label="Type" required>
                <Select id="resource-type" value={type} onChange={(event) => setType(event.target.value as ResourceType)}>
                  {RESOURCE_TYPES.map((option) => <option key={option} value={option}>{resourceTypeLabel(option)}</option>)}
                </Select>
              </FormField>
              <FormField htmlFor="resource-code" label="Code">
                <Input id="resource-code" maxLength={50} value={code} onChange={(event) => setCode(event.target.value)} />
              </FormField>
            </div>
          </section>

          {type === 'VEHICLE' ? (
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Vehicle</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="resource-vehicle-type" label="Vehicle type">
                  <Select id="resource-vehicle-type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
                    <option value="">Select a type</option>
                    {VEHICLE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Select>
                </FormField>
                <FormField htmlFor="resource-plate" label="License plate">
                  <Input id="resource-plate" maxLength={50} value={licensePlate} onChange={(event) => setLicensePlate(event.target.value)} />
                </FormField>
              </div>
              <FormField htmlFor="resource-capacity" label="Capacity (seats)">
                <Input id="resource-capacity" type="number" min={1} className="tabular-nums" value={capacity}
                  onChange={(event) => setCapacity(event.target.value)} />
              </FormField>
            </section>
          ) : null}

          {type === 'EQUIPMENT' ? (
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Equipment</h3>
              <FormField htmlFor="resource-quantity" label="Quantity" required>
                <Input id="resource-quantity" type="number" min={1} className="tabular-nums" value={quantity}
                  onChange={(event) => setQuantity(event.target.value)} />
              </FormField>
            </section>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Status and notes</h3>
            <FormField htmlFor="resource-status" label="Status">
              <Select id="resource-status" value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus)}>
                {RESOURCE_STATUSES.map((option) => <option key={option} value={option}>{resourceStatusLabel(option)}</option>)}
              </Select>
            </FormField>
            <div className="space-y-2">
              <Label htmlFor="resource-notes">Notes</Label>
              <Textarea id="resource-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </section>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : editing ? 'Save changes' : 'Add resource'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
