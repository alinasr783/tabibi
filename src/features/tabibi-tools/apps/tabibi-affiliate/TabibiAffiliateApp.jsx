import { useAuth } from "@/features/auth/AuthContext"
import AffiliateDashboardPage from "@/features/affiliate/AffiliateDashboardPage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function TabibiAffiliateApp() {
  const { user } = useAuth()

  if (user) return <AffiliateDashboardPage />

  return (
    <div dir="rtl" lang="ar" className="p-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Tabibi Affiliate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            التطبيق مخصص لشركاء التسويق بالعمولة. لإنشاء حساب Affiliate وبدء مشاركة رابط الإحالة، استخدم صفحة Affiliate.
          </p>
          <Button asChild>
            <Link to="/affiliate">فتح صفحة Affiliate</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
