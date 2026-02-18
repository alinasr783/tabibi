import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Check, QrCode, Sparkles, TrendingUp, Users, Wallet, Clock, Share2, Target, ReceiptText, Download, Settings, Award, Plus, Pencil, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DataTable from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import QRCode from "react-qr-code"
import toast from "react-hot-toast"
import { deleteAffiliatePayoutMethod, getAffiliateCommissions, getAffiliateDashboard, getAffiliateFunnelStats, getAffiliatePayoutMethods, getAffiliateReferrals, getAffiliateWithdrawableBalance, getAffiliateWithdrawalRequests, requestAffiliateWithdrawal, setDefaultAffiliatePayoutMethod, upsertAffiliatePayoutMethod } from "@/services/apiAffiliate"
import useAffiliateRealtime from "./useAffiliateRealtime"
import { APPS_ICON_REGISTRY } from "@/features/tabibi-tools/appsRegistry"

function formatEgp(amount) {
  const n = Number(amount || 0)
  return `${n.toLocaleString("ar-EG")} ج.م`
}

function formatDateTime(value) {
  if (!value) return "-"
  try {
    const d = new Date(value)
    return d.toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" })
  } catch {
    return "-"
  }
}

function computeLevel({ doctorsActive = 0, thisMonthEarnings = 0 }) {
  const starter = { key: "starter", title: "مبتدئ", badge: "🥉", rateHint: "20%" }
  const growth = { key: "growth", title: "متقدم", badge: "🥈", rateHint: "25%" }
  const pro = { key: "pro", title: "احترافي", badge: "🥇", rateHint: "30%" }

  if (doctorsActive >= 20) return pro
  if (doctorsActive >= 5) return growth
  return starter
}

function computeProgressToNextLevel({ doctorsActive = 0 }) {
  const active = Number(doctorsActive || 0)
  if (active >= 20) return null
  if (active >= 5) {
    const currentBase = 5
    const nextTarget = 20
    const remaining = Math.max(nextTarget - active, 0)
    const pct = Math.max(0, Math.min(100, Math.round(((active - currentBase) / (nextTarget - currentBase)) * 100)))
    return { nextTitle: "احترافي", remaining, pct, nextTarget }
  }
  const nextTarget = 5
  const remaining = Math.max(nextTarget - active, 0)
  const pct = Math.max(0, Math.min(100, Math.round((active / nextTarget) * 100)))
  return { nextTitle: "متقدم", remaining, pct, nextTarget }
}

function computeCurrentRate({ doctorsActive = 0 }) {
  if (doctorsActive >= 20) return 0.3
  if (doctorsActive >= 5) return 0.25
  return 0.2
}

function statusLabel(status) {
  switch (status) {
    case "pending":
      return { label: "Pending", variant: "secondary" }
    case "approved":
      return { label: "Approved", variant: "outline" }
    case "paid":
      return { label: "Paid", variant: "default" }
    case "void":
      return { label: "Void", variant: "destructive" }
    default:
      return { label: status || "-", variant: "secondary" }
  }
}

