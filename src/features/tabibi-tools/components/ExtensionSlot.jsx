import { useQuery } from "@tanstack/react-query";
import { getInstalledApps } from "../../../services/apiTabibiApps";
import useClinic from "../../auth/useClinic";
import { APPS_COMPONENT_REGISTRY } from "../appsRegistry";

export default function ExtensionSlot({ name, context = {} }) {
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const extensions = installedApps.filter(app => 
    app.integration_type === 'partial' && 
    app.integration_target === name && 
    app.isIntegrated
  );

  if (extensions.length === 0) return null;

  return (
    <div className="extension-slot w-full flex flex-col gap-4 animate-in fade-in duration-500">
      {extensions.map(app => {
        const Component = APPS_COMPONENT_REGISTRY[app.component_key];
        if (!Component) return null;
        return (
            <div key={app.id} className="extension-wrapper border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm">
                <Component context={context} />
            </div>
        );
      })}
    </div>
  );
}
