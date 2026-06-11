import { create } from 'zustand';
import type {
  ReportArchive,
  ReportArchiveDataRow,
  EmissionFactorKey,
  ReportTemplate,
  EmissionStatus,
} from '@/types';
import { persistAll } from './persist';
import { readPersistedData } from '@/utils/persist';

function getInitialArchives(): ReportArchive[] {
  const persisted = readPersistedData();
  if (persisted?.archives && Array.isArray(persisted.archives)) {
    return persisted.archives;
  }
  return [];
}

interface ReportState {
  archives: ReportArchive[];
  initArchives: (archives: ReportArchive[]) => void;
  addArchive: (archive: Omit<ReportArchive, 'id' | 'generatedAt'>) => ReportArchive;
  removeArchive: (id: string) => void;
  getArchive: (id: string) => ReportArchive | undefined;
  getArchives: (filters?: {
    template?: ReportTemplate;
    enterpriseId?: string;
    industries?: string[];
    startMonth?: string;
    endMonth?: string;
    generatedBy?: string;
  }) => ReportArchive[];
}

export const useReportStore = create<ReportState>((set, get) => ({
  archives: getInitialArchives(),

  initArchives: (archives) => set({ archives }),

  addArchive: (archive) => {
    const newArchive: ReportArchive = {
      ...archive,
      id: `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
    };
    set((state) => ({ archives: [newArchive, ...state.archives] }));
    persistAll();
    return newArchive;
  },

  removeArchive: (id) => {
    set((state) => ({ archives: state.archives.filter((a) => a.id !== id) }));
    persistAll();
  },

  getArchive: (id) => get().archives.find((a) => a.id === id),

  getArchives: (filters) => {
    let result = [...get().archives];
    if (!filters) return result;

    if (filters.template) {
      result = result.filter((a) => a.template === filters.template);
    }
    if (filters.enterpriseId) {
      result = result.filter((a) => a.enterpriseId === filters.enterpriseId);
    }
    if (filters.industries && filters.industries.length > 0) {
      result = result.filter((a) =>
        a.industries.some((ind) => filters.industries!.includes(ind))
      );
    }
    if (filters.startMonth) {
      result = result.filter((a) => a.endMonth >= filters.startMonth!);
    }
    if (filters.endMonth) {
      result = result.filter((a) => a.startMonth <= filters.endMonth!);
    }
    if (filters.generatedBy) {
      result = result.filter((a) =>
        a.generatedBy.includes(filters.generatedBy!)
      );
    }
    return result.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  },
}));

export function buildArchiveDataRows(
  data: any[],
  results: any[]
): ReportArchiveDataRow[] {
  return data.map((item, idx) => {
    const r = results[idx] || {};
    return {
      enterpriseId: item.enterpriseId,
      enterpriseName: item.enterpriseName || '',
      industry: item.industry || '',
      period: item.period,
      electricity: item.electricity,
      gas: item.gas,
      steam: item.steam,
      fuel: item.fuel,
      production: item.production,
      scope1: r.scope1 || 0,
      scope2: r.scope2 || 0,
      total: r.total || 0,
      breakdownElectricity: r.breakdown?.electricity || 0,
      breakdownGas: r.breakdown?.gas || 0,
      breakdownSteam: r.breakdown?.steam || 0,
      breakdownFuel: r.breakdown?.fuel || 0,
      status: item.status as EmissionStatus,
      submitTime: item.submitTime,
      auditor: item.auditor,
      auditOpinion: item.auditOpinion,
    };
  });
}

export function buildFactorSnapshot(
  factorVersionMap: Record<EmissionFactorKey, { version: string; value: number; effectiveMonth: string }>,
  summaryLabel: string
) {
  return {
    summaryLabel,
    detail: factorVersionMap,
  };
}
