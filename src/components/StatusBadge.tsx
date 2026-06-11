import { cn } from '@/lib/utils';
import type { EmissionStatus } from '@/types';

interface StatusBadgeProps {
  status: EmissionStatus;
}

const statusConfig: Record<EmissionStatus, { label: string; className: string }> = {
  draft: {
    label: '草稿',
    className: 'bg-zinc-100 text-zinc-600',
  },
  pending: {
    label: '待审核',
    className: 'bg-yellow-100 text-yellow-700',
  },
  approved: {
    label: '已通过',
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: '已退回',
    className: 'bg-red-100 text-red-700',
  },
  locked: {
    label: '已锁定',
    className: 'bg-purple-100 text-purple-700',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('badge', config.className)}>
      {config.label}
    </span>
  );
}
