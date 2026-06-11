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
  action: 'approve' | 'reject' | 'submit';
  opinion?: string;
  timestamp: string;
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
