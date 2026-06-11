import { create } from 'zustand';
import type { EmissionData } from '@/types';
import { initMockData } from './mockData';

interface EmissionState {
  emissionData: EmissionData[];
  currentData: EmissionData | null;
  loading: boolean;
  init: (data: EmissionData[]) => void;
  getData: (enterpriseId: string, period: string) => EmissionData | undefined;
  saveData: (data: EmissionData) => void;
  submitData: (id: string) => void;
  copyFromHistory: (targetId: string, sourceData: EmissionData) => void;
  getEnterpriseAllData: (enterpriseId: string) => EmissionData[];
}

const mockData = initMockData();

export const useEmissionStore = create<EmissionState>((set, get) => ({
  emissionData: mockData.emissionData,
  currentData: null,
  loading: false,

  init: (data) => set({ emissionData: data }),

  getData: (enterpriseId, period) =>
    get().emissionData.find(
      (d) => d.enterpriseId === enterpriseId && d.period === period
    ),

  saveData: (data) =>
    set((state) => {
      const exists = state.emissionData.some((d) => d.id === data.id);
      if (exists) {
        return {
          emissionData: state.emissionData.map((d) =>
            d.id === data.id ? { ...data, updatedAt: new Date().toISOString() } : d
          )
        };
      }
      return {
        emissionData: [...state.emissionData, data]
      };
    }),

  submitData: (id) =>
    set((state) => ({
      emissionData: state.emissionData.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'pending',
              submitTime: new Date().toISOString(),
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : d
      )
    })),

  copyFromHistory: (targetId, sourceData) =>
    set((state) => ({
      emissionData: state.emissionData.map((d) =>
        d.id === targetId
          ? {
              ...d,
              electricity: sourceData.electricity,
              gas: sourceData.gas,
              steam: sourceData.steam,
              fuel: sourceData.fuel,
              production: sourceData.production,
              sources: sourceData.sources?.map((s) => ({ ...s })),
              totalEmission: sourceData.totalEmission,
              updatedAt: new Date().toISOString()
            }
          : d
      )
    })),

  getEnterpriseAllData: (enterpriseId) =>
    get().emissionData.filter((d) => d.enterpriseId === enterpriseId)
}));
