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
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { useAuditStore } from '@/store';
import { useEmissionStore } from '@/store';
import { useEnterpriseStore } from '@/store';
import { useUIStore } from '@/store/ui';
import { calculateEmission } from '@/utils/calculator';
import { formatEmission, formatDateTime } from '@/utils/formatter';
import { cn } from '@/lib/utils';
import type { EmissionData, EmissionStatus } from '@/types';

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

export default function Audit() {
  const { approve, reject, batchApprove, lockPeriod, batchLock } = useAuditStore();
  const { addToast } = useUIStore();
  const { emissionData } = useEmissionStore();
  const { enterprises, getEnterpriseById } = useEnterpriseStore();

  const [enterpriseFilter, setEnterpriseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmissionStatus | ''>('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [currentAuditData, setCurrentAuditData] = useState<EmissionData | null>(null);
  const [auditOpinion, setAuditOpinion] = useState('');

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
      return true;
    });
  }, [emissionData, enterpriseFilter, statusFilter, monthFilter]);

  const months = useMemo(() => getMonths(), []);

  const openAuditModal = (data: EmissionData) => {
    setCurrentAuditData(data);
    setAuditOpinion(data.auditOpinion || '');
    setAuditModalOpen(true);
  };

  const closeAuditModal = () => {
    setAuditModalOpen(false);
    setCurrentAuditData(null);
    setAuditOpinion('');
  };

  const handleApprove = () => {
    if (!currentAuditData) return;
    if (currentAuditData.status !== 'pending') {
      addToast('只有待审核状态的数据才能审核通过', 'warning');
      return;
    }
    approve(currentAuditData.id, '审核员', auditOpinion || undefined);
    addToast('已审核通过', 'success');
    closeAuditModal();
  };

  const handleReject = () => {
    if (!currentAuditData) return;
    if (!auditOpinion.trim()) {
      return;
    }
    if (currentAuditData.status !== 'pending') {
      addToast('只有待审核状态的数据才能退回', 'warning');
      return;
    }
    reject(currentAuditData.id, '审核员', auditOpinion);
    addToast('已退回，企业需要重新修正数据', 'success');
    closeAuditModal();
  };

  const handleBatchApprove = () => {
    const pendingCount = selectedRowKeys.filter(id => {
      const data = emissionData.find(d => d.id === id);
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
    const approvedCount = selectedRowKeys.filter(id => {
      const data = emissionData.find(d => d.id === id);
      return data && data.status === 'approved';
    }).length;
    
    if (approvedCount === 0) {
      addToast('未选择已通过状态的记录，批量锁定仅对已通过数据生效', 'warning');
      return;
    }
    
    const processedIds = batchLock(selectedRowKeys);
    addToast(`已成功锁定 ${processedIds.length} 条已通过记录`, 'success');
    setSelectedRowKeys([]);
  };

  const handleLock = (id: string) => {
    const success = lockPeriod(id);
    if (success) {
      addToast('已成功锁定该周期', 'success');
    } else {
      addToast('只有已通过状态的数据才能锁定', 'warning');
    }
  };

  const currentResult = currentAuditData ? calculateEmission(currentAuditData) : null;
  const currentEnterprise = currentAuditData ? getEnterpriseById(currentAuditData.enterpriseId) : null;

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
            <span className="font-medium text-zinc-900">{ent?.name || '-'}</span>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAuditModal(record)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-primary-600 transition-colors"
            title="查看/审核"
          >
            <Eye className="w-4 h-4" />
          </button>
          {record.status === 'pending' && (
            <>
              <button
                onClick={() => approve(record.id, '审核员')}
                className="p-1.5 rounded-lg hover:bg-green-50 text-zinc-600 hover:text-green-600 transition-colors"
                title="通过"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentAuditData(record);
                  setAuditOpinion('');
                  setAuditModalOpen(true);
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
              onClick={() => handleLock(record.id)}
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
      <button
        onClick={handleBatchApprove}
        className={cn('btn btn-primary btn-sm')}
      >
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">审核任务</h1>
        <p className="text-sm text-zinc-500 mt-1">
          审核企业提交的碳排放数据，管理数据状态
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待审核"
          value={stats.pending}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="已通过"
          value={stats.approved}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="已退回"
          value={stats.rejected}
          icon={XCircle}
          color="blue"
        />
        <StatCard
          title="已锁定"
          value={stats.locked}
          icon={Lock}
          color="purple"
        />
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

      <Modal
        open={auditModalOpen}
        onClose={closeAuditModal}
        title="碳排放数据审核"
        width="max-w-2xl"
        footer={
          currentAuditData?.status === 'pending' ? (
            <>
              <button onClick={closeAuditModal} className={cn('btn btn-secondary')}>
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
            </>
          ) : (
            <button onClick={closeAuditModal} className={cn('btn btn-primary')}>
              关闭
            </button>
          )
        }
      >
        {currentAuditData && currentResult && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-zinc-500">企业名称</span>
                <p className="mt-1 text-base font-medium text-zinc-900">
                  {currentEnterprise?.name || '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-zinc-500">统计月份</span>
                <p className="mt-1 text-base font-medium text-zinc-900">
                  {currentAuditData.period}
                </p>
              </div>
              <div>
                <span className="text-sm text-zinc-500">提交时间</span>
                <p className="mt-1 text-base font-medium text-zinc-900">
                  {formatDateTime(currentAuditData.submitTime || currentAuditData.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-zinc-500">当前状态</span>
                <p className="mt-1">
                  <StatusBadge status={currentAuditData.status} />
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-5">
              <h4 className="text-sm font-semibold text-zinc-900 mb-3">能耗与产量数据</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-zinc-50">
                  <span className="text-xs text-zinc-500">用电量</span>
                  <p className="mt-1 text-lg font-bold text-zinc-900">
                    {currentAuditData.electricity.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500 ml-1">kWh</span>
                  </p>
                  <p className="text-xs text-accent-blue mt-0.5">
                    {formatEmission(currentResult.breakdown.electricity)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50">
                  <span className="text-xs text-zinc-500">天然气</span>
                  <p className="mt-1 text-lg font-bold text-zinc-900">
                    {currentAuditData.gas.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500 ml-1">m³</span>
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {formatEmission(currentResult.breakdown.gas)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50">
                  <span className="text-xs text-zinc-500">蒸汽</span>
                  <p className="mt-1 text-lg font-bold text-zinc-900">
                    {currentAuditData.steam.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500 ml-1">t</span>
                  </p>
                  <p className="text-xs text-accent-blue mt-0.5">
                    {formatEmission(currentResult.breakdown.steam)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50">
                  <span className="text-xs text-zinc-500">燃料</span>
                  <p className="mt-1 text-lg font-bold text-zinc-900">
                    {currentAuditData.fuel.toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500 ml-1">t</span>
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {formatEmission(currentResult.breakdown.fuel)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50">
                  <span className="text-xs text-zinc-500">产量</span>
                  <p className="mt-1 text-lg font-bold text-zinc-900">
                    {currentAuditData.production.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-5">
              <h4 className="text-sm font-semibold text-zinc-900 mb-3">排放量汇总</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <span className="text-sm text-green-700">范围一（直接排放）</span>
                  <p className="mt-1 text-xl font-bold text-green-700">
                    {formatEmission(currentResult.scope1)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-sm text-blue-700">范围二（间接排放）</span>
                  <p className="mt-1 text-xl font-bold text-blue-700">
                    {formatEmission(currentResult.scope2)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary-50 border border-primary-100">
                  <span className="text-sm text-primary-700">总排放量</span>
                  <p className="mt-1 text-xl font-bold text-primary-700">
                    {formatEmission(currentResult.total)}
                  </p>
                </div>
              </div>
            </div>

            {currentAuditData.status === 'pending' && (
              <div className="border-t border-zinc-200 pt-5">
                <label className="label">审核意见</label>
                <textarea
                  value={auditOpinion}
                  onChange={(e) => setAuditOpinion(e.target.value)}
                  placeholder="请输入审核意见（退回时必填）"
                  rows={3}
                  className={cn('input-field resize-none')}
                />
              </div>
            )}

            {(currentAuditData.status === 'approved' || currentAuditData.status === 'rejected' || currentAuditData.status === 'locked') && currentAuditData.auditOpinion && (
              <div className="border-t border-zinc-200 pt-5">
                <span className="label">审核意见</span>
                <div className="mt-1 p-3 rounded-lg bg-zinc-50 text-sm text-zinc-700">
                  {currentAuditData.auditOpinion}
                </div>
                {currentAuditData.auditor && (
                  <p className="mt-2 text-xs text-zinc-500">
                    审核人：{currentAuditData.auditor}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
