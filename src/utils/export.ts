import type { Enterprise, EmissionData, EmissionResult, EmissionResultWithVersion } from '../types';
import { calculateEmission, calculateEmissionWithVersion } from './calculator';
import { formatEmission, formatDateTime } from './formatter';

const MAX_CSV_COLUMNS = 18;

function buildEmptyRow(): Record<string, string> {
  const row: Record<string, string> = {};
  for (let i = 1; i <= MAX_CSV_COLUMNS; i++) {
    row[`col${i}`] = '';
  }
  return row;
}

function buildSectionTitleRow(title: string): Record<string, string> {
  const row = buildEmptyRow();
  row.col1 = title;
  return row;
}

function buildRowFromArray(values: (string | number)[]): Record<string, string> {
  const row = buildEmptyRow();
  values.forEach((v, i) => {
    if (i < MAX_CSV_COLUMNS) {
      row[`col${i + 1}`] = String(v ?? '');
    }
  });
  return row;
}

export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) return;

  let headers: string[];
  const firstKeys = Object.keys(data[0]);
  const hasFixedCols = firstKeys.every(k => /^col\d+$/.test(k));
  if (hasFixedCols) {
    headers = firstKeys.sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)));
  } else {
    headers = firstKeys;
  }

  const escapeCell = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => escapeCell(row[h])).join(',')
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
  template?: 'park' | 'enterprise';
  selectedEnterpriseName?: string;
  factorVersionSummary?: string;
  attachments?: {
    period: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadTime: string;
  }[];
  monthlyTrend?: {
    period: string;
    scope1: number;
    scope2: number;
  }[];
}

