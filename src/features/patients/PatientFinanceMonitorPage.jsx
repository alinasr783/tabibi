import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Filter, Loader2, Search, Wallet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import DataTable from "../../components/ui/table";
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

  const truncateEnd = (value, maxLen = 80) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen)}...`;
  };

  const ledgerFilters = useMemo(() => ({ type: typeFilter }), [typeFilter]);
  const { data: ledger, isLoading: isLedgerLoading } = usePatientFinanceLedger(numericPatientId, ledgerFilters);
  const { data: summary, isLoading: isSummaryLoading } = usePatientFinanceSummary(numericPatientId, {});

  const patientName = ledger?.[0]?.patient?.name || "";

  const formatDateTime = useMemo(() => {
    const dtf = new Intl.DateTimeFormat("ar-EG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (value) => {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return dtf.format(d);
    };
  }, []);

  const formatDayLabel = useMemo(() => {
    const dtf = new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return (value) => {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return dtf.format(d);
    };
  }, []);

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

  const normalizeRecordType = (type) => {
    if (type === "payment") return "income";
    if (type === "due" || type === "dues") return "charge";
    return type;
  };

  const getTypeBadge = (normalizedType) => {
    const typeLabel =
      normalizedType === "charge" ? "مستحقات" : normalizedType === "income" ? "مدفوعات" : normalizedType;
    const badgeClass =
      normalizedType === "charge"
        ? "bg-amber-600 hover:bg-amber-700"
        : normalizedType === "income"
          ? "bg-green-600 hover:bg-green-700"
          : "";

    return { typeLabel, badgeClass };
  };

  const buildSources = (r) => {
    const sources = [];
    if (r.plan?.treatment_templates?.name) sources.push(r.plan.treatment_templates.name);
    if (r.appointment_id) sources.push(`موعد #${r.appointment_id}`);
    if (r.visit_id) sources.push(`كشف #${r.visit_id}`);
    return sources;
  };

  const ledgerColumns = useMemo(() => {
    return [
      {
        header: "التاريخ",
        render: (r) => {
          const ts = r.recorded_at || r.created_at;
          const d = ts ? new Date(ts) : null;
          const dayLabel = d && !Number.isNaN(d.getTime()) ? formatDayLabel(d) : "غير معروف";
          const tsLabel = formatDateTime(ts);
          return (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground whitespace-normal">{dayLabel}</div>
              {tsLabel ? <div className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{tsLabel}</div> : null}
            </div>
          );
        },
        cellClassName: "whitespace-nowrap align-top",
      },
      {
        header: "النوع",
        render: (r) => {
          const normalizedType = normalizeRecordType(r.type);
          const { typeLabel, badgeClass } = getTypeBadge(normalizedType);
          return (
            <div className="whitespace-nowrap">
              <Badge className={badgeClass}>{typeLabel}</Badge>
            </div>
          );
        },
        cellClassName: "whitespace-nowrap align-top",
      },
      {
        header: "البيان",
        render: (r) => {
          const sources = buildSources(r);
          return (
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-bold text-foreground whitespace-normal break-words">{r.description || "-"}</div>
              {sources.length ? (
                <div className="text-xs text-muted-foreground whitespace-normal break-words leading-relaxed">
                  {sources.join(" • ")}
                </div>
              ) : null}
              {r.reference_key ? (
                <div className="text-[11px] text-muted-foreground whitespace-normal break-all leading-relaxed">
                  {r.reference_key}
                </div>
              ) : null}
            </div>
          );
        },
        cellClassName: "whitespace-normal align-top min-w-[260px]",
      },
      {
        header: "المبلغ",
        render: (r) => {
          const normalizedType = normalizeRecordType(r.type);
          const isCharge = normalizedType === "charge";
          return (
            <div className={`font-extrabold ${isCharge ? "text-amber-700" : "text-emerald-700"} whitespace-nowrap`} dir="ltr">
              {isCharge ? "+" : "-"} {formatCurrency(r.amount)}
            </div>
          );
        },
        cellClassName: "whitespace-nowrap align-top",
      },
    ];
  }, [formatDateTime, formatDayLabel]);

  const renderMobileLedgerItem = (r) => {
    const normalizedType = normalizeRecordType(r.type);
    const { typeLabel, badgeClass } = getTypeBadge(normalizedType);
    const sources = buildSources(r);
    const ts = r.recorded_at || r.created_at;
    const d = ts ? new Date(ts) : null;
    const dayLabel = d && !Number.isNaN(d.getTime()) ? formatDayLabel(d) : "غير معروف";
    const tsLabel = formatDateTime(ts);
    const isCharge = normalizedType === "charge";

    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted-foreground">{dayLabel}</div>
            <div className="flex items-center gap-2 mt-2 min-w-0">
              <Badge className={badgeClass}>{typeLabel}</Badge>
              <div className="text-sm font-bold text-foreground truncate min-w-0">{truncateEnd(r.description || "-", 80)}</div>
            </div>
            {sources.length ? (
              <div className="text-xs text-muted-foreground mt-2 whitespace-normal break-words leading-relaxed">
                {truncateEnd(sources.join(" • "), 120)}
              </div>
            ) : null}
            {r.reference_key ? (
              <div className="text-[11px] text-muted-foreground mt-2 whitespace-normal break-all leading-relaxed">
                {truncateEnd(r.reference_key, 90)}
              </div>
            ) : null}
            {tsLabel ? <div className="text-[11px] text-muted-foreground mt-2">{tsLabel}</div> : null}
          </div>
          <div className={`font-extrabold ${isCharge ? "text-amber-700" : "text-emerald-700"} shrink-0`} dir="ltr">
            {isCharge ? "+" : "-"} {formatCurrency(r.amount)}
          </div>
        </div>
      </div>
    );
  };

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
    <div className="space-y-6 pb-20 md:pb-0 animate-in fade-in duration-500 w-full min-w-0 overflow-x-hidden" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 shrink-0 rounded-lg border-dashed">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <div className="text-lg font-bold text-foreground truncate">مراقبة ماليات المريض</div>
          <div className="text-sm text-muted-foreground truncate">{patientName || "دفتر المستحقات والمدفوعات"}</div>
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
              <div className="flex items-center justify-between gap-3 min-w-0">
                <p className="text-sm min-[360px]:text-base font-bold text-amber-700 dark:text-amber-400 min-w-0 flex-1 truncate" dir="ltr">
                  {truncateEnd(formatCurrency(summary?.totalCharges || 0), 18)}
                </p>
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
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
              <div className="flex items-center justify-between gap-3 min-w-0">
                <p className="text-sm min-[360px]:text-base font-bold text-emerald-700 dark:text-emerald-400 min-w-0 flex-1 truncate" dir="ltr">
                  {truncateEnd(formatCurrency(summary?.totalPayments || 0), 18)}
                </p>
                <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
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
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className={`text-sm min-[360px]:text-base font-bold truncate ${(summary?.balance || 0) > 0 ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}`} dir="ltr">
                    {truncateEnd(formatCurrency(summary?.balance || 0), 18)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(summary?.balance || 0) > 0 ? "على المريض" : "له رصيد"}
                  </p>
                </div>
                <div className={`p-2 rounded-md ${(summary?.balance || 0) > 0 ? "bg-rose-500/10 text-rose-600" : "bg-slate-500/10 text-slate-700 dark:text-slate-200"}`}>
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex sm:justify-end">
        <Button onClick={exportReport} className="w-full sm:w-auto gap-2" disabled={isLedgerLoading || !filteredLedger.length}>
          <Download className="h-4 w-4" />
          تنزيل التقرير
        </Button>
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
            <div className="p-4 sm:p-6">
              <DataTable columns={ledgerColumns} data={filteredLedger} renderMobileItem={renderMobileLedgerItem} />
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">لا توجد قيود مالية</div>
              <div className="text-sm text-muted-foreground mt-1">ابدأ بإضافة مستحقات أو تسجيل مدفوعات</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
