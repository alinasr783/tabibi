import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../services/apiTabibiApps";
import useClinic from "../auth/useClinic";
import { Loader2, Zap, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { APPS_ICON_REGISTRY, APPS_COMPONENT_REGISTRY } from "../tabibi-tools/appsRegistry.jsx";

export default function MyAppsPage() {
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;
  const navigate = useNavigate();
  const [openAppId, setOpenAppId] = useState(null);

  const { data: installedApps = [], isLoading, error } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId
  });

  const toggleApp = (id) => {
    setOpenAppId(prev => prev === id ? null : id);
  };

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

      {/* Accordion List */}
      <div className="space-y-4 max-w-5xl mx-auto">
        {installedApps.map((app) => {
          const Icon = APPS_ICON_REGISTRY[app.icon_name] || Zap;
          const Component = APPS_COMPONENT_REGISTRY[app.component_key];
          const isOpen = openAppId === app.id;

          return (
            <div 
              key={app.id} 
              className={`border rounded-xl bg-card overflow-hidden transition-all duration-200 ${isOpen ? 'ring-2 ring-primary/20 shadow-lg' : 'shadow-sm'}`}
            >
              <button 
                onClick={() => toggleApp(app.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {app.image_url ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 border bg-muted">
                      <img src={app.image_url} alt={app.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`p-2.5 rounded-lg ${app.color} shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  )}
                  
                  <div className="text-right">
                    <h3 className="font-bold text-base md:text-lg text-foreground">{app.title}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm line-clamp-1">
                      {app.short_description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${app.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {app.status === 'active' ? 'مفعل' : 'غير مفعل'}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {isOpen && (
                <div className="border-t bg-background animate-in slide-in-from-top-2 duration-300">
                  <div className="p-4 md:p-6">
                    <div className="flex justify-end gap-2 mb-4">
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="gap-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/my-apps/${app.component_key}`);
                            }}
                        >
                            <ExternalLink className="h-4 w-4" />
                            فتح التطبيق
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tabibi-apps/${app.id}`);
                            }}
                        >
                            إعدادات التطبيق
                        </Button>
                    </div>
                    {Component ? (
                        <div className="border rounded-lg overflow-hidden min-h-[400px]">
                            <Component />
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>واجهة التطبيق غير متاحة حالياً</p>
                        </div>
                    )}
                  </div>
                </div>
              )}
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
