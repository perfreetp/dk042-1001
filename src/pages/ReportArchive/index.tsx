import { useState, useMemo } from 'react';
import {
  FileArchive,
  Search,
  Calendar,
  Building2,
  Factory,
  Download,
  X,
  ChevronRight,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  SlidersHorizontal,
  Zap,
  Flame,
  Cloud,
  Fuel,
  Trash2,
  Filter,
  Clock,
  User,
} from 'lucide-react';
import { useReportStore } from '@/store/report';
import { useUIStore } from '@/store/ui';
import { formatDateTime, formatEmission, formatNumber } from '@/utils/formatter';
import { exportToCSV } from '@/utils/export';
import { cn } from '@/lib/utils';
import type { ReportArchive, ReportTemplate } from '@/types';

const TEMPLATE_LABEL: Record<ReportTemplate, string> = {
  park: '园区汇总报告',
  enterprise: '单企业报告',
};

const PIE_COLORS = ['#0F5132', '#F97316', '#0EA5E9', '#A855F7'];

const ENERGY_ICONS: Record<string, any> = {
  electricity: Zap,
  gas: Flame,
  steam: Cloud,
  fuel: Fuel,
};

const ENERGY_LABELS: Record<string, string> = {
  electricity: '电力',
  gas: '天然气',
  steam: '蒸汽',
  fuel: '燃油',
};

