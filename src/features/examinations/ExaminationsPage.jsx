import { useState } from "react";
import { useVisits } from "./useVisits";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Search, Filter, FileText, Calendar, User, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table-primitives";
import { Badge } from "../../components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function ExaminationsPage() {
  console.log("ExaminationsPage rendering");
  const { visits, isLoading } = useVisits();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredVisits = visits?.filter((visit) =>
    visit.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRowClick = (patientId, visitId) => {
    navigate(`/patients/${patientId}/visits/${visitId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">الكشوفات</h1>
          <p className="text-muted-foreground mt-1">
            سجل جميع الكشوفات الطبية والزيارات
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم المريض..."
                className="pr-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Future: Add Date Filter Here */}
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View - Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredVisits?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد كشوفات مطابقة
              </div>
            ) : (
              filteredVisits?.map((visit) => (
                <Card 
                  key={visit.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-primary/10"
                  onClick={() => handleRowClick(visit.patient_id, visit.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{visit.patient?.name || "مريض غير معروف"}</p>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(visit.created_at), "PPP", { locale: ar })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <Stethoscope className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium mb-1">التشخيص:</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {visit.diagnosis || "لا يوجد تشخيص"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(visit.patient_id, visit.id);
                      }}
                    >
                      <FileText className="h-4 w-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block rounded-[var(--radius)] border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">التشخيص</TableHead>
                  <TableHead className="text-right">الملاحظات</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      لا توجد كشوفات مطابقة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisits?.map((visit) => (
                    <TableRow 
                      key={visit.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(visit.patient_id, visit.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {visit.patient?.name?.charAt(0) || "?"}
                            </span>
                          </div>
                          {visit.patient?.name || "مريض غير معروف"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(visit.created_at), "PPP p", { locale: ar })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {visit.diagnosis || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {visit.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 ml-2" />
                          التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
