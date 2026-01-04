import { Share2, Calendar, CheckSquare, Users, Trash2, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { linkGoogleAccount } from "../../services/apiAuth";
import { saveIntegrationTokens, getIntegration, syncInitialAppointments } from "../../services/integrationService";
import { useSearchParams } from "react-router-dom";
import supabase from "../../services/supabase";

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState([
    {
      id: "google-calendar",
      title: "Google Calendar",
      description: "هنحطلك كل حجوزاتك في الكالندر وهيجيلك اشعار علي موبيلك علي كل حجز",
      icon: Calendar,
      scope: "https://www.googleapis.com/auth/calendar",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      connected: false,
    },
    {
      id: "google-tasks",
      title: "Google Tasks",
      description: "إدارة المهام والمتابعة عبر مهام جوجل مباشرة",
      icon: CheckSquare,
      scope: "https://www.googleapis.com/auth/tasks",
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      connected: false,
    },
    {
      id: "google-contacts",
      title: "Google Contacts",
      description: "مع كل مريض بيضاف هنضيف جهة اتصال جديدة باسم ورقم المريض ده",
      icon: Users,
      scope: "https://www.googleapis.com/auth/contacts",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      connected: false,
    },
  ]);

  useEffect(() => {
    // Check initial status from DB
    const checkIntegrations = async () => {
      try {
        const cal = await getIntegration('calendar');
        const tasks = await getIntegration('tasks');
        const contacts = await getIntegration('contacts');

        setIntegrations(prev => prev.map(i => {
          if (i.id === "google-calendar" && cal) return { ...i, connected: true };
          if (i.id === "google-tasks" && tasks) return { ...i, connected: true };
          if (i.id === "google-contacts" && contacts) return { ...i, connected: true };
          return i;
        }));
      } catch (e) {
        console.error("Error loading integrations:", e);
      }
    };
    checkIntegrations();

    // Handle OAuth Callback
    const handleCallback = async () => {
        const pendingId = localStorage.getItem("pending_integration");
        const isGoogleCallback = searchParams.get("google_auth_callback") === "true";
        console.log("OAuth callback detected:", { pendingId, isGoogleCallback });
        
        // Supabase puts the tokens in the URL hash, but the client library handles it automatically
        // We need to wait for the session to be established
        
        if (pendingId && isGoogleCallback) {
            try {
                // Wait for auth state change to ensure provider session is applied
                const waitForProviderSession = () => new Promise((resolve) => {
                    const timeoutId = setTimeout(() => resolve(null), 8000);
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        console.log("Auth event:", event, session?.user?.app_metadata?.provider);
                        if (session?.provider_token || session?.user?.app_metadata?.provider === 'google') {
                            clearTimeout(timeoutId);
                            subscription.unsubscribe();
                            resolve(session);
                        }
                    });
                });

                let { data: { session } } = await supabase.auth.getSession();
                if (!session?.provider_token || session?.user?.app_metadata?.provider !== 'google') {
                    session = await waitForProviderSession();
                }
                console.log("Session after OAuth:", { hasSession: !!session, provider: session?.user?.app_metadata?.provider, hasProviderToken: !!session?.provider_token });
                
                if (session?.provider_token) {
                    // We have the provider token!
                    console.log("Saving integration tokens...");
                    const saved = await saveIntegrationTokens({
                        access_token: session.provider_token,
                        refresh_token: session.provider_refresh_token,
                        scope: integrations.find(i => i.id === pendingId)?.scope || '',
                        expires_in: session.expires_in,
                    });
                    console.log("Integration tokens saved:", saved?.id);

                    let type = 'other';
                    if (pendingId === "google-calendar") type = 'calendar';
                    else if (pendingId === "google-tasks") type = 'tasks';
                    else if (pendingId === "google-contacts") type = 'contacts';

                    const confirmed = await getIntegration(type);
                    console.log("Integration confirmation:", { type, hasAccess: !!confirmed?.access_token });
                    if (confirmed?.access_token) {
                        toast.success("تم الربط وحفظ الصلاحيات بنجاح!");
                        setIntegrations(prev => prev.map(i => {
                            if (i.id === pendingId) return { ...i, connected: true };
                            return i;
                        }));
                    } else {
                        console.error("Integration not confirmed after save");
                        toast.error("حدث خطأ أثناء تأكيد الربط");
                    }

                    // Initial Sync for Calendar
                    if (pendingId === "google-calendar") {
                        toast.loading("جاري مزامنة المواعيد المستقبلية...", { id: "sync-toast" });
                        try {
                            const syncResult = await syncInitialAppointments();
                            console.log("Sync result:", syncResult);
                            if (syncResult.success) {
                                toast.success(`تمت المزامنة: ${syncResult.count} موعد`, { id: "sync-toast" });
                            } else {
                                toast.error("حدث خطأ أثناء المزامنة", { id: "sync-toast" });
                            }
                        } catch (syncErr) {
                            console.error("Sync error:", syncErr);
                            toast.error("فشل في مزامنة المواعيد", { id: "sync-toast" });
                        }
                    }
                } else {
                    console.log("Session established but no provider_token found.");
                }

                // Clean up URL
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("google_auth_callback");
                setSearchParams(newParams);
                localStorage.removeItem("pending_integration");

            } catch (err) {
                console.error("Error saving integration:", err);
                toast.error("حدث خطأ أثناء حفظ الربط");
            }
        } else if (pendingId && !isGoogleCallback) {
             // User cancelled
             localStorage.removeItem("pending_integration");
        }
    };

    handleCallback();
  }, [searchParams, setSearchParams]);

  const handleConnect = async (integration) => {
    try {
      localStorage.setItem("pending_integration", integration.id);
      console.log("Starting link for integration:", integration.id, integration.scope);
      await linkGoogleAccount(integration.scope);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء محاولة الربط");
      localStorage.removeItem("pending_integration");
    }
  };

  const handleDisconnect = async (integration) => {
     try {
         // In a real app, we would call an API to delete the token from DB
         const { data: { session } } = await supabase.auth.getSession();
         if (session) {
             let type = 'other';
             if (integration.id.includes('calendar')) type = 'calendar';
             else if (integration.id.includes('tasks')) type = 'tasks';
             else if (integration.id.includes('contacts')) type = 'contacts';

             await supabase.from('integrations')
                 .update({ is_active: false })
                 .eq('user_id', session.user.id)
                 .eq('integration_type', type);
         }

         setIntegrations(prev => prev.map(i => {
             if (i.id === integration.id) return { ...i, connected: false };
             return i;
         }));
         toast.success(`تم إلغاء الربط مع ${integration.title}`);
     } catch (e) {
         console.error("Error disconnecting:", e);
         toast.error("فشل إلغاء الربط");
     }
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
       <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Share2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">التكاملات</h1>
          <p className="text-muted-foreground">اربط حسابك بخدمات جوجل لزيادة الإنتاجية</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {integrations.map((item) => {
            const Icon = item.icon;
            return (
                <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col gap-4">
                        {/* Top Row: Icon | Name | Button */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${item.bgColor} ${item.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    {item.connected && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1">
                                            متصل
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                {item.connected ? (
                                    <Button 
                                        variant="outline" 
                                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleDisconnect(item)}
                                    >
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        إلغاء الربط
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={() => handleConnect(item)}
                                    >
                                        <ExternalLink className="w-4 h-4 ml-2" />
                                        ربط الحساب
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Description */}
                        <div className="mr-16">
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    </div>
                </Card>
            );
        })}
      </div>
    </div>
  );
}
