import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "../apiAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, Ban, MapPin, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard({ clinicId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['booking-analytics', clinicId],
    queryFn: () => getAnalyticsSummary(clinicId),
    enabled: !!clinicId
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!data) return null;

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
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xl font-bold">{stat.value}</p>
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
                <BarChart data={data.topLocations} layout="vertical" margin={{ right: 20, left: 10 }}>
                  <XAxis type="number" hide reversed />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={110} 
                    tick={{fontSize: 12}} 
                    orientation="right"
                  />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#1AA19C" radius={[4, 0, 0, 4]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
