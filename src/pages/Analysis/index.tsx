import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useEnterpriseStore } from '@/store/enterprise';
import { useEmissionStore } from '@/store/emission';
import { calculateEmission } from '@/utils/calculator';
import { formatEmission, formatNumber } from '@/utils/formatter';
import { exportEnterprises } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { Enterprise } from '@/types';

interface AnomalyRecord {
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  period: string;
  type: '同比' | '环比';
  changeRate: number;
  message: string;
}

type CompareScope = 'scope1' | 'scope2' | 'total';

export default function Analysis() {
  const { enterprises } = useEnterpriseStore();
  const { emissionData } = useEmissionStore();

  const [selectedEnterpriseIds, setSelectedEnterpriseIds] = useState<string[]>([]);
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

  const filteredEmissionData = useMemo(() => {
    return emissionData.filter((d) => d.period >= startMonth && d.period <= endMonth);
  }, [emissionData, startMonth, endMonth]);

  const industryCompareData = useMemo(() => {
    const industries = Array.from(new Set(enterprises.map((e) => e.industry)));
    const industryAverages = industries.map((industry) => {
      const industryEnterprises = enterprises.filter((e) => e.industry === industry);
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
  }, [enterprises, filteredEmissionData, industryCompareEnterpriseId]);

  const trendData = useMemo(() => {
    const periods = allMonths.filter((p) => p >= startMonth && p <= endMonth);
    const enterpriseIds = selectedEnterpriseIds.length > 0 ? selectedEnterpriseIds : enterprises.map((e) => e.id);

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
  }, [allMonths, startMonth, endMonth, selectedEnterpriseIds, enterprises, filteredEmissionData]);

  const anomalyRecords = useMemo((): AnomalyRecord[] => {
    const records: AnomalyRecord[] = [];
    const sortedPeriods = [...new Set(filteredEmissionData.map((d) => d.period))].sort();

    enterprises.forEach((ent) => {
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
                period: current.period,
                type: '环比',
                changeRate: parseFloat(changeRate.toFixed(2)),
                message:
                  changeRate > 0
                    ? '排放量较上月显著上升，请关注能源消耗变化'
                    : '排放量较上月显著下降，请核实数据准确性',
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
                  period: current.period,
                  type: '同比',
                  changeRate: parseFloat(changeRate.toFixed(2)),
                  message:
                    changeRate > 0
                      ? '排放量较去年同期显著上升，建议排查原因'
                      : '排放量较去年同期显著下降，请确认数据',
                });
              }
            }
          }
        }
      });
    });

    return records.sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  }, [enterprises, filteredEmissionData]);

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
        : enterprises;
    exportEnterprises(data);
  };

  const handleAnomalyClick = (record: AnomalyRecord) => {
    console.log('跳转到数据填报页:', record);
  };

  const selectedEnterpriseNames = selectedEnterpriseIds
    .map((id) => enterprises.find((e) => e.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">对比分析</h1>
        <p className="text-sm text-zinc-500 mt-1">多维度对比分析企业碳排放数据，洞察异常波动</p>
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
                onClick={() => setEnterpriseDropdownOpen(!enterpriseDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border border-zinc-200 rounded-lg bg-white hover:border-zinc-300 transition-colors"
              >
                <span className="text-sm text-zinc-600 truncate">
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 transition-colors text-left"
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

          <button
            onClick={handleExportEnterprises}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出企业清单
          </button>
        </div>
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
              {enterprises.map((ent) => (
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
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {anomalyRecords.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">暂无异常波动记录</div>
            ) : (
              anomalyRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleAnomalyClick(record)}
                  className="p-4 rounded-xl border border-zinc-100 hover:border-primary-200 hover:bg-primary-50/30 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-medium text-zinc-900">{record.enterpriseName}</span>
                      <span className="mx-2 text-zinc-300">|</span>
                      <span className="text-sm text-zinc-500">{record.period}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">
                      {record.type}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        Math.abs(record.changeRate) > 30 ? 'text-red-600' : 'text-zinc-600'
                      )}
                    >
                      {record.changeRate > 0 ? '+' : ''}
                      {formatNumber(record.changeRate, 2)}%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{record.message}</p>
                </div>
              ))
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
              {enterprises.map((ent) => {
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
