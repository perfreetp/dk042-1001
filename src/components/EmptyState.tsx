import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
        <Icon className="w-10 h-10 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-800">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-zinc-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
