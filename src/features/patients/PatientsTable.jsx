import { Eye, Phone, User, Calendar, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import DataTable from "../../components/ui/table";

export default function PatientsTable({ patients, total, page, pageSize, onPageChange }) {
  const columns = [
    { 
      header: "الاسم", 
      accessor: "name", 
      cellClassName: "font-medium text-foreground",
      render: (patient) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{patient.name}</div>
            <div className="text-xs text-muted-foreground">ID: {String(patient.id || '').slice(-6) || "-"}</div>
          </div>
        </div>
      )
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
        if (!patient.date_of_birth) return "-";
        const birthDate = new Date(patient.date_of_birth);
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        return `${age} سنة`;
      },
    },
    {
      header: "الإجراء",
      render: (patient) => (
        <Link to={`/patients/${patient.id}`}>
          <Button variant="outline" className="gap-2" size="sm">
            <Eye className="h-4 w-4" />
            عرض التفاصيل
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Cards */}
      <div className="block md:hidden p-4 space-y-3">
        {patients.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-foreground mb-2">مفيش مرضى</p>
            <p className="text-sm text-muted-foreground">هتظهر بيانات المرضى هنا</p>
          </div>
        ) : (
          patients.map((patient) => {
            const age = patient.date_of_birth 
              ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
              : null;

            return (
              <Card key={patient.id} className="bg-card/70 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">{patient.name}</h3>
                      <p className="text-xs text-muted-foreground">ID: {String(patient.id || '').slice(-6)}</p>
                    </div>
                    <Badge variant="secondary">
                      {patient.gender === "male" ? "ذكر" : "أنثى"}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4 bg-accent/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{patient.phone || "-"}</span>
                    </div>
                    {age && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-muted-foreground">{age} سنة</span>
                      </div>
                    )}
                  </div>

                  <Link to={`/patients/${patient.id}`}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Eye className="w-4 h-4 ml-2" />
                      شوف التفاصيل
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <DataTable 
          columns={columns} 
          data={patients ?? []} 
          total={total} 
          page={page} 
          pageSize={pageSize} 
          onPageChange={onPageChange} 
          emptyLabel="مفيش مرضى"
        />
      </div>
    </>
  );
}