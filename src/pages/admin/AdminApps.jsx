import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAdminApps, toggleAdminApp, updateAdminAppPrice } from "../../services/apiAdmin"
import { useState } from "react"

export default function AdminApps() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-apps"], queryFn: getAdminApps })
  const toggle = useMutation({ mutationFn: ({ id, is_active }) => toggleAdminApp(id, is_active), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-apps"] }) })
  const setPrice = useMutation({ mutationFn: ({ id, price }) => updateAdminAppPrice(id, price), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-apps"] }) })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">إدارة التطبيقات</h1>
        <p className="text-sm text-muted-foreground">تفعيل/إيقاف التطبيقات وتعديل أسعارها</p>
      </div>
      {isLoading && <p className="text-muted-foreground">جاري التحميل...</p>}
      {error && <p className="text-destructive">خطأ: {error.message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(data || []).map((app) => (
          <AppRow key={app.id} app={app} onToggle={(v) => toggle.mutate({ id: app.id, is_active: v })} onPrice={(p) => setPrice.mutate({ id: app.id, price: p })} busy={toggle.isPending || setPrice.isPending} />
        ))}
      </div>
    </div>
  )
}

function AppRow({ app, onToggle, onPrice, busy }) {
  const [price, setPriceState] = useState(app.price || 0)
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-bold">{app.title}</p>
        <span className={`text-xs rounded-full px-2 py-0.5 ${app.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {app.is_active ? "مفعّل" : "موقوف"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{app.category || ""} • مشاهدات: {app.views_count || 0} • {app.billing_period || ""}</p>
      <div className="flex items-center gap-2">
        <input type="number" value={price} onChange={(e) => setPriceState(Number(e.target.value))} className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
        <button disabled={busy} onClick={() => onPrice(price)} className="rounded-lg border border-border px-3 py-1.5 text-xs">حفظ السعر</button>
        <button disabled={busy} onClick={() => onToggle(!app.is_active)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">
          {app.is_active ? "إيقاف" : "تفعيل"}
        </button>
      </div>
    </div>
  )
}
