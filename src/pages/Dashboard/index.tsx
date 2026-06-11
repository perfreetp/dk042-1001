import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Leaf,
  Calendar,
  Clock,
  AlertTriangle,
  FilePlus,
  CheckSquare,
  Download,
} from 'lucide-react';
import { useEnterpriseStore } from '@/store/enterprise';
import { useEmissionStore } from '@/store/emission';
import { useAuditStore } from '@/store/audit';
import { calculateEmission } from '@/utils/calculator';
import { formatEmission } from '@/utils/formatter';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { enterprises } = useEnterpriseStore();
  const { emissionData } = useEmissionStore();
  const { auditRecords } = useAuditStore();

  const getLastSixMonths = () => {
    const periods: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return periods;
  };

  const totalEmission = useMemo(() => {
    return emissionData.reduce((sum, d) => {
      if (d.status === 'approved' || d.status === 'locked') {
        return sum + calculateEmission(d).total;
      }
      return sum;
    }, 0);
  }, [emissionData]);

  const currentMonthEmission = useMemo(() => {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return emissionData
      .filter((d) => d.period === currentPeriod)
      .reduce((sum, d) => sum + calculateEmission(d).total, 0);
  }, [emissionData]);

  const pendingAuditCount = useMemo(() => {
    return emissionData.filter((d) => d.status === 'pending').length;
  }, [emissionData]);

  const warningCount = useMemo(() => {
    return emissionData.filter((d) => d.status === 'rejected').length;
  }, [emissionData]);

  const trendData = useMemo(() => {
    const periods = getLastSixMonths();
    return periods.map((period) => {
      const monthData = emissionData.filter((d) => d.period === period);
      const emission = monthData.reduce((sum, d) => {
        if (d.status === 'approved' || d.status === 'locked') {
          return sum + calculateEmission(d).total;
        }
        return sum;
      }, 0);
      return {
        period,
        emission: parseFloat(emission.toFixed(2)),
      };
    });
  }, [emissionData]);

  const enterpriseRanking = useMemo(() => {
    const enterpriseEmissions = enterprises.map((ent) => {
      const entData = emissionData.filter(
        (d) =>
          d.enterpriseId === ent.id &&
          (d.status === 'approved' || d.status === 'locked')
      );
      const total = entData.reduce((sum, d) => sum + calculateEmission(d).total, 0);
      return {
        name: ent.name,
        emission: parseFloat(total.toFixed(2)),
      };
    });
    return enterpriseEmissions
      .sort((a, b) => b.emission - a.emission)
      .slice(0, 5);
  }, [enterprises, emissionData]);

  const statCards = [
    {
      label: '园区总排放量',
      value: formatEmission(totalEmission),
      icon: Leaf,
      color: 'bg-primary-50 text-primary-600',
      iconBg: 'bg-primary-100',
    },
    {
      label: '本月排放量',
      value: formatEmission(currentMonthEmission),
      icon: Calendar,
      color: 'bg-accent-blue/10 text-accent-blue',
      iconBg: 'bg-accent-blue/20',
    },
    {
      label: '待审核数量',
      value: `${pendingAuditCount} 条`,
      icon: Clock,
      color: 'bg-accent-orange/10 text-accent-orange',
      iconBg: 'bg-accent-orange/20',
    },
    {
      label: '异常预警数量',
      value: `${warningCount} 条`,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      iconBg: 'bg-red-100',
    },
  ];

  const quickActions = [
    { label: '数据填报', icon: FilePlus, color: 'bg-primary-500 hover:bg-primary-600' },
    { label: '审核任务', icon: CheckSquare, color: 'bg-accent-blue hover:bg-accent-blue/90' },
    { label: '导出报告', icon: Download, color: 'bg-accent-orange hover:bg-accent-orange/90' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">园区碳排放概览</h1>
        <p className="text-sm text-zinc-500 mt-1">
          实时监控园区企业碳排放数据，掌握整体排放情况
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={cn('card p-5 hover:shadow-card-hover transition-shadow')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-500">{card.label}</p>
                <p className={cn('text-2xl font-bold mt-2', card.color.split(' ')[1])}>
                  {card.value}
                </p>
              </div>
              <div className={cn('p-3 rounded-xl', card.iconBg)}>
                <card.icon className={cn('w-6 h-6', card.color.split(' ')[1])} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">近6个月排放趋势</h2>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatEmission(value), '排放量']}
                  labelFormatter={(label) => `月份: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="emission"
                  stroke="#0F5132"
                  strokeWidth={2.5}
                  dot={{ fill: '#0F5132', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#0F5132' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">企业排放量排名 TOP5</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enterpriseRanking}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={{ stroke: '#e4e4e7' }}
                  tickLine={false}
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
                  formatter={(value: number) => [formatEmission(value), '总排放量']}
                />
                <Bar
                  dataKey="emission"
                  fill="#0F5132"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                action.color
              )}
            >
              <action.icon className="w-6 h-6" />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
