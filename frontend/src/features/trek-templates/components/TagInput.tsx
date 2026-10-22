import { useState, type KeyboardEvent } from 'react';

import { CloseIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
}

export function TagInput({ value, onChange, placeholder, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const tag = draft.trim();
    if (tag && !value.some((item) => item.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? <ul className="flex flex-wrap gap-2">
        {value.map((item, index) => <li key={`${item}-${index}`} className="inline-flex items-center gap-1 rounded-md bg-bg-muted px-2 py-1 text-sm text-fg">
          <span>{item}</span>
          <button type="button" aria-label={`Remove ${item}`} className="rounded text-fg-muted hover:text-fg focus-visible:outline-accent" onClick={() => onChange(value.filter((_, position) => position !== index))}>
            <CloseIcon size={14} aria-hidden="true" />
          </button>
        </li>)}
      </ul> : null}
      <Input id={id} value={draft} placeholder={placeholder ?? 'Type and press Enter'} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} onBlur={addTag} />
    </div>
  );
}
