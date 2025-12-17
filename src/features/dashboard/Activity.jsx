import { CalendarDays, User, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import Pagination from "../../components/ui/pagination";
import { SkeletonLine } from "../../components/ui/skeleton";
import { ACTIVITY_PAGE_SIZE } from "../../constants/pagination";
import useRecentActivity from "./useRecentActivity";
import { useNavigate } from "react-router-dom";

function Item({icon: Icon, title, time, tag, isLoading, onClick}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-[calc(var(--radius)-6px)] bg-muted animate-pulse" />
          <div className="space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-2 w-16" />
          </div>
        </div>
        <SkeletonLine className="h-5 w-12" />
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between gap-3 py-2 cursor-pointer hover:bg-accent/50 rounded-[var(--radius)] p-2 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-[calc(var(--radius)-6px)] bg-muted text-foreground grid place-items-center">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{time}</div>
        </div>
      </div>
      {tag ? <Badge className="bg-primary/10 text-primary">{tag}</Badge> : null}
    </div>
  );
}

export default function Activity() {
  const [page, setPage] = useState(1);
  const {data: activities, isLoading} = useRecentActivity(
    page,
    ACTIVITY_PAGE_SIZE
  );
  const navigate = useNavigate();

  // Calculate total pages
  const totalPages =
    activities && activities.count
      ? Math.ceil(activities.count / ACTIVITY_PAGE_SIZE)
      : 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">نشاطك السريع</h3>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {isLoading
            ? Array.from({length: 3}).map((_, i) => (
                <Item key={i} isLoading={true} />
              ))
            : activities && activities.data && activities.data.length > 0
            ? activities.data.map((activity) => (
                <Item
                  key={activity.id}
                  icon={CalendarDays}
                  title={activity.title}
                  time={activity.time}
                  tag={activity.tag}
                  onClick={() => {
                    // Navigate to specific appointment if it's an appointment activity
                    if (activity.type === 'appointment' && activity.appointmentId) {
                      navigate(`/appointments/${activity.appointmentId}`);
                    } else {
                      navigate('/appointments');
                    }
                  }}
                />
              ))
            : (
                <Item
                  icon={CalendarDays}
                  title="مفيش أنشطة حديثة"
                  time="الآن"
                />
              )}
        </div>

        {/* Pagination */}
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}