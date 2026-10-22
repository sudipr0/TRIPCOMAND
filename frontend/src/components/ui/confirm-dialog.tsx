import { Fragment, isValidElement, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  /** Omit when the dialog is controlled with `open` (e.g. opened from a menu item). */
  trigger?: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  /** Optional controlled mode for dialogs opened from a menu or another button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'primary',
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }
  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        if (nextOpen) setError(false);
      }}
    >
      {trigger ? <DialogTrigger asChild={isValidElement(trigger) && trigger.type !== Fragment}>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children ? <div>{children}</div> : null}
        {error && <p role="alert" className="text-sm text-danger">Could not complete the action. Please try again.</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" variant={variant} disabled={pending} onClick={handleConfirm}>
            {pending ? 'Confirming...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
