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

interface AnomalyInfo {
  anomalies: {
    id: string;
    enterpriseId: string;
    enterpriseName: string;
    period: string;
    type: '同比' | '环比';
    changeRate: number;
    message: string;
  }[];
  energyBreakdownDetails: {
    enterpriseId: string;
    enterpriseName: string;
    period: string;
    energyKey: string;
    energyLabel: string;
    current: number;
    previous: number;
    changeRate: number;
    emissionChange: number;
  }[];
  filters: {
    enterprises: string;
    industries: string;
    periodRange: string;
    recordCount: number;
  };
  scopeSummary: {
    scope1: number;
    scope2: number;
    total: number;
  };
  industrySummary: {
    industry: string;
    scope1: number;
    scope2: number;
    total: number;
    count: number;
  }[];
}

export function exportEmissionReport(
  data: (EmissionData & { enterpriseName?: string; result?: EmissionResult; industry?: string })[],
  anomalyInfo?: AnomalyInfo
): void {
  const exportData: any[] = [];

  exportData.push({ '【报告汇总信息】': '' });
  exportData.push({ '生成时间': formatDateTime(new Date().toISOString()) });
  if (anomalyInfo) {
    exportData.push({ '企业范围': anomalyInfo.filters.enterprises });
    exportData.push({ '行业范围': anomalyInfo.filters.industries });
    exportData.push({ '月份范围': anomalyInfo.filters.periodRange });
    exportData.push({ '记录数量': anomalyInfo.filters.recordCount });
    exportData.push({ '' : '' });
    exportData.push({ '【范围排放汇总】': '' });
    exportData.push({ '范围一(tCO₂)': anomalyInfo.scopeSummary.scope1.toFixed(2) });
    exportData.push({ '范围二(tCO₂)': anomalyInfo.scopeSummary.scope2.toFixed(2) });
    exportData.push({ '总排放(tCO₂)': anomalyInfo.scopeSummary.total.toFixed(2) });
    if (anomalyInfo.scopeSummary.total > 0) {
      exportData.push({ '范围一占比(%)': ((anomalyInfo.scopeSummary.scope1 / anomalyInfo.scopeSummary.total) * 100).toFixed(2) });
      exportData.push({ '范围二占比(%)': ((anomalyInfo.scopeSummary.scope2 / anomalyInfo.scopeSummary.total) * 100).toFixed(2) });
    }
  }

  if (anomalyInfo && anomalyInfo.industrySummary.length > 0) {
    exportData.push({ '' : '' });
    exportData.push({ '【行业排放汇总】': '' });
    exportData.push({
      '行业': '',
      '企业数量': '',
      '范围一(tCO₂)': '',
      '范围二(tCO₂)': '',
      '总排放(tCO₂)': '',
    });
    anomalyInfo.industrySummary.forEach((item) => {
      exportData.push({
        '行业': item.industry,
        '企业数量': item.count,
        '范围一(tCO₂)': item.scope1.toFixed(2),
        '范围二(tCO₂)': item.scope2.toFixed(2),
        '总排放(tCO₂)': item.total.toFixed(2),
      });
    });
  }

  exportData.push({ '' : '' });
  exportData.push({ '【企业明细数据】': '' });

  const firstDataRow = {
    '企业名称': '',
    '所属行业': '',
    '统计周期': '',
    '用电量(kWh)': '',
    '天然气(m³)': '',
    '蒸汽(t)': '',
    '燃料(t)': '',
    '产量': '',
    '范围一排放(tCO₂)': '',
    '范围二排放(tCO₂)': '',
    '总排放(tCO₂)': '',
    '电力排放(tCO₂)': '',
    '天然气排放(tCO₂)': '',
    '蒸汽排放(tCO₂)': '',
    '燃料排放(tCO₂)': '',
    '状态': '',
    '提交时间': '',
    '审核人': '',
    '审核意见': '',
  };
  exportData.push(firstDataRow);

  data.forEach((item) => {
    const result = item.result || calculateEmission(item);
    exportData.push({
      '企业名称': item.enterpriseName || '',
      '所属行业': item.industry || '',
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
    });
  });

  if (anomalyInfo && (anomalyInfo.anomalies.length > 0 || anomalyInfo.energyBreakdownDetails.length > 0)) {
    exportData.push({ '' : '' });
    exportData.push({ '【异常波动说明】': '' });
  }

  if (anomalyInfo && anomalyInfo.anomalies.length > 0) {
    exportData.push({ '异常类型一：排放总量异常（同比/环比）': '' });
    exportData.push({
      '企业名称': '',
      '月份': '',
      '类型（同比/环比）': '',
      '变化率(%)': '',
      '说明': '',
    });
    anomalyInfo.anomalies.forEach((a) => {
      exportData.push({
        '企业名称': a.enterpriseName,
        '月份': a.period,
        '类型（同比/环比）': a.type,
        '变化率(%)': a.changeRate.toFixed(2),
        '说明': a.message,
      });
    });
  }

  if (anomalyInfo && anomalyInfo.energyBreakdownDetails.length > 0) {
    exportData.push({ '' : '' });
    exportData.push({ '异常类型二：能源分项异常（变化率>30%）': '' });
    exportData.push({
      '企业名称': '',
      '月份': '',
      '能源类型': '',
      '上期值': '',
      '本期值': '',
      '变化率(%)': '',
      '排放变化(tCO₂)': '',
    });
    anomalyInfo.energyBreakdownDetails.forEach((e) => {
      exportData.push({
        '企业名称': e.enterpriseName,
        '月份': e.period,
        '能源类型': e.energyLabel,
        '上期值': e.previous,
        '本期值': e.current,
        '变化率(%)': e.changeRate.toFixed(2),
        '排放变化(tCO₂)': e.emissionChange.toFixed(2),
      });
    });
  }

  exportToCSV(exportData, '碳排放核算报告');
}
