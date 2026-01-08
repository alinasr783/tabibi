import {Button} from "./button";
import { useState, useEffect } from "react";

export default function DataTable({
  columns = [],
  data = [],
  emptyLabel = "لا توجد بيانات",
  rowKey = (row) => row.id,
  className = "",
  page,
  pageSize,
  total,
  onPageChange,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  if (isMobile) {
    // Mobile card view
    return (
      <div className={`table-card-view ${className}`}>
        {data.length > 0 ? (
          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {data.map((row) => (
              <div key={rowKey(row)} className="table-row border border-gray-200 rounded-[var(--radius)] p-4 bg-white shadow-sm">
                {columns.map((col, i) => {
                  const value = col.render ? col.render(row) : row[col.accessor] ?? "-";
                  // Skip action columns on mobile if they contain buttons
                  if (col.header === "" || col.header === "الإجراء") {
                    return (
                      <div key={i} className="table-cell mb-2 last:mb-0" data-label={col.header}>
                        {value}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="table-cell mb-3 last:mb-0" data-label={col.header}>
                      <span className="font-medium text-gray-700 text-sm">{col.header}: </span>
                      <span className="text-gray-900 text-sm">{value}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            {emptyLabel}
          </div>
        )}
        {typeof total === "number" &&
        total >= 0 &&
        typeof page === "number" &&
        typeof pageSize === "number" &&
        onPageChange && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 mt-4">
            <div className="text-xs text-muted-foreground">
              {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} من {total}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}>
                السابق
              </Button>
              <span className="px-2 py-1 rounded-[var(--radius)] bg-muted text-xs">
                {page}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= Math.ceil((total || 0) / pageSize)}
                onClick={() => onPageChange(page + 1)}>
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-foreground">
            {columns.map((col, i) => (
              <th key={i} className="p-3 text-start text-sm font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border hover:bg-muted/30">
                {columns.map((col, i) => (
                  <td key={i} className={`p-3 ${col.cellClassName ?? ""}`}>
                    {col.render ? col.render(row) : row[col.accessor] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="p-6 text-center text-muted-foreground"
                colSpan={columns.length || 1}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {typeof total === "number" &&
      total >= 0 &&
      typeof page === "number" &&
      typeof pageSize === "number" &&
      onPageChange ? (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <div className="text-xs text-muted-foreground">
            {Math.min((page - 1) * pageSize + 1, total)}–
            {Math.min(page * pageSize, total)} من {total}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}>
              السابق
            </Button>
            <span className="px-3 py-1 rounded-[var(--radius)] bg-muted text-xs">
              الصفحة {page}
            </span>
            <Button
              variant="ghost"
              disabled={page >= Math.ceil((total || 0) / pageSize)}
              onClick={() => onPageChange(page + 1)}>
              التالي
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}