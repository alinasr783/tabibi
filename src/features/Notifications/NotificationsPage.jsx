import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Check, RefreshCw, ChevronDown, Eye, Calendar, ExternalLink, AlertTriangle
} from "lucide-react";
import { OpenRouter } from "@openrouter/sdk";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useNotifications, useNotificationActions, useNotificationStats } from "./useNotifications";
import { NotificationIcon, formatEgyptianDate, parseActionButtons } from "./notificationUtils";
import { NotificationDetailDialog } from "./NotificationDetailDialog";

const AiSummaryRenderer = ({ content, navigate }) => {
  if (!content) return null;

  return (
    <div className="space-y-2 text-sm leading-relaxed font-medium" dir="rtl">
      {content.split('\n').map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Check for ALERT
        if (trimmed.startsWith('{{ALERT}}')) {
          const alertText = trimmed.replace('{{ALERT}}', '').trim();
          return (
            <div key={idx} className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-2 text-red-700 dark:text-red-400 rounded-l-md flex items-start gap-2 my-1 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{alertText}</span>
            </div>
          );
        }

        return (
          <div key={idx} className="text-foreground/90">
             {line}
          </div>
        );
      })}
    </div>
  );
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("week"); // week, month, 3months
  const [activeFilter] = useState(null); // null, 'total', 'unread'
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading
  } = useNotifications();

  useNotificationStats();
  const { markAsRead, deleteNotification, markAllAsRead } = useNotificationActions();

  const allNotifications = useMemo(() => {
    return data?.pages.flatMap(page => page.notifications) || [];
  }, [data]);

  const unreadNotifications = useMemo(() => {
    return allNotifications.filter(n => !n.is_read);
  }, [allNotifications]);

  // Load summary from local storage on mount
  useEffect(() => {
    const savedSummary = localStorage.getItem('tabibi_ai_notification_summary');
    if (savedSummary) {
      setAiSummary(savedSummary);
    }
  }, []);

  useEffect(() => {
    const f = JSON.stringify(unreadNotifications.map(n => `${n.id}-${n.created_at}`));
    if (fingerprint && fingerprint !== f) {
      setAiSummary("");
      setAiError("");
      localStorage.removeItem('tabibi_ai_notification_summary');
    }
    setFingerprint(f);
  }, [unreadNotifications, fingerprint]);

  const handleSummarize = async () => {
    try {
      setAiError("");
      setAiLoading(true);
      setAiSummary(""); // Clear previous summary

      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        setAiError("من فضلك ضيف VITE_OPENROUTER_API_KEY في إعدادات البيئة");
        setAiLoading(false);
        return;
      }

      const lines = unreadNotifications.map((n, i) => {
        const t = n.type || "notification";
        const title = n.title || "";
        const msg = n.message || "";
        return `#${i + 1} [${t}] ${title} — ${msg}`;
      }).join("\n");

      const prompt = [
        "أنت مساعد شخصي للدكتور. لخص الإشعارات في رسالة واتساب قصيرة جداً ومنسقة.",
        "القواعد:",
        "1. ادخل في التفاصيل فوراً بدون مقدمات.",
        "2. جمع الإشعارات المتشابهة (مثلاً: 'عندك 3 حجوزات جديدة' بدل ما تذكرهم واحد واحد).",
        "3. استخدم الإيموجي المعبرة (📅، 💰، ⚠️) كبداية للسطر.",
        "4. خليك 'مختصر مفيد' جداً.",
        "5. لو فيه تنبيه هام جداً، ابدأ السطر بـ {{ALERT}}",
        "",
        "الإشعارات:",
        lines
      ].join("\n");

      const openrouter = new OpenRouter({
        apiKey: apiKey
      });

      const stream = await openrouter.chat.send({
        chatGenerationParams: {
          model: "stepfun/step-3.5-flash:free",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: true
        }
      });

      let response = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          response += content;
          setAiSummary(prev => prev + content);
        }
      }
      
      localStorage.setItem('tabibi_ai_notification_summary', response);

    } catch (err) {
      console.error("AI Summary Error:", err);
      setAiError("حصلت مشكلة أثناء التلخيص. حاول تاني.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    setAiSummary("");
    localStorage.removeItem('tabibi_ai_notification_summary');
  };

  const filteredNotifications = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    
    // Default to show all if "all" or specific period logic
    // But user asked for filters: Last Week, Last Month, Last 3 Months
    // And "Last 20 notifications" default. 
    // Filtering client side might hide the 20 fetched if they are old.
    // However, assuming the most recent 20 are relevant to "Last Week" usually.
    // If user selects "Last 3 Months", they might expect more data. 
    // But I will stick to filtering the *loaded* data for UI consistency as requested.
    
    if (filterPeriod === "week") cutoff.setDate(now.getDate() - 7);
    if (filterPeriod === "month") cutoff.setMonth(now.getMonth() - 1);
    if (filterPeriod === "3months") cutoff.setMonth(now.getMonth() - 3);

    return allNotifications.filter(n => {
      const dateMatch = new Date(n.created_at) >= cutoff;
      const unreadMatch = activeFilter === 'unread' ? !n.is_read : true;
      return dateMatch && unreadMatch;
    });
  }, [allNotifications, filterPeriod, activeFilter]);

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const handleDoubleClick = (_unused, id) => {
    deleteNotification(id);
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الاشعارات</h1>
            <p className="text-sm text-muted-foreground">تابع كل ما يخص عيادتك ومرضاك</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filterPeriod} onValueChange={setFilterPeriod} className="w-full mb-4 sm:mb-6" style={{ direction: 'rtl' }}>
        <TabsList className="grid grid-cols-3 w-full h-auto p-1 sm:p-1.5 bg-muted/50 rounded-[var(--radius)]">
          <TabsTrigger 
            value="week" 
            className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>آخر أسبوع</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="month" 
            className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>آخر شهر</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="3months" 
            className="text-xs sm:text-sm py-2.5 sm:py-3 px-2 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>آخر 3 شهور</span>
            </div>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* AI Summary */}
      <div className="w-full space-y-4">
        <div className="rounded-xl border border-primary/20 bg-card/50 p-4 sm:p-5">
          <div className={`flex items-center justify-between ${(aiSummary || aiError) ? 'mb-3' : ''}`}>
            <h3 className="text-base sm:text-lg font-bold">ملخص اشعاراتك من Tabibi AI</h3>
            <Button 
              onClick={handleSummarize} 
              disabled={aiLoading || unreadNotifications.length === 0}
              className="h-9"
              variant="default"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  بيُلخّص...
                </>
              ) : (
                "لخصلي اشعاراتي"
              )}
            </Button>
          </div>
          {aiError && (
            <div className="text-sm text-red-600 mb-2">{aiError}</div>
          )}
          {aiSummary ? (
            <div className="p-4 rounded-xl border border-primary/20 bg-card/50 shadow-sm transition-all duration-300">
              <AiSummaryRenderer content={aiSummary} navigate={navigate} />
            </div>
          ) : (
            null
          )}
        </div>
        
        {/* Mark All Read Button */}
        <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleMarkAllRead}
              disabled={unreadNotifications.length === 0}
              className="w-full sm:w-auto gap-2"
            >
              <Check className="w-4 h-4" />
              قرأت كل الاشعارات
            </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col min-h-[300px]">
        {isLoading && filteredNotifications.length === 0 ? (
           <div className="flex justify-center items-center py-10">
             <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
           </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed flex flex-col items-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">
              {activeFilter === 'unread' ? 'مفيش اشعارات غير مقروءة' : 'مفيش اشعارات في الفترة دي'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {activeFilter === 'unread' ? 'كل الاشعارات اتقرت، عاش يا دكتور' : 'جرب تغير الفلتر او استنى اشعارات جديدة'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => (
            <div key={notification.id} className="flex flex-col">
              <div
                onClick={() => handleNotificationClick(notification)}
                onDoubleClick={(e) => handleDoubleClick(e, notification.id)}
                className={`
                  group relative flex items-start gap-4 p-4 rounded-lg transition-all duration-200 cursor-pointer select-none
                  ${notification.is_read ? 'bg-card hover:bg-accent/50' : 'bg-primary/5 hover:bg-primary/10'}
                `}
              >
                <NotificationIcon type={notification.type} />
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-base font-semibold ${notification.is_read ? '' : 'text-primary'}`}>
                      {notification.title}
                    </h4>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-1">
                      <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatEgyptianDate(notification.created_at)}
                      </p>
                      {notification.image_url && (
                          <span className="text-xs text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                              <Eye className="h-3 w-3" />
                              مرفق صورة
                          </span>
                      )}
                  </div>

                  {/* Action Buttons Rendering */}
                  {(() => {
                    const actions = parseActionButtons(notification.action_buttons);
                    if (actions && actions.length > 0) {
                      return (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {actions.map((btn, idx) => (
                            <Button 
                              key={idx}
                              size="sm" 
                              variant={btn.variant || "outline"} 
                              className="h-8 text-xs gap-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (btn.link) {
                                  if (btn.link.startsWith('http')) {
                                    window.open(btn.link, '_blank');
                                  } else {
                                    navigate(btn.link);
                                  }
                                }
                              }}
                            >
                              {btn.text}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      );
                    } else if (notification.action_link) {
                      return (
                         <div className="pt-2">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={(e) => {
                              e.stopPropagation();
                              if (notification.action_link.startsWith('http')) {
                                window.open(notification.action_link, '_blank');
                              } else {
                                navigate(notification.action_link);
                              }
                            }}>
                              {notification.action_text || "عرض التفاصيل"}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                         </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              {index < filteredNotifications.length - 1 && (
                <div className="w-full px-4">
                  <div className="border-b border-dashed border-border/50" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4 pb-8">
          <Button 
            variant="outline" 
            onClick={() => fetchNextPage()} 
            disabled={isFetchingNextPage}
            className="w-full md:w-auto gap-2"
          >
            {isFetchingNextPage ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            تحميل المزيد
          </Button>
        </div>
      )}

      {/* Details Modal */}
      <NotificationDetailDialog
        open={!!selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
        notification={selectedNotification}
        onDelete={(id) => {
          deleteNotification(id);
          setSelectedNotification(null);
        }}
      />
    </div>
  );
}
