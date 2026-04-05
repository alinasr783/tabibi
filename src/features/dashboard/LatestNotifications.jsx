import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, Clock, ChevronDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { SkeletonLine } from "../../components/ui/skeleton";
import { getNotifications } from "../../services/apiNotifications";
import { useNavigate } from "react-router-dom";

const typeMap = {
  appointment: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "موعد" },
  payment: { icon: Bell, color: "text-green-500", bg: "bg-green-500/10", label: "دفع" },
  reminder: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "تذكير" },
  subscription: { icon: Bell, color: "text-purple-500", bg: "bg-purple-500/10", label: "اشتراك" },
  patient: { icon: Bell, color: "text-primary", bg: "bg-primary/10", label: "مريض" },
  system: { icon: Bell, color: "text-gray-500", bg: "bg-gray-500/10", label: "نظام" },
};

export default function LatestNotifications() {
  const navigate = useNavigate();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ["notifications", "latest"],
    queryFn: ({ pageParam = 1 }) => getNotifications({ page: pageParam, pageSize: 5 }),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalCount / lastPage.pageSize);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const notifications = data?.pages.flatMap((page) => page.notifications) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">آخر الإشعارات</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) return null;

  return (
    <Card id="latest-notifications">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">آخر الإشعارات</h3>
          </div>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {notifications.length} إشعار
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="size-12 mx-auto mb-2 opacity-30 text-primary" />
            <p>مفيش إشعارات جديدة</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const typeInfo = typeMap[notification.type] || typeMap.system;
              const Icon = typeInfo.icon;
              
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-[var(--radius)] border border-border hover:bg-accent/50 transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                  onClick={() => {
                    if (notification.appointment_id) navigate(`/appointments/${notification.appointment_id}`);
                    else if (notification.patient_id) navigate(`/patients/${notification.patient_id}`);
                    else navigate('/notifications');
                  }}
                >
                  <div className={`size-10 rounded-full ${typeInfo.bg} ${typeInfo.color} grid place-items-center flex-shrink-0`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate text-sm">{notification.title}</div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {notification.created_at
                          ? format(new Date(notification.created_at), "hh:mm a", { locale: ar })
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground gap-2"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                عرض المزيد
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
