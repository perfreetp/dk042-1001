import { create } from 'zustand';
import type { EmissionData } from '@/types';
import { initMockData } from './mockData';
import { persistAll } from './persist';
import { calculateEmission } from '@/utils/calculator';

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

  saveData: (data) => {
    const result = calculateEmission(data);
    const dataWithResult: EmissionData = {
      ...data,
      totalEmission: result.total,
      updatedAt: new Date().toISOString(),
    };
    set((state) => {
      const exists = state.emissionData.some((d) => d.id === data.id);
      if (exists) {
        return {
          emissionData: state.emissionData.map((d) =>
            d.id === data.id ? dataWithResult : d
          )
        };
      }
      return {
        emissionData: [...state.emissionData, dataWithResult]
      };
    });
    persistAll();
  },

  submitData: (id) => {
    const data = get().emissionData.find(d => d.id === id);
    if (!data) return;
    
    const result = calculateEmission(data);
    set((state) => ({
      emissionData: state.emissionData.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'pending',
              totalEmission: result.total,
              submitTime: new Date().toISOString(),
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : d
      )
    }));
    persistAll();
  },

  copyFromHistory: (targetId, sourceData) => {
    const result = calculateEmission(sourceData);
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
              totalEmission: result.total,
              updatedAt: new Date().toISOString()
            }
          : d
      )
    }));
    persistAll();
  },

  getEnterpriseAllData: (enterpriseId) =>
    get().emissionData.filter((d) => d.enterpriseId === enterpriseId)
}));
