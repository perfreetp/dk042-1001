import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendLabel?: string;
  color?: 'green' | 'blue' | 'orange' | 'purple';
}

const colorGradients: Record<string, string> = {
  green: 'from-green-500 to-emerald-400',
  blue: 'from-blue-500 to-sky-400',
  orange: 'from-orange-500 to-amber-400',
  purple: 'from-purple-500 to-violet-400',
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'green',
}: StatCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className={cn('h-1.5 bg-gradient-to-r', colorGradients[color])} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500 font-medium">{title}</span>
            <span className="mt-2 text-3xl font-bold text-zinc-900 tracking-tight">{value}</span>
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br',
              colorGradients[color]
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>

        {trend && trendLabel && (
          <div className="mt-4 flex items-center gap-1.5">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trendLabel}
            </span>
            <span className="text-sm text-zinc-400">较上期</span>
          </div>
        )}
      </div>
    </div>
  );
}
