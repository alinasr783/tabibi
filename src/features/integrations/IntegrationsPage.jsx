import { Share2, Calendar, CheckSquare, Users, Trash2, ExternalLink, ChevronDown, Activity } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { linkGoogleAccount } from "../../services/apiAuth";
import { saveIntegrationTokens, getIntegration, syncInitialAppointments } from "../../services/integrationService";
import { useSearchParams } from "react-router-dom";
import supabase from "../../services/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState(null);
  const [integrations, setIntegrations] = useState([
    {
      id: "google-calendar",
      title: "Calendar",
      description: "اول ما يحصل حجز في tabibi سواء من النت او من العيادة هيتم اضافته في نفس الوقت المحدد في الحجز في الكالندر الخاصة بيه وهيتم ارسال اشعار ليك قبل الحجز بنص ساعة",
      iconUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
      scope: "https://www.googleapis.com/auth/calendar",
      bgColor: "bg-primary/10",
      connected: false,
      isComingSoon: false,
    },
    {
      id: "google-tasks",
      title: "Tasks",
      description: "هيتم اضافة الحجوزات اللي بتحصل في tabibi سواء من النت او من العياده ك مهام في تطبيق google tasks بشكل مباشر",
      iconUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Google_Tasks_2021.svg",
      scope: "https://www.googleapis.com/auth/tasks",
      bgColor: "bg-primary/10",
      connected: false,
      isComingSoon: true,
    },
    {
      id: "google-contacts",
      title: "Contacts",
      description: "اول ما يتم اضافة مريض جديد هيتم مزامنة اسم ورقم موبيل المريض ضمن جهات الاتصال فورا واضافة وسم مريض ليه",
      iconUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Google_Contacts_icon_%282022%29.svg",
      scope: "https://www.googleapis.com/auth/contacts",
      bgColor: "bg-primary/10",
      connected: false,
      isComingSoon: true,
    },
    {
      id: "vezeeta",
      title: "Vezeeta",
      description: "اول ما يحصل حجز في حسابك في Vezeeta هيوصل ل tabibi مباشرة بدون اي تدخل منك والحجز هيدخل في ال workflow الخاص ب Tabibi",
      iconUrl: "https://play-lh.googleusercontent.com/ttLkUcwcja5-8YAhk1ndWbPEglgdoCjs2tEDEOXsd09uq6WuIL-GjWRn_a7HVJbpN06Q",
      scope: "",
      bgColor: "bg-primary/10",
      connected: false,
      isComingSoon: true,
    },
  ]);

  useEffect(() => {
    // Check initial status from DB
    const checkIntegrations = async () => {
      try {
        const cal = await getIntegration('calendar');
        const tasks = await getIntegration('tasks');
        const contacts = await getIntegration('contacts');
        // Mock Vezeeta check
        const vezeeta = await getIntegration('vezeeta').catch(() => null); 

        setIntegrations(prev => prev.map(i => {
          if (i.id === "google-calendar" && cal) return { ...i, connected: true };
          if (i.id === "google-tasks" && tasks) return { ...i, connected: true };
          if (i.id === "google-contacts" && contacts) return { ...i, connected: true };
          if (i.id === "vezeeta" && vezeeta) return { ...i, connected: true };
          return i;
        }));
      } catch (e) {
        console.error("Error loading integrations:", e);
      }
    };
    checkIntegrations();

    // Check if Env vars are set
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !import.meta.env.VITE_GOOGLE_CLIENT_SECRET) {
        console.error("Missing Google OAuth Credentials in .env");
        // toast.error("تنبيه: إعدادات Google OAuth ناقصة في ملف .env", { duration: 6000 });
    }

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

  const toggleIntegration = async (integration) => {
    if (integration.connected) {
        // Disconnect
        await handleDisconnect(integration);
    } else {
        // Connect
        await handleConnect(integration);
    }
  };

  const handleConnect = async (integration) => {
    if (integration.id === "vezeeta") {
        toast.success("تم تفعيل الربط مع Vezeeta");
        setIntegrations(prev => prev.map(i => {
            if (i.id === integration.id) return { ...i, connected: true };
            return i;
        }));
        return;
    }

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
         if (session && integration.id !== "vezeeta") {
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
          <p className="text-muted-foreground">اربط Tabibi مع باقي تطبيقاتك</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {integrations.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
                <Card 
                    key={item.id} 
                    className={`overflow-hidden transition-all duration-200 cursor-pointer ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${item.bgColor} flex items-center justify-center`}>
                                    <img src={item.iconUrl} alt={item.title} className="w-6 h-6 object-contain" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    {item.connected && (
                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            متصل الآن
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div onClick={(e) => e.stopPropagation()}>
                                    {item.isComingSoon ? (
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 whitespace-nowrap">
                                            قريبا ان شاء الله
                                        </Badge>
                                    ) : (
                                        <Switch
                                            checked={item.connected}
                                            onCheckedChange={() => toggleIntegration(item)}
                                        />
                                    )}
                                </div>
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-muted-foreground"
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </motion.div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-4 mt-4 border-t border-border">
                                        <h4 className="font-medium mb-2 text-sm text-primary">كيف يعمل الربط؟</h4>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Card>
            );
        })}
      </div>
    </div>
  );
}
