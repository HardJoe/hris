import type { EmploymentStatus } from '@/lib/contracts';
import { statusLabels } from '@/lib/contracts';

export function StatusBadge({ status }: { status: EmploymentStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}
