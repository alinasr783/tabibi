import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../services/apiTabibiApps";
import useClinic from "../auth/useClinic";
import { Loader2, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { APPS_ICON_REGISTRY } from "../tabibi-tools/appsRegistry.jsx";

export default function MyAppsPage() {
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;
  const navigate = useNavigate();

  const { data: installedApps = [], isLoading, error } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive">
        <p>حدث خطأ أثناء تحميل تطبيقاتك</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary fill-primary/20" />
          تطبيقاتي
        </h1>
        <p className="text-muted-foreground text-sm">
          إدارة واستخدام تطبيقاتك المفعلة
        </p>
      </div>

      {/* List */}
      <div className="space-y-4 max-w-5xl mx-auto">
        {installedApps.map((app) => {
          const Icon = APPS_ICON_REGISTRY[app.icon_name] || Zap;

          return (
            <div 
              key={app.id} 
              className="border rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/my-apps/${app.component_key}`)}
            >
              <div className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {app.image_url ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 border bg-muted group-hover:scale-105 transition-transform">
                      <img src={app.image_url} alt={app.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`p-2.5 rounded-lg ${app.color} shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  )}
                  
                  <div className="text-right">
                    <h3 className="font-bold text-base md:text-lg text-foreground group-hover:text-primary transition-colors">{app.title}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm line-clamp-1">
                      {app.short_description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {app.status === 'active' ? 'مفعل' : 'غير مفعل'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {installedApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Zap className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-xl mb-2">لا توجد تطبيقات مفعلة</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              قم بزيارة متجر تطبيقات طبيبي لتصفح وتفعيل الأدوات التي تساعدك في إدارة عيادتك
            </p>
            <Button onClick={() => navigate("/tabibi-apps")} size="lg">
              تصفح المتجر
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
