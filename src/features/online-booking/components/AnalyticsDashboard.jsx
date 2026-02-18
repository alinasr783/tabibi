import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "../apiAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Ban, MapPin, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SkeletonLine } from "@/components/ui/skeleton";

export default function AnalyticsDashboard({ clinicId }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['booking-analytics', clinicId],
    queryFn: () => getAnalyticsSummary(clinicId),
    enabled: !!clinicId
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/70">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                <Loader2 className="size-4 animate-spin" />
              </div>
              <div className="min-w-0 w-full">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-5 w-12 mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-10 text-center space-y-3">
          <div className="mx-auto size-10 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <Ban className="size-5" />
          </div>
          <div className="text-base font-semibold">تعذر تحميل الإحصائيات</div>
          <div className="text-sm text-muted-foreground">حاول مرة أخرى أو تحقق من الاتصال.</div>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            حاول تاني
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card/70">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          لا توجد بيانات متاحة حالياً.
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "عدد الزيارات",
      value: data.totalViews,
      icon: <Eye className="w-4 h-4 text-blue-600" />,
      color: "bg-blue-100"
    },
    {
      title: "حجوزات ناجحة",
      value: data.totalConversions,
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      color: "bg-green-100"
    },
    {
      title: "معدل التحويل",
      value: data.totalViews ? `${((data.totalConversions / data.totalViews) * 100).toFixed(1)}%` : "0%",
      icon: <CheckCircle className="w-4 h-4 text-purple-600" />,
      color: "bg-purple-100"
    },
    {
      title: "محاولات محظورة",
      value: data.totalBlocked,
      icon: <Ban className="w-4 h-4 text-red-600" />,
      color: "bg-red-100"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card/70">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="size-8 rounded-[calc(var(--radius)-4px)] bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{stat.title}</div>
                <div className="text-lg font-semibold truncate">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              أعلى المناطق الجغرافية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topLocations} margin={{ top: 10, right: 10, left: 10, bottom: 28 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#1AA19C" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
