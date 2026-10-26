import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OfflineSheetProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Sheet anchored to the bottom of the screen on phones, centred dialog from `sm` up.
 * The overrides must beat the base `top-1/2 -translate-y-1/2` at every breakpoint,
 * which is why the vertical offsets are set explicitly rather than omitted.
 */
export function OfflineSheet({ open, title, description, onClose, children }: OfflineSheetProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="bottom-0 top-auto max-h-[88vh] w-[calc(100%-24px)] translate-y-0 overflow-y-auto rounded-b-none rounded-t-xl p-5 data-[state=open]:slide-in-from-bottom-2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
