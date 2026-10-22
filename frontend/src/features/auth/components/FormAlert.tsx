import { ErrorIcon } from '@/components/icons';

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-[hsl(0_60%_82%)] bg-[hsl(0_60%_97%)] px-3 py-2.5 text-sm text-[hsl(0_65%_40%)]">
      <ErrorIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
