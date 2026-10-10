import { useQuery } from "@tanstack/react-query"
import { getAdminStats } from "../../services/apiAdmin"
import { Users, Building2, CreditCard, LayoutGrid, Wallet } from "lucide-react"

export default function AdminOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-stats"], queryFn: getAdminStats })

  if (isLoading) return <p className="text-muted-foreground">جاري تحميل الإحصائيات...</p>
  if (error) return <p className="text-destructive">تعذر التحميل: {error.message} — تأكد من تنفيذ migration السوبر أدمن.</p>

  const cards = [
    { icon: Users, label: "إجمالي المستخدمين", value: data.totalUsers },
    { icon: Building2, label: "إجمالي العيادات", value: data.totalClinics },
    { icon: CreditCard, label: "اشتراكات نشطة", value: data.activeSubscriptions },
    { icon: LayoutGrid, label: "اشتراكات تطبيقات نشطة", value: data.activeAppSubs },
    { icon: Wallet, label: "إيراد الاشتراكات النشطة", value: `${data.revenue} ج` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نظرة عامة</h1>
        <p className="text-sm text-muted-foreground">مؤشرات المنصة الأساسية</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className="p-2.5 rounded-lg bg-primary/10 text-primary"><c.icon className="size-5" /></span>
            <span>
              <span className="block text-2xl font-bold">{c.value}</span>
              <span className="block text-xs text-muted-foreground">{c.label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
