import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Zap,
  Flame,
  Cloud,
  Fuel,
  Package,
  FileText,
  Save,
  Send,
  Copy,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useEnterpriseStore } from '@/store/enterprise';
import { useEmissionStore } from '@/store/emission';
import { useUIStore } from '@/store/ui';
import { calculateEmission } from '@/utils/calculator';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import type { EmissionData } from '@/types';

interface FormData {
  electricity: number | '';
  gas: number | '';
  steam: number | '';
  fuel: number | '';
  production: number | '';
  remark: string;
}

const initialFormData: FormData = {
  electricity: '',
  gas: '',
  steam: '',
  fuel: '',
  production: '',
  remark: '',
};

type RequiredFields = keyof Omit<FormData, 'remark'>;

const REQUIRED_FIELDS: { key: RequiredFields; label: string; icon: typeof Zap }[] = [
  { key: 'electricity', label: '用电量', icon: Zap },
  { key: 'gas', label: '燃气量', icon: Flame },
  { key: 'steam', label: '蒸汽量', icon: Cloud },
  { key: 'fuel', label: '车辆燃油量', icon: Fuel },
  { key: 'production', label: '主要产品产量', icon: Package },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DataEntry() {
  const { enterprises, currentEnterpriseId, setCurrentEnterprise } = useEnterpriseStore();
  const { getData, saveData, submitData, getEnterpriseAllData } = useEmissionStore();
  const { addToast } = useUIStore();

  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>(currentEnterpriseId || '');
  const [period, setPeriod] = useState<string>(getCurrentMonth());
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState('');

  useEffect(() => {
    if (selectedEnterpriseId && period) {
      const existing = getData(selectedEnterpriseId, period);
      if (existing) {
        setFormData({
          electricity: existing.electricity,
          gas: existing.gas,
          steam: existing.steam,
          fuel: existing.fuel,
          production: existing.production,
          remark: '',
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [selectedEnterpriseId, period, getData]);

  const missingFields = useMemo(() => {
    return REQUIRED_FIELDS.filter((f) => formData[f.key] === '' || Number(formData[f.key]) < 0);
  }, [formData]);

  const currentEmission = useMemo(() => {
    return calculateEmission({
      electricity: Number(formData.electricity) || 0,
      gas: Number(formData.gas) || 0,
      steam: Number(formData.steam) || 0,
      fuel: Number(formData.fuel) || 0,
    });
  }, [formData]);

  const historyData = useMemo(() => {
    if (!selectedEnterpriseId) return [];
    return getEnterpriseAllData(selectedEnterpriseId).filter(
      (d) => d.period !== period && d.status !== 'draft'
    );
  }, [selectedEnterpriseId, period, getEnterpriseAllData]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === 'remark') {
      setFormData((prev) => ({ ...prev, [field]: value }));
      return;
    }
    if (value === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
    } else {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) {
        setFormData((prev) => ({ ...prev, [field]: num }));
      }
    }
  };

  const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedEnterpriseId(id);
    setCurrentEnterprise(id || null);
  };

  const getEmissionDataId = (): string => {
    const existing = getData(selectedEnterpriseId, period);
    if (existing) return existing.id;
    return `EMI${Date.now().toString().padStart(6, '0')}`;
  };

  const buildEmissionData = (status: 'draft' | 'pending'): EmissionData => {
    const existing = getData(selectedEnterpriseId, period);
    const now = new Date().toISOString();
    return {
      id: existing?.id || getEmissionDataId(),
      enterpriseId: selectedEnterpriseId,
      period,
      status,
      electricity: Number(formData.electricity) || 0,
      gas: Number(formData.gas) || 0,
      steam: Number(formData.steam) || 0,
      fuel: Number(formData.fuel) || 0,
      production: Number(formData.production) || 0,
      totalEmission: currentEmission.total,
      sources: [
        {
          name: '电力消耗',
          fuelType: 'electricity',
          consumption: Number(formData.electricity) || 0,
          unit: 'kWh',
          emissionFactor: 0.000581,
          emission: currentEmission.breakdown.electricity,
        },
        {
          name: '天然气消耗',
          fuelType: 'gas',
          consumption: Number(formData.gas) || 0,
          unit: 'm³',
          emissionFactor: 0.0021622,
          emission: currentEmission.breakdown.gas,
        },
        {
          name: '蒸汽消耗',
          fuelType: 'steam',
          consumption: Number(formData.steam) || 0,
          unit: 't',
          emissionFactor: 0.11,
          emission: currentEmission.breakdown.steam,
        },
        {
          name: '燃油消耗',
          fuelType: 'fuel',
          consumption: Number(formData.fuel) || 0,
          unit: 'L',
          emissionFactor: 0.0029251,
          emission: currentEmission.breakdown.fuel,
        },
      ],
      submitTime: status === 'pending' ? now : undefined,
      submittedAt: status === 'pending' ? now : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  };

  const handleSaveDraft = () => {
    if (!selectedEnterpriseId) {
      addToast('请选择企业', 'warning');
      return;
    }
    const data = buildEmissionData('draft');
    saveData(data);
    addToast('草稿已保存', 'success');
  };

  const handleSubmit = () => {
    if (!selectedEnterpriseId) {
      addToast('请选择企业', 'warning');
      return;
    }
    if (missingFields.length > 0) {
      addToast(`还有 ${missingFields.length} 项必填数据未填写`, 'error');
      return;
    }
    const data = buildEmissionData('pending');
    saveData(data);
    submitData(data.id);
    addToast('数据已提交审核', 'success');
  };

  const handleCopyHistory = () => {
    if (!selectedHistoryPeriod) {
      addToast('请选择历史月份', 'warning');
      return;
    }
    const source = historyData.find((d) => d.period === selectedHistoryPeriod);
    if (!source) return;

    setFormData({
      electricity: source.electricity,
      gas: source.gas,
      steam: source.steam,
      fuel: source.fuel,
      production: source.production,
      remark: formData.remark,
    });
    setCopyModalOpen(false);
    setSelectedHistoryPeriod('');
    addToast(`已复制 ${selectedHistoryPeriod} 的数据`, 'success');
  };

  const hasError = (field: RequiredFields) =>
    missingFields.some((f) => f.key === field);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">数据填报</h1>
          <p className="text-sm text-zinc-500 mt-1">
            填写企业能源消耗与生产活动数据，系统将自动核算碳排放量
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="label">
              <Building2 className="inline w-4 h-4 mr-1" />
              企业选择
            </label>
            <select
              value={selectedEnterpriseId}
              onChange={handleEnterpriseChange}
              className={cn('input-field')}
            >
              <option value="">请选择企业</option>
              {enterprises.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="label">
              <Calendar className="inline w-4 h-4 mr-1" />
              填报月份
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={cn('input-field')}
            />
          </div>

          <button
            onClick={() => setCopyModalOpen(true)}
            className={cn('btn btn-secondary')}
            disabled={!selectedEnterpriseId || historyData.length === 0}
          >
            <Copy className="w-4 h-4" />
            复制上月数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">能源消耗</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">
                  用电量
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.electricity}
                    onChange={(e) => handleInputChange('electricity', e.target.value)}
                    placeholder="请输入用电量"
                    className={cn(
                      'input-field pr-14',
                      hasError('electricity') && 'input-field-error'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    kWh
                  </span>
                </div>
              </div>

              <div>
                <label className="label">
                  燃气量
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.gas}
                    onChange={(e) => handleInputChange('gas', e.target.value)}
                    placeholder="请输入燃气量"
                    className={cn(
                      'input-field pr-14',
                      hasError('gas') && 'input-field-error'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    m³
                  </span>
                </div>
              </div>

              <div>
                <label className="label">
                  蒸汽量
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.steam}
                    onChange={(e) => handleInputChange('steam', e.target.value)}
                    placeholder="请输入蒸汽量"
                    className={cn(
                      'input-field pr-14',
                      hasError('steam') && 'input-field-error'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    t
                  </span>
                </div>
              </div>

              <div>
                <label className="label">
                  车辆燃油量
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.fuel}
                    onChange={(e) => handleInputChange('fuel', e.target.value)}
                    placeholder="请输入燃油量"
                    className={cn(
                      'input-field pr-14',
                      hasError('fuel') && 'input-field-error'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    L
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-accent-blue" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">生产活动</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">
                  主要产品产量
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.production}
                    onChange={(e) => handleInputChange('production', e.target.value)}
                    placeholder="请输入产品产量"
                    className={cn(
                      'input-field pr-14',
                      hasError('production') && 'input-field-error'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    件/t
                  </span>
                </div>
              </div>

              <div>
                <label className="label">
                  <FileText className="inline w-4 h-4 mr-1" />
                  备注说明
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => handleInputChange('remark', e.target.value)}
                  placeholder="请输入备注信息（选填）"
                  rows={4}
                  className={cn('input-field resize-none')}
                />
              </div>
            </div>
          </div>

          <div className="card p-5 bg-gradient-to-r from-primary-50 to-accent-blue/5 border-primary-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">预估排放量（实时计算）</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-500">范围一（直接排放）</p>
                <p className="text-lg font-bold text-zinc-900 mt-1">
                  {currentEmission.scope1.toFixed(4)} tCO₂e
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">范围二（间接排放）</p>
                <p className="text-lg font-bold text-zinc-900 mt-1">
                  {currentEmission.scope2.toFixed(4)} tCO₂e
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">总排放量</p>
                <p className="text-lg font-bold text-primary-600 mt-1">
                  {currentEmission.total.toFixed(4)} tCO₂e
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">填报进度</p>
                <p className="text-lg font-bold text-zinc-900 mt-1">
                  {REQUIRED_FIELDS.length - missingFields.length}
                  <span className="text-sm text-zinc-400">/{REQUIRED_FIELDS.length}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            {missingFields.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-accent-orange" />
            ) : (
              <CheckCircle className="w-5 h-5 text-primary-500" />
            )}
            <h3 className="text-base font-semibold text-zinc-900">缺项检测</h3>
          </div>

          {missingFields.length === 0 ? (
            <div className="p-4 rounded-lg bg-primary-50 text-primary-700 text-sm">
              <CheckCircle className="inline w-4 h-4 mr-1.5" />
              所有必填项已填写完成
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500 mb-3">
                还有 <span className="font-semibold text-accent-orange">{missingFields.length}</span> 项未填写
              </p>
              {missingFields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-600"
                >
                  <field.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{field.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 flex items-center justify-end gap-3 sticky bottom-0 z-10">
        <button onClick={handleSaveDraft} className={cn('btn btn-secondary')}>
          <Save className="w-4 h-4" />
          保存草稿
        </button>
        <button
          onClick={handleSubmit}
          className={cn('btn btn-primary')}
          disabled={missingFields.length > 0 || !selectedEnterpriseId}
        >
          <Send className="w-4 h-4" />
          提交审核
        </button>
      </div>

      <Modal
        open={copyModalOpen}
        onClose={() => {
          setCopyModalOpen(false);
          setSelectedHistoryPeriod('');
        }}
        title="选择历史月份复制数据"
        width="max-w-md"
        footer={
          <>
            <button
              onClick={() => {
                setCopyModalOpen(false);
                setSelectedHistoryPeriod('');
              }}
              className={cn('btn btn-secondary')}
            >
              取消
            </button>
            <button
              onClick={handleCopyHistory}
              className={cn('btn btn-primary')}
              disabled={!selectedHistoryPeriod}
            >
              确认复制
            </button>
          </>
        }
      >
        {historyData.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">暂无可用的历史数据</div>
        ) : (
          <div className="space-y-2">
            {historyData.map((d) => (
              <label
                key={d.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedHistoryPeriod === d.period
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="historyPeriod"
                    value={d.period}
                    checked={selectedHistoryPeriod === d.period}
                    onChange={(e) => setSelectedHistoryPeriod(e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <div>
                    <p className="font-medium text-zinc-900">{d.period}</p>
                    <p className="text-xs text-zinc-500">
                      排放量：{calculateEmission(d).total.toFixed(4)} tCO₂e
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'badge',
                    d.status === 'approved'
                      ? 'bg-primary-100 text-primary-700'
                      : d.status === 'pending'
                      ? 'bg-accent-orange/10 text-accent-orange'
                      : d.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-zinc-100 text-zinc-600'
                  )}
                >
                  {d.status === 'approved'
                    ? '已通过'
                    : d.status === 'pending'
                    ? '审核中'
                    : d.status === 'rejected'
                    ? '已驳回'
                    : '已锁定'}
                </span>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