function buildMonthOptions() {
  const months: string[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default function ReportArchivePage() {
  const { archives, removeArchive, getArchive } = useReportStore();
  const { addToast, currentUser } = useUIStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<ReportTemplate | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const months = useMemo(() => buildMonthOptions(), []);

  const filteredArchives = useMemo(() => {
    return archives.filter((a) => {
      if (templateFilter !== 'all' && a.template !== templateFilter) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (
          !a.title.toLowerCase().includes(kw) &&
          !a.generatedBy.toLowerCase().includes(kw) &&
          !(a.enterpriseName || '').toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      if (startMonth && a.endMonth < startMonth) return false;
      if (endMonth && a.startMonth > endMonth) return false;
      return true;
    });
  }, [archives, templateFilter, keyword, startMonth, endMonth]);

  const selectedArchive = useMemo(() => {
    if (!selectedId) return null;
    return getArchive(selectedId) || null;
  }, [selectedId, getArchive]);

  const handleExport = (archive: ReportArchive) => {
    const rows: Record<string, string>[] = [];
    const buildEmpty = () => {
      const r: Record<string, string> = {};
      for (let i = 1; i <= 18; i++) r[`col${i}`] = '';
      return r;
    };
    const buildTitle = (t: string) => { const r = buildEmpty(); r.col1 = t; return r; };
    const buildRow = (vals: (string | number)[]) => {
      const r = buildEmpty();
      vals.forEach((v, i) => { if (i < 18) r[`col${i + 1}`] = String(v ?? ''); });
      return r;
    };

    rows.push(buildTitle('【碳排放核算报告】'));
    rows.push(buildTitle(`报告模板：${TEMPLATE_LABEL[archive.template]}`));
    rows.push(buildTitle(`生成时间：${formatDateTime(archive.generatedAt)}`));
    rows.push(buildTitle(`导出人：${archive.generatedBy}`));
    rows.push(buildTitle(`因子版本：${archive.factorVersion.summaryLabel}`));
    rows.push(buildTitle(`月份范围：${archive.startMonth} 至 ${archive.endMonth}`));
    rows.push(buildTitle(`记录数量：${archive.recordCount} 条`));
    if (archive.enterpriseName) {
      rows.push(buildTitle(`企业名称：${archive.enterpriseName}`));
    }
    rows.push(buildEmpty());

    rows.push(buildTitle('【范围排放汇总】'));
    rows.push(buildRow(['排放范围', '排放量(tCO₂)', '占比(%)']));
    const total = archive.summary.total || 0;
    rows.push(buildRow(['范围一（直接排放）', archive.summary.scope1.toFixed(2), total > 0 ? ((archive.summary.scope1 / total) * 100).toFixed(2) : '0.00']));
    rows.push(buildRow(['范围二（间接排放）', archive.summary.scope2.toFixed(2), total > 0 ? ((archive.summary.scope2 / total) * 100).toFixed(2) : '0.00']));
    rows.push(buildRow(['总排放量', archive.summary.total.toFixed(2), '100.00']));

    if (archive.summary.industrySummary?.length > 0) {
      rows.push(buildEmpty());
      rows.push(buildTitle('【行业排放汇总】'));
      rows.push(buildRow(['行业', '企业数量', '范围一(tCO₂)', '范围二(tCO₂)', '总排放(tCO₂)']));
      archive.summary.industrySummary.forEach((item) => {
        rows.push(buildRow([item.industry, item.count, item.scope1.toFixed(2), item.scope2.toFixed(2), item.total.toFixed(2)]));
      });
    }

    rows.push(buildEmpty());
    rows.push(buildTitle('【企业明细数据】'));
    rows.push(buildRow([
      '企业名称', '所属行业', '统计周期',
      '用电量(kWh)', '天然气(m³)', '蒸汽(t)', '燃料(t)', '产量',
      '范围一(tCO₂)', '范围二(tCO₂)', '总排放(tCO₂)',
    ]));
    archive.dataRows.forEach((row) => {
      rows.push(buildRow([
        row.enterpriseName, row.industry, row.period,
        row.electricity, row.gas, row.steam, row.fuel, row.production,
        row.scope1.toFixed(2), row.scope2.toFixed(2), row.total.toFixed(2),
      ]));
    });

    if (archive.monthlyTrend?.length > 0) {
      rows.push(buildEmpty());
      rows.push(buildTitle('【月度趋势数据】'));
      rows.push(buildRow(['月份', '范围一(tCO₂)', '范围二(tCO₂)']));
      archive.monthlyTrend.forEach((m) => {
        rows.push(buildRow([m.period, m.scope1.toFixed(2), m.scope2.toFixed(2)]));
      });
    }

    if (archive.attachments?.length > 0) {
      rows.push(buildEmpty());
      rows.push(buildTitle('【凭证附件清单】'));
      rows.push(buildRow(['月份', '文件名', '类型', '大小(B)', '上传时间']));
      archive.attachments.forEach((a) => {
        rows.push(buildRow([a.period, a.fileName, a.fileType, a.fileSize, formatDateTime(a.uploadTime)]));
      });
    }

    if (archive.anomalies?.length > 0) {
      rows.push(buildEmpty());
      rows.push(buildTitle('【异常波动说明】'));
      rows.push(buildRow(['月份', '类型', '变化率(%)', '说明']));
      archive.anomalies.forEach((a) => {
        rows.push(buildRow([a.period, a.type, a.changeRate.toFixed(2), a.message]));
      });
    }

    exportToCSV(rows, `${archive.title}`);
    addToast('报告导出成功', 'success');
  };

  const handleRemove = (id: string) => {
    if (!confirm('确定删除该归档报告？删除后不可恢复。')) return;
    removeArchive(id);
    if (selectedId === id) setSelectedId(null);
    addToast('归档报告已删除', 'info');
  };

  const scope1Percent = selectedArchive && selectedArchive.summary.total > 0
    ? (selectedArchive.summary.scope1 / selectedArchive.summary.total) * 100
    : 0;
  const scope2Percent = selectedArchive && selectedArchive.summary.total > 0
    ? (selectedArchive.summary.scope2 / selectedArchive.summary.total) * 100
    : 0;

  return (
    <div className="p-6 space-y-6 h-screen overflow-hidden flex flex-col">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">报告归档</h1>
              <p className="text-sm text-zinc-500 mt-1">
                查看历史导出的报告快照，筛选条件、因子版本与数据内容均为导出时的状态，不受后续数据变更影响
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          共 {archives.length} 份归档报告
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className={cn(
          'flex flex-col gap-4 min-h-0 transition-all duration-300',
          selectedArchive ? 'w-[380px]' : 'flex-1'
        )}>
          <div className="card p-4 space-y-3 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Filter className="w-4 h-4" />
              筛选条件
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 p-0.5 bg-zinc-100 rounded-lg">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'park', label: '园区汇总' },
                  { key: 'enterprise', label: '单企业' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTemplateFilter(t.key as any)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-all',
                      templateFilter === t.key
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索报告名称 / 导出人 / 企业..."
                  className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="input-field text-xs py-1.5 flex-1"
              >
                <option value="">开始月份</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-zinc-300 text-xs">至</span>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="input-field text-xs py-1.5 flex-1"
              >
                <option value="">结束月份</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 card overflow-hidden min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-medium text-zinc-700">归档列表</span>
              <span className="text-xs text-zinc-400">{filteredArchives.length} 条</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredArchives.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3 py-12">
                  <FileArchive className="w-10 h-10 opacity-40" />
                  <div className="text-sm">暂无归档报告</div>
                  <div className="text-xs text-zinc-300">在核算结果页导出报告会自动归档</div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredArchives.map((archive) => (
                    <button
                      key={archive.id}
                      onClick={() => setSelectedId(archive.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors group',
                        selectedId === archive.id && 'bg-primary-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                          archive.template === 'park'
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-blue-100 text-blue-600'
                        )}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-900 truncate text-sm">
                              {archive.title}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0 ml-auto group-hover:text-primary-500 transition-colors" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-medium',
                              archive.template === 'park'
                                ? 'bg-primary-50 text-primary-700'
                                : 'bg-blue-50 text-blue-700'
                            )}>
                              {TEMPLATE_LABEL[archive.template]}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(archive.generatedAt).slice(5, 16)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {archive.generatedBy}
                            </span>
                            <span>{archive.startMonth} ~ {archive.endMonth}</span>
                            <span className="ml-auto font-mono text-zinc-500">
                              {formatEmission(archive.summary.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedArchive && (
          <div className="flex-1 min-w-0 card overflow-hidden flex flex-col animate-slide-in-left">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3 flex-shrink-0">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                selectedArchive.template === 'park'
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-blue-100 text-blue-600'
              )}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-zinc-900 truncate">{selectedArchive.title}</h2>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedArchive.generatedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(selectedArchive.generatedAt)}
                  </span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-medium',
                    selectedArchive.template === 'park'
                      ? 'bg-primary-50 text-primary-700'
                      : 'bg-blue-50 text-blue-700'
                  )}>
                    {TEMPLATE_LABEL[selectedArchive.template]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport(selectedArchive)}
                  className="btn btn-primary text-xs py-1.5 px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出
                </button>
                <button
                  onClick={() => handleRemove(selectedArchive.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="删除归档"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                  title="关闭详情"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="text-xs text-green-600 font-medium mb-1">范围一排放</div>
                  <div className="text-xl font-bold font-mono text-green-800">
                    {formatEmission(selectedArchive.summary.scope1)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium mb-1">范围二排放</div>
                  <div className="text-xl font-bold font-mono text-blue-800">
                    {formatEmission(selectedArchive.summary.scope2)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="text-xs text-orange-600 font-medium mb-1">总排放量</div>
                  <div className="text-xl font-bold font-mono text-orange-800">
                    {formatEmission(selectedArchive.summary.total)}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-2.5">
                <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary-600" />
                  导出时筛选条件快照
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-zinc-100">
                    <div className="text-zinc-400 mb-0.5">月份范围</div>
                    <div className="font-medium text-zinc-700">
                      {selectedArchive.startMonth} ~ {selectedArchive.endMonth}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-zinc-100">
                    <div className="text-zinc-400 mb-0.5">记录数量</div>
                    <div className="font-medium text-zinc-700">{selectedArchive.recordCount} 条</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-zinc-100">
                    <div className="text-zinc-400 mb-0.5">行业范围</div>
                    <div className="font-medium text-zinc-700">
                      {selectedArchive.industries.length > 0
                        ? selectedArchive.industries.join('、')
                        : '全部行业'}
                    </div>
                  </div>
                  {selectedArchive.enterpriseName && (
                    <div className="p-2 bg-white rounded-lg border border-zinc-100">
                      <div className="text-zinc-400 mb-0.5">企业名称</div>
                      <div className="font-medium text-zinc-700">{selectedArchive.enterpriseName}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-100 space-y-2.5">
                <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary-600" />
                  使用的因子版本
                </div>
                <div className="text-xs text-zinc-500 mb-1">{selectedArchive.factorVersion.summaryLabel}</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedArchive.factorVersion.detail).map(([key, val]) => {
                    const Icon = ENERGY_ICONS[key] || Zap;
                    const label = ENERGY_LABELS[key] || key;
                    return (
                      <div key={key} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                        <div className="w-7 h-7 rounded-md bg-white border border-zinc-200 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-zinc-600" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-zinc-700">{label}</div>
                          <div className="text-[10px] text-zinc-400">
                            {val.version} · {val.effectiveMonth} 生效
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedArchive.summary.industrySummary && selectedArchive.summary.industrySummary.length > 0 && (
                <div className="p-4 rounded-xl border border-zinc-100 space-y-3">
                  <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-600" />
                    行业排放汇总
                  </div>
                  <div className="space-y-2">
                    {selectedArchive.summary.industrySummary.map((item) => (
                      <div key={item.industry} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-700">{item.industry}</span>
                          <span className="text-zinc-400">· {item.count} 家</span>
                        </div>
                        <span className="font-mono font-semibold text-primary-700">{formatEmission(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedArchive.monthlyTrend && selectedArchive.monthlyTrend.length > 0 && (
                <div className="p-4 rounded-xl border border-zinc-100 space-y-3">
                  <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary-600" />
                    月度趋势
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="text-left py-1.5 px-2 font-medium text-zinc-500">月份</th>
                          <th className="text-right py-1.5 px-2 font-medium text-zinc-500">范围一</th>
                          <th className="text-right py-1.5 px-2 font-medium text-zinc-500">范围二</th>
                          <th className="text-right py-1.5 px-2 font-medium text-zinc-500">合计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedArchive.monthlyTrend.map((m) => (
                          <tr key={m.period} className="border-b border-zinc-50">
                            <td className="py-1.5 px-2 font-mono text-zinc-700">{m.period}</td>
                            <td className="text-right py-1.5 px-2 font-mono text-zinc-700">{m.scope1.toFixed(2)}</td>
                            <td className="text-right py-1.5 px-2 font-mono text-zinc-700">{m.scope2.toFixed(2)}</td>
                            <td className="text-right py-1.5 px-2 font-mono font-semibold text-primary-700">
                              {(m.scope1 + m.scope2).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedArchive.attachments && selectedArchive.attachments.length > 0 && (
                <div className="p-4 rounded-xl border border-zinc-100 space-y-3">
                  <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    凭证附件清单
                    <span className="ml-auto text-xs text-zinc-400 font-normal">
                      共 {selectedArchive.attachments.length} 个
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedArchive.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg text-xs">
                        <Paperclip className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="truncate text-zinc-700 flex-1">{att.fileName}</span>
                        <span className="text-zinc-400 flex-shrink-0">{att.period}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedArchive.anomalies && selectedArchive.anomalies.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    异常波动说明
                    <span className="ml-auto text-xs text-amber-600 font-normal">
                      共 {selectedArchive.anomalies.length} 条
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedArchive.anomalies.slice(0, 10).map((a, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border bg-white"
                        style={{ borderColor: a.changeRate > 0 ? '#fecaca' : '#bbf7d0' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-700">{a.period} · {a.type}</span>
                          <span className={cn(
                            'flex items-center gap-0.5 text-xs font-semibold',
                            a.changeRate > 0 ? 'text-red-600' : 'text-green-600'
                          )}>
                            {a.changeRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {a.changeRate > 0 ? '+' : ''}{a.changeRate.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl border border-zinc-100 space-y-3">
                <div className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-600" />
                  企业明细数据
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-1.5 px-2 font-medium text-zinc-500">企业</th>
                        <th className="text-left py-1.5 px-2 font-medium text-zinc-500">月份</th>
                        <th className="text-right py-1.5 px-2 font-medium text-zinc-500">范围一</th>
                        <th className="text-right py-1.5 px-2 font-medium text-zinc-500">范围二</th>
                        <th className="text-right py-1.5 px-2 font-medium text-zinc-500">总量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedArchive.dataRows.slice(0, 30).map((row, idx) => (
                        <tr key={idx} className="border-b border-zinc-50">
                          <td className="py-1.5 px-2 text-zinc-700 truncate max-w-[120px]" title={row.enterpriseName}>
                            {row.enterpriseName}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-zinc-600">{row.period}</td>
                          <td className="text-right py-1.5 px-2 font-mono text-zinc-700">{row.scope1.toFixed(2)}</td>
                          <td className="text-right py-1.5 px-2 font-mono text-zinc-700">{row.scope2.toFixed(2)}</td>
                          <td className="text-right py-1.5 px-2 font-mono font-semibold text-primary-700">
                            {row.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedArchive.dataRows.length > 30 && (
                    <div className="text-center text-xs text-zinc-400 mt-2">
                      共 {selectedArchive.dataRows.length} 条，仅展示前 30 条
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
