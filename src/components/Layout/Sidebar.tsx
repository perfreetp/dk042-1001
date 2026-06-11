import { NavLink } from 'react-router-dom';
import {
  Home,
  Building2,
  FileEdit,
  Paperclip,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  Leaf,
  ChevronDown,
  Users,
  Building
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui';
import type { UserRole } from '@/types';

interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '数据概览', path: '/dashboard', icon: Home },
  { key: 'enterprises', label: '企业名录', path: '/enterprises', icon: Building2 },
  { key: 'data-entry', label: '数据填报', path: '/data-entry', icon: FileEdit },
  { key: 'attachments', label: '凭证附件', path: '/attachments', icon: Paperclip },
  { key: 'audit', label: '审核任务', path: '/audit', icon: ClipboardCheck },
  { key: 'results', label: '核算结果', path: '/results', icon: BarChart3 },
  { key: 'analysis', label: '对比分析', path: '/analysis', icon: TrendingUp },
];

const roleOptions: { value: UserRole; label: string; icon: React.ElementType }[] = [
  { value: 'enterprise', label: '企业用户', icon: Users },
  { value: 'admin', label: '园区管理员', icon: Building },
];

export default function Sidebar() {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const currentUser = useUIStore((state) => state.currentUser);
  const setUserRole = useUIStore((state) => state.setUserRole);

  const currentRoleOption = roleOptions.find((r) => r.value === currentUser.role) ?? roleOptions[0];
  const RoleIcon = currentRoleOption.icon;

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setRoleDropdownOpen(false);
  };

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#0F5132] text-white flex flex-col z-30">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-200" />
          </div>
          <div className="text-base font-semibold tracking-wide">碳排放核算平台</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-primary-100 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-150 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-primary-400/30 flex items-center justify-center flex-shrink-0">
              <RoleIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.name}</div>
              <div className="text-xs text-primary-200 truncate">{currentRoleOption.label}</div>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-primary-200 transition-transform duration-200',
                roleDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {roleDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-primary-700 shadow-xl border border-white/10 overflow-hidden animate-fade-in">
              {roleOptions.map((option) => {
                const OptIcon = option.icon;
                const isActive = option.value === currentUser.role;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleRoleChange(option.value)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-white/15 text-white' : 'text-primary-100 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <OptIcon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
