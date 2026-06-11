import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  ChevronDown,
  Check,
  ChevronRight,
  Factory,
  Layers,
  ChevronUp,
  ExternalLink,
  Zap,
  Flame,
  Cloud,
  Fuel,
  TrendingUp,
  TrendingDown,
  X as XIcon,
} from 'lucide-react';
import { useEnterpriseStore } from '@/store/enterprise';
import { useEmissionStore } from '@/store/emission';
import { calculateEmission } from '@/utils/calculator';
import { formatEmission, formatNumber } from '@/utils/formatter';
import { exportEnterprises } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { Enterprise, EmissionData } from '@/types';

const SCALES = ['大型', '中型', '小型', '微型'];

interface EnergyDiff {
  key: string;
  label: string;
  icon: any;
  color: string;
  current: number;
  previous: number;
  changeRate: number;
  emissionChange: number;
}

interface AnomalyRecord {
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  industry: string;
  scale: string;
  period: string;
  type: '同比' | '环比';
  changeRate: number;
  message: string;
  previousPeriod?: string;
  energyBreakdown: EnergyDiff[];
  totalCurrent: number;
  totalPrevious: number;
  totalDiff: number;
}

type CompareScope = 'scope1' | 'scope2' | 'total';

export default function Analysis() {
  const navigate = useNavigate();
  const { enterprises, getEnterpriseById } = useEnterpriseStore();
  const { emissionData } = useEmissionStore();

  const [selectedEnterpriseIds, setSelectedEnterpriseIds] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<string[]>([]);
  const [industryCompareEnterpriseId, setIndustryCompareEnterpriseId] = useState<string | null>(
    enterprises.length > 0 ? enterprises[0].id : null
  );
  const [multiCompareIds, setMultiCompareIds] = useState<string[]>(
    enterprises.slice(0, 3).map((e) => e.id)
  );
  const [compareScope, setCompareScope] = useState<CompareScope>('total');
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);
  const [expandedAnomalyIds, setExpandedAnomalyIds] = useState<Set<string>>(new Set());

  const getLast12Months = () => {
    const periods: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return periods;
  };

  const allMonths = useMemo(() => getLast12Months(), []);

  const INDUSTRY_LIST = useMemo(() => {
    return Array.from(new Set(enterprises.map((e) => e.industry))).sort();
  }, [enterprises]);

  const filteredEmissionData = useMemo(() => {
    return emissionData.filter((d) => d.period >= startMonth && d.period <= endMonth);
  }, [emissionData, startMonth, endMonth]);

  const filterEnterprise = useMemo(() => {
    return (ent: Enterprise) => {
      if (selectedIndustries.length > 0 && !selectedIndustries.includes(ent.industry)) return false;
      if (selectedScales.length > 0 && !selectedScales.includes(ent.scale)) return false;
      return true;
    };
  }, [selectedIndustries, selectedScales]);

  const industryCompareData = useMemo(() => {
    const industries = Array.from(new Set(enterprises.filter(filterEnterprise).map((e) => e.industry)));
    const industryAverages = industries.map((industry) => {
      const industryEnterprises = enterprises.filter((e) => e.industry === industry && filterEnterprise(e));
      const industryEmissions = industryEnterprises.flatMap((ent) =>
        filteredEmissionData
          .filter((d) => d.enterpriseId === ent.id)
          .map((d) => calculateEmission(d).total)
      );
      const avg =
        industryEmissions.length > 0
          ? industryEmissions.reduce((a, b) => a + b, 0) / industryEmissions.length
          : 0;

      let selectedValue = 0;
      if (industryCompareEnterpriseId) {
        const selectedEnt = enterprises.find((e) => e.id === industryCompareEnterpriseId);
        if (selectedEnt && selectedEnt.industry === industry) {
          const selectedEmissions = filteredEmissionData
            .filter((d) => d.enterpriseId === industryCompareEnterpriseId)
            .map((d) => calculateEmission(d).total);
          selectedValue =
            selectedEmissions.length > 0
              ? selectedEmissions.reduce((a, b) => a + b, 0) / selectedEmissions.length
              : 0;
        }
      }

      return {
        industry,
        industryAvg: parseFloat(avg.toFixed(2)),
        selectedValue: parseFloat(selectedValue.toFixed(2)),
      };
    });
    return industryAverages;
  }, [enterprises, filteredEmissionData, industryCompareEnterpriseId, filterEnterprise]);

  const trendData = useMemo(() => {
    const periods = allMonths.filter((p) => p >= startMonth && p <= endMonth);
    const enterpriseIds = selectedEnterpriseIds.length > 0
      ? selectedEnterpriseIds
      : enterprises.filter(filterEnterprise).map((e) => e.id);

    return periods.map((period) => {
      const monthData = filteredEmissionData.filter(
        (d) => d.period === period && enterpriseIds.includes(d.enterpriseId)
      );
      const scope1 = monthData.reduce((sum, d) => sum + calculateEmission(d).scope1, 0);
      const scope2 = monthData.reduce((sum, d) => sum + calculateEmission(d).scope2, 0);
      return {
        period,
        范围一: parseFloat(scope1.toFixed(2)),
        范围二: parseFloat(scope2.toFixed(2)),
      };
    });
  }, [allMonths, startMonth, endMonth, selectedEnterpriseIds, enterprises, filteredEmissionData, filterEnterprise]);

  const buildEnergyBreakdown = (current: EmissionData, previous: EmissionData): EnergyDiff[] => {
    const curResult = calculateEmission(current);
    const prevResult = calculateEmission(previous);
    const items = [
      { key: 'electricity', label: '电力', icon: Zap, color: '#0EA5E9' },
      { key: 'gas', label: '天然气', icon: Flame, color: '#F97316' },
      { key: 'steam', label: '蒸汽', icon: Cloud, color: '#8B5CF6' },
      { key: 'fuel', label: '燃油', icon: Fuel, color: '#EF4444' },
    ];
    return items.map((item) => {
      const curVal = (current as any)[item.key] as number;
      const prevVal = (previous as any)[item.key] as number;
      const curEm = curResult.breakdown[item.key as keyof typeof curResult.breakdown];
      const prevEm = prevResult.breakdown[item.key as keyof typeof prevResult.breakdown];
      return {
        ...item,
        current: curVal,
        previous: prevVal,
        changeRate: prevVal > 0 ? parseFloat(((curVal - prevVal) / prevVal * 100).toFixed(2)) : 0,
        emissionChange: parseFloat((curEm - prevEm).toFixed(4)),
      };
    }).sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  };

  const anomalyRecords = useMemo((): AnomalyRecord[] => {
    const records: AnomalyRecord[] = [];
    const sortedPeriods = [...new Set(filteredEmissionData.map((d) => d.period))].sort();
    const eligibleEnterprises = enterprises.filter((ent) => {
      if (selectedEnterpriseIds.length > 0 && !selectedEnterpriseIds.includes(ent.id)) return false;
      return filterEnterprise(ent);
    });

    eligibleEnterprises.forEach((ent) => {
      const entData = filteredEmissionData
        .filter((d) => d.enterpriseId === ent.id)
        .sort((a, b) => a.period.localeCompare(b.period));

      entData.forEach((current, idx) => {
        if (idx > 0) {
          const prev = entData[idx - 1];
          const prevTotal = calculateEmission(prev).total;
          const currentTotal = calculateEmission(current).total;
          if (prevTotal > 0) {
            const changeRate = ((currentTotal - prevTotal) / prevTotal) * 100;
            if (Math.abs(changeRate) > 30) {
              records.push({
                id: `${ent.id}-${current.period}-mom`,
                enterpriseId: ent.id,
                enterpriseName: ent.name,
                industry: ent.industry,
                scale: ent.scale,
                period: current.period,
                type: '环比',
                changeRate: parseFloat(changeRate.toFixed(2)),
                message:
                  changeRate > 0
                    ? '排放量较上月显著上升，请关注能源消耗变化'
                    : '排放量较上月显著下降，请核实数据准确性',
                previousPeriod: prev.period,
                energyBreakdown: buildEnergyBreakdown(current, prev),
                totalCurrent: currentTotal,
                totalPrevious: prevTotal,
                totalDiff: currentTotal - prevTotal,
              });
            }
          }
        }

        const periodIdx = sortedPeriods.indexOf(current.period);
        if (periodIdx >= 12) {
          const yoyPeriod = sortedPeriods[periodIdx - 12];
          const yoyData = entData.find((d) => d.period === yoyPeriod);
          if (yoyData) {
            const yoyTotal = calculateEmission(yoyData).total;
            const currentTotal = calculateEmission(current).total;
            if (yoyTotal > 0) {
              const changeRate = ((currentTotal - yoyTotal) / yoyTotal) * 100;
              if (Math.abs(changeRate) > 30) {
                records.push({
                  id: `${ent.id}-${current.period}-yoy`,
                  enterpriseId: ent.id,
                  enterpriseName: ent.name,
                  industry: ent.industry,
                  scale: ent.scale,
                  period: current.period,
                  type: '同比',
                  changeRate: parseFloat(changeRate.toFixed(2)),
                  message:
                    changeRate > 0
                      ? '排放量较去年同期显著上升，建议排查原因'
                      : '排放量较去年同期显著下降，请确认数据',
                  previousPeriod: yoyPeriod,
                  energyBreakdown: buildEnergyBreakdown(current, yoyData),
                  totalCurrent: currentTotal,
                  totalPrevious: yoyTotal,
                  totalDiff: currentTotal - yoyTotal,
                });
              }
            }
          }
        }
      });
    });

    return records.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  }, [enterprises, filteredEmissionData, selectedEnterpriseIds, filterEnterprise]);

  const multiCompareData = useMemo(() => {
    return multiCompareIds
      .map((id) => {
        const ent = enterprises.find((e) => e.id === id);
        if (!ent) return null;
        const entData = filteredEmissionData.filter((d) => d.enterpriseId === id);
        const scope1 = entData.reduce((sum, d) => sum + calculateEmission(d).scope1, 0);
        const scope2 = entData.reduce((sum, d) => sum + calculateEmission(d).scope2, 0);
        const total = scope1 + scope2;
        return {
          name: ent.name,
          scope1: parseFloat(scope1.toFixed(2)),
          scope2: parseFloat(scope2.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        };
      })
      .filter(Boolean) as { name: string; scope1: number; scope2: number; total: number }[];
  }, [multiCompareIds, enterprises, filteredEmissionData]);

  const handleEnterpriseToggle = (id: string) => {
    setSelectedEnterpriseIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleIndustryToggle = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind]
    );
  };

  const handleScaleToggle = (s: string) => {
    setSelectedScales((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleMultiCompareToggle = (id: string) => {
    setMultiCompareIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        return prev.filter((e) => e !== id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const handleExportEnterprises = () => {
    const data =
      selectedEnterpriseIds.length > 0
        ? enterprises.filter((e) => selectedEnterpriseIds.includes(e.id))
        : enterprises.filter(filterEnterprise);
    exportEnterprises(data);
  };

  const handleAnomalyClick = (record: AnomalyRecord) => {
    navigate(`/data-entry?enterprise=${record.enterpriseId}&period=${record.period}`);
  };

  const toggleExpandAnomaly = (id: string) => {
    setExpandedAnomalyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedEnterpriseNames = selectedEnterpriseIds
    .map((id) => getEnterpriseById(id)?.name)
    .filter(Boolean) as string[];

  const hasAnomalyFilters = selectedIndustries.length > 0 || selectedScales.length > 0 || selectedEnterpriseIds.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">对比分析</h1>
        <p className="text-sm text-zinc-500 mt-1">多维度对比分析企业碳排放数据，洞察异常波动并溯源联动</p>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              <Building2 className="w-4 h-4 inline mr-1" />
              选择企业
            </label>
            <div className="relative">
              <button
                onClick={() => { setEnterpriseDropdownOpen(!enterpriseDropdownOpen); setIndustryDropdownOpen(false); setScaleDropdownOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors"
              >
                <span className={cn('text-sm truncate text-left', selectedEnterpriseNames.length > 0 ? 'text-zinc-800' : 'text-zinc-500')}>
                  {selectedEnterpriseNames.length > 0
                    ? selectedEnterpriseNames.join('、')
                    : '全部企业'}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-zinc-400 flex-shrink-0 ml-2 transition-transform',
                    enterpriseDropdownOpen && 'rotate-180'
                  )}
                />
              </button>
              {enterpriseDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                  {enterprises.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => handleEnterpriseToggle(ent.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors text-left',
                        !filterEnterprise(ent) && selectedEnterpriseIds.length === 0 && hasAnomalyFilters && 'opacity-40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selectedEnterpriseIds.includes(ent.id)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-zinc-300'
                        )}
                      >
                        {selectedEnterpriseIds.includes(ent.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-zinc-700 truncate">{ent.name}</span>
                      <span className="ml-auto text-xs text-zinc-400 flex-shrink-0">{ent.industry} · {ent.scale}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[180px]">
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              <Factory className="w-4 h-4 inline mr-1" />
              行业筛选
            </label>
            <div className="relative">
              <button
                onClick={() => { setIndustryDropdownOpen(!industryDropdownOpen); setEnterpriseDropdownOpen(false); setScaleDropdownOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors',
                  selectedIndustries.length > 0 && 'text-zinc-800'
                )}
              >
                <span className={cn('text-sm truncate text-left', selectedIndustries.length === 0 && 'text-zinc-500')}>
                  {selectedIndustries.length === 0 ? '全部行业' : `已选 ${selectedIndustries.length} 个`}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-zinc-400 flex-shrink-0 ml-2 transition-transform',
                    industryDropdownOpen && 'rotate-180'
                  )}
                />
              </button>
              {industryDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                  {INDUSTRY_LIST.map((ind) => (
                    <button
                      key={ind}
                      onClick={() => handleIndustryToggle(ind)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors text-left"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selectedIndustries.includes(ind)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-zinc-300'
                        )}
                      >
                        {selectedIndustries.includes(ind) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-zinc-700 truncate">{ind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[180px]">
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              <Layers className="w-4 h-4 inline mr-1" />
              企业规模
            </label>
            <div className="relative">
              <button
                onClick={() => { setScaleDropdownOpen(!scaleDropdownOpen); setEnterpriseDropdownOpen(false); setIndustryDropdownOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors',
                  selectedScales.length > 0 && 'text-zinc-800'
                )}
              >
                <span className={cn('text-sm truncate text-left', selectedScales.length === 0 && 'text-zinc-500')}>
                  {selectedScales.length === 0 ? '全部规模' : `已选 ${selectedScales.length} 个`}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-zinc-400 flex-shrink-0 ml-2 transition-transform',
                    scaleDropdownOpen && 'rotate-180'
                  )}
                />
              </button>
              {scaleDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                  {SCALES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleScaleToggle(s)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors text-left"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          selectedScales.includes(s)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-zinc-300'
                        )}
                      >
                        {selectedScales.includes(s) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-zinc-700 truncate">{s}型</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              起始月份
            </label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white hover:border-zinc-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="text-zinc-400 pb-2">—</div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              截止月份
            </label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white hover:border-zinc-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {hasAnomalyFilters && (
            <button
              onClick={() => {
                setSelectedEnterpriseIds([]);
                setSelectedIndustries([]);
                setSelectedScales([]);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
              清除筛选
            </button>
          )}

          <button
            onClick={handleExportEnterprises}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出企业清单
          </button>
        </div>
        {hasAnomalyFilters && (
          <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-2 items-center text-xs text-zinc-500">
            <span className="text-zinc-600 font-medium">筛选条件：</span>
            {selectedEnterpriseIds.length > 0 && <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded">企业 {selectedEnterpriseIds.length} 家</span>}
            {selectedIndustries.length > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">行业 {selectedIndustries.join('/')}</span>}
            {selectedScales.length > 0 && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">规模 {selectedScales.join('/')}</span>}
            <span>· 异常 {anomalyRecords.length} 条</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">行业均值对比</h2>
            <select
              value={industryCompareEnterpriseId || ''}
              onChange={(e) => setIndustryCompareEnterpriseId(e.target.value || null)}
              className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white hover:border-zinc-300 focus:outline-none focus:border-primary-500"
            >
              {enterprises.filter(filterEnterprise).map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryCompareData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="industry"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}`}
                  label={{
                    value: 'tCO₂',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#71717a',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatEmission(value),
                    name === 'industryAvg' ? '行业均值' : '选中企业',
                  ]}
                />
                <Legend
                  formatter={(value: string) => (value === 'industryAvg' ? '行业均值' : '选中企业')}
                />
                <Bar dataKey="industryAvg" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="selectedValue" fill="#0F5132" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">环比趋势图</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}`}
                  label={{
                    value: 'tCO₂',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#71717a',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatEmission(value)]}
                  labelFormatter={(label) => `月份: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="范围一"
                  stroke="#0F5132"
                  strokeWidth={2.5}
                  dot={{ fill: '#0F5132', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#0F5132' }}
                />
                <Line
                  type="monotone"
                  dataKey="范围二"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#F97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-accent-orange rounded-full" />
            <AlertTriangle className="w-5 h-5 text-accent-orange" />
            <h2 className="text-lg font-semibold text-zinc-900">异常波动提醒</h2>
            <span className="px-2 py-0.5 bg-accent-orange/10 text-accent-orange text-xs font-medium rounded-full">
              {anomalyRecords.length} 条
            </span>
            {anomalyRecords.length > 0 && (
              <span className="ml-auto text-xs text-zinc-500 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                点击跳转到对应填报页
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {anomalyRecords.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">
                {hasAnomalyFilters ? '当前筛选条件下无异常波动记录' : '暂无异常波动记录'}
              </div>
            ) : (
              anomalyRecords.map((record) => {
                const expanded = expandedAnomalyIds.has(record.id);
                const topDriver = record.energyBreakdown.find(e => Math.abs(e.changeRate) > 0);
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-zinc-100 overflow-hidden hover:border-primary-200 transition-all group"
                  >
                    <div
                      onClick={() => handleAnomalyClick(record)}
                      className="p-4 hover:bg-primary-50/30 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="font-medium text-zinc-900 truncate">{record.enterpriseName}</span>
                          <span className="text-zinc-300 flex-shrink-0">|</span>
                          <span className="text-sm text-zinc-500 flex-shrink-0">{record.period}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[11px] rounded">
                            {record.industry}
                          </span>
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[11px] rounded">
                            {record.scale}
                          </span>
                          <ExternalLink className="w-4 h-4 text-zinc-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">
                          {record.type}{record.previousPeriod ? `(${record.previousPeriod})` : ''}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-semibold flex items-center gap-0.5',
                            Math.abs(record.changeRate) > 30 ? 'text-red-600' : 'text-zinc-600'
                          )}
                        >
                          {record.changeRate > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {record.changeRate > 0 ? '+' : ''}
                          {formatNumber(record.changeRate, 2)}%
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {formatEmission(record.totalPrevious)} → {formatEmission(record.totalCurrent)}
                          <span className={record.totalDiff >= 0 ? 'text-red-500' : 'text-green-500'}>
                            ({record.totalDiff >= 0 ? '+' : ''}{record.totalDiff.toFixed(2)})
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 mb-3">{record.message}</p>
                      {topDriver && (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                          <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-medium">
                            主要变化来源
                          </span>
                          <span className="flex items-center gap-1">
                            <topDriver.icon className="w-3 h-3" style={{ color: topDriver.color }} />
                            {topDriver.label}
                          </span>
                          <span className={cn('font-mono font-medium', topDriver.changeRate > 0 ? 'text-red-500' : 'text-green-500')}>
                            {topDriver.changeRate > 0 ? '+' : ''}{formatNumber(topDriver.changeRate, 1)}%
                          </span>
                          <span className="text-zinc-400">
                            · 排放 {topDriver.emissionChange >= 0 ? '+' : ''}{topDriver.emissionChange.toFixed(3)} tCO₂
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpandAnomaly(record.id); }}
                        className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {expanded ? (
                          <><ChevronUp className="w-3 h-3" />收起能源明细</>
                        ) : (
                          <><ChevronDown className="w-3 h-3" />查看全部能源变化明细</>
                        )}
                      </button>
                    </div>

                    {expanded && (
                      <div className="bg-zinc-50/80 px-4 pb-4 pt-1 border-t border-zinc-100">
                        <div className="text-xs font-medium text-zinc-600 mb-2 mt-2">
                          能源分项变化对比（{record.previousPeriod || '上期'} → {record.period}）
                        </div>
                        <div className="space-y-2">
                          {record.energyBreakdown.map((e) => {
                            const isSignificant = Math.abs(e.changeRate) > 30;
                            return (
                              <div key={e.key} className="p-2.5 bg-white rounded-lg border border-zinc-100">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <e.icon className="w-3.5 h-3.5" style={{ color: e.color }} />
                                    <span className="text-xs font-medium text-zinc-800">{e.label}</span>
                                    {isSignificant && (
                                      <span className={cn(
                                        'px-1 py-px rounded text-[10px] font-semibold',
                                        e.changeRate > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                      )}>
                                        异常
                                      </span>
                                    )}
                                  </div>
                                  <span className={cn(
                                    'text-xs font-mono font-semibold',
                                    e.changeRate > 0 ? 'text-red-600' : e.changeRate < 0 ? 'text-green-600' : 'text-zinc-500'
                                  )}>
                                    {e.changeRate > 0 ? '+' : ''}{formatNumber(e.changeRate, 1)}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-1.5">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(Math.abs(e.changeRate), 100)}%`,
                                      backgroundColor: e.changeRate >= 0 ? (isSignificant ? '#EF4444' : '#F97316') : (isSignificant ? '#10B981' : '#0EA5E9'),
                                    }}
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[11px]">
                                  <div>
                                    <div className="text-zinc-400">上期</div>
                                    <div className="font-mono text-zinc-700">{formatNumber(e.previous, 0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-zinc-400">本期</div>
                                    <div className="font-mono text-zinc-800 font-medium">{formatNumber(e.current, 0)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-zinc-400">排放变化</div>
                                    <div className={cn(
                                      'font-mono font-medium',
                                      e.emissionChange >= 0 ? 'text-red-600' : 'text-green-600'
                                    )}>
                                      {e.emissionChange >= 0 ? '+' : ''}{e.emissionChange.toFixed(3)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAnomalyClick(record); }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          跳转到数据填报页查看完整记录
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">多企业横向对比</h2>
              <div className="flex items-center gap-1">
                {(['scope1', 'scope2', 'total'] as CompareScope[]).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setCompareScope(scope)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                      compareScope === scope
                        ? 'bg-primary-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    )}
                  >
                    {scope === 'scope1' ? '范围一' : scope === 'scope2' ? '范围二' : '总量'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {enterprises.filter(filterEnterprise).map((ent) => {
                const selected = multiCompareIds.includes(ent.id);
                const disabled = !selected && multiCompareIds.length >= 5;
                return (
                  <button
                    key={ent.id}
                    onClick={() => handleMultiCompareToggle(ent.id)}
                    disabled={disabled}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md border transition-all',
                      selected
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : disabled
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-primary-300 hover:text-primary-600'
                    )}
                  >
                    {ent.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={multiCompareData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                  label={{
                    value: 'tCO₂',
                    position: 'insideBottom',
                    offset: -5,
                    fill: '#71717a',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatEmission(value)]}
                />
                <Bar
                  dataKey={compareScope}
                  fill="#0F5132"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
