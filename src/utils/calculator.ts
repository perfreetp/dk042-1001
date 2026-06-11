import type { EmissionData, EmissionResult } from '../types';

export const EMISSION_FACTORS = {
  electricity: 0.000581,
  gas: 0.0021622,
  steam: 0.11,
  fuel: 0.0029251,
} as const;

export function calculateEmission(data: Partial<EmissionData>): EmissionResult {
  const { electricity = 0, gas = 0, steam = 0, fuel = 0 } = data;

  const electricityEmission = electricity * EMISSION_FACTORS.electricity;
  const gasEmission = gas * EMISSION_FACTORS.gas;
  const steamEmission = steam * EMISSION_FACTORS.steam;
  const fuelEmission = fuel * EMISSION_FACTORS.fuel;

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
