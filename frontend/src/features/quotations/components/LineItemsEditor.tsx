import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AddIcon, DeleteIcon } from '@/components/icons';
import { QuotationTotals, computeTotals } from '@/features/quotations/components/QuotationTotals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Editor row. Numeric fields are kept as strings so a partially typed value never becomes NaN. */
export interface EditableLineItem {
  key: string;
  category: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  isOptional: boolean;
}

let rowSequence = 0;
export function newLineItem(seed?: Partial<Omit<EditableLineItem, 'key'>>): EditableLineItem {
  rowSequence += 1;
  return {
    key: `line-${Date.now()}-${rowSequence}`,
    category: seed?.category ?? '',
    description: seed?.description ?? '',
    quantity: seed?.quantity ?? '1',
    unit: seed?.unit ?? 'pax',
    unitPrice: seed?.unitPrice ?? '',
    isOptional: seed?.isOptional ?? false,
  };
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Per-row validation so a partially filled line item explains why submit is blocked. */
export function lineItemErrors(item: EditableLineItem): { category?: string; description?: string; quantity?: string; unitPrice?: string } {
  const errors: Record<string, string> = {};
  if (!item.category.trim()) errors.category = 'Required';
  if (!item.description.trim()) errors.description = 'Required';
  const quantity = toNumber(item.quantity);
  if (item.quantity.trim() === '' || quantity <= 0) errors.quantity = 'Quantity must be greater than 0';
  const unitPrice = toNumber(item.unitPrice);
  if (item.unitPrice.trim() === '' || unitPrice < 0) errors.unitPrice = 'Unit price must be 0 or more';
  return errors;
}

export interface LineItemsEditorProps {
  items: EditableLineItem[];
  onChange: (items: EditableLineItem[]) => void;
  discount: number;
  tax: number;
  currency: string;
  error?: string;
}

/**
 * Inline editable line items. Every keystroke goes straight into form state, so the totals
 * below the table update as the user types — no save required to see the new amount.
 */
export function LineItemsEditor({ items, onChange, discount, tax, currency, error }: LineItemsEditorProps) {
  function patch(key: string, changes: Partial<EditableLineItem>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  function remove(key: string) {
    onChange(items.filter((item) => (item.key !== key)));
  }

  const rowErrors = items.map(lineItemErrors);
  const errorCount = rowErrors.reduce((count, row) => count + Object.keys(row).length, 0);

  const { subtotal, total } = computeTotals(
    items.map((item) => ({ quantity: toNumber(item.quantity), unitPrice: toNumber(item.unitPrice) })),
    discount,
    tax,
  );

  return (
    <div className="space-y-3">
      {items.length ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="w-full min-w-[720px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[19%]">Category</TableHead>
                <TableHead className="w-[27%]">Description</TableHead>
                <TableHead className="w-[10%] text-right">Qty</TableHead>
                <TableHead className="w-[11%]">Unit</TableHead>
                <TableHead className="w-[13%] text-right">Unit price</TableHead>
                <TableHead className="w-[9%] text-center">Optional</TableHead>
                <TableHead className="w-[13%] text-right">Line total</TableHead>
                <TableHead className="w-[4%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.key}>
                  <TableCell className="py-2">
                    <Input aria-label={`Line ${index + 1} category`} aria-invalid={Boolean(rowErrors[index].category)} className="min-w-0 px-2" value={item.category} maxLength={60} placeholder="Transport"
                      onChange={(event) => patch(item.key, { category: event.target.value })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input aria-label={`Line ${index + 1} description`} aria-invalid={Boolean(rowErrors[index].description)} className="min-w-0 px-2" value={item.description} maxLength={500} placeholder="Airport transfer"
                      onChange={(event) => patch(item.key, { description: event.target.value })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input aria-label={`Line ${index + 1} quantity`} type="number" min={0} step="any" title={rowErrors[index].quantity}
                      aria-invalid={Boolean(rowErrors[index].quantity)}
                      className="min-w-0 px-2 text-right tabular-nums"
                      value={item.quantity} onChange={(event) => patch(item.key, { quantity: event.target.value })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input aria-label={`Line ${index + 1} unit`} className="min-w-0 px-2" value={item.unit} maxLength={30}
                      onChange={(event) => patch(item.key, { unit: event.target.value })} />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input aria-label={`Line ${index + 1} unit price`} type="number" min={0} step="any" title={rowErrors[index].unitPrice}
                      aria-invalid={Boolean(rowErrors[index].unitPrice)}
                      className="min-w-0 px-2 text-right tabular-nums"
                      value={item.unitPrice} onChange={(event) => patch(item.key, { unitPrice: event.target.value })} />
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Switch aria-label={`Line ${index + 1} optional`} checked={item.isOptional}
                      onCheckedChange={(checked) => patch(item.key, { isOptional: checked })} />
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm font-medium tabular-nums text-fg">
                    {formatCurrency(toNumber(item.quantity) * toNumber(item.unitPrice), currency)}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-0 text-fg-subtle hover:text-danger"
                      aria-label={`Remove line ${index + 1}`} onClick={() => remove(item.key)}>
                      <DeleteIcon size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-fg-muted">No line items yet</p>
          <Button type="button" size="sm" variant="secondary" className="mt-3"
            onClick={() => onChange([...items, newLineItem()])}>
            <AddIcon size={16} />Add first item
          </Button>
        </div>
      )}

      {items.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, newLineItem()])}>
            <AddIcon size={16} />Add line item
          </Button>
          <span className="text-xs text-fg-subtle">Optional items are shown to the customer but excluded from the quoted total.</span>
        </div>
      ) : null}

      {errorCount > 0 ? <p role="alert" className="text-xs text-danger">Fix {errorCount} line item {errorCount === 1 ? 'error' : 'errors'} before submitting</p> : null}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end border-t border-border pt-3">
        <QuotationTotals subtotal={subtotal} discount={discount} tax={tax} total={total} currency={currency} />
      </div>
    </div>
  );
}
