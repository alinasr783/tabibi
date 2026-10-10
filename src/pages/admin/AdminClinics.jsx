import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminClinics } from "../../services/apiAdmin"

export default function AdminClinics() {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-clinics", query, page],
    queryFn: () => getAdminClinics({ query, page }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">إدارة العيادات</h1>
        <p className="text-sm text-muted-foreground">كل العيادات وخططها الحالية</p>
      </div>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(0) }}
        placeholder="بحث باسم العيادة أو العنوان..."
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
      />
      {isLoading && <p className="text-muted-foreground">جاري التحميل...</p>}
      {error && <p className="text-destructive">خطأ: {error.message}</p>}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="p-3">الاسم</th>
              <th className="p-3">العنوان</th>
              <th className="p-3">الخطة</th>
              <th className="p-3">الحجز أونلاين</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((c) => (
              <tr key={c.clinic_uuid} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{c.name || "—"}</td>
                <td className="p-3 text-muted-foreground">{c.address || "—"}</td>
                <td className="p-3">{c.current_plan || "—"}</td>
                <td className="p-3">{c.online_booking_enabled ? "مفعّل" : "معطّل"}</td>
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
