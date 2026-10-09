import React from 'react';

export default function DataTable({ 
  columns, 
  data, 
  keyField = 'id',
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange
}) {
  if (!data || data.length === 0) {
    return null; // Let the parent render an EmptyState
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(data.map(row => row[keyField]));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface-0">
      <table className="min-w-full divide-y divide-border text-left">
        <thead className="bg-surface-50">
          <tr>
            {selectable && (
              <th className="px-4 py-3 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  ref={input => { if (input) input.indeterminate = someSelected; }}
                  onChange={handleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </th>
            )}
            {columns.map((col, idx) => (
              <th 
                key={col.key || idx}
                className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-500 ${col.headerClassName || ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, rowIndex) => (
            <tr 
              key={row[keyField] || rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-surface-50 transition-colors' : 'hover:bg-surface-50 transition-colors'}`}
            >
              {selectable && (
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(row[keyField])}
                    onChange={(e) => handleSelectRow(row[keyField], e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </td>
              )}
              {columns.map((col, colIndex) => (
                <td 
                  key={`${row[keyField] || rowIndex}-${col.key || colIndex}`}
                  className={`px-4 py-3 text-sm text-text-900 ${col.className || ''}`}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
