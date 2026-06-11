import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import {
  Leaf,
  Flame,
  Zap,
  Download,
  Building2,
  ArrowUpDown,
  ChevronDown,
  X,
  Factory,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  Paperclip,
  Calendar,
  SlidersHorizontal,
  Fuel,
  Cloud,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useEmissionStore } from '@/store/emission';
import { useEnterpriseStore } from '@/store/enterprise';
import { useAuditStore } from '@/store/audit';
import { useReportStore } from '@/store/report';
import { useUIStore } from '@/store/ui';
import { calculateEmission, calculateEmissionWithVersion, getFactorSummaryLabel } from '@/utils/calculator';
import { formatEmission, formatNumber, formatDateTime } from '@/utils/formatter';
import { exportEmissionReport } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { EmissionData, EmissionResultWithVersion } from '@/types';

const PIE_COLORS = ['#0F5132', '#F97316', '#0EA5E9', '#A855F7'];

interface EnergyAnomaly {
  enterpriseId: string;
  enterpriseName: string;
  period: string;
  energyKey: string;
  energyLabel: string;
  current: number;
  previous: number;
  changeRate: number;
  emissionChange: number;
}

interface AnomalyRecord {
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  period: string;
  type: '同比' | '环比';
  changeRate: number;
  message: string;
}

function getMonthRange(): { label: string; value: string }[] {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label: value, value });
  }
  return months;
}

type SortKey = 'enterpriseName' | 'period' | 'scope1' | 'scope2' | 'total';
type SortOrder = 'asc' | 'desc';
type ReportTemplate = 'park' | 'enterprise';

interface TableRow extends EmissionData {
  enterpriseName: string;
  industry: string;
  result: EmissionResultWithVersion;
}

