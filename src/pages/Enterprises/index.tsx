import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Power,
  X,
  Building2,
  Filter,
} from 'lucide-react';
import { useEnterpriseStore } from '@/store';
import type { Enterprise } from '@/types';
import { INDUSTRIES } from '@/utils/mockData';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  creditCode: string;
  industry: string;
  scale: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  status: 'active' | 'inactive';
}

const initialFormData: FormData = {
  name: '',
  creditCode: '',
  industry: INDUSTRIES[0],
  scale: '中型',
  address: '',
  contactPerson: '',
  contactPhone: '',
  status: 'active',
};

const SCALES = ['大型', '中型', '小型'];

export default function Enterprises() {
  const { enterprises, addEnterprise, updateEnterprise, deleteEnterprise } =
    useEnterpriseStore();

  const [searchText, setSearchText] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const filteredEnterprises = useMemo(() => {
    return enterprises.filter((ent) => {
      if (searchText && !ent.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (industryFilter && ent.industry !== industryFilter) {
        return false;
      }
      if (statusFilter && ent.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [enterprises, searchText, industryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingEnterprise(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (enterprise: Enterprise) => {
    setEditingEnterprise(enterprise);
    setFormData({
      name: enterprise.name,
      creditCode: enterprise.creditCode,
      industry: enterprise.industry,
      scale: enterprise.scale,
      address: enterprise.address,
      contactPerson: enterprise.contactPerson,
      contactPhone: enterprise.contactPhone,
      status: enterprise.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEnterprise(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入企业名称';
    }
    if (!formData.creditCode.trim()) {
      errors.creditCode = '请输入统一社会信用代码';
    } else if (formData.creditCode.length !== 18) {
      errors.creditCode = '统一社会信用代码应为18位';
    }
    if (!formData.industry) {
      errors.industry = '请选择行业';
    }
    if (!formData.scale) {
      errors.scale = '请选择企业规模';
    }
    if (!formData.address.trim()) {
      errors.address = '请输入企业地址';
    }
    if (!formData.contactPerson.trim()) {
      errors.contactPerson = '请输入联系人姓名';
    }
    if (!formData.contactPhone.trim()) {
      errors.contactPhone = '请输入联系电话';
    } else if (!/^1[3-9]\d{9}$/.test(formData.contactPhone)) {
      errors.contactPhone = '请输入有效的手机号码';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingEnterprise) {
      updateEnterprise(editingEnterprise.id, formData);
    } else {
      const newEnterprise: Enterprise = {
        id: `ENT${Date.now().toString().padStart(4, '0')}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      addEnterprise(newEnterprise);
    }
    closeModal();
  };

  const handleToggleStatus = (enterprise: Enterprise) => {
    const newStatus = enterprise.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive') {
      deleteEnterprise(enterprise.id);
    } else {
      updateEnterprise(enterprise.id, { status: 'active' });
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">企业名录</h1>
          <p className="text-sm text-zinc-500 mt-1">
            管理园区内所有注册企业的基本信息
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索企业名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={cn('input-field pl-9')}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className={cn('input-field w-36')}
            >
              <option value="">全部行业</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn('input-field w-32')}
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="inactive">停用</option>
          </select>

          <button
            onClick={openAddModal}
            className={cn('btn btn-primary ml-auto')}
          >
            <Plus className="w-4 h-4" />
            新增企业
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">企业名称</th>
                <th className="table-header">统一社会信用代码</th>
                <th className="table-header">行业</th>
                <th className="table-header">规模</th>
                <th className="table-header">联系人</th>
                <th className="table-header">电话</th>
                <th className="table-header">状态</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnterprises.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-zinc-400 py-12">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredEnterprises.map((enterprise) => (
                  <tr
                    key={enterprise.id}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary-600" />
                        </div>
                        <span className="font-medium text-zinc-900">
                          {enterprise.name}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-zinc-600">
                      {enterprise.creditCode}
                    </td>
                    <td className="table-cell">{enterprise.industry}</td>
                    <td className="table-cell">{enterprise.scale}</td>
                    <td className="table-cell">{enterprise.contactPerson}</td>
                    <td className="table-cell">{enterprise.contactPhone}</td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          'badge',
                          enterprise.status === 'active'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        {enterprise.status === 'active' ? '正常' : '停用'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(enterprise)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-primary-600 transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(enterprise)}
                          className={cn(
                            'p-1.5 rounded-lg hover:bg-zinc-100 transition-colors',
                            enterprise.status === 'active'
                              ? 'text-zinc-600 hover:text-red-600'
                              : 'text-zinc-600 hover:text-primary-600'
                          )}
                          title={enterprise.status === 'active' ? '停用' : '启用'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingEnterprise ? '编辑企业' : '新增企业'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div>
                <label className="label">企业名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入企业名称"
                  className={cn(
                    'input-field',
                    formErrors.name && 'input-field-error'
                  )}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="label">统一社会信用代码</label>
                <input
                  type="text"
                  value={formData.creditCode}
                  onChange={(e) => handleInputChange('creditCode', e.target.value)}
                  placeholder="请输入18位统一社会信用代码"
                  maxLength={18}
                  className={cn(
                    'input-field font-mono',
                    formErrors.creditCode && 'input-field-error'
                  )}
                />
                {formErrors.creditCode && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.creditCode}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">所属行业</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className={cn(
                      'input-field',
                      formErrors.industry && 'input-field-error'
                    )}
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  {formErrors.industry && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="label">企业规模</label>
                  <select
                    value={formData.scale}
                    onChange={(e) => handleInputChange('scale', e.target.value)}
                    className={cn(
                      'input-field',
                      formErrors.scale && 'input-field-error'
                    )}
                  >
                    {SCALES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {formErrors.scale && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.scale}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">企业地址</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="请输入详细地址"
                  className={cn(
                    'input-field',
                    formErrors.address && 'input-field-error'
                  )}
                />
                {formErrors.address && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">联系人</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    placeholder="请输入联系人姓名"
                    className={cn(
                      'input-field',
                      formErrors.contactPerson && 'input-field-error'
                    )}
                  />
                  {formErrors.contactPerson && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.contactPerson}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">联系电话</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      handleInputChange('contactPhone', e.target.value)
                    }
                    placeholder="请输入手机号码"
                    maxLength={11}
                    className={cn(
                      'input-field',
                      formErrors.contactPhone && 'input-field-error'
                    )}
                  />
                  {formErrors.contactPhone && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.contactPhone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">状态</label>
                <div className="flex gap-4">
                  {(['active', 'inactive'] as const).map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={formData.status === s}
                        onChange={() => handleInputChange('status', s)}
                        className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-zinc-700">
                        {s === 'active' ? '正常' : '停用'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
              <button onClick={closeModal} className={cn('btn btn-secondary')}>
                取消
              </button>
              <button onClick={handleSubmit} className={cn('btn btn-primary')}>
                {editingEnterprise ? '保存修改' : '确认新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
