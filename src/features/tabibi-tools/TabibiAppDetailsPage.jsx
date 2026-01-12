import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppById, getInstalledApps, installApp, uninstallApp, incrementAppViews } from "../../services/apiTabibiApps";
import useClinic from "../auth/useClinic";
import { toast } from "react-hot-toast";
import { useEffect } from "react";

import AppHeader from "./components/AppHeader";
import AppHero from "./components/AppHero";
import AppScreenshots from "./components/AppScreenshots";
import AppFeatures from "./components/AppFeatures";
import AppDescription from "./components/AppDescription";
import AppActionBar from "./components/AppActionBar";

export default function TabibiAppDetailsPage() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clinic } = useClinic();
  const clinicId = clinic?.clinic_uuid;

  useEffect(() => {
    if (appId) {
      incrementAppViews(appId);
    }
  }, [appId]);

  const { data: app, isLoading: isLoadingApp } = useQuery({
    queryKey: ['tabibi_app', appId],
    queryFn: () => getAppById(appId),
  });

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed_apps', clinicId],
    queryFn: () => getInstalledApps(clinicId),
    enabled: !!clinicId
  });

  const subscription = installedApps.find(a => a.id === Number(appId) && a.status === 'active');
  const isInstalled = !!subscription;

  const installMutation = useMutation({
    mutationFn: () => installApp(clinicId, Number(appId)),
    onSuccess: () => {
      toast.success("تم تفعيل التطبيق بنجاح");
      queryClient.invalidateQueries(['installed_apps']);
    },
    onError: (err) => toast.error("فشل تفعيل التطبيق: " + err.message)
  });

  const uninstallMutation = useMutation({
    mutationFn: () => uninstallApp(clinicId, Number(appId)),
    onSuccess: () => {
      toast.success("تم إلغاء تفعيل التطبيق");
      queryClient.invalidateQueries(['installed_apps']);
    },
    onError: (err) => toast.error("فشل إلغاء التفعيل: " + err.message)
  });

  if (isLoadingApp) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4">التطبيق غير موجود</h2>
        <Button onClick={() => navigate("/tabibi-apps")}>عودة للتطبيقات</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 font-sans" dir="rtl">
      <AppHeader />
      
      <div className="flex flex-col w-full divide-y">
        <AppHero app={app} isInstalled={isInstalled} />
        <AppScreenshots app={app} />
        <AppFeatures app={app} />
        <AppDescription app={app} />
      </div>

      <AppActionBar 
        app={app} 
        isInstalled={isInstalled} 
        installMutation={installMutation} 
        uninstallMutation={uninstallMutation} 
      />
    </div>
  );
}
