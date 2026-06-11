import { useLocation } from 'react-router-dom';
import { ChevronRight, Bell, User } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

const routeTitles: Record<string, string> = {
  '/dashboard': '数据概览',
  '/enterprises': '企业名录',
  '/data-entry': '数据填报',
  '/attachments': '凭证附件',
  '/audit': '审核任务',
  '/results': '核算结果',
  '/analysis': '对比分析',
};

const roleLabels: Record<string, string> = {
  enterprise: '企业用户',
  admin: '园区管理员',
};

export default function Header() {
  const location = useLocation();
  const currentUser = useUIStore((state) => state.currentUser);

  const currentPath = location.pathname;
  const pageTitle = routeTitles[currentPath] ?? '首页';

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="text-zinc-400">首页</span>
        <ChevronRight className="w-4 h-4 text-zinc-300" />
        <span className="text-zinc-800 font-medium">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-zinc-100 transition-colors">
          <Bell className="w-5 h-5 text-zinc-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
        </button>

        <div className="h-6 w-px bg-zinc-200" />

        <div className="flex items-center gap-3">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              currentUser.role === 'admin'
                ? 'bg-primary-50 text-primary-600'
                : 'bg-accent-orange/10 text-accent-orange'
            )}
          >
            {roleLabels[currentUser.role] ?? '未知角色'}
          </span>

          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>

          <span className="text-sm font-medium text-zinc-700">{currentUser.name}</span>
        </div>
      </div>
    </header>
  );
}
