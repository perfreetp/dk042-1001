import { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Filter,
  Eye,
  Check,
  X,
  Building2,
  X as CloseIcon,
  FileText,
  ChevronRight,
  Zap,
  Flame,
  Cloud,
  Fuel,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  Paperclip,
  MessageSquare,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { useAuditStore } from '@/store';
import { useEmissionStore } from '@/store';
import { useEnterpriseStore } from '@/store';
import { useUIStore } from '@/store/ui';
import { calculateEmissionWithVersion } from '@/utils/calculator';
import { formatEmission, formatDateTime, formatNumber } from '@/utils/formatter';
import { cn } from '@/lib/utils';
import type { EmissionData, EmissionStatus, AuditRecord as AuditRecordType, Attachment, EmissionFactorKey } from '@/types';

const STATUS_FILTERS: { value: EmissionStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已退回' },
  { value: 'locked', label: '已锁定' },
];

function getMonths(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

function subtractMonth(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number);
  const d = new Date(year, month - 1 - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface HistoryCompareItem {
  period: string;
  total: number;
  electricity: number;
  gas: number;
  steam: number;
  fuel: number;
  changeRate: number | null;
}

const ACTION_META: Record<AuditRecordType['action'], { label: string; bg: string; icon: any; text: string; dot: string }> = {
  submit: {
    label: '提交',
    bg: 'bg-zinc-100',
    icon: Clock,
    text: 'text-zinc-700',
    dot: 'bg-zinc-100 text-zinc-600',
  },
  approve: {
    label: '审核通过',
    bg: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
    text: 'text-green-700',
    dot: 'bg-green-100 text-green-600',
  },
  reject: {
    label: '审核退回',
    bg: 'bg-red-100 text-red-700',
    icon: XCircle,
    text: 'text-red-700',
    dot: 'bg-red-100 text-red-600',
  },
  lock: {
    label: '锁定周期',
    bg: 'bg-purple-100 text-purple-700',
    icon: Lock,
    text: 'text-purple-700',
    dot: 'bg-purple-100 text-purple-600',
  },
};

export default function Audit() {
  const { approve, reject, batchApprove, lockPeriod, batchLock, getAttachments, getRecordsForEmission } = useAuditStore();
  const { addToast } = useUIStore();
  const { emissionData, getEnterpriseAllData } = useEmissionStore();
  const { enterprises, getEnterpriseById } = useEnterpriseStore();

  const [enterpriseFilter, setEnterpriseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmissionStatus | ''>('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<EmissionData | null>(null);
  const [auditOpinion, setAuditOpinion] = useState('');
  const [localAppendedRecords, setLocalAppendedRecords] = useState<Map<string, AuditRecordType[]>>(new Map());

  const INDUSTRY_FILTERS = useMemo(() => {
    const unique = Array.from(new Set(enterprises.map((e) => e.industry).filter(Boolean)));
    return [
      { value: '', label: '全部行业' },
      ...unique.map((i) => ({ value: i, label: i })),
    ];
  }, [enterprises]);

  const stats = useMemo(() => {
    return {
      pending: emissionData.filter((d) => d.status === 'pending').length,
      approved: emissionData.filter((d) => d.status === 'approved').length,
      rejected: emissionData.filter((d) => d.status === 'rejected').length,
      locked: emissionData.filter((d) => d.status === 'locked').length,
    };
  }, [emissionData]);

  const filteredData = useMemo(() => {
    return emissionData.filter((data) => {
      if (enterpriseFilter && data.enterpriseId !== enterpriseFilter) return false;
      if (statusFilter && data.status !== statusFilter) return false;
      if (monthFilter && data.period !== monthFilter) return false;
      if (industryFilter) {
        const ent = getEnterpriseById(data.enterpriseId);
        if (ent?.industry !== industryFilter) return false;
      }
      return true;
    });
  }, [emissionData, enterpriseFilter, statusFilter, monthFilter, industryFilter, getEnterpriseById]);

  const months = useMemo(() => getMonths(), []);

  const openSidebar = (data: EmissionData) => {
    setSelectedData(data);
    setAuditOpinion(data.auditOpinion || '');
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSelectedData(null);
    setAuditOpinion('');
  };

  const appendLocalRecord = (emissionDataId: string, record: AuditRecordType) => {
    setLocalAppendedRecords((prev) => {
      const next = new Map(prev);
      const existing = next.get(emissionDataId) || [];
      next.set(emissionDataId, [...existing, record]);
      return next;
    });
  };

  const handleApprove = () => {
    if (!selectedData) return;
    if (selectedData.status !== 'pending') {
      addToast('只有待审核状态的数据才能审核通过', 'warning');
      return;
    }
    const newRecord = approve(selectedData.id, '审核员', auditOpinion || undefined);
    if (newRecord) {
      appendLocalRecord(selectedData.id, newRecord);
    }
    addToast('已审核通过', 'success');
    setSelectedData((prev) =>
      prev ? { ...prev, status: 'approved', auditOpinion: auditOpinion || undefined, auditor: '审核员' } : null
    );
  };

  const handleReject = () => {
    if (!selectedData) return;
    if (!auditOpinion.trim()) {
      addToast('退回时请填写审核意见', 'warning');
      return;
    }
    if (selectedData.status !== 'pending') {
      addToast('只有待审核状态的数据才能退回', 'warning');
      return;
    }
    const newRecord = reject(selectedData.id, '审核员', auditOpinion);
    if (newRecord) {
      appendLocalRecord(selectedData.id, newRecord);
    }
    addToast('已退回，企业需要重新修正数据', 'success');
    setSelectedData((prev) =>
      prev ? { ...prev, status: 'rejected', auditOpinion, auditor: '审核员' } : null
    );
  };

  const handleLock = () => {
    if (!selectedData) return;
    const { success, record } = lockPeriod(selectedData.id, '审核员');
    if (success) {
      if (record) appendLocalRecord(selectedData.id, record);
      addToast('已成功锁定该周期，操作已进入审核记录', 'success');
      setSelectedData((prev) => (prev ? { ...prev, status: 'locked' } : null));
    } else {
      addToast('只有已通过状态的数据才能锁定', 'warning');
    }
  };

  const handleBatchApprove = () => {
    const pendingCount = selectedRowKeys.filter((id) => {
      const data = emissionData.find((d) => d.id === id);
      return data && data.status === 'pending';
    }).length;

    if (pendingCount === 0) {
      addToast('未选择待审核状态的记录，批量审核仅对待审核数据生效', 'warning');
      return;
    }

    const processedIds = batchApprove(selectedRowKeys, '审核员');
    addToast(`已成功审核通过 ${processedIds.length} 条待审核记录`, 'success');
    setSelectedRowKeys([]);
  };

  const handleBatchLock = () => {
    const approvedCount = selectedRowKeys.filter((id) => {
      const data = emissionData.find((d) => d.id === id);
      return data && data.status === 'approved';
    }).length;

    if (approvedCount === 0) {
      addToast('未选择已通过状态的记录，批量锁定仅对已通过数据生效', 'warning');
      return;
    }

    const processedIds = batchLock(selectedRowKeys, '审核员');
    addToast(`已成功锁定 ${processedIds.length} 条已通过记录，审核记录已保存`, 'success');
    setSelectedRowKeys([]);
  };

  const selectedResultWithVersion = selectedData ? calculateEmissionWithVersion(selectedData) : null;
  const selectedResult = selectedResultWithVersion;
  const selectedEnterprise = selectedData ? getEnterpriseById(selectedData.enterpriseId) : null;

  const attachmentCount = useMemo(() => {
    if (!selectedData) return 0;
    return getAttachments(selectedData.enterpriseId, selectedData.period).length;
  }, [selectedData, getAttachments, selectedData?.enterpriseId, selectedData?.period]);

  const attachments: Attachment[] = useMemo(() => {
    if (!selectedData) return [];
    return getAttachments(selectedData.enterpriseId, selectedData.period);
  }, [selectedData, getAttachments, selectedData?.enterpriseId, selectedData?.period]);

  const historyComparison = useMemo((): HistoryCompareItem[] => {
    if (!selectedData) return [];
    const allData = getEnterpriseAllData(selectedData.enterpriseId).filter(
      (d) => d.status !== 'draft'
    );
    const currentResult = selectedResult;

    const periods: string[] = [];
    for (let i = 2; i >= 0; i--) {
      periods.push(subtractMonth(selectedData.period, i));
    }

    return periods.map((p, idx) => {
      const d = allData.find((x) => x.period === p);
      if (d) {
        const r = calculateEmissionWithVersion(d);
        const prevPeriod = idx > 0 ? periods[idx - 1] : null;
        let changeRate: number | null = null;
        if (prevPeriod) {
          const prevD = allData.find((x) => x.period === prevPeriod);
          if (prevD) {
            const prevR = calculateEmissionWithVersion(prevD);
            if (prevR.total > 0) {
              changeRate = ((r.total - prevR.total) / prevR.total) * 100;
            }
          }
        }
        return {
          period: p,
          total: r.total,
          electricity: r.breakdown.electricity,
          gas: r.breakdown.gas,
          steam: r.breakdown.steam,
          fuel: r.breakdown.fuel,
          changeRate,
        };
      }
      return {
        period: p,
        total: p === selectedData.period ? currentResult?.total || 0 : 0,
        electricity: p === selectedData.period ? currentResult?.breakdown.electricity || 0 : 0,
        gas: p === selectedData.period ? currentResult?.breakdown.gas || 0 : 0,
        steam: p === selectedData.period ? currentResult?.breakdown.steam || 0 : 0,
        fuel: p === selectedData.period ? currentResult?.breakdown.fuel || 0 : 0,
        changeRate: null,
      };
    });
  }, [selectedData, getEnterpriseAllData, selectedResult]);

  const lastMonthCompare = useMemo(() => {
    if (!selectedData || historyComparison.length < 2) return null;
    const cur = historyComparison[historyComparison.length - 1];
    const prev = historyComparison[historyComparison.length - 2];
    if (prev.total === 0) return null;
    return {
      rate: ((cur.total - prev.total) / prev.total) * 100,
      diff: cur.total - prev.total,
    };
  }, [historyComparison, selectedData]);

  const sameMonthLastYear = useMemo(() => {
    if (!selectedData) return null;
    const lastYearPeriod = subtractMonth(selectedData.period, 12);
    const allData = getEnterpriseAllData(selectedData.enterpriseId);
    const d = allData.find((x) => x.period === lastYearPeriod);
    if (!d) return null;
    const cur = selectedResult?.total || 0;
    const prev = calculateEmissionWithVersion(d).total;
    if (prev === 0) return null;
    return {
      period: lastYearPeriod,
      rate: ((cur - prev) / prev) * 100,
      diff: cur - prev,
      prevTotal: prev,
    };
  }, [selectedData, getEnterpriseAllData, selectedResult]);

  const relevantAuditRecords = useMemo((): AuditRecordType[] => {
    if (!selectedData) return [];
    const baseRecords = getRecordsForEmission(selectedData.id);
    const localRecords = localAppendedRecords.get(selectedData.id) || [];
    const combined = [...baseRecords, ...localRecords];
    const seen = new Set<string>();
    const deduped: AuditRecordType[] = [];
    combined.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        deduped.push(r);
      }
    });
    return deduped.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [selectedData, getRecordsForEmission, localAppendedRecords, selectedData?.id]);

  const energyBreakdownChange = useMemo(() => {
    if (!lastMonthCompare || historyComparison.length < 2) return null;
    const cur = historyComparison[historyComparison.length - 1];
    const prev = historyComparison[historyComparison.length - 2];
    if (prev.total === 0) return null;

    const items = [
      { key: 'electricity', label: '电力', cur: cur.electricity, prev: prev.electricity, icon: Zap, color: 'text-accent-blue' },
      { key: 'gas', label: '天然气', cur: cur.gas, prev: prev.gas, icon: Flame, color: 'text-green-600' },
      { key: 'steam', label: '蒸汽', cur: cur.steam, prev: prev.steam, icon: Cloud, color: 'text-accent-blue' },
      { key: 'fuel', label: '燃油', cur: cur.fuel, prev: prev.fuel, icon: Fuel, color: 'text-green-600' },
    ];

    return items
      .map((item) => ({
        ...item,
        rate: item.prev > 0 ? ((item.cur - item.prev) / item.prev) * 100 : 0,
        absDiff: Math.abs(item.cur - item.prev),
      }))
      .sort((a, b) => b.absDiff - a.absDiff);
  }, [lastMonthCompare, historyComparison]);

  const columns: DataTableColumn<EmissionData>[] = [
    {
      key: 'enterpriseName',
      title: '企业名称',
      render: (record) => {
        const ent = getEnterpriseById(record.enterpriseId);
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <span className="font-medium text-zinc-900">{ent?.name || '-'}</span>
              {ent?.industry && (
                <p className="text-xs text-zinc-500 mt-0.5">{ent.industry}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'period',
      title: '统计月份',
      dataIndex: 'period',
      align: 'center',
    },
    {
      key: 'totalEmission',
      title: '排放量',
      render: (record) => {
        const r = calculateEmissionWithVersion(record);
        return (
          <div className="text-center">
            <span className="font-semibold text-zinc-900">{formatEmission(r.total)}</span>
          </div>
        );
      },
      align: 'center',
    },
    {
      key: 'submitTime',
      title: '提交时间',
      render: (record) => formatDateTime(record.submitTime || record.createdAt),
      align: 'center',
    },
    {
      key: 'status',
      title: '状态',
      render: (record) => <StatusBadge status={record.status} />,
      align: 'center',
    },
    {
      key: 'action',
      title: '操作',
      width: '180px',
      render: (record) => (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => openSidebar(record)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-primary-600 transition-colors text-sm"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
            详情
          </button>
          {record.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  const r = approve(record.id, '审核员');
                  if (r) appendLocalRecord(record.id, r);
                  addToast('已审核通过', 'success');
                }}
                className="p-1.5 rounded-lg hover:bg-green-50 text-zinc-600 hover:text-green-600 transition-colors"
                title="通过"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedData(record);
                  setAuditOpinion('');
                  setSidebarOpen(true);
                }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-600 hover:text-red-600 transition-colors"
                title="退回"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {record.status === 'approved' && (
            <button
              onClick={() => {
                const { success, record: newRec } = lockPeriod(record.id, '审核员');
                if (success && newRec) appendLocalRecord(record.id, newRec);
                addToast(success ? '已成功锁定该周期' : '仅已通过数据可锁定', success ? 'success' : 'warning');
              }}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-zinc-600 hover:text-purple-600 transition-colors"
              title="锁定周期"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      align: 'center',
    },
  ];

  const batchActions = (
    <>
      <button onClick={handleBatchApprove} className={cn('btn btn-primary btn-sm')}>
        <Check className="w-3.5 h-3.5" />
        批量通过
      </button>
      <button
        onClick={handleBatchLock}
        className={cn('btn', 'bg-purple-500 text-white hover:bg-purple-600')}
      >
        <Lock className="w-3.5 h-3.5" />
        批量锁定
      </button>
    </>
  );

  return (
    <div className="p-6 space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">审核任务</h1>
        <p className="text-sm text-zinc-500 mt-1">
          审核企业提交的碳排放数据，查看完整详情与历史追溯，所有操作（通过/退回/锁定）均记入审核记录
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="待审核" value={stats.pending} icon={Clock} color="orange" />
        <StatCard title="已通过" value={stats.approved} icon={CheckCircle2} color="green" />
        <StatCard title="已退回" value={stats.rejected} icon={XCircle} color="blue" />
        <StatCard title="已锁定" value={stats.locked} icon={Lock} color="purple" />
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={enterpriseFilter}
              onChange={(e) => setEnterpriseFilter(e.target.value)}
              className={cn('input-field w-48')}
            >
              <option value="">全部企业</option>
              {enterprises.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className={cn('input-field w-40')}
          >
            {INDUSTRY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmissionStatus | '')}
            className={cn('input-field w-36')}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={cn('input-field w-40')}
          >
            <option value="">全部月份</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="ml-auto text-xs text-zinc-500 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            操作均自动记入审核记录，可在详情侧栏追溯
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        rowKey="id"
        selectable
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        batchActions={batchActions}
        pagination
        pageSize={10}
      />

      {selectedData && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-zinc-900/30 backdrop-blur-sm z-40"
            onClick={closeSidebar}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-left">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-zinc-900">审核详情</h2>
                    {selectedData && <StatusBadge status={selectedData.status} />}
                  </div>
                  <p className="text-sm text-zinc-500">
                    {selectedEnterprise?.name || '-'} · {selectedData.period}
                  </p>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedResult && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500">企业规模</span>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {selectedEnterprise?.scale || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">所属行业</span>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {selectedEnterprise?.industry || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">提交时间</span>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {formatDateTime(selectedData.submitTime || selectedData.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">附件数量</span>
                    <p className="mt-1 text-sm font-medium text-zinc-900 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                      {attachmentCount} 个
                    </p>
                  </div>
                </div>

                {selectedResultWithVersion && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-sky-50 to-primary-50 border border-primary-100 flex items-center gap-2 flex-wrap">
                    <SlidersHorizontal className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-primary-800">当前核算因子版本：</span>
                    {(['electricity', 'gas', 'steam', 'fuel'] as EmissionFactorKey[]).map((k) => {
                      const v = selectedResultWithVersion.factorVersionMap[k];
                      const labels: Record<EmissionFactorKey, string> = {
                        electricity: '电',
                        gas: '气',
                        steam: '汽',
                        fuel: '油',
                      };
                      return (
                        <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white/80 border border-primary-100 text-zinc-700">
                          <Tag className="w-3 h-3 text-primary-500" />
                          {labels[k]} <span className="font-mono font-semibold">{v.version}</span>
                          <span className="text-zinc-400">({v.effectiveMonth})</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                    <span className="text-xs text-green-700">范围一</span>
                    <p className="mt-1 text-lg font-bold text-green-700">
                      {formatEmission(selectedResult.scope1)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="text-xs text-blue-700">范围二</span>
                    <p className="mt-1 text-lg font-bold text-blue-700">
                      {formatEmission(selectedResult.scope2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                    <span className="text-xs text-primary-700">总量</span>
                    <p className="mt-1 text-lg font-bold text-primary-700">
                      {formatEmission(selectedResult.total)}
                    </p>
                  </div>
                </div>

                {(lastMonthCompare || sameMonthLastYear) && (
                  <div className="grid grid-cols-2 gap-4">
                    {lastMonthCompare && (
                      <div className="p-4 rounded-xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-500">环比上月</span>
                          {lastMonthCompare.rate >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-lg font-bold',
                            lastMonthCompare.rate >= 0 ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {lastMonthCompare.rate > 0 ? '+' : ''}
                          {formatNumber(lastMonthCompare.rate, 1)}%
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {lastMonthCompare.diff > 0 ? '+' : ''}
                          {formatEmission(lastMonthCompare.diff)}
                        </p>
                      </div>
                    )}
                    {sameMonthLastYear && (
                      <div className="p-4 rounded-xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-500">同比去年</span>
                          {sameMonthLastYear.rate >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-lg font-bold',
                            sameMonthLastYear.rate >= 0 ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {sameMonthLastYear.rate > 0 ? '+' : ''}
                          {formatNumber(sameMonthLastYear.rate, 1)}%
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          去年同期: {formatEmission(sameMonthLastYear.prevTotal)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-900">能耗与产量数据</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-50">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Zap className="w-3 h-3" /> 用电量
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {selectedData.electricity.toLocaleString()} kWh
                      </p>
                      <p className="text-xs text-accent-blue mt-0.5">
                        {formatEmission(selectedResult.breakdown.electricity)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Flame className="w-3 h-3" /> 天然气
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {selectedData.gas.toLocaleString()} m³
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {formatEmission(selectedResult.breakdown.gas)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Cloud className="w-3 h-3" /> 蒸汽
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {selectedData.steam.toLocaleString()} t
                      </p>
                      <p className="text-xs text-accent-blue mt-0.5">
                        {formatEmission(selectedResult.breakdown.steam)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Fuel className="w-3 h-3" /> 燃油
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {selectedData.fuel.toLocaleString()} t
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {formatEmission(selectedResult.breakdown.fuel)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 col-span-2">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Package className="w-3 h-3" /> 产品产量
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {selectedData.production.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {energyBreakdownChange && energyBreakdownChange.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-900">环比变化来源</h3>
                    </div>
                    <div className="space-y-2">
                      {energyBreakdownChange.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-50"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className={cn('w-4 h-4', item.color)} />
                            <span className="text-sm text-zinc-700">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                item.rate >= 0 ? 'text-red-600' : 'text-green-600'
                              )}
                            >
                              {item.rate > 0 ? '+' : ''}
                              {formatNumber(item.rate, 1)}%
                            </span>
                            <span className="text-xs text-zinc-500">
                              {formatEmission(item.cur - item.prev)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {historyComparison.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <History className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-900">近月排放趋势</h3>
                    </div>
                    <div className="space-y-2">
                      {historyComparison.map((item) => (
                        <div
                          key={item.period}
                          className={cn(
                            'p-3 rounded-lg border transition-colors',
                            item.period === selectedData.period
                              ? 'border-primary-300 bg-primary-50'
                              : 'border-zinc-200 bg-white'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900">
                                {item.period}
                              </span>
                              {item.period === selectedData.period && (
                                <span className="px-1.5 py-0.5 bg-primary-500 text-white text-xs rounded">
                                  当前
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-zinc-900">
                              {formatEmission(item.total)}
                            </span>
                          </div>
                          {item.changeRate !== null && (
                            <div className="flex items-center gap-2">
                              {item.changeRate >= 0 ? (
                                <TrendingUp className="w-3 h-3 text-red-500" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-green-500" />
                              )}
                              <span
                                className={cn(
                                  'text-xs',
                                  item.changeRate >= 0 ? 'text-red-600' : 'text-green-600'
                                )}
                              >
                                {item.changeRate > 0 ? '+' : ''}
                                {formatNumber(item.changeRate, 1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-900">
                      凭证附件
                      <span className="text-xs font-normal text-zinc-500 ml-2">
                        ({attachmentCount} 个)
                      </span>
                    </h3>
                  </div>
                  {attachments.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 text-center text-sm text-zinc-400">
                      暂无附件
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.slice(0, 5).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 truncate">
                                {att.fileName}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {att.fileType} ·{' '}
                                {formatDateTime(att.uploadTime)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-900">审核记录</h3>
                    </div>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      共 {relevantAuditRecords.length} 条追溯记录
                    </span>
                  </div>
                  {relevantAuditRecords.length === 0 ? (
                    <div className="p-4 rounded-lg bg-zinc-50 text-center text-sm text-zinc-400">
                      暂无审核记录
                    </div>
                  ) : (
                    <div className="relative pl-1">
                      <div className="absolute left-[18px] top-2 bottom-2 w-px bg-zinc-200" />
                      <div className="space-y-4">
                        {relevantAuditRecords.map((record, idx) => {
                          const meta = ACTION_META[record.action] || ACTION_META.submit;
                          const Icon = meta.icon;
                          const isLast = idx === relevantAuditRecords.length - 1;
                          return (
                            <div key={record.id} className="flex gap-3 relative">
                              <div
                                className={cn(
                                  'w-9 h-9 rounded-full shrink-0 flex items-center justify-center z-10 ring-4 ring-white',
                                  meta.dot
                                )}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span className="text-sm font-semibold text-zinc-900">
                                    {record.auditor}
                                  </span>
                                  <span className={cn('px-2 py-0.5 text-xs rounded font-medium', meta.bg)}>
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 font-mono ml-auto">
                                    {formatDateTime(record.timestamp)}
                                  </span>
                                </div>
                                {record.opinion && (
                                  <p className="mt-0.5 text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 p-2 rounded-lg">
                                    {record.opinion}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedData.status === 'pending' && (
                  <div className="border-t border-zinc-200 pt-5">
                    <label className="label">审核意见 <span className="text-red-500">（退回必填）</span></label>
                    <textarea
                      value={auditOpinion}
                      onChange={(e) => setAuditOpinion(e.target.value)}
                      placeholder="请输入审核意见..."
                      rows={3}
                      className={cn('input-field resize-none')}
                    />
                  </div>
                )}

                {(selectedData.status === 'approved' ||
                  selectedData.status === 'rejected' ||
                  selectedData.status === 'locked') &&
                  selectedData.auditOpinion && (
                    <div className="border-t border-zinc-200 pt-5">
                      <span className="label">最近审核意见</span>
                      <div className="mt-1 p-3 rounded-lg bg-zinc-50 text-sm text-zinc-700 border border-zinc-100">
                        {selectedData.auditOpinion}
                      </div>
                      {selectedData.auditor && (
                        <p className="mt-2 text-xs text-zinc-500">
                          审核人：{selectedData.auditor}
                        </p>
                      )}
                    </div>
                  )}

                <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-zinc-200">
                  {selectedData.status === 'pending' ? (
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={closeSidebar}
                        className={cn('btn btn-secondary')}
                      >
                        取消
                      </button>
                      <button
                        onClick={handleReject}
                        className={cn('btn btn-danger')}
                        disabled={!auditOpinion.trim()}
                      >
                        <XCircle className="w-4 h-4" />
                        退回
                      </button>
                      <button onClick={handleApprove} className={cn('btn btn-primary')}>
                        <CheckCircle2 className="w-4 h-4" />
                        通过
                      </button>
                    </div>
                  ) : selectedData.status === 'approved' ? (
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={closeSidebar}
                        className={cn('btn btn-secondary')}
                      >
                        关闭
                      </button>
                      <button onClick={handleLock} className={cn('btn', 'bg-purple-500 text-white hover:bg-purple-600')}>
                        <Lock className="w-4 h-4" />
                        锁定周期
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={closeSidebar}
                        className={cn('btn btn-secondary')}
                      >
                        关闭
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
