import { useState } from 'react';

import { AddIcon, CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Accessible name for the entry input when the visible label lives elsewhere. */
  ariaLabel?: string;
  /** Soft cap matching the backend's 300-char per-entry limit per row. */
  maxLength?: number;
}

/** Comma, Enter or the Add button commits an entry as a removable chip. */
export function TagInput({ id, value, onChange, placeholder, ariaLabel, maxLength = 300 }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
    if (!entries.length) return;
    const next = [...value];
    for (const entry of entries) {
      if (!next.some((item) => item.toLowerCase() === entry.toLowerCase())) next.push(entry.slice(0, maxLength));
    }
    onChange(next);
    setDraft('');
  }

  return (
    <div className="space-y-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <li key={`${item}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-sm bg-bg-muted px-2 py-1 text-xs text-fg">
              <span className="truncate">{item}</span>
              <button type="button" aria-label={`Remove ${item}`} className="text-fg-subtle hover:text-danger"
                onClick={() => onChange(value.filter((_, position) => position !== index))}>
                <CloseIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input id={id} value={draft} maxLength={maxLength} placeholder={placeholder} aria-label={ariaLabel} className="h-8 text-sm"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commit(draft);
            }
          }} />
        <Button type="button" size="sm" variant="secondary" disabled={!draft.trim()} onClick={() => commit(draft)}>
          <AddIcon size={16} />Add
        </Button>
      </div>
    </div>
  );
}
