import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { BadgePercent, X } from "lucide-react"
import { getAdminSubscriptions, cancelAdminSubscription, extendAdminSubscription, getAdminPlans, updateAdminPlan } from "../../services/apiAdmin"
import { getPlanPriceView } from "../../lib/planDiscount"
import { formatCurrency } from "../../lib/utils"

export default function AdminSubscriptions() {
  const [status, setStatus] = useState("active")
  const [page, setPage] = useState(0)
  const qc = useQueryClient()

  const subs = useQuery({ queryKey: ["admin-subs", status, page], queryFn: () => getAdminSubscriptions({ status, page }) })
  const plans = useQuery({ queryKey: ["admin-plans"], queryFn: getAdminPlans })

  const cancel = useMutation({ mutationFn: cancelAdminSubscription, onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-subs"] }) })
  const extend = useMutation({ mutationFn: (id) => extendAdminSubscription(id, 1), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-subs"] }) })
  const savePlan = useMutation({ mutationFn: ({ id, payload }) => updateAdminPlan(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الاشتراكات والخطط</h1>
        <p className="text-sm text-muted-foreground">إدارة أسعار الخطط والاشتراكات النشطة</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">خطط الأسعار</h2>
        {plans.isLoading && <p className="text-sm text-muted-foreground">جاري تحميل الخطط...</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(plans.data || []).map((p) => (
            <PlanCard key={p.id} plan={p} onSave={(payload) => savePlan.mutate({ id: p.id, payload })} saving={savePlan.isPending} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">الاشتراكات</h2>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
            <option value="active">نشطة</option>
            <option value="cancelled">ملغاة</option>
            <option value="all">الكل</option>
          </select>
        </div>
        {subs.isLoading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}
        {subs.error && <p className="text-sm text-destructive">خطأ: {subs.error.message}</p>}
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-muted-foreground">
                <th className="p-3">الخطة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الفوترة</th>
                <th className="p-3">ينتهي في</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(subs.data?.rows || []).map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{s.plan_id}</td>
                  <td className="p-3">{s.amount}</td>
                  <td className="p-3">{s.billing_period}</td>
                  <td className="p-3 text-muted-foreground">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("ar-EG") : "—"}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => extend.mutate(s.id)} disabled={extend.isPending} className="rounded-lg border border-border px-2.5 py-1 text-xs">تمديد شهر</button>
                    <button onClick={() => { if (confirm("إلغاء هذا الاشتراك؟")) cancel.mutate(s.id) }} disabled={cancel.isPending} className="rounded-lg bg-destructive px-2.5 py-1 text-xs text-destructive-foreground">إلغاء</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function toLocalInputValue(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function PlanCard({ plan, onSave, saving }) {
  const [price, setPrice] = useState(plan.price)
  const [discountType, setDiscountType] = useState(plan.discount_type || "none")
  const [discountValue, setDiscountValue] = useState(plan.discount_value || 0)
  const [discountEndsAt, setDiscountEndsAt] = useState(toLocalInputValue(plan.discount_ends_at))

  const draft = { ...plan, price, discount_type: discountType, discount_value: discountValue, discount_ends_at: discountEndsAt || null }
  const view = getPlanPriceView(draft, "monthly")
  const showDiscountFields = discountType !== "none"
  const hasDiscount = showDiscountFields && Number(discountValue) > 0

  const handleSave = () => {
    onSave({
      price: Number(price) || 0,
      discount_type: hasDiscount ? discountType : "none",
      discount_value: hasDiscount ? Number(discountValue) || 0 : 0,
      discount_ends_at: hasDiscount && discountEndsAt ? new Date(discountEndsAt).toISOString() : null,
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold">{plan.name || plan.id}</p>
        {plan.popular && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">الأكثر شعبية</span>
        )}
      </div>

      {/* معاينة حية بنفس هوية الموقع: الأساسي مشطوب + الخصم بارز */}
      <div className="rounded-lg bg-muted/60 p-3">
        {view.hasDiscount ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground line-through">{formatCurrency(view.base)}</span>
              <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                خصم {view.percentOff}%
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(view.final)}
              <span className="text-sm font-normal text-muted-foreground"> / شهر</span>
            </div>
            <p className="text-xs text-green-600 font-medium">وفّر {formatCurrency(view.saved)}</p>
          </div>
        ) : (
          <div className="text-2xl font-bold">
            {formatCurrency(view.base)}
            <span className="text-sm font-normal text-muted-foreground"> / شهر</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">السعر الأساسي (شهري)</label>
        <div className="flex items-center gap-2">
          <input type="number" min="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">نوع الخصم</label>
        <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
          <option value="none">بدون خصم</option>
          <option value="percent">نسبة مئوية %</option>
          <option value="fixed">مبلغ ثابت (ج)</option>
        </select>
      </div>

      {showDiscountFields && (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-2.5">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {discountType === "percent" ? "النسبة % (1 - 100)" : "قيمة الخصم بالجنيه"}
            </label>
            <input
              type="number" min="0" max={discountType === "percent" ? 100 : undefined}
              value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ينتهي في (اختياري)</label>
            <input
              type="datetime-local" value={discountEndsAt} onChange={(e) => setDiscountEndsAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
          حفظ السعر والخصم
        </button>
        {showDiscountFields && (
          <button
            onClick={() => { setDiscountType("none"); setDiscountValue(0); setDiscountEndsAt("") }}
            title="إزالة الخصم"
            className="rounded-lg border border-border px-2.5 py-2 text-destructive hover:bg-destructive/10"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <BadgePercent className="size-3.5" />
        {plan.description || ""}
      </p>
    </div>
  )
}
