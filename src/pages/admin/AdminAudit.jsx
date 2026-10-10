import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAuditLogs } from "../../services/apiAdmin"

export default function AdminAudit() {
  const [page, setPage] = useState(0)
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-audit", page], queryFn: () => getAuditLogs(page) })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">سجل التدقيق</h1>
        <p className="text-sm text-muted-foreground">كل إجراءات السوبر أدمن مسجلة هنا</p>
      </div>
      {isLoading && <p className="text-muted-foreground">جاري التحميل...</p>}
      {error && <p className="text-destructive">خطأ: {error.message} — نفّذ migration إنشاء جدول admin_audit_logs أولاً.</p>}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="p-3">التاريخ</th>
              <th className="p-3">الإجراء</th>
              <th className="p-3">الجدول</th>
              <th className="p-3">الهدف</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("ar-EG")}</td>
                <td className="p-3 font-medium">{l.action}</td>
                <td className="p-3">{l.target_table || "—"}</td>
                <td className="p-3 text-muted-foreground">{l.target_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الإجمالي: {data?.total || 0}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">السابق</button>
          <button onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5">التالي</button>
        </div>
      </div>
    </div>
  )
}