export function exportEmissionReport(
  data: (EmissionData & { enterpriseName?: string; result?: EmissionResult | EmissionResultWithVersion; industry?: string })[],
  anomalyInfo?: AnomalyInfo
): void {
  const rows: Record<string, string>[] = [];

  rows.push(buildSectionTitleRow('【碳排放核算报告】'));
  rows.push(buildSectionTitleRow(`生成时间：${formatDateTime(new Date().toISOString())}`));

  if (anomalyInfo) {
    if (anomalyInfo.template === 'enterprise' && anomalyInfo.selectedEnterpriseName) {
      rows.push(buildSectionTitleRow(`报告模板：单企业报告`));
      rows.push(buildSectionTitleRow(`企业名称：${anomalyInfo.selectedEnterpriseName}`));
    } else {
      rows.push(buildSectionTitleRow(`报告模板：园区汇总报告`));
    }
    rows.push(buildSectionTitleRow(`企业范围：${anomalyInfo.filters.enterprises}`));
    rows.push(buildSectionTitleRow(`行业范围：${anomalyInfo.filters.industries}`));
    rows.push(buildSectionTitleRow(`月份范围：${anomalyInfo.filters.periodRange}`));
    rows.push(buildSectionTitleRow(`记录数量：${anomalyInfo.filters.recordCount}`));
    if (anomalyInfo.factorVersionSummary) {
      rows.push(buildSectionTitleRow(`因子版本：${anomalyInfo.factorVersionSummary}`));
    }
  }

  rows.push(buildEmptyRow());
  rows.push(buildSectionTitleRow('【范围排放汇总】'));
  if (anomalyInfo) {
    rows.push(buildRowFromArray(['排放范围', '排放量(tCO₂)', '占比(%)']));
    const total = anomalyInfo.scopeSummary.total || 0;
    rows.push(buildRowFromArray(['范围一（直接排放）', anomalyInfo.scopeSummary.scope1.toFixed(2), total > 0 ? ((anomalyInfo.scopeSummary.scope1 / total) * 100).toFixed(2) : '0.00']));
    rows.push(buildRowFromArray(['范围二（间接排放）', anomalyInfo.scopeSummary.scope2.toFixed(2), total > 0 ? ((anomalyInfo.scopeSummary.scope2 / total) * 100).toFixed(2) : '0.00']));
    rows.push(buildRowFromArray(['总排放量', anomalyInfo.scopeSummary.total.toFixed(2), '100.00']));
  }

  if (anomalyInfo && anomalyInfo.industrySummary.length > 0) {
    rows.push(buildEmptyRow());
    rows.push(buildSectionTitleRow('【行业排放汇总】'));
    rows.push(buildRowFromArray(['行业', '企业数量', '范围一(tCO₂)', '范围二(tCO₂)', '总排放(tCO₂)']));
    anomalyInfo.industrySummary.forEach((item) => {
      rows.push(buildRowFromArray([
        item.industry,
        item.count,
        item.scope1.toFixed(2),
        item.scope2.toFixed(2),
        item.total.toFixed(2),
      ]));
    });
  }

  if (anomalyInfo && anomalyInfo.template === 'enterprise' && anomalyInfo.monthlyTrend && anomalyInfo.monthlyTrend.length > 0) {
    rows.push(buildEmptyRow());
    rows.push(buildSectionTitleRow('【月度排放趋势】'));
    rows.push(buildRowFromArray(['统计月份', '范围一(tCO₂)', '范围二(tCO₂)', '总排放(tCO₂)']));
    anomalyInfo.monthlyTrend.forEach((m) => {
      rows.push(buildRowFromArray([
        m.period,
        m.scope1.toFixed(2),
        m.scope2.toFixed(2),
        (m.scope1 + m.scope2).toFixed(2),
      ]));
    });
  }

  rows.push(buildEmptyRow());
  rows.push(buildSectionTitleRow('【企业明细数据】'));
  rows.push(buildRowFromArray([
    '企业名称', '所属行业', '统计周期',
    '用电量(kWh)', '天然气(m³)', '蒸汽(t)', '燃料(t)', '产量',
    '范围一(tCO₂)', '范围二(tCO₂)', '总排放(tCO₂)',
    '电力排放(tCO₂)', '天然气排放(tCO₂)', '蒸汽排放(tCO₂)', '燃料排放(tCO₂)',
    '状态', '提交时间', '审核人', '审核意见',
  ]));

  data.forEach((item) => {
    const result = item.result || calculateEmission(item);
    rows.push(buildRowFromArray([
      item.enterpriseName || '',
      item.industry || '',
      item.period,
      item.electricity,
      item.gas,
      item.steam,
      item.fuel,
      item.production,
      result.scope1.toFixed(2),
      result.scope2.toFixed(2),
      result.total.toFixed(2),
      result.breakdown.electricity.toFixed(2),
      result.breakdown.gas.toFixed(2),
      result.breakdown.steam.toFixed(2),
      result.breakdown.fuel.toFixed(2),
      (() => {
        switch (item.status) {
          case 'draft': return '草稿';
          case 'pending': return '待审核';
          case 'approved': return '已通过';
          case 'rejected': return '已驳回';
          case 'locked': return '已锁定';
          default: return item.status;
        }
      })(),
      item.submitTime ? formatDateTime(item.submitTime) : '',
      item.auditor || '',
      item.auditOpinion || '',
    ]));
  });

  if (anomalyInfo && (anomalyInfo.anomalies.length > 0 || anomalyInfo.energyBreakdownDetails.length > 0)) {
    rows.push(buildEmptyRow());
    rows.push(buildSectionTitleRow('【异常波动说明】'));
  }

  if (anomalyInfo && anomalyInfo.anomalies.length > 0) {
    rows.push(buildSectionTitleRow('● 异常类型一：排放总量异常（同比/环比）'));
    rows.push(buildRowFromArray(['企业名称', '月份', '类型', '变化率(%)', '说明']));
    anomalyInfo.anomalies.forEach((a) => {
      rows.push(buildRowFromArray([
        a.enterpriseName,
        a.period,
        a.type,
        a.changeRate.toFixed(2),
        a.message,
      ]));
    });
  }

  if (anomalyInfo && anomalyInfo.energyBreakdownDetails.length > 0) {
    rows.push(buildEmptyRow());
    rows.push(buildSectionTitleRow('● 异常类型二：能源分项异常（变化率>30%）'));
    rows.push(buildRowFromArray(['企业名称', '月份', '能源类型', '上期值', '本期值', '变化率(%)', '排放变化(tCO₂)']));
    anomalyInfo.energyBreakdownDetails.forEach((e) => {
      rows.push(buildRowFromArray([
        e.enterpriseName,
        e.period,
        e.energyLabel,
        e.previous,
        e.current,
        e.changeRate.toFixed(2),
        e.emissionChange.toFixed(2),
      ]));
    });
  }

  if (anomalyInfo && anomalyInfo.template === 'enterprise' && anomalyInfo.attachments && anomalyInfo.attachments.length > 0) {
    rows.push(buildEmptyRow());
    rows.push(buildSectionTitleRow('【凭证附件清单】'));
    rows.push(buildRowFromArray(['统计月份', '文件名称', '文件类型', '文件大小', '上传时间']));
    anomalyInfo.attachments.forEach((a) => {
      const sizeStr = a.fileSize > 1024
        ? `${(a.fileSize / 1024).toFixed(2)} KB`
        : `${a.fileSize} B`;
      rows.push(buildRowFromArray([
        a.period,
        a.fileName,
        a.fileType,
        sizeStr,
        formatDateTime(a.uploadTime),
      ]));
    });
  }

  exportToCSV(rows, '碳排放核算报告');
}
