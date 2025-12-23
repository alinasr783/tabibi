import { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, Check, X, Trash2, Filter, Search, Eye, Calendar, User, CreditCard, FileText, Settings } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Checkbox } from "../../components/ui/checkbox";
import { useNotifications, useNotificationActions } from "./useNotifications";

// Notification type icons mapping
const notificationIcons = {
  appointment: <Calendar className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  subscription: <FileText className="h-4 w-4" />,
  patient: <User className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
};

// Notification type labels mapping
const notificationLabels = {
  appointment: "حجز",
  payment: "دفع",
  reminder: "تذكير",
  subscription: "اشتراك",
  patient: "مريض",
  system: "نظام",
};

// Notification type variants for badges
const notificationVariants = {
  appointment: "default",
  payment: "success",
  reminder: "warning",
  subscription: "destructive",
  patient: "secondary",
  system: "outline",
};

// Format date for display
const formatDate = (date) => {
  if (isToday(date)) {
    return format(date, "h:mm a", { locale: ar });
  } else if (isYesterday(date)) {
    return "أمس";
  } else {
    return format(date, "d MMMM yyyy", { locale: ar });
  }
};

// Group notifications by date
const groupNotificationsByDate = (notifications) => {
  const groups = {};
  notifications.forEach(notification => {
    const dateKey = formatDate(new Date(notification.created_at));
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(notification);
  });
  return groups;
};

export default function NotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { markAsRead, markAsUnread, deleteNotifications, markAllAsRead } = useNotificationActions();

  // Filter notifications based on search term and selected types
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(notification.type);
      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, selectedTypes]);

  // Group filtered notifications by date
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  // Handle select all notifications
  useEffect(() => {
    if (selectAll) {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    } else {
      setSelectedNotifications([]);
    }
  }, [selectAll, JSON.stringify(filteredNotifications.map(n => n.id).sort())]);

  // Toggle notification selection
  const toggleNotificationSelection = useCallback((id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(notificationId => notificationId !== id)
        : [...prev, id]
    );
  }, []);

  // Toggle notification type filter
  const toggleTypeFilter = useCallback((type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  // Mark selected notifications as read
  const handleMarkAsRead = useCallback(async () => {
    try {
      if (selectedNotifications.length > 0) {
        await markAsRead(selectedNotifications);
        setSelectedNotifications([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, [markAsRead, selectedNotifications]);

  // Mark selected notifications as unread
  const handleMarkAsUnread = useCallback(async () => {
    try {
      if (selectedNotifications.length > 0) {
        await markAsUnread(selectedNotifications);
        setSelectedNotifications([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Failed to mark as unread:", error);
    }
  }, [markAsUnread, selectedNotifications]);

  // Delete selected notifications
  const handleDeleteNotifications = useCallback(async () => {
    try {
      if (selectedNotifications.length > 0) {
        await deleteNotifications(selectedNotifications);
        setSelectedNotifications([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Failed to delete notifications:", error);
    }
  }, [deleteNotifications, selectedNotifications]);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [markAllAsRead]);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-background min-h-screen pb-20 md:pb-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
            <p className="text-sm text-muted-foreground">شوف كل التنبيهات</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleMarkAllAsRead}
          className="gap-2 h-9"
        >
          <Check className="h-4 w-4" />
          خلاص كله مقروء
        </Button>
      </div>

      {/* Controls */}
      <Card className="bg-card/70">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="دور في الإشعارات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  تصفية
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {Object.entries(notificationLabels).map(([type, label]) => (
                  <DropdownMenuItem 
                    key={type} 
                    onSelect={() => toggleTypeFilter(type)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {notificationIcons[type]}
                      <span>{label}</span>
                    </div>
                    <Checkbox 
                      checked={selectedTypes.includes(type)} 
                      onCheckedChange={() => toggleTypeFilter(type)}
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Active Filters */}
          {selectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTypes.map(type => (
                <Badge 
                  key={type} 
                  variant="secondary" 
                  className="gap-1 pl-2 pr-1 py-1"
                >
                  {notificationLabels[type]}
                  <button 
                    onClick={() => toggleTypeFilter(type)}
                    className="rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTypes([])}
                className="h-6 px-2 text-xs"
              >
                امسح كله
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-blue-700">
                في {selectedNotifications.length} إشعار مختار
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkAsRead}
                  className="gap-1 h-8"
                >
                  <Check className="h-4 w-4" />
                  مقروء
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMarkAsUnread}
                  className="gap-1 h-8"
                >
                  <Bell className="h-4 w-4" />
                  مش مقروء
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteNotifications}
                  className="gap-1 h-8 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse bg-card/70">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-muted h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedNotifications).length === 0 ? (
          // Empty state
          <Card className="bg-card/70">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">مفيش إشعارات</h3>
              <p className="text-muted-foreground">هتظهر الإشعارات هنا لما تيجي</p>
            </CardContent>
          </Card>
        ) : (
          // Notifications grouped by date
          Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date} className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground px-2">{date}</div>
              <div className="space-y-2">
                {dateNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`transition-all duration-200 bg-card/70 ${
                      !notification.is_read 
                        ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10" 
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Select checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedNotifications.includes(notification.id)}
                            onCheckedChange={() => toggleNotificationSelection(notification.id)}
                          />
                        </div>
                        
                        {/* Icon */}
                        <div className={`p-2 rounded-full ${
                          !notification.is_read 
                            ? "bg-blue-500/10 text-blue-600" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {notificationIcons[notification.type]}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-sm font-medium ${
                                  !notification.is_read ? "text-blue-700" : "text-foreground"
                                }`}>
                                  {notification.title}
                                </h3>
                                <Badge variant={notificationVariants[notification.type]}>
                                  {notificationLabels[notification.type]}
                                </Badge>
                              </div>
                              <p className={`text-sm ${
                                !notification.is_read ? "text-blue-600" : "text-muted-foreground"
                              }`}>
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.is_read && (
                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              )}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(notification.created_at), "h:mm a", { locale: ar })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 gap-1 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                              عرض التفاصيل
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteNotifications([notification.id])}
                              className="h-7 gap-1 text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                              حذف
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}