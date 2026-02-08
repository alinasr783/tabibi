import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../../services/apiTabibiApps";
import useClinic from "../../auth/useClinic";
import { APPS_COMPONENT_REGISTRY } from "../appsRegistry";
import { Loader2 } from "lucide-react";

export default function IntegrationGuard({ target, children }) {
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;

  const { data: installedApps = [], isLoading } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) {
    // Return children while loading to avoid layout shift, 
    // or return a loader if strict consistency is required.
    // For "replacement", usually we want to wait to see if we should replace.
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const integratedApp = installedApps.find(app => 
    app.integration_type === 'full' && 
    app.integration_target === target && 
    app.isIntegrated
  );

  if (integratedApp) {
    const Component = APPS_COMPONENT_REGISTRY[integratedApp.component_key];
    if (Component) {
        return (
            <div className="integrated-app-view animate-in fade-in duration-300">
                <Component />
            </div>
        );
    }
  }

  return children;
}
