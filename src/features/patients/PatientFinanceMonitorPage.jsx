import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Filter, Loader2, Search, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { formatCurrency } from "../../lib/utils";
import useClinic from "../auth/useClinic";
import { useAuth } from "../auth/AuthContext";
import { usePatientFinanceLedger, usePatientFinanceSummary } from "./usePatientFinanceLedger";
import generatePatientFinanceReportPdf from "../../lib/generatePatientFinanceReportPdf";

export default function PatientFinanceMonitorPage() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const numericPatientId = Number(patientId);
  const { user } = useAuth();
  const { data: clinic } = useClinic();

  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filters = useMemo(() => ({ type: typeFilter }), [typeFilter]);
  const { data: ledger, isLoading: isLedgerLoading } = usePatientFinanceLedger(numericPatientId, filters);
  const { data: summary, isLoading: isSummaryLoading } = usePatientFinanceSummary(numericPatientId, filters);

  const patientName = ledger?.[0]?.patient?.name || "";

  const filteredLedger = useMemo(() => {
    const items = Array.isArray(ledger) ? ledger : [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const d = (r.description || "").toLowerCase();
      const ref = (r.reference_key || "").toLowerCase();
      const plan = (r.plan?.treatment_templates?.name || "").toLowerCase();
      const diagnosis = (r.visit?.diagnosis || "").toLowerCase();
      return d.includes(q) || ref.includes(q) || plan.includes(q) || diagnosis.includes(q);
    });
  }, [ledger, searchTerm]);

  const exportReport = () => {
    generatePatientFinanceReportPdf(
      summary,
      filteredLedger,
      null,
      clinic,
      user?.name,
      { id: numericPatientId, name: patientName }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="ghost" className="gap-2 w-full sm:w-auto justify-center sm:justify-start" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          رجوع
        </Button>
        <Button onClick={exportReport} className="gap-2 w-full sm:w-auto" disabled={isLedgerLoading || !filteredLedger.length}>
          <Download className="h-4 w-4" />
          تقرير مالي
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0">
          <Wallet className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مراقبة ماليات المريض</h1>
          <p className="text-sm text-muted-foreground">
            {patientName ? `المريض: ${patientName}` : "عرض كل المستحقات والمدفوعات بالتفصيل"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">إجمالي المستحقات</span>
            </div>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل
              </div>
            ) : (
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(summary?.totalCharges || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">إجمالي المدفوعات</span>
            </div>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل
              </div>
            ) : (
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(summary?.totalPayments || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">الرصيد</span>
            </div>
            {isSummaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل
              </div>
            ) : (
              <p className={`text-base font-bold ${(summary?.balance || 0) > 0 ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}`}>
                {formatCurrency(summary?.balance || 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card w-full overflow-hidden border border-border shadow-sm">
        <CardHeader className="border-b border-border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">دفتر الماليات</CardTitle>
              <p className="text-sm text-muted-foreground">كل سطر يوضح جنيه على المريض أو جنيه دفعه</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="تصفية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="charge">مستحقات</SelectItem>
                  <SelectItem value="income">مدفوعات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLedgerLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري تحميل دفتر الماليات...
            </div>
          ) : filteredLedger.length ? (
            <div className="divide-y">
              {filteredLedger.map((r) => {
                const typeLabel = r.type === "charge" ? "مستحقات" : r.type === "income" ? "مدفوعات" : r.type;
                const badgeClass =
                  r.type === "charge"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : r.type === "income"
                      ? "bg-green-600 hover:bg-green-700"
                      : "";

                const sources = [];
                if (r.plan?.treatment_templates?.name) sources.push(r.plan.treatment_templates.name);
                if (r.appointment_id) sources.push(`موعد #${r.appointment_id}`);
                if (r.visit_id) sources.push(`كشف #${r.visit_id}`);
                if (r.reference_key) sources.push(r.reference_key);

                return (
                  <div key={r.id} className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={badgeClass}>{typeLabel}</Badge>
                          <div className="text-sm font-bold text-foreground truncate">{r.description}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {sources.length ? sources.join(" • ") : "-"}
                        </div>
                      </div>
                      <div className={`font-extrabold ${r.type === "charge" ? "text-amber-700" : "text-emerald-700"} shrink-0 self-end sm:self-auto`} dir="ltr">
                        {r.type === "charge" ? "+" : "-"} {formatCurrency(r.amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              لا توجد قيود مالية للمريض
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
