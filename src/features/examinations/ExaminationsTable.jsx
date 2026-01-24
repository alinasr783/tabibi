import { Eye, User, Calendar, Stethoscope, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import DataTable from "../../components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

function ExaminationCard({ visit, navigate }) {
  return (
    <div className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
      <div className="p-1">
        {/* Header - Patient Name & Gender */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold">{visit.patient?.name?.charAt(0) || "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <Button 
                variant="link" 
                className="font-bold text-lg p-0 h-auto text-right hover:text-primary"
                onClick={() => navigate(`/patients/${visit.patient_id}`)}>
                {visit.patient?.name || "مريض غير معروف"}
              </Button>
              <div className="text-sm text-muted-foreground">
                {visit.patient?.phone || "-"}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5 flex-shrink-0">
            {visit.patient?.gender === "male" ? "ذكر" : visit.patient?.gender === "female" ? "أنثى" : "-"}
          </Badge>
        </div>

        {/* Visit Details */}
        <div className="space-y-2.5 mb-4 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">
              {format(new Date(visit.created_at), "PPP", { locale: ar })}
            </span>
            <span className="text-muted-foreground">•</span>
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">
              {format(new Date(visit.created_at), "p", { locale: ar })}
            </span>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <Stethoscope className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground flex-1 line-clamp-2">
              {visit.diagnosis || "لا يوجد تشخيص"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="w-full h-10 border-primary text-primary hover:bg-primary/5"
            onClick={() => navigate(`/patients/${visit.patient_id}/visits/${visit.id}`)}
          >
            <Eye className="w-4 h-4 ml-2" />
            عرض التفاصيل
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ExaminationsTable({ visits, total, page, pageSize, onPageChange, onLoadMore, hasMore, isLoadingMore }) {
  const navigate = useNavigate();

  const columns = [
    {
      header: "المريض",
      render: (visit) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
             <span className="text-primary font-bold">{visit.patient?.name?.charAt(0) || "?"}</span>
          </div>
          <div>
            <div className="font-medium">{visit.patient?.name || "مريض غير معروف"}</div>
            <div className="text-xs text-muted-foreground">{visit.patient?.phone || "-"}</div>
          </div>
        </div>
      )
    },
    {
      header: "التاريخ",
      render: (visit) => (
        <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(visit.created_at), "PPP p", { locale: ar })}</span>
        </div>
      )
    },
    {
        header: "التشخيص",
        render: (visit) => (
            <div className="flex items-center gap-2 max-w-[200px]">
                <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate" title={visit.diagnosis}>{visit.diagnosis || "-"}</span>
            </div>
        )
    },
    {
      header: "النوع",
      render: (visit) => (
        <Badge variant="secondary" className="gap-1">
          {visit.patient?.gender === "male" ? "ذكر" : visit.patient?.gender === "female" ? "أنثى" : "-"}
        </Badge>
      ),
    },
    {
      header: "",
      id: "actions",
      render: (visit) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/patients/${visit.patient_id}/visits/${visit.id}`}>
            <Eye className="h-4 w-4 ml-2" />
            التفاصيل
          </Link>
        </Button>
      ),
    },
  ];

  // Pagination Component
  const MobilePagination = () => {
    if (!total || total <= pageSize) return null;
    
    const totalPages = Math.ceil(total / pageSize);
    const canGoBack = page > 1;
    const canGoForward = page < totalPages;

    return (
      <div className="flex items-center justify-between mt-4 px-2 bg-card/50 rounded-[var(--radius)] p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoBack}
          className="h-9 px-3"
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          السابق
        </Button>
        
        <div className="text-sm text-muted-foreground">
          صفحة <span className="font-bold text-foreground">{page}</span> من <span className="font-bold text-foreground">{totalPages}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoForward}
          className="h-9 px-3"
        >
          التالي
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden pt-2">
        {visits.map((visit) => (
          <ExaminationCard 
            key={visit.id} 
            visit={visit} 
            navigate={navigate} 
          />
        ))}
        
        {onLoadMore ? (
          hasMore && (
            <div className="mt-4 px-2 pb-4">
              <Button 
                variant="outline" 
                className="w-full h-11 text-base"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                   "بيحمل..."
                ) : (
                   "عرض المزيد"
                )}
              </Button>
            </div>
          )
        ) : (
          <MobilePagination />
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block">
        <DataTable
          data={visits}
          columns={columns}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          emptyLabel="لا توجد كشوفات"
        />
        {onLoadMore && hasMore && (
           <div className="mt-4 flex flex-col items-center justify-center border-t pt-4">
              <Button 
                variant="outline" 
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="min-w-[200px]"
              >
                {isLoadingMore ? "بيحمل..." : "عرض المزيد"}
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                 معروض {visits.length} من {total}
              </div>
           </div>
        )}
      </div>
    </>
  );
}