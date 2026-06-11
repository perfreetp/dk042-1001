import { create } from 'zustand';
import type { EmissionFactor, EmissionFactorKey, FactorStatus } from '@/types';
import { persistAll } from './persist';
import { readPersistedData } from '@/utils/persist';

interface FactorState {
  factors: EmissionFactor[];
  initFactors: (factors: EmissionFactor[]) => void;
  submitFactor: (factor: Omit<EmissionFactor, 'id' | 'createdAt' | 'status' | 'submittedBy' | 'submittedAt' | 'reviewedBy' | 'reviewedAt' | 'reviewOpinion'>, submittedBy: string) => EmissionFactor;
  approveFactor: (id: string, reviewedBy: string, opinion?: string) => EmissionFactor | null;
  rejectFactor: (id: string, reviewedBy: string, opinion: string) => EmissionFactor | null;
  removeFactor: (id: string) => void;
  getEffectiveFactor: (key: EmissionFactorKey, period: string) => EmissionFactor;
  getEffectiveFactorsForPeriod: (period: string) => Record<EmissionFactorKey, EmissionFactor>;
  getLatestApprovedFactors: () => Record<EmissionFactorKey, EmissionFactor>;
  getFactorHistory: (key: EmissionFactorKey) => EmissionFactor[];
  getPendingFactors: () => EmissionFactor[];
  getFactorsByStatus: (status: FactorStatus) => EmissionFactor[];
  getFactorsByKey: (key: EmissionFactorKey) => EmissionFactor[];
}

const FACTOR_META: Record<EmissionFactorKey, { label: string; unit: string; defaultValue: number }> = {
  electricity: { label: '电力', unit: 'tCO₂/kWh', defaultValue: 0.000581 },
  gas: { label: '天然气', unit: 'tCO₂/m³', defaultValue: 0.0021622 },
  steam: { label: '蒸汽', unit: 'tCO₂/t', defaultValue: 0.11 },
  fuel: { label: '燃油', unit: 'tCO₂/t', defaultValue: 0.0029251 },
};

function getInitialFactors(): EmissionFactor[] {
  const persisted = readPersistedData();
  if (persisted?.factors && Array.isArray(persisted.factors) && persisted.factors.length > 0) {
    return persisted.factors;
  }

  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
  const defaultMonth = `${twoYearsAgo.getFullYear()}-${String(twoYearsAgo.getMonth() + 1).padStart(2, '0')}`;
  const factors: EmissionFactor[] = [];
  let idx = 1;
  (['electricity', 'gas', 'steam', 'fuel'] as EmissionFactorKey[]).forEach((key) => {
    const meta = FACTOR_META[key];
    factors.push({
      id: `F${String(idx++).padStart(6, '0')}`,
      key,
      label: meta.label,
      unit: meta.unit,
      version: 'V1.0',
      effectiveMonth: defaultMonth,
      value: meta.defaultValue,
      createdAt: new Date(twoYearsAgo.getTime() + idx * 86400000).toISOString(),
      note: '初始默认版本',
      status: 'approved',
      submittedBy: '系统初始化',
      submittedAt: new Date(twoYearsAgo.getTime() + idx * 86400000).toISOString(),
      reviewedBy: '系统管理员',
      reviewedAt: new Date(twoYearsAgo.getTime() + idx * 86400000 + 86400000).toISOString(),
      reviewOpinion: '初始因子版本，通过审核',
    });
  });
  const v2Month = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  (['electricity', 'gas', 'steam', 'fuel'] as EmissionFactorKey[]).forEach((key) => {
    const meta = FACTOR_META[key];
    const adjustment = key === 'electricity' ? 0.97 : key === 'gas' ? 1.02 : key === 'steam' ? 0.95 : 1.05;
    factors.push({
      id: `F${String(idx++).padStart(6, '0')}`,
      key,
      label: meta.label,
      unit: meta.unit,
      version: 'V1.1',
      effectiveMonth: v2Month,
      value: parseFloat((meta.defaultValue * adjustment).toFixed(7)),
      createdAt: new Date(now.getTime() - 86400000 * 20 - idx * 3600000).toISOString(),
      note: `${now.getFullYear() - 1}年度区域电网排放因子更新`,
      status: 'approved',
      submittedBy: '李主管',
      submittedAt: new Date(now.getTime() - 86400000 * 22 - idx * 3600000).toISOString(),
      reviewedBy: '王总',
      reviewedAt: new Date(now.getTime() - 86400000 * 21 - idx * 3600000).toISOString(),
      reviewOpinion: '年度更新，数据准确，予以通过',
    });
  });
  return factors;
}

