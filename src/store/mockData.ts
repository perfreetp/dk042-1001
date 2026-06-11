import type { Enterprise, EmissionData, AuditRecord, Attachment } from '@/types';
import { initMockData as utilsInitMockData } from '@/utils/mockData';

function generateAuditRecords(emissionData: EmissionData[]): AuditRecord[] {
  const records: AuditRecord[] = [];
  let idCounter = 1;

  const AUDITORS = ['张审核', '李主管', '王经理', '赵总监'];
  const AUDIT_OPINIONS = [
    '数据完整，核算准确，予以通过。',
    '部分数据需要补充，请完善后重新提交。',
    '原始凭证齐全，排放量计算符合规范。',
    '请核对燃料消耗量与发票数据。',
  ];

  emissionData.forEach((emi) => {
    if (emi.status === 'draft') return;

    if (emi.submitTime) {
      records.push({
        id: `AUD${String(idCounter++).padStart(6, '0')}`,
        emissionDataId: emi.id,
        enterpriseId: emi.enterpriseId,
        period: emi.period,
        auditor: '企业用户',
        action: 'submit',
        timestamp: emi.submitTime,
      });
    }

    if (emi.status === 'approved' || emi.status === 'rejected' || emi.status === 'locked') {
      records.push({
        id: `AUD${String(idCounter++).padStart(6, '0')}`,
        emissionDataId: emi.id,
        enterpriseId: emi.enterpriseId,
        period: emi.period,
        auditor: emi.auditor || AUDITORS[Math.floor(Math.random() * AUDITORS.length)],
        action: emi.status === 'rejected' ? 'reject' : 'approve',
        opinion: emi.auditOpinion || AUDIT_OPINIONS[Math.floor(Math.random() * AUDIT_OPINIONS.length)],
        timestamp: emi.submitTime ? new Date(new Date(emi.submitTime).getTime() + 86400000).toISOString() : new Date().toISOString(),
      });
    }
  });

  return records;
}

export function initMockData() {
  const baseData = utilsInitMockData();
  const auditRecords = generateAuditRecords(baseData.emissionData);

  const enterprises: Enterprise[] = baseData.enterprises.map((e) => ({
    ...e,
    code: e.creditCode,
  }));

  const emissionData: EmissionData[] = baseData.emissionData.map((d) => ({
    ...d,
    createdAt: d.submitTime || new Date().toISOString(),
    updatedAt: d.submitTime || new Date().toISOString(),
    submittedAt: d.submitTime,
  }));

  const attachments: Attachment[] = baseData.attachments.map((a) => ({
    ...a,
    name: a.fileName,
    url: `/attachments/${a.enterpriseId}/${a.period}/${a.fileName}`,
    uploadedAt: a.uploadTime,
  }));

  return {
    enterprises,
    emissionData,
    auditRecords,
    attachments,
  };
}

export { generateEnterprises, generateEmissionData, generateAttachments } from '@/utils/mockData';
