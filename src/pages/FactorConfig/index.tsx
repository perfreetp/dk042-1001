import { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Zap,
  Flame,
  Cloud,
  Fuel,
  Plus,
  Trash2,
  Calendar,
  Tag,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Layers,
  FileSearch,
} from 'lucide-react';
import { useFactorStore, FACTOR_META } from '@/store/factor';
import { useUIStore } from '@/store/ui';
import { formatDateTime, formatNumber } from '@/utils/formatter';
import { cn } from '@/lib/utils';
import type { EmissionFactor, EmissionFactorKey } from '@/types';

const ICON_MAP: Record<EmissionFactorKey, any> = {
  electricity: Zap,
  gas: Flame,
  steam: Cloud,
  fuel: Fuel,
};

const COLOR_MAP: Record<EmissionFactorKey, string> = {
  electricity: 'text-sky-600 bg-sky-50 border-sky-200',
  gas: 'text-orange-600 bg-orange-50 border-orange-200',
  steam: 'text-purple-600 bg-purple-50 border-purple-200',
  fuel: 'text-red-600 bg-red-50 border-red-200',
};

const ENERGY_KEYS: EmissionFactorKey[] = ['electricity', 'gas', 'steam', 'fuel'];

export default function FactorConfig() {
  const { factors, addFactor, removeFactor, getLatestFactors, getEffectiveFactorsForPeriod, getFactorHistory } = useFactorStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'lookup'>('current');
  const [formKey, setFormKey] = useState<EmissionFactorKey>('electricity');
  const [formVersion, setFormVersion] = useState('');
  const [formEffectiveMonth, setFormEffectiveMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formValue, setFormValue] = useState('');
  const [formNote, setFormNote] = useState('');
  const [lookupMonth, setLookupMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [historyTab, setHistoryTab] = useState<EmissionFactorKey>('electricity');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const latestFactors = useMemo(() => getLatestFactors(), [getLatestFactors]);
  const lookupFactors = useMemo(() => getEffectiveFactorsForPeriod(lookupMonth), [getEffectiveFactorsForPeriod, lookupMonth]);
  const historyFactors = useMemo(() => getFactorHistory(historyTab), [getFactorHistory, historyTab]);

  const groupedByKey = useMemo(() => {
    const map = new Map<EmissionFactorKey, EmissionFactor[]>();
    ENERGY_KEYS.forEach((k) => map.set(k, []));
    factors.forEach((f) => {
      map.get(f.key)?.push(f);
    });
    map.forEach((arr) => arr.sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth)));
    return map;
  }, [factors]);

  const handleAdd = () => {
    if (!formVersion.trim()) {
      addToast('请填写版本号', 'warning');
      return;
    }
    const numValue = parseFloat(formValue);
    if (isNaN(numValue) || numValue <= 0) {
      addToast('请输入有效的因子数值', 'warning');
      return;
    }
    const meta = FACTOR_META[formKey];
    const newFactor = addFactor({
      key: formKey,
      label: meta.label,
      unit: meta.unit,
      version: formVersion.trim(),
      effectiveMonth: formEffectiveMonth,
      value: numValue,
      note: formNote.trim() || undefined,
    });
    addToast(`${meta.label}因子 ${newFactor.version} 已发布，${newFactor.effectiveMonth} 起生效`, 'success');
    setFormVersion('');
    setFormValue('');
    setFormNote('');
  };

  const handleRemove = (id: string, label: string, version: string) => {
    if (!confirm(`确认删除${label}因子 ${version}？该操作不可撤销。`)) return;
    removeFactor(id);
    addToast(`${label}因子 ${version} 已删除`, 'info');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">排放因子配置</h1>
              <p className="text-sm text-zinc-500 mt-1">
                维护电力、天然气、蒸汽、燃油等排放因子的版本与生效月份，历史月份按当时生效因子核算
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
          {[
            { key: 'current', label: '当前生效', icon: CheckCircle2 },
            { key: 'history', label: '版本历史', icon: History },
            { key: 'lookup', label: '按月查询', icon: FileSearch },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                activeTab === t.key
                  ? 'bg-white text-primary-700 shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {activeTab === 'current' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ENERGY_KEYS.map((key) => {
                  const f = latestFactors[key];
                  const Icon = ICON_MAP[key];
                  const history = groupedByKey.get(key) || [];
                  return (
                    <div
                      key={key}
                      className={cn('p-5 rounded-xl border-2 bg-white shadow-sm', COLOR_MAP[key].split(' ').slice(1).pop())}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center border', COLOR_MAP[key])}>
                            <Icon className="w-5.5 h-5.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{f.label}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{f.unit}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900/5 text-[11px] font-semibold text-zinc-700 border border-zinc-200">
                            <Tag className="w-3 h-3" />
                            {f.version}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <div className="text-2xl font-bold font-mono text-zinc-900 tabular-nums">{f.value.toFixed(7)}</div>
                        <div className="text-xs text-zinc-400 font-medium">{f.unit}</div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          <span>生效自</span>
                          <span className="font-medium text-zinc-700">{f.effectiveMonth}</span>
                        </div>
                        <div className="text-xs text-zinc-400">共 {history.length} 个历史版本</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1"><Layers className="w-3.5 h-3.5" />生效规则说明</div>
                <p>系统根据填报月份 <strong>自动匹配 ≤ 填报月份的最新生效版本</strong>。历史数据核算将严格沿用当时生效的因子版本，新发布的因子不会影响已锁定月份的历史核算结果。</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
                {ENERGY_KEYS.map((k) => {
                  const Icon = ICON_MAP[k];
                  const meta = FACTOR_META[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setHistoryTab(k)}
                      className={cn(
                        'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                        historyTab === k ? 'bg-white shadow-sm text-primary-700' : 'text-zinc-500 hover:text-zinc-700'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">版本</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">生效月份</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">因子值</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">发布时间</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">备注</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {historyFactors.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">暂无版本记录</td></tr>
                    ) : historyFactors.map((f, i) => {
                      const isLatest = i === 0;
                      return (
                        <tr key={f.id} className={cn('hover:bg-zinc-50', isLatest && 'bg-primary-50/20')}>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-zinc-900">{f.version}</span>
                              {isLatest && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-500 text-white">当前</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-zinc-700 font-medium">{f.effectiveMonth}</td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums text-zinc-900 font-semibold">{f.value.toFixed(7)}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-500">{formatDateTime(f.createdAt)}</td>
                          <td className="px-4 py-3.5 text-sm text-zinc-500 max-w-[220px] truncate" title={f.note}>
                            {f.note || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {!isLatest ? (
                              <button
                                onClick={() => handleRemove(f.id, f.label, f.version)}
                                className="inline-flex items-center gap-1 p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="删除该历史版本"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs text-zinc-300">当前版本不可删</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'lookup' && (
            <div className="space-y-4">
              <div className="card p-4 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700">查询月份</span>
                </div>
                <input
                  type="month"
                  value={lookupMonth}
                  onChange={(e) => setLookupMonth(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <div className="ml-auto text-xs text-zinc-500">
                  系统自动匹配该月份及之前最新生效的因子版本
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ENERGY_KEYS.map((key) => {
                  const f = lookupFactors[key];
                  const Icon = ICON_MAP[key];
                  const isLatest = latestFactors[key].id === f.id;
                  return (
                    <div key={key} className={cn('p-5 rounded-xl border', COLOR_MAP[key].split(' ').slice(2).pop())}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', COLOR_MAP[key])}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{f.label}</div>
                            <div className="text-xs text-zinc-500">{f.unit}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[11px] font-semibold',
                            isLatest ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          )}>
                            {f.version}
                          </span>
                          {!isLatest && <span className="text-[10px] text-zinc-400">历史版本</span>}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold font-mono text-zinc-900 tabular-nums">{formatNumber(f.value, 7)}</span>
                        <span className="text-xs text-zinc-400">{f.unit}</span>
                      </div>
                      <div className="text-xs text-zinc-500 space-y-0.5 pt-2 border-t border-zinc-100">
                        <div className="flex items-center justify-between">
                          <span>生效起始：{f.effectiveMonth}</span>
                          <span className="text-zinc-400">发布：{formatDateTime(f.createdAt).slice(0, 10)}</span>
                        </div>
                        {f.note && <div className="text-zinc-500 italic">“{f.note}”</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-zinc-900">发布新版本因子</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4">新版本发布后，所有 ≥ 生效月份的新填报记录将自动采用该因子</p>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">能源类型</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-lg">
                  {ENERGY_KEYS.map((k) => {
                    const Icon = ICON_MAP[k];
                    const meta = FACTOR_META[k];
                    return (
                      <button
                        key={k}
                        onClick={() => setFormKey(k)}
                        className={cn(
                          'flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all',
                          formKey === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 text-[11px] text-zinc-400">单位：{FACTOR_META[formKey].unit}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  <Tag className="w-3 h-3 inline mr-1 -mt-0.5" />
                  版本号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                  placeholder="如 V1.2、2026H1"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
                  生效月份 <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formEffectiveMonth}
                  onChange={(e) => setFormEffectiveMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  排放因子值 ({FACTOR_META[formKey].unit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={FACTOR_META[formKey].defaultValue.toString()}
                    className="w-full px-3 py-2 pr-14 border border-zinc-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormValue(FACTOR_META[formKey].defaultValue.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] rounded bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
                  >
                    默认
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">变更说明 / 备注</label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="如：2026年度国家电网区域排放因子更新发布"
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                发布 {FACTOR_META[formKey].label}因子新版本
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
