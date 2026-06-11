export interface Enterprise {
  id: string;
  name: string;
  code?: string;
  creditCode: string;
  industry: string;
  scale: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface EmissionSource {
  name: string;
  fuelType: string;
  consumption: number;
  unit: string;
  emissionFactor: number;
  emission: number;
}

export type EmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'locked';

export interface EmissionData {
  id: string;
  enterpriseId: string;
  period: string;
  status: EmissionStatus;
  sources?: EmissionSource[];
  totalEmission?: number;
  electricity: number;
  gas: number;
  steam: number;
  fuel: number;
  production: number;
  submitTime?: string;
  submittedAt?: string;
  approvedAt?: string;
  auditor?: string;
  auditOpinion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmissionResult {
  scope1: number;
  scope2: number;
  total: number;
  breakdown: {
    electricity: number;
    gas: number;
    steam: number;
    fuel: number;
  };
}

export interface AuditRecord {
  id: string;
  emissionDataId: string;
  enterpriseId: string;
  period: string;
  auditor: string;
  action: 'approve' | 'reject' | 'submit' | 'lock';
  opinion?: string;
  timestamp: string;
  previousStatus?: EmissionStatus;
}

export interface Attachment {
  id: string;
  enterpriseId: string;
  emissionDataId: string;
  period: string;
  name?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  uploadTime: string;
}

export type EmissionFactorKey = 'electricity' | 'gas' | 'steam' | 'fuel';

export type FactorStatus = 'pending' | 'approved' | 'rejected';

export interface EmissionFactor {
  id: string;
  key: EmissionFactorKey;
  label: string;
  unit: string;
  version: string;
  effectiveMonth: string;
  value: number;
  createdAt: string;
  note?: string;
  status: FactorStatus;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewOpinion?: string;
}

export interface EmissionResultWithVersion extends EmissionResult {
  factorVersionMap: Record<EmissionFactorKey, { version: string; value: number; effectiveMonth: string }>;
}

export type UserRole = 'enterprise' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  enterpriseId?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type ReportTemplate = 'park' | 'enterprise';

export interface ReportArchiveFilterSnapshot {
  enterpriseIds: string[];
  industries: string[];
  startMonth: string;
  endMonth: string;
  enterpriseName?: string;
}

export interface ReportArchiveFactorSnapshot {
  summaryLabel: string;
  detail: Record<EmissionFactorKey, { version: string; value: number; effectiveMonth: string }>;
}

export interface ReportArchiveSummary {
  scope1: number;
  scope2: number;
  total: number;
  breakdown: { electricity: number; gas: number; steam: number; fuel: number };
  industrySummary: { industry: string; scope1: number; scope2: number; total: number; count: number }[];
  anomalyCount: number;
}

export interface ReportArchiveDataRow {
  enterpriseId: string;
  enterpriseName: string;
  industry: string;
  period: string;
  electricity: number;
  gas: number;
  steam: number;
  fuel: number;
  production: number;
  scope1: number;
  scope2: number;
  total: number;
  breakdownElectricity: number;
  breakdownGas: number;
  breakdownSteam: number;
  breakdownFuel: number;
  status: EmissionStatus;
  submitTime?: string;
  auditor?: string;
  auditOpinion?: string;
}

export interface ReportArchiveAttachment {
  period: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadTime: string;
}

export interface ReportArchiveAnomaly {
  period: string;
  type: '同比' | '环比';
  changeRate: number;
  message: string;
  energyKey?: string;
  energyLabel?: string;
  current?: number;
  previous?: number;
  emissionChange?: number;
}

export interface ReportArchive {
  id: string;
  title: string;
  template: ReportTemplate;
  enterpriseId?: string;
  enterpriseName?: string;
  industries: string[];
  startMonth: string;
  endMonth: string;
  recordCount: number;
  generatedBy: string;
  generatedAt: string;
  factorVersion: ReportArchiveFactorSnapshot;
  filterSnapshot: ReportArchiveFilterSnapshot;
  summary: ReportArchiveSummary;
  dataRows: ReportArchiveDataRow[];
  attachments: ReportArchiveAttachment[];
  anomalies: ReportArchiveAnomaly[];
  monthlyTrend: { period: string; scope1: number; scope2: number }[];
}
