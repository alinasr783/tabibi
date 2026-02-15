import { Link, Navigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Handshake, QrCode, Link2, Trophy } from "lucide-react"

export default function AffiliateEntry() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (user?.role === "affiliate") return <Navigate to="/affiliate/dashboard" replace />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <Card className="w-full max-w-2xl border-0 shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Handshake className="size-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Tabibi Affiliate</CardTitle>
          <p className="text-gray-600">
            رابط إحالة + QR + عمولة شهرية متكررة طالما الطبيب مشترك
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-[var(--radius)] border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Link2 className="size-4 text-primary" />
                رابط إحالة
              </div>
              <p className="mt-2 text-xs text-gray-600">نسخ ومشاركة في ثانية</p>
            </div>
            <div className="bg-white rounded-[var(--radius)] border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <QrCode className="size-4 text-primary" />
                QR تلقائي
              </div>
              <p className="mt-2 text-xs text-gray-600">سهل الاستخدام للأطباء</p>
            </div>
            <div className="bg-white rounded-[var(--radius)] border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Trophy className="size-4 text-primary" />
                Gamification
              </div>
              <p className="mt-2 text-xs text-gray-600">مستويات + شارات + أهداف</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild fullWidth={true}>
              <Link to="/signup">إنشاء حساب</Link>
            </Button>
            <Button asChild variant="outline" fullWidth={true}>
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
