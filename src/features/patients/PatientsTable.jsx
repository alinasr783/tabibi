import { Eye, Phone, User, Calendar, Mail, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import DataTable from "../../components/ui/table";

export default function PatientsTable({ patients, total, page, pageSize, onPageChange, onLoadMore, hasMore }) {
  const columns = [
    { 
      header: "الاسم", 
      accessor: "name", 
      cellClassName: "font-medium text-foreground",
      render: (patient) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{patient.name}</div>
            <div className="text-xs text-muted-foreground">ID: {String(patient.id || '').slice(-6) || "-"}</div>
            {Array.isArray(patient.medical_history) && patient.medical_history.some(h => h.type === 'chronic' || h.type === 'Chronic') && (
              <div className="flex flex-wrap gap-1 mt-1">
                 {patient.medical_history
                   .filter(h => h.type === 'chronic' || h.type === 'Chronic')
                   .slice(0, 2)
                   .map((h, i) => (
                     <Badge key={i} variant="outline" className="text-[10px] h-4 px-1 border-red-200 text-red-700 bg-red-50">
                       {h.condition}
                     </Badge>
                   ))}
                 {patient.medical_history.filter(h => h.type === 'chronic' || h.type === 'Chronic').length > 2 && (
                   <span className="text-[10px] text-muted-foreground">+{patient.medical_history.filter(h => h.type === 'chronic' || h.type === 'Chronic').length - 2}</span>
                 )}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: "المواعيد",
      render: (patient) => {
        const now = new Date();
        const lastVisit = patient.appointments
          ?.filter(a => new Date(a.date) < now && a.status !== 'cancelled')
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        const nextVisit = patient.appointments
          ?.filter(a => new Date(a.date) >= now && a.status !== 'cancelled')
          .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

        return (
          <div className="flex flex-col gap-1 text-xs">
            {lastVisit ? (
              <div className="text-muted-foreground">
                <span className="opacity-70">اخر زيارة: </span>
                <span className="font-medium">{new Date(lastVisit.date).toLocaleDateString('ar-EG')}</span>
              </div>
            ) : (
               <div className="text-muted-foreground opacity-50">لا توجد زيارات سابقة</div>
            )}
            {nextVisit ? (
              <div className="text-primary">
                <span className="opacity-70">القادم: </span>
                <span className="font-medium">{new Date(nextVisit.date).toLocaleDateString('ar-EG')}</span>
              </div>
            ) : (
               <div className="text-muted-foreground opacity-50">لا توجد مواعيد قادمة</div>
            )}
          </div>
        );
      }
    },
    {
      header: "الهاتف",
      accessor: "phone",
      cellClassName: "text-foreground",
      render: (patient) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{patient.phone || "-"}</span>
        </div>
      )
    },
    {
      header: "النوع",
      render: (patient) => (
        <Badge variant="secondary" className="gap-1">
          {patient.gender === "male" ? "ذكر" : "أنثى"}
        </Badge>
      ),
    },
    {
      header: "العمر",
      render: (patient) => {
        if (patient.date_of_birth) {
          const birthDate = new Date(patient.date_of_birth);
          const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
          return `${age} سنة`;
        }
        if (patient.age) {
          const unit = patient.age_unit === 'months' ? 'شهر' : patient.age_unit === 'days' ? 'يوم' : 'سنة';
          return `${patient.age} ${unit}`;
        }
        return "-";
      },
    },
    {
      header: "الإجراء",
      render: (patient) => (
        <div className="flex items-center gap-2">
          <Link to={`/patients/${patient.id}`} onClick={() => console.log("Navigating to patient with ID:", patient.id, "Full patient object:", patient)}>
            <Button variant="outline" className="gap-2" size="sm">
              <Eye className="h-4 w-4" />
              عرض التفاصيل
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => window.open(`https://wa.me/${patient.phone}`, '_blank')}>
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => window.location.href = `tel:${patient.phone}`}>
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3" style={{ direction: 'rtl' }}>
        {patients.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-foreground mb-2">مفيش مرضى</p>
            <p className="text-sm text-muted-foreground">هتظهر بيانات المرضى هنا</p>
          </div>
        ) : (
          patients.map((patient) => {
            let ageDisplay = null;
            if (patient.date_of_birth) {
              const age = Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
              ageDisplay = `${age} سنة`;
            } else if (patient.age) {
               const unit = patient.age_unit === 'months' ? 'شهر' : patient.age_unit === 'days' ? 'يوم' : 'سنة';
               ageDisplay = `${patient.age} ${unit}`;
            }

            return (
              <Card key={patient.id} className="mb-4 border-border overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">{patient.name}</h3>
                      <p className="text-xs text-muted-foreground">ID: {String(patient.id || '').slice(-6)}</p>
                      {(() => {
                        const chronicDiseases = Array.isArray(patient.medical_history)
                          ? patient.medical_history.filter(h => h.type === 'chronic' || h.type === 'Chronic').map(h => h.condition)
                          : patient.medical_history?.chronic_diseases || [];
                        
                        if (chronicDiseases.length === 0) return null;

                        return (
                          <div className="flex flex-wrap gap-1 mt-2">
                             {chronicDiseases.slice(0, 3).map((disease, i) => (
                               <Badge key={i} variant="outline" className="text-[10px] h-5 px-2 border-red-200 text-red-700 bg-red-50">
                                 {disease}
                               </Badge>
                             ))}
                             {chronicDiseases.length > 3 && (
                               <span className="text-[10px] text-muted-foreground">+{chronicDiseases.length - 3}</span>
                             )}
                          </div>
                        );
                      })()}
                    </div>
                    <Badge variant="secondary">
                      {patient.gender === "male" ? "ذكر" : "أنثى"}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{patient.phone || "-"}</span>
                    </div>
                    {ageDisplay && (
                      <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-muted-foreground">{ageDisplay}</span>
                      </div>
                    )}
                    
                    {(() => {
                        const now = new Date();
                        const lastVisit = patient.appointments
                          ?.filter(a => new Date(a.date) < now && a.status !== 'cancelled')
                          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                        
                        const nextVisit = patient.appointments
                          ?.filter(a => new Date(a.date) >= now && a.status !== 'cancelled')
                          .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

                        return (
                          <>
                             <div className="flex items-center gap-2 text-sm">
                               <Calendar className="w-4 h-4 text-blue-500" />
                               <span className="text-muted-foreground">اخر زيارة: </span>
                               <span className="font-medium">{lastVisit ? new Date(lastVisit.date).toLocaleDateString('ar-EG') : '-'}</span>
                             </div>
                             {nextVisit && (
                               <div className="flex items-center gap-2 text-sm">
                                 <Calendar className="w-4 h-4 text-green-500" />
                                 <span className="text-muted-foreground">القادم: </span>
                                 <span className="font-medium text-green-700">{new Date(nextVisit.date).toLocaleDateString('ar-EG')}</span>
                               </div>
                             )}
                          </>
                        )
                    })()}
                  </div>

                  <div className="space-y-4">
                    <Link to={`/patients/${patient.id}`} onClick={() => console.log("Mobile: Navigating to patient with ID:", patient.id, "Full patient object:", patient)}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-4">
                        <Eye className="w-4 h-4 ml-2" />
                        شوف التفاصيل
                      </Button>
                    </Link>
                    <div className="flex gap-4 mt-2">
                      <Button variant="outline" className="flex-1 gap-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800" onClick={() => window.open(`https://wa.me/${patient.phone}`, '_blank')}>
                        <MessageCircle className="w-4 h-4" />
                        واتساب
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800" onClick={() => window.location.href = `tel:${patient.phone}`}>
                        <Phone className="w-4 h-4" />
                        اتصال
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        {onLoadMore && hasMore && (
          <Button onClick={onLoadMore} variant="outline" className="w-full mt-4">عرض المزيد</Button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden shadow-sm bg-card">
        <DataTable 
          columns={columns} 
          data={patients ?? []} 
          total={total} 
          page={onLoadMore ? undefined : page} 
          pageSize={pageSize} 
          onPageChange={onPageChange} 
          emptyLabel="مفيش مرضى"
        />
        {onLoadMore && hasMore && (
          <div className="p-4 border-t bg-muted/20 flex justify-center">
            <Button onClick={onLoadMore} variant="outline" className="min-w-[200px] bg-background">عرض المزيد</Button>
          </div>
        )}
      </div>
    </>
  );
}