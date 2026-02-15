import { useParams, useNavigate } from "react-router-dom";
import { APPS_COMPONENT_REGISTRY } from "../tabibi-tools/appsRegistry.jsx";
import { Button } from "../../components/ui/button";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useClinic from "../auth/useClinic";
import { getInstalledApps } from "../../services/apiTabibiApps";
import AppActionBar from "../tabibi-tools/components/AppActionBar";

export default function MyAppViewer() {
  const { appKey } = useParams();
  const navigate = useNavigate();
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;

  const { data: installedApps = [], isLoading } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId
  });

  const currentApp = installedApps.find(app => app.component_key === appKey);
  const Component = APPS_COMPONENT_REGISTRY[appKey];

  if (!Component) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="bg-destructive/10 p-4 rounded-full text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">التطبيق غير موجود أو غير مدعوم حالياً</h2>
        <Button onClick={() => navigate("/my-apps")}>
          <ArrowRight className="h-4 w-4 ml-2" />
          عودة لتطبيقاتي
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Construct props for AppActionBar
  const appData = currentApp ? {
    id: currentApp.id,
    title: currentApp.title,
    price: currentApp.price,
    billing_period: currentApp.billing_period,
    integration_type: currentApp.integration_type,
    preview_link: currentApp.preview_link
  } : null;

  const subscriptionData = currentApp ? {
    isIntegrated: currentApp.isIntegrated,
    subscriptionId: currentApp.subscriptionId
  } : null;

  // Render the component
  return (
    <div className="w-full h-full relative">
      <div className={`animate-in fade-in duration-300 ${appKey === 'tabibi_profile' ? '' : 'pb-24'}`}>
        <Component />
      </div>
      
      {currentApp && appKey !== 'tabibi_profile' && appKey !== 'tabibi_affiliate' && (
        <AppActionBar 
          app={appData} 
          isInstalled={true} 
          subscription={subscriptionData}
        />
      )}
    </div>
  );
}