export const useFactorStore = create<FactorState>((set, get) => ({
  factors: getInitialFactors(),

  initFactors: (factors) => set({ factors }),

  submitFactor: (factor, submittedBy) => {
    const now = new Date().toISOString();
    const newFactor: EmissionFactor = {
      ...factor,
      id: `F${String(Date.now()).slice(-8)}`,
      createdAt: now,
      status: 'pending',
      submittedBy,
      submittedAt: now,
    };
    set((state) => ({ factors: [newFactor, ...state.factors] }));
    persistAll();
    return newFactor;
  },

  approveFactor: (id, reviewedBy, opinion) => {
    const factor = get().factors.find((f) => f.id === id);
    if (!factor || factor.status !== 'pending') return null;

    const now = new Date().toISOString();
    const updated = {
      ...factor,
      status: 'approved' as FactorStatus,
      reviewedBy,
      reviewedAt: now,
      reviewOpinion: opinion,
    };

    set((state) => ({
      factors: state.factors.map((f) => (f.id === id ? updated : f)),
    }));
    persistAll();
    return updated;
  },

  rejectFactor: (id, reviewedBy, opinion) => {
    const factor = get().factors.find((f) => f.id === id);
    if (!factor || factor.status !== 'pending') return null;

    const now = new Date().toISOString();
    const updated = {
      ...factor,
      status: 'rejected' as FactorStatus,
      reviewedBy,
      reviewedAt: now,
      reviewOpinion: opinion,
    };

    set((state) => ({
      factors: state.factors.map((f) => (f.id === id ? updated : f)),
    }));
    persistAll();
    return updated;
  },

  removeFactor: (id) => {
    set((state) => ({ factors: state.factors.filter((f) => f.id !== id) }));
    persistAll();
  },

  getEffectiveFactor: (key, period) => {
    const candidates = get()
      .factors.filter(
        (f) => f.key === key && f.status === 'approved' && f.effectiveMonth <= period
      )
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
    if (candidates.length > 0) return candidates[0];
    const meta = FACTOR_META[key];
    return {
      id: `fallback-${key}`,
      key,
      label: meta.label,
      unit: meta.unit,
      version: '默认',
      effectiveMonth: '2024-01',
      value: meta.defaultValue,
      createdAt: new Date().toISOString(),
      note: '兜底默认值',
      status: 'approved' as FactorStatus,
      submittedBy: '系统',
      submittedAt: new Date().toISOString(),
    };
  },

  getEffectiveFactorsForPeriod: (period) => {
    const keys: EmissionFactorKey[] = ['electricity', 'gas', 'steam', 'fuel'];
    const result = {} as Record<EmissionFactorKey, EmissionFactor>;
    keys.forEach((key) => {
      result[key] = get().getEffectiveFactor(key, period);
    });
    return result;
  },

  getLatestApprovedFactors: () => {
    const keys: EmissionFactorKey[] = ['electricity', 'gas', 'steam', 'fuel'];
    const result = {} as Record<EmissionFactorKey, EmissionFactor>;
    keys.forEach((key) => {
      const candidates = get()
        .factors.filter((f) => f.key === key && f.status === 'approved')
        .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
      result[key] = candidates[0] || {
        id: `latest-${key}`,
        key,
        label: FACTOR_META[key].label,
        unit: FACTOR_META[key].unit,
        version: '默认',
        effectiveMonth: '2024-01',
        value: FACTOR_META[key].defaultValue,
        createdAt: new Date().toISOString(),
        status: 'approved' as FactorStatus,
        submittedBy: '系统',
        submittedAt: new Date().toISOString(),
      };
    });
    return result;
  },

  getFactorHistory: (key) => {
    return get()
      .factors.filter((f) => f.key === key)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  },

  getPendingFactors: () => get().factors.filter((f) => f.status === 'pending'),

  getFactorsByStatus: (status) => get().factors.filter((f) => f.status === status),

  getFactorsByKey: (key) =>
    get()
      .factors.filter((f) => f.key === key)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth)),
}));

export { FACTOR_META };
