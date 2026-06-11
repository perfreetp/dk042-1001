import { registerStateGetter } from './persist';
import { useEnterpriseStore } from './enterprise';
import { useEmissionStore } from './emission';
import { useAuditStore } from './audit';
import { useFactorStore } from './factor';

registerStateGetter(() => ({
  enterprises: useEnterpriseStore.getState().enterprises,
  emissionData: useEmissionStore.getState().emissionData,
  attachments: useAuditStore.getState().attachments,
  auditRecords: useAuditStore.getState().auditRecords,
  factors: useFactorStore.getState().factors,
}));

export { useEnterpriseStore } from './enterprise';
export { useEmissionStore } from './emission';
export { useAuditStore } from './audit';
export { useFactorStore } from './factor';
export { useUIStore } from './ui';
