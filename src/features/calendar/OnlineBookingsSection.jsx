import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, Smartphone, Eye, MoreHorizontal } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Mobile Card View Component for Bookings
const BookingCard = ({ booking, onStatusChange, onViewDetails }) => {
  const statusConfig = {
    pending: { label: "قيد الانتظار", variant: "secondary", icon: Clock, color: "text-amber-600" },
    confirmed: { label: "مؤكد", variant: "default", icon: CheckCircle, color: "text-green-600" },
    cancelled: { label: "ملغي", variant: "destructive", icon: XCircle, color: "text-red-600" }
  };

  const StatusIcon = statusConfig[booking.status]?.icon || Clock;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h4 className="font-bold text-gray-900 truncate">{booking.patient_name || "زائر"}</h4>
          </div>
          <p className="text-sm text-gray-500 truncate">{booking.patient_phone || "لا يوجد"}</p>
        </div>
        <Badge variant={statusConfig[booking.status]?.variant || "secondary"} className="text-xs">
          <StatusIcon className="w-3 h-3 ml-1" />
          {statusConfig[booking.status]?.label || booking.status}
        </Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {booking.requested_date
              ? format(new Date(booking.requested_date), "dd MMM yyyy - hh:mm a", { locale: ar })
              : "غير محدد"}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="text-gray-500">ملاحظات: </span>
          <span className="truncate">{booking.notes || "لا توجد"}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">تم الطلب: </span>
          <span className="font-medium">
            {booking.created_at
              ? format(new Date(booking.created_at), "dd MMM yyyy", { locale: ar })
              : "غير معروف"}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          onClick={() => onViewDetails(booking.id)}
        >
          <Eye className="w-4 h-4 ml-1" />
          التفاصيل
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-3">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={5} className="w-48">
            <DropdownMenuItem onClick={() => onStatusChange(booking.id, "pending")}>
              قيد الانتظار
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(booking.id, "confirmed")}>
              تأكيد
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(booking.id, "cancelled")}>
              إلغاء
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default function OnlineBookingsTable({
  bookings,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
}) {
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStatusChange = (bookingId, newStatus) => {
    // Implementation for status change
    console.log(`Change booking ${bookingId} to ${newStatus}`);
  };

  const handleViewDetails = (bookingId) => {
    navigate(`/online-bookings/${bookingId}`);
  };

  // Desktop columns
  const columns = [
    {
      header: "اسم المريض",
      accessor: "patient_name",
      cellClassName: "font-medium",
      render: (booking) => booking.patient_name || "زائر",
    },
    {
      header: "رقم الهاتف",
      accessor: "patient_phone",
      cellClassName: "text-muted-foreground",
      render: (booking) => booking.patient_phone || "-",
    },
    {
      header: "التاريخ المطلوب",
      accessor: "requested_date",
      cellClassName: "text-muted-foreground",
      render: (booking) =>
        booking.requested_date
          ? format(new Date(booking.requested_date), "dd MMM yyyy - hh:mm a", { locale: ar })
          : "غير محدد",
    },
    {
      header: "ملاحظات",
      accessor: "notes",
      cellClassName: "text-muted-foreground truncate max-w-[200px]",
    },
    {
      header: "تاريخ الطلب",
      accessor: "created_at",
      cellClassName: "text-muted-foreground",
      render: (booking) =>
        booking.created_at
          ? format(new Date(booking.created_at), "dd MMM yyyy", { locale: ar })
          : "غير معروف",
    },
    {
      header: "الحالة",
      accessor: "status",
      render: (booking) => {
        const config = {
          pending: { label: "قيد الانتظار", variant: "secondary" },
          confirmed: { label: "مؤكد", variant: "default" },
          cancelled: { label: "ملغي", variant: "destructive" }
        };
        const cfg = config[booking.status] || config.pending;
        return (
          <Badge variant={cfg.variant} className="text-xs">
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      header: "",
      accessor: "actions",
      cellClassName: "text-right",
      render: (booking) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleViewDetails(booking.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={5}>
              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "pending")}>
                قيد الانتظار
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "confirmed")}>
                تأكيد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "cancelled")}>
                إلغاء
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card className="max-h-[calc(100vh-200px)]">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card className="max-h-[calc(100vh-200px)]">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد حجوزات إلكترونية</h3>
          <p className="text-gray-500 text-sm">الحجوزات القادمة من موقعك الإلكتروني ستظهر هنا</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isMobileView ? (
        // Mobile View: Cards
        <div className="space-y-3 pb-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        // Desktop View: Table with horizontal scroll
        <Card className="max-h-[calc(100vh-200px)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      {columns.map((column, index) => (
                        <td
                          key={index}
                          className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap"
                        >
                          {column.render ? column.render(booking) : booking[column.accessor]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}