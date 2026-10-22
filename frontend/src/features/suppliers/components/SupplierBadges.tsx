import type { SupplierCategory } from '@tripchange/shared';

import { Badge, type BadgeVariant } from '@/components/ui/badge';

const variants: Record<SupplierCategory | string, BadgeVariant> = {
  ACCOMMODATION: 'info',
  TRANSPORT: 'warning',
  FOOD: 'success',
  PERMIT: 'danger',
  EQUIPMENT: 'default',
  INSURANCE: 'default',
  OTHER: 'default',
};

export const supplierCategoryLabel = (category: string) =>
  category.charAt(0) + category.slice(1).toLowerCase();

export function SupplierCategoryBadge({ category }: { category: string }) {
  return <Badge variant={variants[category] ?? 'default'}>{supplierCategoryLabel(category)}</Badge>;
}

const statusVariants: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  BLACKLISTED: 'danger',
  PENDING_REVIEW: 'warning',
};

export function SupplierStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariants[status] ?? 'default'}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>;
}
