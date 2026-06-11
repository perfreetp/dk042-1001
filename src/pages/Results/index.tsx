import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
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
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useEmissionStore } from '@/store/emission';
import { useEnterpriseStore } from '@/store/enterprise';
import { calculateEmission } from '@/utils/calculator';
import { formatEmission } from '@/utils/formatter';
import { exportEmissionReport } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { EmissionData } from '@/types';

const PIE_COLORS = ['#0F5132', '#F97316', '#0EA5E9', '#A855F7'];

function getMonthRange(): { label: string; value: string }[] {
  const months: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label: value, value });
  }
  return months;
}

type SortKey = 'enterpriseName' | 'period' | 'scope1' | 'scope2' | 'total';
type SortOrder = 'asc' | 'desc';

interface TableRow extends EmissionData {
  enterpriseName: string;
  result: {
    scope1: number;
    scope2: number;
    total: number;
    breakdown: {
      electricity: number;
      gas: number;
      steam: number;
      fuel: number;
    };
  };
}

export default function Results() {
  const { emissionData } = useEmissionStore();
  const { enterprises, getEnterpriseById } = useEnterpriseStore();

  const [selectedEnterpriseIds, setSelectedEnterpriseIds] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const months = useMemo(() => getMonthRange(), []);

  const validData = useMemo(() => {
    return emissionData.filter((d) => d.status === 'approved' || d.status === 'locked');
  }, [emissionData]);

  const filteredData = useMemo((): TableRow[] => {
    return validData
      .filter((d) => {
        if (selectedEnterpriseIds.length > 0 && !selectedEnterpriseIds.includes(d.enterpriseId)) {
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
          result: calculateEmission(d),
        };
      });
  }, [validData, selectedEnterpriseIds, startMonth, endMonth, getEnterpriseById]);

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
    const previousData = validData
      .filter((d) => {
        if (selectedEnterpriseIds.length > 0 && !selectedEnterpriseIds.includes(d.enterpriseId)) {
          return false;
        }
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
      if (prev === 0) return { trend: 'up' as const, percent: '0.0%' };
      const change = ((cur - prev) / prev) * 100;
      return {
        trend: change >= 0 ? 'up' as const : 'down' as const,
        percent: `${Math.abs(change).toFixed(1)}%`,
      };
    };

    return {
      current,
      scope1Trend: calcTrend(current.scope1, previous.scope1),
      scope2Trend: calcTrend(current.scope2, previous.scope2),
      totalTrend: calcTrend(current.total, previous.total),
    };
  }, [filteredData, validData, selectedEnterpriseIds]);

  const pieData = useMemo(() => {
    const { breakdown } = summary.current;
    const data = [
      { name: '电力', value: breakdown.electricity },
      { name: '天然气', value: breakdown.gas },
      { name: '蒸汽', value: breakdown.steam },
      { name: '燃油', value: breakdown.fuel },
    ];
    return data.filter((d) => d.value > 0);
  }, [summary]);

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

  const toggleEnterprise = (id: string) => {
    setSelectedEnterpriseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
    exportEmissionReport(filteredData);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">核算结果</h1>
          <p className="text-sm text-zinc-500 mt-1">
            查看企业碳排放核算结果与排放构成分析
          </p>
        </div>
        <button
          onClick={handleExport}
          className={cn('btn btn-primary')}
        >
          <Download className="w-4 h-4" />
          导出核算报告
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <button
              onClick={() => setEnterpriseDropdownOpen(!enterpriseDropdownOpen)}
              className={cn(
                'input-field flex items-center justify-between gap-2 min-w-[280px]',
                selectedEnterpriseIds.length > 0 && 'text-zinc-900'
              )}
            >
              <span className={cn(selectedEnterpriseIds.length === 0 && 'text-zinc-400')}>
                {selectedEnterpriseIds.length === 0
                  ? '选择企业（可多选）'
                  : `已选 ${selectedEnterpriseIds.length} 家企业`}
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

          {(selectedEnterpriseIds.length > 0 || startMonth || endMonth) && (
            <button
              onClick={() => {
                setSelectedEnterpriseIds([]);
                setStartMonth('');
                setEndMonth('');
              }}
              className={cn('btn btn-secondary')}
            >
              <X className="w-3.5 h-3.5" />
              重置筛选
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">排放构成</h2>
          <div className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
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
                    formatter={(value: number) => formatEmission(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-zinc-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">核算明细</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">
                    <SortHeader label="企业名称" sortKeyName="enterpriseName" />
                  </th>
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
                      colSpan={6}
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
          {sortedData.length > 0 && (
            <div className="px-5 py-3 border-t border-zinc-100 text-sm text-zinc-500">
              共 {sortedData.length} 条记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