export default function Results() {
  const { emissionData } = useEmissionStore();
  const { enterprises, getEnterpriseById } = useEnterpriseStore();
  const { getAttachments } = useAuditStore();
  const { addArchive } = useReportStore();
  const { currentUser, addToast } = useUIStore();

  const [template, setTemplate] = useState<ReportTemplate>('park');
  const [selectedSingleEnterpriseId, setSelectedSingleEnterpriseId] = useState<string>('');
  const [selectedEnterpriseIds, setSelectedEnterpriseIds] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const months = useMemo(() => getMonthRange(), []);

  const INDUSTRY_LIST = useMemo(() => {
    return Array.from(new Set(enterprises.map((e) => e.industry))).sort();
  }, [enterprises]);

  const validData = useMemo(() => {
    return emissionData.filter((d) => d.status === 'approved' || d.status === 'locked');
  }, [emissionData]);

  const filteredData = useMemo((): TableRow[] => {
    let workingData = validData;
    if (template === 'enterprise' && selectedSingleEnterpriseId) {
      workingData = workingData.filter((d) => d.enterpriseId === selectedSingleEnterpriseId);
    }

    return workingData
      .filter((d) => {
        const ent = getEnterpriseById(d.enterpriseId);
        if (template === 'park' && selectedEnterpriseIds.length > 0 && !selectedEnterpriseIds.includes(d.enterpriseId)) {
          return false;
        }
        if (selectedIndustries.length > 0 && ent && !selectedIndustries.includes(ent.industry)) {
          return false;
        }
        if (startMonth && d.period < startMonth) return false;
        if (endMonth && d.period > endMonth) return false;
        return true;
      })
      .map((d) => {
        const ent = getEnterpriseById(d.enterpriseId);
        return {
          ...d,
          enterpriseName: ent?.name || '-',
          industry: ent?.industry || '-',
          result: calculateEmissionWithVersion(d),
        };
      });
  }, [validData, template, selectedSingleEnterpriseId, selectedEnterpriseIds, selectedIndustries, startMonth, endMonth, getEnterpriseById]);

  const summary = useMemo(() => {
    const current = filteredData.reduce(
      (acc, d) => ({
        scope1: acc.scope1 + d.result.scope1,
        scope2: acc.scope2 + d.result.scope2,
        total: acc.total + d.result.total,
        breakdown: {
          electricity: acc.breakdown.electricity + d.result.breakdown.electricity,
          gas: acc.breakdown.gas + d.result.breakdown.gas,
          steam: acc.breakdown.steam + d.result.breakdown.steam,
          fuel: acc.breakdown.fuel + d.result.breakdown.fuel,
        },
      }),
      {
        scope1: 0,
        scope2: 0,
        total: 0,
        breakdown: { electricity: 0, gas: 0, steam: 0, fuel: 0 },
      }
    );

    const currentPeriods = new Set(filteredData.map((d) => d.period));
    const currentEntIds = new Set(filteredData.map((d) => d.enterpriseId));
    const previousData = validData
      .filter((d) => {
        if (currentEntIds.size > 0 && !currentEntIds.has(d.enterpriseId)) return false;
        return !currentPeriods.has(d.period);
      })
      .slice(0, filteredData.length);

    const previous = previousData.reduce(
      (acc, d) => {
        const r = calculateEmission(d);
        return {
          scope1: acc.scope1 + r.scope1,
          scope2: acc.scope2 + r.scope2,
          total: acc.total + r.total,
        };
      },
      { scope1: 0, scope2: 0, total: 0 }
    );

    const calcTrend = (cur: number, prev: number) => {
      if (prev === 0) return { trend: 'up' as const, percent: '0.0%', diff: cur };
      const change = ((cur - prev) / prev) * 100;
      return {
        trend: change >= 0 ? 'up' as const : 'down' as const,
        percent: `${Math.abs(change).toFixed(1)}%`,
        diff: cur - prev,
      };
    };

    return {
      current,
      scope1Trend: calcTrend(current.scope1, previous.scope1),
      scope2Trend: calcTrend(current.scope2, previous.scope2),
      totalTrend: calcTrend(current.total, previous.total),
    };
  }, [filteredData, validData]);

  const pieData = useMemo(() => {
    const { breakdown } = summary.current;
    const total = breakdown.electricity + breakdown.gas + breakdown.steam + breakdown.fuel;
    const data = [
      { name: '电力', value: breakdown.electricity, percent: total > 0 ? (breakdown.electricity / total) * 100 : 0 },
      { name: '天然气', value: breakdown.gas, percent: total > 0 ? (breakdown.gas / total) * 100 : 0 },
      { name: '蒸汽', value: breakdown.steam, percent: total > 0 ? (breakdown.steam / total) * 100 : 0 },
      { name: '燃油', value: breakdown.fuel, percent: total > 0 ? (breakdown.fuel / total) * 100 : 0 },
    ];
    return data.filter((d) => d.value > 0);
  }, [summary]);

  const industrySummary = useMemo(() => {
    const map = new Map<string, { scope1: number; scope2: number; total: number; count: number }>();
    filteredData.forEach((row) => {
      const existing = map.get(row.industry) || { scope1: 0, scope2: 0, total: 0, count: 0 };
      map.set(row.industry, {
        scope1: existing.scope1 + row.result.scope1,
        scope2: existing.scope2 + row.result.scope2,
        total: existing.total + row.result.total,
        count: existing.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([industry, val]) => ({ industry, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const anomalies = useMemo((): AnomalyRecord[] => {
    const records: AnomalyRecord[] = [];
    const groupedByEnt = new Map<string, TableRow[]>();
    filteredData.forEach((row) => {
      const list = groupedByEnt.get(row.enterpriseId) || [];
      list.push(row);
      groupedByEnt.set(row.enterpriseId, list);
    });
    groupedByEnt.forEach((rows) => {
      const sorted = rows.sort((a, b) => a.period.localeCompare(b.period));
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i];
        const prev = sorted[i - 1];
        const prevTotal = prev.result.total;
        const curTotal = cur.result.total;
        if (prevTotal > 0) {
          const rate = ((curTotal - prevTotal) / prevTotal) * 100;
          if (Math.abs(rate) > 30) {
            records.push({
              id: `${cur.enterpriseId}-${cur.period}-mom`,
              enterpriseId: cur.enterpriseId,
              enterpriseName: cur.enterpriseName,
              period: cur.period,
              type: '环比',
              changeRate: parseFloat(rate.toFixed(2)),
              message: rate > 0
                ? `较上月 ${prev.period} 增长 ${Math.abs(rate).toFixed(1)}%，需关注能源消耗`
                : `较上月 ${prev.period} 下降 ${Math.abs(rate).toFixed(1)}%，建议复核数据`,
            });
          }
        }
      }
    });
    return records.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  }, [filteredData]);

  const energyBreakdownDetails = useMemo((): EnergyAnomaly[] => {
    const list: EnergyAnomaly[] = [];
    const energyItems = [
      { key: 'electricity', label: '电力' },
      { key: 'gas', label: '天然气' },
      { key: 'steam', label: '蒸汽' },
      { key: 'fuel', label: '燃油' },
    ];
    const groupedByEnt = new Map<string, TableRow[]>();
    filteredData.forEach((row) => {
      const arr = groupedByEnt.get(row.enterpriseId) || [];
      arr.push(row);
      groupedByEnt.set(row.enterpriseId, arr);
    });
    groupedByEnt.forEach((rows) => {
      const sorted = rows.sort((a, b) => a.period.localeCompare(b.period));
      for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i];
        const prev = sorted[i - 1];
        energyItems.forEach((item) => {
          const curVal = (cur as any)[item.key] as number;
          const prevVal = (prev as any)[item.key] as number;
          if (prevVal > 0) {
            const rate = ((curVal - prevVal) / prevVal) * 100;
            const curEmission = cur.result.breakdown[item.key as keyof typeof cur.result.breakdown];
            const prevEmission = prev.result.breakdown[item.key as keyof typeof prev.result.breakdown];
            if (Math.abs(rate) > 30 && Math.abs(curVal - prevVal) > 0) {
              list.push({
                enterpriseId: cur.enterpriseId,
                enterpriseName: cur.enterpriseName,
                period: cur.period,
                energyKey: item.key,
                energyLabel: item.label,
                current: curVal,
                previous: prevVal,
                changeRate: parseFloat(rate.toFixed(2)),
                emissionChange: parseFloat((curEmission - prevEmission).toFixed(2)),
              });
            }
          }
        });
      }
    });
    return list.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)).slice(0, 15);
  }, [filteredData]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'enterpriseName':
          comparison = a.enterpriseName.localeCompare(b.enterpriseName);
          break;
        case 'period':
          comparison = a.period.localeCompare(b.period);
          break;
        case 'scope1':
          comparison = a.result.scope1 - b.result.scope1;
          break;
        case 'scope2':
          comparison = a.result.scope2 - b.result.scope2;
          break;
        case 'total':
          comparison = a.result.total - b.result.total;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  const factorVersionSummary = useMemo(() => {
    if (filteredData.length === 0) return '';
    const maps = filteredData.map((d) => d.result.factorVersionMap);
    return getFactorSummaryLabel(maps[0]);
  }, [filteredData]);

  const monthlyTrendData = useMemo(() => {
    const periods = months.map((m) => m.value);
    const scope1Map = new Map<string, number>();
    const scope2Map = new Map<string, number>();
    filteredData.forEach((row) => {
      scope1Map.set(row.period, (scope1Map.get(row.period) || 0) + row.result.scope1);
      scope2Map.set(row.period, (scope2Map.get(row.period) || 0) + row.result.scope2);
    });
    const periodSet = new Set(filteredData.map((d) => d.period));
    return periods
      .filter((p) => periodSet.has(p))
      .map((p) => ({
        period: p,
        范围一: parseFloat((scope1Map.get(p) || 0).toFixed(2)),
        范围二: parseFloat((scope2Map.get(p) || 0).toFixed(2)),
      }));
  }, [filteredData, months]);

  const singleEnterpriseInfo = useMemo(() => {
    if (template !== 'enterprise' || !selectedSingleEnterpriseId) return null;
    const ent = getEnterpriseById(selectedSingleEnterpriseId);
    if (!ent) return null;

    const enterpriseAttachments: { period: string; attachments: any[] }[] = [];
    const periodSet = new Set(filteredData.map((d) => d.period));
    Array.from(periodSet).sort().forEach((period) => {
      const atts = getAttachments(selectedSingleEnterpriseId, period);
      if (atts.length > 0) {
        enterpriseAttachments.push({ period, attachments: atts });
      }
    });

    const enterpriseAnomalies = anomalies.filter((a) => a.enterpriseId === selectedSingleEnterpriseId);
    const enterpriseEnergyAnomalies = energyBreakdownDetails.filter(
      (e) => e.enterpriseId === selectedSingleEnterpriseId
    );

    return {
      enterprise: ent,
      attachments: enterpriseAttachments,
      anomalies: enterpriseAnomalies,
      energyAnomalies: enterpriseEnergyAnomalies,
    };
  }, [template, selectedSingleEnterpriseId, filteredData, getEnterpriseById, getAttachments, anomalies, energyBreakdownDetails]);

  const toggleEnterprise = (id: string) => {
    setSelectedEnterpriseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind]
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const entName = template === 'enterprise' && selectedSingleEnterpriseId
      ? getEnterpriseById(selectedSingleEnterpriseId)?.name || ''
      : '';

    const firstRow = filteredData[0];
    const factorVersionMap = firstRow?.result.factorVersionMap;
    const factorDetail = factorVersionMap || {
      electricity: { version: '默认', value: 0, effectiveMonth: '2024-01' },
      gas: { version: '默认', value: 0, effectiveMonth: '2024-01' },
      steam: { version: '默认', value: 0, effectiveMonth: '2024-01' },
      fuel: { version: '默认', value: 0, effectiveMonth: '2024-01' },
    };

    const dataRows = filteredData.map((row) => ({
      enterpriseId: row.enterpriseId,
      enterpriseName: row.enterpriseName,
      industry: row.industry,
      period: row.period,
      electricity: row.electricity,
      gas: row.gas,
      steam: row.steam,
      fuel: row.fuel,
      production: row.production,
      scope1: row.result.scope1,
      scope2: row.result.scope2,
      total: row.result.total,
      breakdownElectricity: row.result.breakdown.electricity,
      breakdownGas: row.result.breakdown.gas,
      breakdownSteam: row.result.breakdown.steam,
      breakdownFuel: row.result.breakdown.fuel,
      status: row.status,
      submitTime: row.submitTime,
      auditor: row.auditor,
      auditOpinion: row.auditOpinion,
    }));

    const archiveAnomalies = [
      ...anomalies.map((a) => ({
        period: a.period,
        type: a.type,
        changeRate: a.changeRate,
        message: a.message,
      })),
      ...energyBreakdownDetails.map((e) => ({
        period: e.period,
        type: '环比' as const,
        changeRate: e.changeRate,
        message: `${e.energyLabel}变化 ${e.changeRate > 0 ? '+' : ''}${e.changeRate.toFixed(1)}%，排放变化 ${e.emissionChange > 0 ? '+' : ''}${e.emissionChange.toFixed(2)} tCO₂`,
        energyKey: e.energyKey,
        energyLabel: e.energyLabel,
        current: e.current,
        previous: e.previous,
        emissionChange: e.emissionChange,
      })),
    ];

    let archiveAttachments: any[] = [];
    if (template === 'enterprise' && selectedSingleEnterpriseId) {
      const periodSet = new Set(filteredData.map((d) => d.period));
      Array.from(periodSet).sort().forEach((period) => {
        const atts = getAttachments(selectedSingleEnterpriseId, period);
        atts.forEach((a) => {
          archiveAttachments.push({
            period,
            fileName: a.fileName,
            fileType: a.fileType,
            fileSize: a.fileSize,
            uploadTime: a.uploadTime,
          });
        });
      });
    }

    const monthlyTrendExport = monthlyTrendData.map((m) => ({
      period: m.period,
      scope1: m['范围一'],
      scope2: m['范围二'],
    }));

    const anomalyInfo = {
      anomalies,
      energyBreakdownDetails,
      filters: {
        enterprises: template === 'enterprise'
          ? (entName || '指定企业')
          : (selectedEnterpriseIds.length > 0
            ? selectedEnterpriseIds.map(id => getEnterpriseById(id)?.name || id).join('、')
            : '全部企业'),
        industries: selectedIndustries.length > 0 ? selectedIndustries.join('、') : '全部行业',
        periodRange: `${startMonth || '最早'} 至 ${endMonth || '最新'}`,
        recordCount: filteredData.length,
      },
      scopeSummary: {
        scope1: summary.current.scope1,
        scope2: summary.current.scope2,
        total: summary.current.total,
      },
      industrySummary,
      template,
      selectedEnterpriseName: entName,
      factorVersionSummary,
      attachments: archiveAttachments,
      monthlyTrend: monthlyTrendExport,
    };

    const reportTitle = template === 'enterprise'
      ? `${entName || '企业'}_碳排放报告_${startMonth || '最早'}-${endMonth || '最新'}`
      : `园区碳排放汇总报告_${startMonth || '最早'}-${endMonth || '最新'}`;

    addArchive({
      title: reportTitle,
      template,
      enterpriseId: template === 'enterprise' ? selectedSingleEnterpriseId : undefined,
      enterpriseName: template === 'enterprise' ? entName : undefined,
      industries: selectedIndustries.length > 0 ? [...selectedIndustries] : [],
      startMonth: startMonth || (filteredData.length > 0 ? filteredData[filteredData.length - 1].period : ''),
      endMonth: endMonth || (filteredData.length > 0 ? filteredData[0].period : ''),
      recordCount: filteredData.length,
      generatedBy: currentUser.name,
      factorVersion: {
        summaryLabel: factorVersionSummary,
        detail: factorDetail as any,
      },
      filterSnapshot: {
        enterpriseIds: template === 'park' ? [...selectedEnterpriseIds] : selectedSingleEnterpriseId ? [selectedSingleEnterpriseId] : [],
        industries: selectedIndustries.length > 0 ? [...selectedIndustries] : [],
        startMonth,
        endMonth,
        enterpriseName: entName,
      },
      summary: {
        scope1: summary.current.scope1,
        scope2: summary.current.scope2,
        total: summary.current.total,
        breakdown: { ...summary.current.breakdown },
        industrySummary: industrySummary.map((i) => ({ ...i })),
        anomalyCount: anomalies.length + energyBreakdownDetails.length,
      },
      dataRows,
      attachments: archiveAttachments,
      anomalies: archiveAnomalies,
      monthlyTrend: monthlyTrendExport,
    });

    exportEmissionReport(filteredData, anomalyInfo);
    addToast('报告导出成功，已自动归档至"报告归档"', 'success');
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className="inline-flex items-center gap-1 hover:text-primary-600 transition-colors"
    >
      {label}
      <ArrowUpDown
        className={cn(
          'w-3 h-3',
          sortKey === sortKeyName ? 'text-primary-600' : 'text-zinc-400'
        )}
      />
    </button>
  );

  const hasFilters = template === 'park'
    ? selectedEnterpriseIds.length > 0 || selectedIndustries.length > 0 || startMonth || endMonth
    : selectedIndustries.length > 0 || startMonth || endMonth;
  const scope1Percent = summary.current.total > 0 ? (summary.current.scope1 / summary.current.total) * 100 : 0;
  const scope2Percent = summary.current.total > 0 ? (summary.current.scope2 / summary.current.total) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">核算结果</h1>
          <p className="text-sm text-zinc-500 mt-1">
            查看企业碳排放核算结果与排放构成分析，支持按企业、行业、月份筛选并导出报告
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
            <button
              onClick={() => setTemplate('park')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                template === 'park'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-800'
              )}
            >
              <Factory className="w-3.5 h-3.5" />
              园区汇总
            </button>
            <button
              onClick={() => {
                setTemplate('enterprise');
                if (!selectedSingleEnterpriseId && enterprises.length > 0) {
                  setSelectedSingleEnterpriseId(enterprises[0].id);
                }
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                template === 'enterprise'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-800'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              单企业报告
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className={cn('btn btn-primary')}
          >
            <Download className="w-4 h-4" />
            导出核算报告
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {template === 'enterprise' ? (
            <div className="relative">
              <select
                value={selectedSingleEnterpriseId}
                onChange={(e) => setSelectedSingleEnterpriseId(e.target.value)}
                className={cn('input-field min-w-[280px] pr-8')}
              >
                <option value="">请选择企业</option>
                {enterprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name} · {ent.industry}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => { setEnterpriseDropdownOpen(!enterpriseDropdownOpen); setIndustryDropdownOpen(false); }}
                className={cn(
                  'input-field flex items-center justify-between gap-2 min-w-[240px]',
                  selectedEnterpriseIds.length > 0 && 'text-zinc-900'
                )}
              >
                <span className={cn(selectedEnterpriseIds.length === 0 && 'text-zinc-400')}>
                  <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  {selectedEnterpriseIds.length === 0
                    ? '选择企业（可多选）'
                    : `已选 ${selectedEnterpriseIds.length} 家`}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-zinc-400 transition-transform',
                    enterpriseDropdownOpen && 'rotate-180'
                  )}
                />
              </button>
              {enterpriseDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
                  {enterprises.map((ent) => (
                    <label
                      key={ent.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEnterpriseIds.includes(ent.id)}
                        onChange={() => toggleEnterprise(ent.id)}
                        className="w-4 h-4 rounded border-zinc-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-zinc-700">{ent.name}</span>
                      <span className="text-xs text-zinc-400 ml-auto">{ent.industry}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedEnterpriseIds.length > 0 && (
                <button
                  onClick={() => setSelectedEnterpriseIds([])}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-100"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => { setIndustryDropdownOpen(!industryDropdownOpen); setEnterpriseDropdownOpen(false); }}
              className={cn(
                'input-field flex items-center justify-between gap-2 min-w-[220px]',
                selectedIndustries.length > 0 && 'text-zinc-900'
              )}
            >
              <span className={cn(selectedIndustries.length === 0 && 'text-zinc-400')}>
                <Factory className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                {selectedIndustries.length === 0
                  ? '选择行业（可多选）'
                  : `已选 ${selectedIndustries.length} 个行业`}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-zinc-400 transition-transform',
                  industryDropdownOpen && 'rotate-180'
                )}
              />
            </button>
            {industryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
                {INDUSTRY_LIST.map((ind) => (
                  <label
                    key={ind}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(ind)}
                      onChange={() => toggleIndustry(ind)}
                      className="w-4 h-4 rounded border-zinc-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-zinc-700">{ind}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedIndustries.length > 0 && (
              <button
                onClick={() => setSelectedIndustries([])}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-100"
              >
                <X className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className={cn('input-field w-40')}
            >
              <option value="">开始月份</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-zinc-400">至</span>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className={cn('input-field w-40')}
            >
              <option value="">结束月份</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSelectedEnterpriseIds([]);
                setSelectedIndustries([]);
                setStartMonth('');
                setEndMonth('');
              }}
              className={cn('btn btn-secondary')}
            >
              <X className="w-3.5 h-3.5" />
              重置筛选
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-600" />
            <span>因子版本：</span>
            <span className="font-mono font-medium text-zinc-700">{factorVersionSummary || '默认因子'}</span>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-2 items-center text-xs text-zinc-500">
            <span className="text-zinc-600 font-medium">当前筛选：</span>
            <span>共 {filteredData.length} 条记录</span>
            {template === 'enterprise' && selectedSingleEnterpriseId && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                {getEnterpriseById(selectedSingleEnterpriseId)?.name}
              </span>
            )}
            {template === 'park' && selectedEnterpriseIds.length > 0 && (
              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded">企业 {selectedEnterpriseIds.length} 家</span>
            )}
            {selectedIndustries.length > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">行业 {selectedIndustries.length} 个</span>}
            {(startMonth || endMonth) && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">{startMonth || '—'} 至 {endMonth || '—'}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="范围一排放量（直接排放）"
          value={formatEmission(summary.current.scope1)}
          icon={Flame}
          color="green"
          trend={summary.scope1Trend.trend}
          trendLabel={summary.scope1Trend.percent}
        />
        <StatCard
          title="范围二排放量（间接排放）"
          value={formatEmission(summary.current.scope2)}
          icon={Zap}
          color="blue"
          trend={summary.scope2Trend.trend}
          trendLabel={summary.scope2Trend.percent}
        />
        <StatCard
          title="总排放量"
          value={formatEmission(summary.current.total)}
          icon={Leaf}
          color="orange"
          trend={summary.totalTrend.trend}
          trendLabel={summary.totalTrend.percent}
        />
      </div>

      <div className="card p-5 border-2 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {template === 'park' ? '园区汇总报告预览' : '单企业报告预览'}
            </h2>
            <p className="text-xs text-zinc-500">
              {template === 'park'
                ? '导出前预览核算范围构成、能源来源占比与异常说明，导出内容与当前筛选一致'
                : '单企业维度展示月度趋势、附件凭证和异常原因，重点关注该企业的波动情况'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-zinc-600">预览与导出完全同步</span>
          </div>
        </div>

        {template === 'park' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-primary-600" />
                  范围构成
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[0] }} />
                      <span className="text-sm text-zinc-700">范围一（直接排放）</span>
                    </div>
                    <span className="text-sm font-semibold font-mono text-zinc-900">{scope1Percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${scope1Percent}%`, backgroundColor: PIE_COLORS[0] }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[1] }} />
                      <span className="text-sm text-zinc-700">范围二（间接排放）</span>
                    </div>
                    <span className="text-sm font-semibold font-mono text-zinc-900">{scope2Percent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${scope2Percent}%`, backgroundColor: PIE_COLORS[1] }} />
                  </div>
                  <div className="pt-2 mt-2 border-t border-zinc-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-zinc-400">范围一总量</div>
                      <div className="font-semibold font-mono text-zinc-800 mt-0.5">{summary.current.scope1.toFixed(2)} tCO₂</div>
                    </div>
                    <div>
                      <div className="text-zinc-400">范围二总量</div>
                      <div className="font-semibold font-mono text-zinc-800 mt-0.5">{summary.current.scope2.toFixed(2)} tCO₂</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent-orange" />
                  能源来源占比
                </h3>
                <div className="h-48">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={38}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatEmission(value), '排放量']}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => (
                            <span className="text-xs text-zinc-600">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                      暂无数据
                    </div>
                  )}
                </div>
                {pieData.length > 0 && (
                  <div className="space-y-1.5 mt-2 pt-2 border-t border-zinc-100">
                    {pieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-zinc-600">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-800">{item.percent.toFixed(1)}%</span>
                          <span className="text-zinc-400">·</span>
                          <span className="font-mono text-zinc-500">{formatEmission(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-blue-600" />
                  行业排放汇总
                </h3>
                {industrySummary.length > 0 ? (
                  <div className="overflow-y-auto pr-1">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={industrySummary} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          axisLine={{ stroke: '#e4e4e7' }}
                          tickLine={false}
                          tickFormatter={(v: number) => `${v.toFixed(0)}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="industry"
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          axisLine={{ stroke: '#e4e4e7' }}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatEmission(value),
                            name === 'total' ? '总排放' : name === 'scope1' ? '范围一' : '范围二'
                          ]}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Bar dataKey="total" fill="#0F5132" radius={[0, 4, 4, 0]} barSize={16} name="总排放" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                      {industrySummary.slice(0, 5).map((item) => (
                        <div key={item.industry} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-700">{item.industry}</span>
                            <span className="text-zinc-400">· {item.count} 家企业</span>
                          </div>
                          <span className="font-mono font-semibold text-primary-700">{formatEmission(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-zinc-400 text-sm">
                    暂无行业数据
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-orange" />
                    异常波动说明
                  </span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    anomalies.length > 0 ? 'bg-accent-orange/10 text-accent-orange' : 'bg-green-50 text-green-600'
                  )}>
                    {anomalies.length}
                  </span>
                </h3>
                <div className={cn('space-y-2 max-h-[280px] overflow-y-auto pr-1', anomalies.length === 0 && 'h-48')}>
                  {anomalies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <span>当前范围数据稳定，无异常波动</span>
                    </div>
                  ) : (
                    anomalies.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border bg-zinc-50/50 group"
                        style={{ borderColor: item.changeRate > 0 ? '#fecaca' : '#bbf7d0' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-xs font-medium text-zinc-800 truncate">{item.enterpriseName}</div>
                          <div className={cn(
                            'flex items-center gap-0.5 text-xs font-semibold flex-shrink-0',
                            item.changeRate > 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {item.changeRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.changeRate > 0 ? '+' : ''}{formatNumber(item.changeRate, 1)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <span className="px-1.5 py-0.5 bg-white rounded border border-zinc-200 text-zinc-600">{item.type}</span>
                          <span>{item.period}</span>
                          <ChevronRight className="w-3 h-3 ml-auto text-zinc-300 group-hover:text-primary-400 transition-colors" />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
                {energyBreakdownDetails.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <div className="text-xs font-medium text-zinc-600 mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      能源分项变化 Top 5
                    </div>
                    <div className="space-y-1.5">
                      {energyBreakdownDetails.slice(0, 5).map((e, idx) => (
                        <div key={`${e.enterpriseId}-${e.period}-${e.energyKey}-${idx}`} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-600 truncate max-w-[55%]">
                            {e.enterpriseName} · {e.energyLabel}
                          </span>
                          <span className={cn(
                            'font-mono font-medium flex-shrink-0',
                            e.changeRate > 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {e.changeRate > 0 ? '+' : ''}{formatNumber(e.changeRate, 1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-600" />
                  月度趋势
                </h3>
                <div className="h-72">
                  {monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          axisLine={{ stroke: '#e4e4e7' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          axisLine={{ stroke: '#e4e4e7' }}
                          tickLine={false}
                          tickFormatter={(v: number) => `${v}`}
                          label={{ value: 'tCO₂', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatEmission(value)]}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="范围一" stroke="#0F5132" strokeWidth={2.5} dot={{ fill: '#0F5132', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="范围二" stroke="#F97316" strokeWidth={2.5} dot={{ fill: '#F97316', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                      暂无月度数据
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent-orange" />
                  能耗与排放明细
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left py-2 px-2 font-medium text-zinc-600">月份</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">电力(kWh)</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">天然气(m³)</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">蒸汽(t)</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">燃油(t)</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">产量</th>
                        <th className="text-right py-2 px-2 font-medium text-zinc-600">总排放(tCO₂)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-zinc-400">暂无数据</td>
                        </tr>
                      ) : (
                        sortedData.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                            <td className="py-2 px-2 font-mono text-zinc-700">{row.period}</td>
                            <td className="text-right py-2 px-2 font-mono text-zinc-700">{formatNumber(row.electricity, 0)}</td>
                            <td className="text-right py-2 px-2 font-mono text-zinc-700">{formatNumber(row.gas, 0)}</td>
                            <td className="text-right py-2 px-2 font-mono text-zinc-700">{formatNumber(row.steam, 2)}</td>
                            <td className="text-right py-2 px-2 font-mono text-zinc-700">{formatNumber(row.fuel, 2)}</td>
                            <td className="text-right py-2 px-2 font-mono text-zinc-700">{formatNumber(row.production, 0)}</td>
                            <td className="text-right py-2 px-2 font-mono font-semibold text-primary-700">{row.result.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  凭证附件清单
                </h3>
                {singleEnterpriseInfo && singleEnterpriseInfo.attachments.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {singleEnterpriseInfo.attachments.map((group) => (
                      <div key={group.period} className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                          <Calendar className="w-3 h-3" />
                          {group.period}
                        </div>
                        <div className="space-y-1 pl-4">
                          {group.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-2 text-xs p-1.5 bg-zinc-50 rounded">
                              <Paperclip className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                              <span className="truncate text-zinc-700">{att.fileName}</span>
                              <span className="ml-auto text-zinc-400 flex-shrink-0">
                                {att.fileSize < 1024 ? `${att.fileSize} B` : att.fileSize < 1024 * 1024 ? `${(att.fileSize / 1024).toFixed(1)} KB` : `${(att.fileSize / 1024 / 1024).toFixed(1)} MB`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-400 text-xs">
                    <Paperclip className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    暂无凭证附件
                  </div>
                )}
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-orange" />
                    异常波动原因
                  </span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    (singleEnterpriseInfo?.anomalies.length || 0) > 0 ? 'bg-accent-orange/10 text-accent-orange' : 'bg-green-50 text-green-600'
                  )}>
                    {singleEnterpriseInfo?.anomalies.length || 0} 条
                  </span>
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {!singleEnterpriseInfo || singleEnterpriseInfo.anomalies.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span>无异常波动，数据保持稳定</span>
                    </div>
                  ) : (
                    singleEnterpriseInfo.anomalies.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border bg-zinc-50/50"
                        style={{ borderColor: item.changeRate > 0 ? '#fecaca' : '#bbf7d0' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-800">
                            <span className="px-1.5 py-0.5 bg-white rounded border border-zinc-200 text-zinc-600">{item.type}</span>
                            <span>{item.period}</span>
                          </div>
                          <div className={cn(
                            'flex items-center gap-0.5 text-xs font-semibold flex-shrink-0',
                            item.changeRate > 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {item.changeRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.changeRate > 0 ? '+' : ''}{formatNumber(item.changeRate, 1)}%
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
                {singleEnterpriseInfo && singleEnterpriseInfo.energyAnomalies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <div className="text-xs font-medium text-zinc-600 mb-2">能源分项变化明细</div>
                    <div className="space-y-1.5">
                      {singleEnterpriseInfo.energyAnomalies.slice(0, 5).map((e, idx) => (
                        <div key={`${e.period}-${e.energyKey}-${idx}`} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-zinc-600">
                            {e.energyKey === 'electricity' && <Zap className="w-3 h-3 text-blue-500" />}
                            {e.energyKey === 'gas' && <Flame className="w-3 h-3 text-orange-500" />}
                            {e.energyKey === 'steam' && <Cloud className="w-3 h-3 text-purple-500" />}
                            {e.energyKey === 'fuel' && <Fuel className="w-3 h-3 text-red-500" />}
                            {e.period} · {e.energyLabel}
                          </span>
                          <span className={cn(
                            'font-mono font-medium',
                            e.changeRate > 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {e.changeRate > 0 ? '+' : ''}{formatNumber(e.changeRate, 1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary-600" />
                  因子版本与企业信息
                </h3>
                {singleEnterpriseInfo ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-zinc-50 rounded-lg">
                      <div>
                        <div className="text-zinc-400">企业名称</div>
                        <div className="font-medium text-zinc-800 mt-0.5">{singleEnterpriseInfo.enterprise.name}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">所属行业</div>
                        <div className="font-medium text-zinc-800 mt-0.5">{singleEnterpriseInfo.enterprise.industry}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">企业规模</div>
                        <div className="font-medium text-zinc-800 mt-0.5">{singleEnterpriseInfo.enterprise.scale}型</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">统计范围</div>
                        <div className="font-medium text-zinc-800 mt-0.5">{filteredData.length} 个月</div>
                      </div>
                    </div>
                    {filteredData.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-zinc-500">当前报告使用因子版本：</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(['electricity', 'gas', 'steam', 'fuel'] as const).map((k) => {
                            const v = filteredData[0].result.factorVersionMap[k];
                            const icons = { electricity: Zap, gas: Flame, steam: Cloud, fuel: Fuel };
                            const labels = { electricity: '电', gas: '气', steam: '汽', fuel: '油' };
                            const Icon = icons[k];
                            return (
                              <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded border border-primary-100">
                                <Icon className="w-3 h-3" />
                                {labels[k]} {v.version}
                                <span className="text-primary-500/70">({v.effectiveMonth})</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-400 text-xs">请选择企业</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {template === 'enterprise' ? '企业月度核算明细' : '核算明细'}
          </h2>
          <span className="text-sm text-zinc-500">共 {sortedData.length} 条记录</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">
                  <SortHeader label="企业名称" sortKeyName="enterpriseName" />
                </th>
                <th className="table-header">行业</th>
                <th className="table-header">
                  <SortHeader label="统计月份" sortKeyName="period" />
                </th>
                <th className="table-header text-right">
                  <SortHeader label="范围一 (tCO₂)" sortKeyName="scope1" />
                </th>
                <th className="table-header text-right">
                  <SortHeader label="范围二 (tCO₂)" sortKeyName="scope2" />
                </th>
                <th className="table-header text-right">
                  <SortHeader label="总量 (tCO₂)" sortKeyName="total" />
                </th>
                <th className="table-header text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-zinc-400"
                  >
                    暂无数据
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-primary-600" />
                        </div>
                        <span className="font-medium text-zinc-900">
                          {row.enterpriseName}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-zinc-600">{row.industry}</td>
                    <td className="table-cell">{row.period}</td>
                    <td className="table-cell text-right font-mono text-zinc-700">
                      {row.result.scope1.toFixed(2)}
                    </td>
                    <td className="table-cell text-right font-mono text-zinc-700">
                      {row.result.scope2.toFixed(2)}
                    </td>
                    <td className="table-cell text-right font-mono font-semibold text-primary-700">
                      {row.result.total.toFixed(2)}
                    </td>
                    <td className="table-cell text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
