import { Badge } from '@/components/ui/badge';

export function CustomerTypeBadge({ type }: { type: string }) {
  return <Badge>{type.charAt(0) + type.slice(1).toLowerCase()}</Badge>;
}
