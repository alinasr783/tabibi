import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Check, X, Trash2, Filter, Search, Eye, 
  Calendar, User, CreditCard, FileText, Settings, 
  ChevronDown, ExternalLink, RefreshCw, Wallet, Smartphone,
  Info, Globe
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useNotifications, useNotificationActions, useNotificationStats } from "./useNotifications";

// --- Utility: Egyptian Date Formatter ---
const formatEgyptianDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  
  // Reset hours for accurate date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true })
    .replace('ص', 'صباحاً').replace('م', 'مساءً');
  
  if (targetDate.getTime() === today.getTime()) {
    return `النهاردة الساعة ${time}`;
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return `امبارح الساعة ${time}`;
  }
  
  const days = ['الاحد', 'الاتنين', 'التلات', 'الاربع', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  return `يوم ${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} الساعة ${time}`;
};

// --- Utility: Action Buttons Parser ---
const parseActionButtons = (buttons) => {
  if (!buttons) return [];
  if (Array.isArray(buttons)) return buttons;
  if (typeof buttons === 'string') {
    try {
      const parsed = JSON.parse(buttons);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse action_buttons", e);
      return [];
    }
  }
  return [];
};

// --- Components ---

const NotificationIcon = ({ type }) => {
  const styles = {
    appointment: { icon: Calendar },
    online_appointment: { icon: Calendar },
    payment: { icon: CreditCard },
    wallet: { icon: Wallet },
    app: { icon: Smartphone },
    reminder: { icon: Bell },
    subscription: { icon: FileText },
    patient: { icon: User },
    system: { icon: Settings },
    alert: { icon: Bell },
    info: { icon: Info },
  };

  const style = styles[type] || { icon: Bell };
  const Icon = style.icon;

  return (
    <div className="p-2 rounded-full shrink-0 bg-stone-800">
      <Icon className="h-5 w-5 text-primary" />
    </div>
  );
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("week"); // week, month, 3months
  const [activeFilter, setActiveFilter] = useState(null); // null, 'total', 'unread'

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading,
    refetch 
  } = useNotifications();

  const { data: stats } = useNotificationStats();
  const { markAsRead, deleteNotification, markAllAsRead } = useNotificationActions();

  const allNotifications = useMemo(() => {
    return data?.pages.flatMap(page => page.notifications) || [];
  }, [data]);

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

  const handleDoubleClick = (e, id) => {
    e.stopPropagation(); // Prevent opening modal
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
        <div className="flex gap-2 w-full sm:w-auto">
           <Button variant="outline" onClick={() => markAllAsRead()} className="gap-2 w-full sm:w-auto">
             <Check className="h-4 w-4" />
             تحديد الكل كمقروء
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'total' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`}
          onClick={() => setActiveFilter(prev => prev === 'total' ? null : 'total')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الاشعارات</p>
              <p className={`text-2xl font-bold ${activeFilter === 'total' ? 'text-primary' : ''}`}>{stats?.total || 0}</p>
            </div>
            <Bell className={`h-8 w-8 ${activeFilter === 'total' ? 'text-primary' : 'text-primary/20'}`} />
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${activeFilter === 'unread' ? 'border-orange-500 bg-orange-50' : 'hover:bg-accent/50'}`}
          onClick={() => setActiveFilter(prev => prev === 'unread' ? null : 'unread')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">غير مقروءة</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.unread || 0}</p>
            </div>
            <div className={`h-2 w-2 rounded-full ${stats?.unread > 0 ? 'bg-orange-500 animate-pulse' : 'bg-gray-300'}`} />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-card p-1 rounded-lg border shadow-sm overflow-x-auto">
        <Tabs value={filterPeriod} onValueChange={setFilterPeriod} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="week">آخر أسبوع</TabsTrigger>
            <TabsTrigger value="month">آخر شهر</TabsTrigger>
            <TabsTrigger value="3months">آخر 3 شهور</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 min-h-[300px]">
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
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              onDoubleClick={(e) => handleDoubleClick(e, notification.id)}
              className={`
                group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none
                ${notification.is_read ? 'bg-card hover:bg-accent/50 border-transparent' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}
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
                {notification.action_buttons && Array.isArray(notification.action_buttons) && notification.action_buttons.length > 0 ? (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {notification.action_buttons.map((btn, idx) => (
                      <Button 
                        key={idx}
                        size="sm" 
                        variant={btn.variant || "outline"} 
                        className="h-8 text-xs gap-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = btn.link;
                        }}
                      >
                        {btn.text}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                ) : notification.action_link && (
                   <div className="pt-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={(e) => {
                        e.stopPropagation();
                        navigate(notification.action_link);
                      }}>
                        {notification.action_text || "عرض التفاصيل"}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                   </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4 pb-8">
          <Button 
            variant="ghost" 
            onClick={() => fetchNextPage()} 
            disabled={isFetchingNextPage}
            className="w-full md:w-auto"
          >
            {isFetchingNextPage ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            عرض المزيد
          </Button>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-[500px] text-right p-0 overflow-hidden gap-0" dir="rtl">
          
          {/* Header Actions */}
          <div className="absolute left-4 top-4 flex items-center gap-2 z-50">
             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                onClick={() => {
                    deleteNotification(selectedNotification.id);
                    setSelectedNotification(null);
                }}
                title="حذف الاشعار"
             >
                <Trash2 className="h-4 w-4" />
             </Button>
             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => setSelectedNotification(null)}
             >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
             </Button>
          </div>

          <DialogHeader className="p-6 pb-2 text-right space-y-4">
            <div className="flex items-center gap-3 pr-8">
              <NotificationIcon type={selectedNotification?.type} />
              <DialogTitle className="text-xl leading-normal">{selectedNotification?.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-1">
              <Calendar className="h-4 w-4" />
              <span>{formatEgyptianDate(selectedNotification?.created_at)}</span>
            </div>
          </DialogHeader>

          <div className="p-6 pt-2 overflow-y-auto max-h-[60vh]">
            {selectedNotification?.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden border bg-muted/20">
                    <img 
                        src={selectedNotification.image_url} 
                        alt="Notification" 
                        className="w-full h-auto max-h-[300px] object-contain mx-auto"
                    />
                </div>
            )}
            <p className="text-base leading-loose text-foreground/90 whitespace-pre-wrap">
              {selectedNotification?.message}
            </p>
          </div>

          {(selectedNotification?.action_buttons || selectedNotification?.action_link) && (
            <DialogFooter className="p-6 pt-0 flex-col sm:flex-row gap-2 sm:justify-start">
                {(() => {
                const actions = parseActionButtons(selectedNotification?.action_buttons);
                if (actions.length > 0) {
                    return actions.map((btn, idx) => (
                    <Button 
                        key={idx}
                        variant={btn.variant || "default"}
                        onClick={() => {
                        if (btn.link) {
                            if (btn.link.startsWith('http')) {
                            window.open(btn.link, '_blank');
                            } else {
                            navigate(btn.link);
                            }
                            setSelectedNotification(null);
                        }
                        }} 
                        className="w-full sm:w-auto"
                    >
                        {btn.text}
                    </Button>
                    ));
                } else if (selectedNotification?.action_link) {
                    return (
                    <Button 
                        onClick={() => {
                        if (selectedNotification.action_link) {
                            if (selectedNotification.action_link.startsWith('http')) {
                            window.open(selectedNotification.action_link, '_blank');
                            } else {
                            navigate(selectedNotification.action_link);
                            }
                            setSelectedNotification(null);
                        }
                        }} 
                        className="w-full sm:w-auto"
                    >
                        {selectedNotification.action_text || "عرض التفاصيل"}
                    </Button>
                    );
                }
                return null;
                })()}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}