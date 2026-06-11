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
  approve: (id: string, auditor: string, opinion?: string) => AuditRecord | null;
  reject: (id: string, auditor: string, opinion: string) => AuditRecord | null;
  batchApprove: (ids: string[], auditor: string) => string[];
  lockPeriod: (id: string, auditor?: string) => { success: boolean; record: AuditRecord | null };
  batchLock: (ids: string[], auditor?: string) => string[];
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  getAttachments: (enterpriseId: string, period: string) => Attachment[];
  getRecordsForEmission: (emissionDataId: string) => AuditRecord[];
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
      return null;
    }

    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    return record;
  },

  reject: (id, auditor, opinion) => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    if (!emissionData || emissionData.status !== 'pending') {
      return null;
    }

    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    return record;
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
        id: `audit-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 6)}`,
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

  lockPeriod: (id, auditor = '系统管理员') => {
    const timestamp = new Date().toISOString();
    const emissionState = useEmissionStore.getState();
    const emissionData = emissionState.emissionData.find((d: EmissionData) => d.id === id);

    if (!emissionData || emissionData.status !== 'approved') {
      return { success: false, record: null };
    }

    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      emissionDataId: id,
      enterpriseId: emissionData?.enterpriseId || '',
      period: emissionData?.period || '',
      auditor,
      action: 'lock',
      opinion: '管理员锁定该月份数据，不可修改',
      timestamp
    };

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        d.id === id ? { ...d, status: 'locked', updatedAt: timestamp } : d
      )
    });

    set((state) => ({
      auditRecords: [...state.auditRecords, record]
    }));

    persistAll();
    return { success: true, record };
  },

  batchLock: (ids, auditor = '系统管理员') => {
    const emissionState = useEmissionStore.getState();
    const timestamp = new Date().toISOString();

    const approvedIds = ids.filter(id => {
      const data = emissionState.emissionData.find(d => d.id === id);
      return data && data.status === 'approved';
    });

    if (approvedIds.length === 0) {
      return [];
    }

    const newRecords: AuditRecord[] = approvedIds.map(id => {
      const data = emissionState.emissionData.find(d => d.id === id);
      return {
        id: `audit-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 6)}`,
        emissionDataId: id,
        enterpriseId: data?.enterpriseId || '',
        period: data?.period || '',
        auditor,
        action: 'lock',
        opinion: '批量锁定该月份数据',
        timestamp
      };
    });

    useEmissionStore.setState({
      emissionData: emissionState.emissionData.map((d: EmissionData) =>
        approvedIds.includes(d.id)
          ? { ...d, status: 'locked', updatedAt: timestamp }
          : d
      )
    });

    set((state) => ({
      auditRecords: [...state.auditRecords, ...newRecords]
    }));

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
    ),

  getRecordsForEmission: (emissionDataId) =>
    get()
      .auditRecords.filter((r) => r.emissionDataId === emissionDataId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}));
