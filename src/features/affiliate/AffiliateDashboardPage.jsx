import { useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy, Check, QrCode, Sparkles, TrendingUp, Users, Wallet, Clock, Share2, Star, Target, ReceiptText, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DataTable from "@/components/ui/table"
import QRCode from "react-qr-code"
import toast from "react-hot-toast"
import { getAffiliateCommissions, getAffiliateDashboard, getAffiliateFunnelStats, getAffiliateReferrals } from "@/services/apiAffiliate"
import useAffiliateRealtime from "./useAffiliateRealtime"

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

export default function AffiliateDashboardPage() {
  const [copied, setCopied] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const qrRef = useRef(null)

  useAffiliateRealtime()

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: getAffiliateDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const stats = data?.stats || {}

  const level = useMemo(() => computeLevel(stats), [stats])
  const currentRate = useMemo(() => computeCurrentRate(stats), [stats])

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

  const { data: funnel } = useQuery({
    queryKey: ["affiliate-funnel"],
    queryFn: getAffiliateFunnelStats,
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

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6 pb-24 font-sans" dir="rtl" lang="ar">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Tabibi Affiliate
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm">
          اربح عمولة شهرية متكررة مع كل طبيب يسجل ويفعّل اشتراكه
        </p>
      </div>

      <div className="bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">مستواك الحالي</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {level.badge} {level.title}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {level.rateHint}
              </Badge>
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-xs text-muted-foreground">نسبتك</div>
            <div className="text-2xl font-bold text-foreground">{(currentRate * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" dir="rtl" className="w-full">
        <div className="sticky top-2 z-20">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="referrals">الإحالات</TabsTrigger>
            <TabsTrigger value="wallet">المحفظة</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  فتح الرابط
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{funnel?.opens ?? 0}</CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  إنشاء حساب
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{funnel?.signups ?? stats.doctorsRegistered ?? 0}</CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  اشتراك مدفوع
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{funnel?.activeSubscriptions ?? stats.doctorsActive ?? 0}</CardContent>
            </Card>
          </div>

          {Array.isArray(funnel?.plans) && funnel.plans.length > 0 && (
            <Card className="border-0 shadow-md">
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
            <Card className="lg:col-span-2 border-0 shadow-md">
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
                <div className="bg-white rounded-[var(--radius)] border p-3">
                  <div className="text-xs text-gray-600 break-all">{data?.referralLink}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Card className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        الأطباء المسجلين
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.doctorsRegistered ?? 0}</CardContent>
                  </Card>
                  <Card className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="size-4 text-primary" />
                        الأطباء النشطين
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">{stats.doctorsActive ?? 0}</CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="size-4 text-primary" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-[var(--radius)] border bg-white px-3 py-3 text-sm"
                  onClick={() => setIsQrOpen((v) => !v)}
                >
                  <span className="font-medium text-foreground">{isQrOpen ? "إخفاء QR Code" : "عرض QR Code"}</span>
                  <span className="text-xs text-muted-foreground">{isQrOpen ? "−" : "+"}</span>
                </button>
                {isQrOpen && (
                  <div className="space-y-3">
                    <div ref={qrRef} className="bg-white p-3 rounded-[var(--radius)] border flex items-center justify-center">
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

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-sm text-muted-foreground">
              تفاصيل الأرباح وحركة المحفظة موجودة داخل تبويب <span className="font-semibold text-foreground">المحفظة</span>.
            </CardContent>
          </Card>

          {isLoading && <div className="text-sm text-muted-foreground">جاري تحميل البيانات...</div>}
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  حسابات
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">{funnel?.signups ?? stats.doctorsRegistered ?? 0}</CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  نشط
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">{funnel?.activeSubscriptions ?? stats.doctorsActive ?? 0}</CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  تحويل
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">
                {(() => {
                  const signups = Number(funnel?.signups ?? stats.doctorsRegistered ?? 0)
                  const active = Number(funnel?.activeSubscriptions ?? stats.doctorsActive ?? 0)
                  if (!signups) return "0%"
                  return `${Math.round((active / signups) * 100)}%`
                })()}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <ReceiptText className="size-4 text-primary" />
                  باقات
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">{Array.isArray(funnel?.plans) ? funnel.plans.reduce((a, p) => a + Number(p.count || 0), 0) : 0}</CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="size-4 text-primary" />
                  المحفظة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border rounded-[var(--radius)] p-4">
                    <div className="text-xs text-muted-foreground">متاح للسحب</div>
                    <div className="text-xl font-bold mt-1">{formatEgp(walletSummary.availableToWithdraw)}</div>
                  </div>
                  <div className="bg-white border rounded-[var(--radius)] p-4">
                    <div className="text-xs text-muted-foreground">قيد الاعتماد</div>
                    <div className="text-xl font-bold mt-1">{formatEgp(walletSummary.pending)}</div>
                  </div>
                  <div className="bg-white border rounded-[var(--radius)] p-4">
                    <div className="text-xs text-muted-foreground">إجمالي أرباحك</div>
                    <div className="text-xl font-bold mt-1">{formatEgp(walletSummary.total)}</div>
                  </div>
                </div>

                <div className="bg-white border rounded-[var(--radius)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">نسبة الشريك الحالية</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        تعتمد على عدد الأطباء النشطين (Starter / Growth / Pro Partner)
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {(currentRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" />
                  يتم اعتماد العمولة بعد 14 يوم كفترة أمان لمنع التلاعب.
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button disabled={true} className="w-full sm:w-auto">
                    طلب سحب
                  </Button>
                  <Button variant="outline" disabled={true} className="w-full sm:w-auto">
                    إعدادات الدفع
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="size-4 text-primary" />
                  كيف تزيد دخلك؟
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white border rounded-[var(--radius)] p-4">
                  <div className="text-sm font-semibold text-foreground">هدف سريع</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    اوصل لـ 5 أطباء نشطين للترقية إلى Growth وزيادة النسبة.
                  </div>
                </div>
                <div className="bg-white border rounded-[var(--radius)] p-4">
                  <div className="text-sm font-semibold text-foreground">نصيحة</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    استخدم زر مشاركة الرابط + QR مع أطباء العيادات والطلاب والصيادلة.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
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
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
