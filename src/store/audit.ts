import { create } from 'zustand';
import type { AuditRecord, Attachment, EmissionData } from '@/types';
import { initMockData } from './mockData';
import { persistAll } from './persist';
import { useEmissionStore } from './emission';

interface AuditState {
  auditRecords: AuditRecord[];
  attachments: Attachment[];
  initAuditRecords: (records: AuditRecord[]) => void;
  initAttachments: (attachments: Attachment[]) => void;
  approve: (id: string, auditor: string, opinion?: string) => void;
  reject: (id: string, auditor: string, opinion: string) => void;
  batchApprove: (ids: string[], auditor: string) => string[];
  lockPeriod: (id: string) => boolean;
  batchLock: (ids: string[]) => string[];
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

    if (!emissionData || emissionData.status !== 'pending') {
      return;
    }

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

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        d.id === id
          ? { ...d, status: 'approved', approvedAt: timestamp, auditor, auditOpinion: opinion, updatedAt: timestamp }
          : d
      )
    });

    set((state) => ({
      auditRecords: [...state.auditRecords, record]
    }));
    
    persistAll();
  },

  reject: (id, auditor, opinion) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    if (!emissionData || emissionData.status !== 'pending') {
      return;
    }

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

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        d.id === id ? { ...d, status: 'rejected', auditor, auditOpinion: opinion, updatedAt: timestamp } : d
      )
    });

    set((state) => ({
      auditRecords: [...state.auditRecords, record]
    }));
    
    persistAll();
  },

  batchApprove: (ids, auditor) => {
    const emissionState = useEmissionStore.getState();
    const timestamp = new Date().toISOString();
    
    const pendingIds = ids.filter(id => {
      const data = emissionState.emissionData.find(d => d.id === id);
      return data && data.status === 'pending';
    });

    if (pendingIds.length === 0) {
      return [];
    }

    const newRecords: AuditRecord[] = pendingIds.map(id => {
      const data = emissionState.emissionData.find(d => d.id === id);
      return {
        id: `audit-${Date.now()}-${id}`,
        emissionDataId: id,
        enterpriseId: data?.enterpriseId || '',
        period: data?.period || '',
        auditor,
        action: 'approve',
        opinion: '批量审核通过',
        timestamp
      };
    });

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        pendingIds.includes(d.id)
          ? { ...d, status: 'approved', approvedAt: timestamp, auditor, auditOpinion: '批量审核通过', updatedAt: timestamp }
          : d
      )
    });

    set((state) => ({
      auditRecords: [...state.auditRecords, ...newRecords]
    }));

    persistAll();
    return pendingIds;
  },

  lockPeriod: (id) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    if (!emissionData || emissionData.status !== 'approved') {
      return false;
    }

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        d.id === id ? { ...d, status: 'locked', updatedAt: timestamp } : d
      )
    });

    persistAll();
    return true;
  },

  batchLock: (ids) => {
    const emissionState = useEmissionStore.getState();
    const timestamp = new Date().toISOString();
    
    const approvedIds = ids.filter(id => {
      const data = emissionState.emissionData.find(d => d.id === id);
      return data && data.status === 'approved';
    });

    if (approvedIds.length === 0) {
      return [];
    }

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        approvedIds.includes(d.id)
          ? { ...d, status: 'locked', updatedAt: timestamp }
          : d
      )
    });

    persistAll();
    return approvedIds;
  },

  addAttachment: (attachment) => {
    set((state) => ({
      attachments: [...state.attachments, attachment]
    }));
    persistAll();
  },

  removeAttachment: (id) => {
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id)
    }));
    persistAll();
  },

  getAttachments: (enterpriseId, period) =>
    get().attachments.filter(
      (a) => a.enterpriseId === enterpriseId && a.period === period
    )
}));
