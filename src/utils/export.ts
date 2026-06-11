import type { Enterprise, EmissionData, EmissionResult } from '../types';
import { calculateEmission } from './calculator';
import { formatEmission, formatDateTime } from './formatter';

export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ];

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEnterprises(enterprises: Enterprise[]): void {
  const exportData = enterprises.map((e) => ({
    '企业ID': e.id,
    '企业名称': e.name,
    '统一社会信用代码': e.creditCode,
    '所属行业': e.industry,
    '企业规模': e.scale,
    '联系人': e.contactPerson,
    '联系电话': e.contactPhone,
    '地址': e.address,
    '状态': e.status === 'active' ? '活跃' : '停用',
    '创建时间': formatDateTime(e.createdAt),
  }));
  exportToCSV(exportData, '企业清单');
}

export function exportEmissionReport(
  data: (EmissionData & { enterpriseName?: string; result?: EmissionResult })[]
): void {
  const exportData = data.map((item) => {
    const result = item.result || calculateEmission(item);
    return {
      '企业名称': item.enterpriseName || '',
      '统计周期': item.period,
      '用电量(kWh)': item.electricity,
      '天然气(m³)': item.gas,
      '蒸汽(t)': item.steam,
      '燃料(t)': item.fuel,
      '产量': item.production,
      '范围一排放(tCO₂)': result.scope1.toFixed(2),
      '范围二排放(tCO₂)': result.scope2.toFixed(2),
      '总排放(tCO₂)': result.total.toFixed(2),
      '电力排放(tCO₂)': result.breakdown.electricity.toFixed(2),
      '天然气排放(tCO₂)': result.breakdown.gas.toFixed(2),
      '蒸汽排放(tCO₂)': result.breakdown.steam.toFixed(2),
      '燃料排放(tCO₂)': result.breakdown.fuel.toFixed(2),
      '状态': (() => {
        switch (item.status) {
          case 'draft': return '草稿';
          case 'pending': return '待审核';
          case 'approved': return '已通过';
          case 'rejected': return '已驳回';
          case 'locked': return '已锁定';
          default: return item.status;
        }
      })(),
      '提交时间': item.submitTime ? formatDateTime(item.submitTime) : '',
      '审核人': item.auditor || '',
      '审核意见': item.auditOpinion || '',
    };
  });
  exportToCSV(exportData, '碳排放核算报告');
}
