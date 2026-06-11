import { create } from 'zustand';
import type { Enterprise } from '@/types';
import { initMockData } from './mockData';

interface EnterpriseState {
  enterprises: Enterprise[];
  currentEnterpriseId: string | null;
  loading: boolean;
  init: (enterprises: Enterprise[]) => void;
  addEnterprise: (enterprise: Enterprise) => void;
  updateEnterprise: (id: string, data: Partial<Enterprise>) => void;
  deleteEnterprise: (id: string) => void;
  setCurrentEnterprise: (id: string | null) => void;
  getEnterpriseById: (id: string) => Enterprise | undefined;
}

const mockData = initMockData();

export const useEnterpriseStore = create<EnterpriseState>((set, get) => ({
  enterprises: mockData.enterprises,
  currentEnterpriseId: mockData.enterprises.length > 0 ? mockData.enterprises[0].id : null,
  loading: false,

  init: (enterprises) => set({ enterprises }),

  addEnterprise: (enterprise) =>
    set((state) => ({
      enterprises: [...state.enterprises, enterprise]
    })),

  updateEnterprise: (id, data) =>
    set((state) => ({
      enterprises: state.enterprises.map((ent) =>
        ent.id === id ? { ...ent, ...data } : ent
      )
    })),

  deleteEnterprise: (id) =>
    set((state) => ({
      enterprises: state.enterprises.map((ent) =>
        ent.id === id ? { ...ent, status: 'inactive' as const } : ent
      )
    })),

  setCurrentEnterprise: (id) => set({ currentEnterpriseId: id }),

  getEnterpriseById: (id) => get().enterprises.find((ent) => ent.id === id)
}));
