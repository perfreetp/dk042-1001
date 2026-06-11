import { create } from 'zustand';
import type { AuditRecord, Attachment, EmissionData } from '@/types';
import { initMockData } from './mockData';
import { useEmissionStore } from './emission';

interface AuditState {
  auditRecords: AuditRecord[];
  attachments: Attachment[];
  initAuditRecords: (records: AuditRecord[]) => void;
  initAttachments: (attachments: Attachment[]) => void;
  approve: (id: string, auditor: string, opinion?: string) => void;
  reject: (id: string, auditor: string, opinion: string) => void;
  batchApprove: (ids: string[], auditor: string) => void;
  lockPeriod: (id: string) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  getAttachments: (enterpriseId: string, period: string) => Attachment[];
}

const mockData = initMockData();

export const useAuditStore = create<AuditState>((set, get) => ({
  auditRecords: mockData.auditRecords,
  attachments: mockData.attachments,

  initAuditRecords: (records) => set({ auditRecords: records }),

  initAttachments: (attachments) => set({ attachments }),

  approve: (id, auditor, opinion) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    const record: AuditRecord = {
      id: `audit-${Date.now()}`,
      emissionDataId: id,
      enterpriseId: emissionData?.enterpriseId || '',
      period: emissionData?.period || '',
      auditor,
      action: 'approve',
      opinion,
      timestamp
    };

    if (emissionData) {
      useEmissionStore.setState({
        emissionData: emissionState.emissionData.map((d: EmissionData) =>
          d.id === id
            ? { ...d, status: 'approved', approvedAt: timestamp, auditor, auditOpinion: opinion, updatedAt: timestamp }
            : d
        )
      });
    }

    set((state) => ({
      auditRecords: [...state.auditRecords, record]
    }));
  },

  reject: (id, auditor, opinion) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    const record: AuditRecord = {
      id: `audit-${Date.now()}`,
      emissionDataId: id,
      enterpriseId: emissionData?.enterpriseId || '',
      period: emissionData?.period || '',
      auditor,
      action: 'reject',
      opinion,
      timestamp
    };

    if (emissionData) {
      useEmissionStore.setState({
        emissionData: emissionState.emissionData.map((d: EmissionData) =>
          d.id === id ? { ...d, status: 'rejected', auditor, auditOpinion: opinion, updatedAt: timestamp } : d
        )
      });
    }

    set((state) => ({
      auditRecords: [...state.auditRecords, record]
    }));
  },

  batchApprove: (ids, auditor) => {
    ids.forEach((id) => {
      get().approve(id, auditor);
    });
  },

  lockPeriod: (id) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        d.id === id ? { ...d, status: 'locked', updatedAt: timestamp } : d
      )
    });
  },

  addAttachment: (attachment) =>
    set((state) => ({
      attachments: [...state.attachments, attachment]
    })),

  removeAttachment: (id) =>
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id)
    })),

  getAttachments: (enterpriseId, period) =>
    get().attachments.filter(
      (a) => a.enterpriseId === enterpriseId && a.period === period
    )
}));
