import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: string;
  render?: (record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((record: T) => string);
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  batchActions?: React.ReactNode;
  pagination?: boolean;
  pageSize?: number;
  emptyText?: string;
  loading?: boolean;
}

function getRowKey<T>(record: T, rowKey: DataTableProps<T>['rowKey'], index: number): string {
  if (!rowKey) return String(index);
  if (typeof rowKey === 'function') return rowKey(record);
  return String(record[rowKey]);
}

export default function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  batchActions,
  pagination = false,
  pageSize = 10,
  emptyText = '暂无数据',
  loading = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = pagination ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const displayData = pagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  const allSelected =
    selectable && displayData.length > 0 && displayData.every((record, index) => {
      const key = getRowKey(record, rowKey, index);
      return selectedRowKeys.includes(key);
    });

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allKeys = displayData.map((record, index) => getRowKey(record, rowKey, index));
      const mergedKeys = Array.from(new Set([...selectedRowKeys, ...allKeys]));
      onSelectionChange(mergedKeys);
    } else {
      const displayKeys = displayData.map((record, index) => getRowKey(record, rowKey, index));
      onSelectionChange(selectedRowKeys.filter((k) => !displayKeys.includes(k)));
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedRowKeys, key]);
    } else {
      onSelectionChange(selectedRowKeys.filter((k) => k !== key));
    }
  };

  return (
    <div className="w-full">
      {selectable && batchActions && selectedRowKeys.length > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-primary-50 rounded-lg">
          <span className="text-sm text-primary-700 font-medium">
            已选择 {selectedRowKeys.length} 项
          </span>
          <div className="flex items-center gap-2">{batchActions}</div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {selectable && (
                  <th className="table-header w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-primary-500 focus:ring-primary-500"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'table-header',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    加载中...
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                displayData.map((record, index) => {
                  const key = getRowKey(record, rowKey, index);
                  const isSelected = selectable && selectedRowKeys.includes(key);

                  return (
                    <tr
                      key={key}
                      className={cn(
                        'transition-colors hover:bg-zinc-50',
                        isSelected && 'bg-primary-50/50'
                      )}
                    >
                      {selectable && (
                        <td className="table-cell w-12">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(key, e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 text-primary-500 focus:ring-primary-500"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const content = col.render
                          ? col.render(record, index)
                          : col.dataIndex
                            ? (record[col.dataIndex] as React.ReactNode)
                            : null;

                        return (
                          <td
                            key={col.key}
                            className={cn(
                              'table-cell',
                              col.align === 'center' && 'text-center',
                              col.align === 'right' && 'text-right'
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <span className="text-sm text-zinc-500">
              共 {data.length} 条，第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  currentPage === 1
                    ? 'text-zinc-300 cursor-not-allowed'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors',
                    currentPage === page
                      ? 'bg-primary-500 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  currentPage === totalPages
                    ? 'text-zinc-300 cursor-not-allowed'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
