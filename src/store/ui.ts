import { create } from 'zustand';
import type { Toast, ToastType, User, UserRole } from '@/types';

interface UIState {
  toasts: Toast[];
  sidebarOpen: boolean;
  currentUser: User;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  toggleSidebar: () => void;
  setUserRole: (role: UserRole) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  sidebarOpen: true,
  currentUser: {
    id: 'user-001',
    name: '管理员',
    role: 'admin'
  },

  addToast: (message, type) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen
    })),

  setUserRole: (role) =>
    set(() => ({
      currentUser: {
        id: 'user-001',
        name: role === 'admin' ? '管理员' : '企业用户',
        role,
        enterpriseId: role === 'enterprise' ? 'ent-001' : undefined
      }
    }))
}));
