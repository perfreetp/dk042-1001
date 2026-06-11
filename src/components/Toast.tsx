import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import type { ToastType } from '@/types';
import { cn } from '@/lib/utils';

const toastConfig: Record<ToastType, { icon: React.ElementType; className: string; iconClassName: string }> = {
  success: {
    icon: CheckCircle,
    className: 'bg-white border-green-200',
    iconClassName: 'text-green-500',
  },
  error: {
    icon: XCircle,
    className: 'bg-white border-red-200',
    iconClassName: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-white border-yellow-200',
    iconClassName: 'text-yellow-500',
  },
  info: {
    icon: Info,
    className: 'bg-white border-blue-200',
    iconClassName: 'text-blue-500',
  },
};

export default function Toast() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[280px] max-w-md animate-slide-in-right',
              config.className
            )}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0', config.iconClassName)} />
            <p className="flex-1 text-sm text-zinc-800">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded hover:bg-zinc-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
