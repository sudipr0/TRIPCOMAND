import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { SpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
}

export function SubmitButton({ loading, loadingLabel, children, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" size="lg" className="w-full justify-center" disabled={loading} {...props}>
      {loading ? <SpinnerIcon size={16} weight="bold" className="animate-spin" /> : null}
      {loading ? loadingLabel : children}
    </Button>
  );
}
