import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Calendar,
  Upload,
  FileText,
  FileImage,
  FileSpreadsheet,
  Download,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useEnterpriseStore, useAuditStore } from '@/store';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import type { Attachment } from '@/types';

interface UploadingFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string, fileName: string) {
  if (type.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png)$/i)) {
    return FileImage;
  }
  if (
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    fileName.match(/\.(xlsx|xls)$/i)
  ) {
    return FileSpreadsheet;
  }
  return FileText;
}

function getFileTypeLabel(type: string, fileName: string): string {
  if (type.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png)$/i)) {
    return '图片';
  }
  if (
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    fileName.match(/\.(xlsx|xls)$/i)
  ) {
    return 'Excel';
  }
  if (type === 'application/pdf' || fileName.match(/\.pdf$/i)) {
    return 'PDF';
  }
  return '文件';
}

function getFileIconColor(type: string, fileName: string): string {
  if (type.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png)$/i)) {
    return 'text-accent-blue bg-accent-blue/10';
  }
  if (
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    fileName.match(/\.(xlsx|xls)$/i)
  ) {
    return 'text-primary-600 bg-primary-100';
  }
  return 'text-accent-orange bg-accent-orange/10';
}

export default function Attachments() {
  const { enterprises, currentEnterpriseId, setCurrentEnterprise } = useEnterpriseStore();
  const { attachments, addAttachment, removeAttachment, getAttachments } = useAuditStore();
  const { addToast, currentUser } = useUIStore();

  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>(
    currentEnterpriseId || ''
  );
  const [period, setPeriod] = useState<string>(getCurrentMonth());
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAttachments = useMemo(() => {
    if (!selectedEnterpriseId || !period) return [];
    return getAttachments(selectedEnterpriseId, period);
  }, [selectedEnterpriseId, period, attachments, getAttachments]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
    if (!isValidType) {
      return `文件 "${file.name}" 格式不支持，仅支持 PDF、图片（jpg/png）、Excel`;
    }
    if (file.size > 20 * 1024 * 1024) {
      return `文件 "${file.name}" 超过 20MB 限制`;
    }
    return null;
  };

  const simulateUpload = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          addToast(error, 'error');
        } else {
          validFiles.push(file);
        }
      });

      if (validFiles.length === 0) return;

      validFiles.forEach((file) => {
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const uploadingFile: UploadingFile = {
          id: uploadId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          progress: 0,
          status: 'uploading',
        };

        setUploadingFiles((prev) => [...prev, uploadingFile]);

        const interval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) => {
              if (f.id !== uploadId) return f;
              const newProgress = Math.min(f.progress + Math.random() * 25, 100);
              if (newProgress >= 100) {
                clearInterval(interval);
                return { ...f, progress: 100, status: 'success' };
              }
              return { ...f, progress: newProgress };
            })
          );
        }, 200);

        setTimeout(() => {
          const attachment: Attachment = {
            id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            enterpriseId: selectedEnterpriseId,
            emissionDataId: '',
            period,
            fileName: file.name,
            fileType: getFileTypeLabel(file.type, file.name),
            fileSize: file.size,
            name: file.name,
            url: URL.createObjectURL(file),
            uploadedBy: currentUser.name,
            uploadedAt: new Date().toISOString(),
            uploadTime: new Date().toISOString(),
          };

          addAttachment(attachment);

          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
          addToast(`"${file.name}" 上传成功`, 'success');
        }, 2200);
      });
    },
    [selectedEnterpriseId, period, addAttachment, addToast, currentUser]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!selectedEnterpriseId) {
        addToast('请先选择企业', 'warning');
        return;
      }
      if (e.dataTransfer.files.length > 0) {
        simulateUpload(e.dataTransfer.files);
      }
    },
    [selectedEnterpriseId, simulateUpload, addToast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedEnterpriseId) {
        addToast('请先选择企业', 'warning');
        return;
      }
      if (e.target.files && e.target.files.length > 0) {
        simulateUpload(e.target.files);
        e.target.value = '';
      }
    },
    [selectedEnterpriseId, simulateUpload, addToast]
  );

  const handleDelete = (attachment: Attachment) => {
    if (window.confirm(`确定要删除附件 "${attachment.fileName}" 吗？`)) {
      removeAttachment(attachment.id);
      addToast('附件已删除', 'success');
    }
  };

  const handlePreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
    setPreviewModalOpen(true);
  };

  const handleDownload = (attachment: Attachment) => {
    addToast(`开始下载 "${attachment.fileName}"`, 'info');
  };

  const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedEnterpriseId(id);
    setCurrentEnterprise(id || null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">凭证附件</h1>
          <p className="text-sm text-zinc-500 mt-1">
            上传和管理企业碳排放数据相关的凭证附件
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
              关联月份
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={cn('input-field')}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'card p-8 border-2 border-dashed transition-all cursor-pointer',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-zinc-300 hover:border-primary-300 hover:bg-zinc-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
              isDragging ? 'bg-primary-100' : 'bg-zinc-100'
            )}
          >
            <Upload
              className={cn(
                'w-8 h-8 transition-colors',
                isDragging ? 'text-primary-600' : 'text-zinc-400'
              )}
            />
          </div>
          <p className="text-base font-medium text-zinc-900 mb-1">
            {isDragging ? '释放文件开始上传' : '点击或拖拽文件到此处上传'}
          </p>
          <p className="text-sm text-zinc-500 mb-3">
            支持 PDF、图片（JPG/PNG）、Excel 格式，单文件不超过 20MB
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['PDF', 'JPG', 'PNG', 'Excel'].map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-600"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            正在上传 ({uploadingFiles.length})
          </h3>
          {uploadingFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  getFileIconColor(file.fileType, file.fileName)
                )}
              >
                {(() => {
                  const Icon = getFileIcon(file.fileType, file.fileName);
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {file.fileName}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {file.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-primary-500" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <span className="text-xs text-zinc-500">
                        {Math.round(file.progress)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-200',
                      file.status === 'error'
                        ? 'bg-red-500'
                        : file.status === 'success'
                        ? 'bg-primary-500'
                        : 'bg-primary-400'
                    )}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
              {file.status === 'success' && (
                <button
                  onClick={() =>
                    setUploadingFiles((prev) => prev.filter((f) => f.id !== file.id))
                  }
                  className="p-1 rounded hover:bg-zinc-200 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            附件列表
            <span className="text-sm font-normal text-zinc-500 ml-2">
              ({filteredAttachments.length} 个文件)
            </span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">文件名</th>
                <th className="table-header">类型</th>
                <th className="table-header">大小</th>
                <th className="table-header">上传时间</th>
                <th className="table-header">关联月份</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttachments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-zinc-400 py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-zinc-300" />
                      <p>暂无附件</p>
                      <p className="text-xs">请选择企业和月份后上传文件</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttachments.map((attachment) => {
                  const Icon = getFileIcon(attachment.fileType, attachment.fileName);
                  return (
                    <tr
                      key={attachment.id}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                              getFileIconColor(attachment.fileType, attachment.fileName)
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <button
                            onClick={() => handlePreview(attachment)}
                            className="text-sm font-medium text-zinc-900 hover:text-primary-600 truncate text-left"
                          >
                            {attachment.fileName}
                          </button>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="badge bg-zinc-100 text-zinc-700">
                          {getFileTypeLabel(attachment.fileType, attachment.fileName)}
                        </span>
                      </td>
                      <td className="table-cell text-zinc-600">
                        {formatFileSize(attachment.fileSize)}
                      </td>
                      <td className="table-cell text-zinc-600 text-sm">
                        {attachment.uploadTime
                          ? new Date(attachment.uploadTime).toLocaleString('zh-CN')
                          : '-'}
                      </td>
                      <td className="table-cell text-zinc-600">{attachment.period}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePreview(attachment)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-primary-600 transition-colors"
                            title="预览"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(attachment)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-accent-blue transition-colors"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(attachment)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewAttachment(null);
        }}
        title={previewAttachment?.fileName || '附件预览'}
        width="max-w-4xl"
        footer={
          previewAttachment && (
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-zinc-500">
                {getFileTypeLabel(previewAttachment.fileType, previewAttachment.fileName)} ·{' '}
                {formatFileSize(previewAttachment.fileSize)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className={cn('btn btn-secondary')}
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
                <button
                  onClick={() => {
                    setPreviewModalOpen(false);
                    setPreviewAttachment(null);
                  }}
                  className={cn('btn btn-primary')}
                >
                  关闭
                </button>
              </div>
            </div>
          )
        }
      >
        {previewAttachment && (
          <div className="min-h-[400px] flex items-center justify-center bg-zinc-50 rounded-lg">
            {previewAttachment.fileType === '图片' ||
            previewAttachment.fileName.match(/\.(jpg|jpeg|png)$/i) ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.fileName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : previewAttachment.fileType === 'PDF' ||
              previewAttachment.fileName.match(/\.pdf$/i) ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-20 h-20 rounded-xl bg-accent-orange/10 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-accent-orange" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-zinc-900 mb-1">
                    {previewAttachment.fileName}
                  </p>
                  <p className="text-sm text-zinc-500">
                    PDF 文件预览（演示环境）
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className={cn('btn btn-primary mt-2')}
                >
                  <Download className="w-4 h-4" />
                  下载查看
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-20 h-20 rounded-xl bg-primary-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-10 h-10 text-primary-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-zinc-900 mb-1">
                    {previewAttachment.fileName}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Excel 文件预览（演示环境）
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className={cn('btn btn-primary mt-2')}
                >
                  <Download className="w-4 h-4" />
                  下载查看
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
