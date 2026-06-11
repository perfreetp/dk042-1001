import type { Enterprise, EmissionData, Attachment, AuditRecord, EmissionFactor, ReportArchive } from '@/types';

const STORAGE_KEY = 'carbon_emission_mock_data';

export interface PersistedData {
  enterprises: Enterprise[];
  emissionData: EmissionData[];
  attachments: Attachment[];
  auditRecords: AuditRecord[];
  factors: EmissionFactor[];
  archives: ReportArchive[];
}

export function readPersistedData(): PersistedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    console.error('Failed to read persisted data');
  }
  return null;
}

export function writePersistedData(data: Partial<PersistedData>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readPersistedData();
    const merged: PersistedData = {
      enterprises: data.enterprises || existing?.enterprises || [],
      emissionData: data.emissionData || existing?.emissionData || [],
      attachments: data.attachments || existing?.attachments || [],
      auditRecords: data.auditRecords || existing?.auditRecords || [],
      factors: data.factors || existing?.factors || [],
      archives: data.archives || existing?.archives || [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    console.error('Failed to write persisted data');
  }
}

export function clearPersistedData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
