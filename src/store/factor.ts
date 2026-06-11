import { create } from 'zustand';
import type { EmissionFactor, EmissionFactorKey } from '@/types';
import { persistAll } from './persist';

interface FactorState {
  factors: EmissionFactor[];
  initFactors: (factors: EmissionFactor[]) => void;
  addFactor: (factor: Omit<EmissionFactor, 'id' | 'createdAt'>) => EmissionFactor;
  removeFactor: (id: string) => void;
  getEffectiveFactor: (key: EmissionFactorKey, period: string) => EmissionFactor;
  getEffectiveFactorsForPeriod: (period: string) => Record<EmissionFactorKey, EmissionFactor>;
  getLatestFactors: () => Record<EmissionFactorKey, EmissionFactor>;
  getFactorHistory: (key: EmissionFactorKey) => EmissionFactor[];
}

const FACTOR_META: Record<EmissionFactorKey, { label: string; unit: string; defaultValue: number }> = {
  electricity: { label: '电力', unit: 'tCO₂/kWh', defaultValue: 0.000581 },
  gas: { label: '天然气', unit: 'tCO₂/m³', defaultValue: 0.0021622 },
  steam: { label: '蒸汽', unit: 'tCO₂/t', defaultValue: 0.11 },
  fuel: { label: '燃油', unit: 'tCO₂/t', defaultValue: 0.0029251 },
};

function getInitialFactors(): EmissionFactor[] {
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
    });
  });
  return factors;
}

export const useFactorStore = create<FactorState>((set, get) => ({
  factors: getInitialFactors(),

  initFactors: (factors) => set({ factors }),

  addFactor: (factor) => {
    const newFactor: EmissionFactor = {
      ...factor,
      id: `F${String(Date.now()).slice(-8)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ factors: [newFactor, ...state.factors] }));
    persistAll();
    return newFactor;
  },

  removeFactor: (id) => {
    set((state) => ({ factors: state.factors.filter((f) => f.id !== id) }));
    persistAll();
  },

  getEffectiveFactor: (key, period) => {
    const candidates = get().factors
      .filter((f) => f.key === key && f.effectiveMonth <= period)
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

  getLatestFactors: () => {
    const keys: EmissionFactorKey[] = ['electricity', 'gas', 'steam', 'fuel'];
    const result = {} as Record<EmissionFactorKey, EmissionFactor>;
    keys.forEach((key) => {
      const candidates = get()
        .factors.filter((f) => f.key === key)
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
      };
    });
    return result;
  },

  getFactorHistory: (key) => {
    return get()
      .factors.filter((f) => f.key === key)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
  },
}));

export { FACTOR_META };
