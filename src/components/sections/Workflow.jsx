import { CheckCircle2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "../../features/auth/AuthContext"
import { Button } from "../ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card"

export default function Workflow() {
  const { user, isLoading } = useAuth()

  return (
    <section id="workflow" className="container py-20">
      <Card>
        <CardHeader className="text-center">
          <h2 className="text-2xl font-bold">سير عمل بسيط</h2>
          <p className="text-muted-foreground">من الاستقبال إلى الفوترة بخطوات واضحة.</p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold">استقبال وتنظيم</h3>
            <p className="text-sm text-muted-foreground">إدارة مواعيد وحجوزات المرضى مع إشعارات فورية.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">الملف الطبي</h3>
            <p className="text-sm text-muted-foreground">توثيق التشخيص والمرفقات ومتابعة التاريخ المرضي.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">الفوترة والتقارير</h3>
            <p className="text-sm text-muted-foreground">إصدار الفواتير وتحليل الإيرادات بشكل مبسط.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          {isLoading ? (
            // Show loading state
            <div className="h-12 w-40 bg-gray-200 rounded animate-pulse"></div>
          ) : user ? (
            // If user is authenticated, show "الدخول" button
            <Link to="/dashboard">
              <Button className="gap-2">
                <CheckCircle2 className="size-5" />
                الدخول
              </Button>
            </Link>
          ) : (
            // If user is not authenticated, show signup button
            <Link to="/signup">
              <Button className="gap-2">
                <CheckCircle2 className="size-5" />
                جرّبه الآن
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </section>
  )
}