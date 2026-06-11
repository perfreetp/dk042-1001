import { writePersistedData } from '@/utils/persist';
import type { PersistedData } from '@/utils/persist';

type StateGetter = () => PersistedData;

let getState: StateGetter | null = null;

export function registerStateGetter(getter: StateGetter) {
  getState = getter;
}

export function persistAll() {
  if (!getState) return;
  const state = getState();
  writePersistedData({
    enterprises: state.enterprises,
    emissionData: state.emissionData,
    attachments: state.attachments,
    auditRecords: state.auditRecords,
    factors: state.factors,
    archives: state.archives,
  });
}
