import { registerStateGetter } from './persist';
import { useEnterpriseStore } from './enterprise';
import { useEmissionStore } from './emission';
import { useAuditStore } from './audit';

registerStateGetter(() => ({
  enterprises: useEnterpriseStore.getState().enterprises,
  emissionData: useEmissionStore.getState().emissionData,
  attachments: useAuditStore.getState().attachments,
  auditRecords: useAuditStore.getState().auditRecords,
}));

export { useEnterpriseStore } from './enterprise';
export { useEmissionStore } from './emission';
export { useAuditStore } from './audit';
export { useUIStore } from './ui';
