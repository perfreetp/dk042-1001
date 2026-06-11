import type { EmissionData, EmissionResult, EmissionResultWithVersion, EmissionFactor, EmissionFactorKey } from '../types';
import { useFactorStore } from '../store/factor';

export const EMISSION_FACTORS = {
  electricity: 0.000581,
  gas: 0.0021622,
  steam: 0.11,
  fuel: 0.0029251,
} as const;

export function calculateEmission(data: Partial<EmissionData>): EmissionResult {
  const { electricity = 0, gas = 0, steam = 0, fuel = 0 } = data;
  const period = data.period || new Date().toISOString().slice(0, 7);

  const factors = useFactorStore.getState().getEffectiveFactorsForPeriod(period);

  const electricityEmission = electricity * factors.electricity.value;
  const gasEmission = gas * factors.gas.value;
  const steamEmission = steam * factors.steam.value;
  const fuelEmission = fuel * factors.fuel.value;

  const scope1 = gasEmission + fuelEmission;
  const scope2 = electricityEmission + steamEmission;
  const total = scope1 + scope2;

  return {
    scope1,
    scope2,
    total,
    breakdown: {
      electricity: electricityEmission,
      gas: gasEmission,
      steam: steamEmission,
      fuel: fuelEmission,
    },
  };
}

export function calculateEmissionWithVersion(data: Partial<EmissionData>): EmissionResultWithVersion {
  const { electricity = 0, gas = 0, steam = 0, fuel = 0 } = data;
  const period = data.period || new Date().toISOString().slice(0, 7);

  const factors = useFactorStore.getState().getEffectiveFactorsForPeriod(period);

  const calc = (val: number, factor: EmissionFactor) => val * factor.value;

  const electricityEmission = calc(electricity, factors.electricity);
  const gasEmission = calc(gas, factors.gas);
  const steamEmission = calc(steam, factors.steam);
  const fuelEmission = calc(fuel, factors.fuel);

  const scope1 = gasEmission + fuelEmission;
  const scope2 = electricityEmission + steamEmission;
  const total = scope1 + scope2;

  const buildVersionEntry = (f: EmissionFactor) => ({
    version: f.version,
    value: f.value,
    effectiveMonth: f.effectiveMonth,
  });

  return {
    scope1,
    scope2,
    total,
    breakdown: {
      electricity: electricityEmission,
      gas: gasEmission,
      steam: steamEmission,
      fuel: fuelEmission,
    },
    factorVersionMap: {
      electricity: buildVersionEntry(factors.electricity),
      gas: buildVersionEntry(factors.gas),
      steam: buildVersionEntry(factors.steam),
      fuel: buildVersionEntry(factors.fuel),
    },
  };
}

export function getFactorSummaryLabel(factorMap: EmissionResultWithVersion['factorVersionMap']): string {
  const keys: EmissionFactorKey[] = ['electricity', 'gas', 'steam', 'fuel'];
  const uniqueVersions = new Map<string, string>();
  keys.forEach((k) => {
    const entry = factorMap[k];
    if (entry.version && entry.version !== '默认') uniqueVersions.set(k, `${entry.version}(${entry.effectiveMonth})`);
  });
  if (uniqueVersions.size === 0) return '默认因子';
  const unique = Array.from(new Set(Array.from(uniqueVersions.values())));
  if (unique.length === 1) return `因子 ${unique[0]}`;
  return `因子版本混合 · ${keys.map((k) => `${k.charAt(0).toUpperCase()}:${uniqueVersions.get(k) || '默认'}`).join(' ')}`;
}