function StatCard({ icon: Icon, label, value, iconColorClass = "bg-primary/10 text-primary", onClick }) {
  return (
    <Card className={`bg-card/70 h-full ${onClick ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}`} onClick={onClick}>
      <CardContent className="flex items-center gap-3 py-3">
        <div className={`size-8 rounded-[calc(var(--radius)-4px)] grid place-items-center flex-shrink-0 ${iconColorClass}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-semibold truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AffiliateDashboardPage({ app }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [payoutFormMode, setPayoutFormMode] = useState("idle")
  const [payoutForm, setPayoutForm] = useState({
    id: null,
    payout_method: "bank",
    bank_name: "",
    account_name: "",
    iban: "",
    wallet_phone: "",
    notes: "",
    make_default: true,
  })
  const qrRef = useRef(null)

  useAffiliateRealtime()

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: getAffiliateDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: funnel } = useQuery({
    queryKey: ["affiliate-funnel"],
    queryFn: getAffiliateFunnelStats,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const stats = data?.stats || {}
  const signupsCount = Math.max(Number(stats.doctorsRegistered || 0), Number(funnel?.signups || 0))
  const activeSubsCount = Math.max(Number(stats.doctorsActive || 0), Number(funnel?.activeSubscriptions || 0))

  const level = useMemo(() => computeLevel(stats), [stats])
  const currentRate = useMemo(() => computeCurrentRate(stats), [stats])
  const progressToNext = useMemo(() => computeProgressToNextLevel(stats), [stats])

  const { data: referrals = [], isLoading: isReferralsLoading } = useQuery({
    queryKey: ["affiliate-referrals"],
    queryFn: getAffiliateReferrals,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: commissions = [], isLoading: isCommissionsLoading } = useQuery({
    queryKey: ["affiliate-commissions"],
    queryFn: getAffiliateCommissions,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: payoutMethods = [], isLoading: isPayoutMethodsLoading } = useQuery({
    queryKey: ["affiliate-payout-methods"],
    queryFn: getAffiliatePayoutMethods,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const { data: withdrawable = 0 } = useQuery({
    queryKey: ["affiliate-withdrawable-balance"],
    queryFn: getAffiliateWithdrawableBalance,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })

  const { data: withdrawalRequests = [] } = useQuery({
    queryKey: ["affiliate-withdrawal-requests"],
    queryFn: getAffiliateWithdrawalRequests,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(data?.referralLink || "")
      setCopied(true)
      toast.success("تم نسخ رابط الإحالة")
      setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error("تعذر نسخ الرابط")
    }
  }

  const shareReferralLink = async () => {
    const url = data?.referralLink || ""
    if (!url) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Tabibi Affiliate",
          text: "سجل كطبيب في Tabibi من خلال رابط الإحالة",
          url,
        })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success("تم نسخ الرابط للمشاركة")
    } catch {
      toast.error("تعذر مشاركة الرابط")
    }
  }

  const walletSummary = useMemo(() => {
    const paid = Number(stats.paidEarnings || 0)
    const pending = Number(stats.pendingEarnings || 0)
    const total = Number(stats.totalEarnings || 0)
    return {
      availableToWithdraw: paid,
      pending,
      total,
    }
  }, [stats])

  const downloadQrCode = () => {
    const node = qrRef.current
    if (!node) return
    const svg = node.querySelector("svg")
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "tabibi-affiliate-qr.svg"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const openPaymentSettings = () => {
    setTab("payout")
  }

  const resetPayoutForm = () => {
    setPayoutForm({
      id: null,
      payout_method: "bank",
      bank_name: "",
      account_name: "",
      iban: "",
      wallet_phone: "",
      notes: "",
      make_default: true,
    })
  }

  const submitPayoutMethod = async (e) => {
    e.preventDefault()
    try {
      await upsertAffiliatePayoutMethod(payoutForm)
      await queryClient.invalidateQueries({ queryKey: ["affiliate-payout-methods"] })
      toast.success(payoutForm?.id ? "تم تحديث طريقة الدفع" : "تمت إضافة طريقة دفع")
      if (payoutForm?.id) {
        setPayoutFormMode("idle")
        resetPayoutForm()
      } else {
        setPayoutFormMode("new")
        resetPayoutForm()
      }
    } catch {
      toast.error("تعذر حفظ إعدادات الدفع")
    }
  }

  const editPayoutMethod = (m) => {
    setPayoutFormMode("edit")
    setPayoutForm({
      id: m?.id || null,
      payout_method: m?.payout_method || "bank",
      bank_name: m?.bank_name || "",
      account_name: m?.account_name || "",
      iban: m?.iban || "",
      wallet_phone: m?.wallet_phone || "",
      notes: m?.notes || "",
      make_default: !!m?.is_default,
    })
  }

  const markDefaultPayoutMethod = async (methodId) => {
    try {
      await setDefaultAffiliatePayoutMethod(methodId)
      await queryClient.invalidateQueries({ queryKey: ["affiliate-payout-methods"] })
      toast.success("تم تعيين الطريقة الافتراضية")
    } catch {
      toast.error("تعذر تعيين الطريقة الافتراضية")
    }
  }

  const removePayoutMethod = async (methodId) => {
    try {
      await deleteAffiliatePayoutMethod(methodId)
      await queryClient.invalidateQueries({ queryKey: ["affiliate-payout-methods"] })
      toast.success("تم حذف طريقة الدفع")
      if (payoutForm?.id === methodId) resetPayoutForm()
    } catch {
      toast.error("تعذر حذف طريقة الدفع")
    }
  }

  const requestWithdrawal = async () => {
    try {
      await requestAffiliateWithdrawal()
      await queryClient.invalidateQueries({ queryKey: ["affiliate-withdrawable-balance"] })
      await queryClient.invalidateQueries({ queryKey: ["affiliate-withdrawal-requests"] })
      toast.success("تم إرسال طلب السحب")
    } catch (e) {
      const msg = String(e?.message || "")
      if (msg.includes("missing_payment_settings") || msg.includes("missing_payout_method")) {
        toast.error("لازم تكمل إعدادات الدفع الأول")
        openPaymentSettings()
        return
      }
      if (msg.includes("no_withdrawable_balance")) {
        toast.error("لا يوجد رصيد متاح للسحب حالياً")
        return
      }
      toast.error("تعذر إرسال طلب السحب")
    }
  }

  useEffect(() => {
    if (!Array.isArray(payoutMethods) || payoutMethods.length === 0) return
    const current = payoutMethods.find((m) => m.is_default) || payoutMethods[0]
    if (!current || payoutForm?.id) return
    if (payoutFormMode !== "idle") return
    setPayoutForm((p) => ({
      ...p,
      payout_method: current?.payout_method || "bank",
      bank_name: current?.bank_name || "",
      account_name: current?.account_name || "",
      iban: current?.iban || "",
      wallet_phone: current?.wallet_phone || "",
      notes: current?.notes || "",
      make_default: true,
    }))
  }, [payoutMethods, payoutForm?.id])

  const AppIcon = APPS_ICON_REGISTRY[app?.icon_name] || Sparkles

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 pb-24 font-sans" dir="rtl" lang="ar">
      <Card className="bg-card/70">
        <CardContent className="flex items-start gap-3 py-4">
          <div className={`shrink-0 rounded-[calc(var(--radius)+6px)] p-3 ${app?.color || "bg-primary/10"} border border-border`}>
            <AppIcon className="size-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{app?.title || "Tabibi Affiliate"}</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              {app?.short_description || "اربح عمولة شهرية متكررة مع كل طبيب يسجل ويفعّل اشتراكه"}
            </p>
          </div>
        </CardContent>
      </Card>

      {!data?.profile && (
        <Card className="bg-card/70">
          <CardContent className="p-4 text-sm">
            <div className="font-semibold text-foreground">الـ Affiliate غير مفعّل على قاعدة البيانات</div>
            <div className="text-muted-foreground mt-1">
              نفّذ سكربت الـ SQL الخاص بالـ Affiliate على Supabase علشان تبدأ الإحصائيات تتحدث.
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/70">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">رتبتك الحالية</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="size-10 rounded-[calc(var(--radius)+10px)] border border-border bg-primary/10 text-primary grid place-items-center">
                  <Award className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-foreground truncate">{level.badge} {level.title}</div>
                </div>
              </div>
            </div>
            <div className="text-left shrink-0">
              <div className="text-xs text-muted-foreground">نسبتك</div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground">{(currentRate * 100).toFixed(0)}%</div>
            </div>
          </div>
          {progressToNext ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="text-muted-foreground">
                  باقي <span className="font-semibold text-foreground">{progressToNext.remaining}</span> طبيب نشط للترقية إلى{" "}
                  <span className="font-semibold text-foreground">{progressToNext.nextTitle}</span>
                </div>
                <div className="text-muted-foreground">{progressToNext.pct}%</div>
              </div>
              <Progress value={progressToNext.pct} className="h-2 w-full" />
            </div>
          ) : (
            <div className="mt-4 text-xs text-muted-foreground">أنت في أعلى مستوى حالياً</div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} dir="rtl" className="w-full">
        <div className="sticky top-2 z-20">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="referrals">الإحالات</TabsTrigger>
            <TabsTrigger value="wallet">المحفظة</TabsTrigger>
            <TabsTrigger value="payout">الإعدادات</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Target} label="فتح الرابط" value={funnel?.opens ?? 0} />
            <StatCard icon={Users} label="إنشاء حساب" value={signupsCount} />
            <StatCard icon={TrendingUp} label="اشتراك مدفوع" value={activeSubsCount} />
            <StatCard
              icon={ReceiptText}
              label="نسبة التحويل"
              value={(() => {
                const signups = signupsCount
                const active = activeSubsCount
                if (!signups) return "0%"
                return `${Math.round((active / signups) * 100)}%`
              })()}
              iconColorClass="bg-emerald-500/10 text-emerald-700"
            />
          </div>

          {Array.isArray(funnel?.plans) && funnel.plans.length > 0 && (
            <Card className="bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ReceiptText className="size-4 text-primary" />
                  الاشتراكات حسب الباقة
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {funnel.plans.slice(0, 8).map((p) => (
                  <Badge key={`${p.planId}_${p.billingPeriod}`} variant="secondary">
                    {p.planId} • {p.billingPeriod} • {p.count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-card/70">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    رابط الإحالة
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">انسخ أو شارك الرابط مباشرة</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={shareReferralLink} variant="outline" size="sm" className="gap-2">
                    <Share2 className="size-4" />
                    مشاركة
                  </Button>
                  <Button onClick={copyReferralLink} variant="outline" size="sm" className="gap-2">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    نسخ
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background rounded-[var(--radius)] border border-border p-3">
                  <div className="text-xs text-muted-foreground break-all">{data?.referralLink}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatCard icon={Users} label="الأطباء المسجلين" value={stats.doctorsRegistered ?? 0} />
                  <StatCard icon={TrendingUp} label="الأطباء النشطين" value={stats.doctorsActive ?? 0} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="size-4 text-primary" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-[var(--radius)] border border-border bg-background px-3 py-3 text-sm"
                  onClick={() => setIsQrOpen((v) => !v)}
                >
                  <span className="font-medium text-foreground">{isQrOpen ? "إخفاء QR Code" : "عرض QR Code"}</span>
                  <span className="text-xs text-muted-foreground">{isQrOpen ? "−" : "+"}</span>
                </button>
                {isQrOpen && (
                  <div className="space-y-3">
                    <div ref={qrRef} className="bg-background p-3 rounded-[var(--radius)] border border-border flex items-center justify-center">
                      {data?.referralLink ? <QRCode value={data.referralLink} size={160} /> : <div className="w-[160px] h-[160px] bg-muted rounded-[var(--radius)]" />}
                    </div>
                    <Button
                      onClick={downloadQrCode}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      disabled={!data?.referralLink}
                    >
                      <Download className="size-4" />
                      تحميل QR
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">مشاركة أسرع على واتساب/فيس/لينكدإن</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/70">
            <CardContent className="p-4 text-sm text-muted-foreground">
              تفاصيل الأرباح وحركة المحفظة موجودة داخل تبويب <span className="font-semibold text-foreground">المحفظة</span>.
            </CardContent>
          </Card>

          {isLoading && <div className="text-sm text-muted-foreground">جاري تحميل البيانات...</div>}
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="حسابات" value={signupsCount} />
            <StatCard icon={TrendingUp} label="نشط" value={activeSubsCount} />
            <StatCard
              icon={Target}
              label="تحويل"
              value={(() => {
                const signups = signupsCount
                const active = activeSubsCount
                if (!signups) return "0%"
                return `${Math.round((active / signups) * 100)}%`
              })()}
              iconColorClass="bg-emerald-500/10 text-emerald-700"
            />
            <StatCard icon={ReceiptText} label="باقات" value={Array.isArray(funnel?.plans) ? funnel.plans.reduce((a, p) => a + Number(p.count || 0), 0) : 0} />
          </div>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4 text-primary" />
                آخر الإحالات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { header: "العيادة", accessor: "clinicName" },
                  { header: "الحالة", accessor: "isActive", render: (r) => (r.isActive ? <Badge>نشط</Badge> : <Badge variant="secondary">غير نشط</Badge>) },
                  { header: "الباقة", accessor: "planName", render: (r) => (r.planName || r.planId || "-") },
                  { header: "مدة", accessor: "billingPeriod", render: (r) => (r.billingPeriod === "annual" ? "سنوي" : r.billingPeriod === "monthly" ? "شهري" : r.billingPeriod || "-") },
                  { header: "قيمة", accessor: "subscriptionAmount", render: (r) => (r.subscriptionAmount ? formatEgp(r.subscriptionAmount) : "-") },
                  { header: "تاريخ التسجيل", accessor: "createdAt", render: (r) => formatDateTime(r.createdAt) },
                ]}
                data={referrals}
                emptyLabel={isReferralsLoading ? "جاري التحميل..." : "لا توجد إحالات بعد"}
                rowKey={(r) => r.id}
                renderMobileItem={(r) => (
                  <div className="rounded-xl border bg-background p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{r.clinicName || "—"}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {(r.planName || r.planId || "—")} • {r.billingPeriod === "annual" ? "سنوي" : r.billingPeriod === "monthly" ? "شهري" : r.billingPeriod || "—"}
                        </div>
                      </div>
                      <div className="shrink-0">{r.isActive ? <Badge>نشط</Badge> : <Badge variant="secondary">غير نشط</Badge>}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-foreground">{r.subscriptionAmount ? formatEgp(r.subscriptionAmount) : "—"}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</div>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="mt-4 space-y-4">
          <Card className="bg-card/70">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="size-4 text-primary" />
                  المحفظة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Wallet} label="متاح للسحب" value={formatEgp(withdrawable)} iconColorClass="bg-emerald-500/10 text-emerald-700" />
                  <StatCard icon={Clock} label="قيد الاعتماد" value={formatEgp(walletSummary.pending)} iconColorClass="bg-amber-500/10 text-amber-700" />
                  <Card className="bg-card/70 col-span-2">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                        <ReceiptText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground truncate">إجمالي أرباحك</div>
                        <div className="text-lg font-semibold truncate">{formatEgp(walletSummary.total)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" />
                  يتم اعتماد العمولة بعد 14 يوم كفترة أمان، إلا إذا تم تحويلها إلى Paid.
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={requestWithdrawal} className="w-full sm:w-auto" disabled={withdrawable <= 0}>
                    طلب سحب المتاح
                  </Button>
                  <Button variant="outline" onClick={openPaymentSettings} className="w-full sm:w-auto gap-2">
                    <Settings className="size-4" />
                    إعدادات الدفع
                  </Button>
                </div>
              </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ReceiptText className="size-4 text-primary" />
                تاريخ معاملات المحفظة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { header: "المبلغ", accessor: "commissionAmount", render: (c) => formatEgp(c.commissionAmount) },
                  { header: "النسبة", accessor: "commissionRate", render: (c) => `${Math.round((Number(c.commissionRate || 0) || 0) * 100)}%` },
                  {
                    header: "الحالة",
                    accessor: "status",
                    render: (c) => {
                      const s = statusLabel(c.status)
                      return <Badge variant={s.variant}>{s.label}</Badge>
                    },
                  },
                  { header: "تاريخ", accessor: "createdAt", render: (c) => formatDateTime(c.createdAt) },
                  { header: "متاحة بعد", accessor: "availableAt", render: (c) => formatDateTime(c.availableAt) },
                ]}
                data={commissions}
                emptyLabel={isCommissionsLoading ? "جاري التحميل..." : "لا توجد معاملات بعد"}
                rowKey={(c) => c.id}
                renderMobileItem={(c) => {
                  const s = statusLabel(c.status)
                  return (
                    <div className="rounded-xl border bg-background p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">المبلغ</div>
                          <div className="text-lg font-extrabold text-foreground">{formatEgp(c.commissionAmount)}</div>
                        </div>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-[var(--radius)] border bg-white p-2">
                          <div className="text-muted-foreground">النسبة</div>
                          <div className="font-semibold text-foreground">{`${Math.round((Number(c.commissionRate || 0) || 0) * 100)}%`}</div>
                        </div>
                        <div className="rounded-[var(--radius)] border bg-white p-2">
                          <div className="text-muted-foreground">تاريخ</div>
                          <div className="font-semibold text-foreground">{formatDateTime(c.createdAt)}</div>
                        </div>
                        <div className="rounded-[var(--radius)] border bg-white p-2 col-span-2">
                          <div className="text-muted-foreground">متاحة بعد</div>
                          <div className="font-semibold text-foreground">{formatDateTime(c.availableAt)}</div>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                طلبات السحب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { header: "المبلغ", accessor: "amount", render: (r) => formatEgp(r.amount) },
                  { header: "الحالة", accessor: "status", render: (r) => <Badge variant="secondary">{r.status}</Badge> },
                  { header: "تاريخ", accessor: "created_at", render: (r) => formatDateTime(r.created_at) },
                ]}
                data={withdrawalRequests}
                emptyLabel="لا توجد طلبات سحب"
                rowKey={(r) => r.id}
                renderMobileItem={(r) => (
                  <div className="rounded-xl border bg-background p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">المبلغ</div>
                        <div className="text-lg font-extrabold text-foreground">{formatEgp(r.amount)}</div>
                      </div>
                      <Badge variant="secondary">{r.status}</Badge>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between gap-2">
                      <div>تاريخ</div>
                      <div className="text-foreground font-semibold">{formatDateTime(r.created_at)}</div>
                    </div>
                    {r.admin_note ? (
                      <div className="mt-2 text-xs rounded-[var(--radius)] border bg-white p-2">
                        <div className="text-muted-foreground">ملاحظة</div>
                        <div className="text-foreground font-semibold mt-1">{r.admin_note}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/70">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="size-4 text-primary" />
                    طرق الدفع
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">يمكنك إضافة أكثر من طريقة وتعيين واحدة افتراضية</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setPayoutFormMode("new")
                    resetPayoutForm()
                  }}
                >
                  <Plus className="size-4" />
                  طريقة جديدة
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPayoutMethodsLoading ? (
                  <div className="text-sm text-muted-foreground">جاري التحميل...</div>
                ) : payoutMethods.length === 0 ? (
                  <div className="text-sm text-muted-foreground">لا توجد طرق دفع بعد</div>
                ) : (
                  payoutMethods.map((m) => (
                    <div key={m.id} className="rounded-[var(--radius)] border border-border bg-background p-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-foreground">
                              {m.payout_method === "bank" ? "حساب بنكي" : "محفظة"}
                            </div>
                            {m.is_default ? <Badge>افتراضية</Badge> : <Badge variant="secondary">إضافية</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 break-words">
                            {m.account_name ? `الاسم: ${m.account_name}` : "—"}
                            {m.payout_method === "bank"
                              ? ` • البنك: ${m.bank_name || "—"} • IBAN: ${m.iban || "—"}`
                              : ` • الرقم: ${m.wallet_phone || "—"}`}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {!m.is_default && (
                            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => markDefaultPayoutMethod(m.id)}>
                              تعيين افتراضية
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => editPayoutMethod(m)}>
                            <Pencil className="size-4" />
                            تعديل
                          </Button>
                          <Button type="button" variant="destructive" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => removePayoutMethod(m.id)}>
                            <Trash2 className="size-4" />
                            حذف
                          </Button>
                        </div>
                      </div>
                      {m.notes ? <div className="text-xs text-muted-foreground mt-2">{m.notes}</div> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/70">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="size-4 text-primary" />
                    {payoutForm?.id ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">استخدم البيانات الصحيحة لتسهيل تنفيذ السحب</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setTab("wallet")}>
                  العودة للمحفظة
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitPayoutMethod} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">طريقة الاستلام</div>
                      <select
                        className="w-full h-10 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
                        value={payoutForm.payout_method}
                        onChange={(e) => setPayoutForm((p) => ({ ...p, payout_method: e.target.value }))}
                      >
                        <option value="bank">حساب بنكي</option>
                        <option value="wallet">محفظة (رقم)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">اسم صاحب الحساب</div>
                      <input
                        className="w-full h-10 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
                        value={payoutForm.account_name}
                        onChange={(e) => setPayoutForm((p) => ({ ...p, account_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  {payoutForm.payout_method === "bank" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">اسم البنك</div>
                        <input
                          className="w-full h-10 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
                          value={payoutForm.bank_name}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, bank_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">IBAN</div>
                        <input
                          className="w-full h-10 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
                          value={payoutForm.iban}
                          onChange={(e) => setPayoutForm((p) => ({ ...p, iban: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">رقم المحفظة</div>
                      <input
                        className="w-full h-10 rounded-[var(--radius)] border border-border bg-background px-3 text-sm"
                        value={payoutForm.wallet_phone}
                        onChange={(e) => setPayoutForm((p) => ({ ...p, wallet_phone: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">ملاحظات</div>
                    <textarea
                      className="w-full min-h-20 rounded-[var(--radius)] border border-border bg-background p-3 text-sm"
                      value={payoutForm.notes}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!payoutForm.make_default}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, make_default: e.target.checked }))}
                    />
                    تعيين كافتراضية
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button type="submit" className="w-full sm:w-auto">
                      {payoutForm?.id ? "حفظ التعديل" : "إضافة الطريقة"}
                    </Button>
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetPayoutForm}>
                      تفريغ النموذج
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
