import { useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Filter,
  Download,
  X,
  Coins,
  Loader2,
  FileText,
  User,
  Calendar
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import DataTable from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";

import { useFinancialRecords } from "../features/finance/useFinancialRecords";
import { useCreateFinancialRecord } from "../features/finance/useCreateFinancialRecord";
import { useFinancialStats } from "../features/finance/useFinancialStats";
import { formatCurrency } from "../lib/utils";
import FinancialAnalytics from "../features/finance/FinancialAnalytics";
import { useAuth } from "../features/auth/AuthContext";
import useClinic from "../features/auth/useClinic";
import { getFinancialSummary, getFinancialRecords, getFinancialChartData } from "../services/apiFinancialRecords";
import generateFinancialReportPdf from "../lib/generateFinancialReportPdf";
import { toast } from "sonner";

export default function Finance() {
  const { user } = useAuth();
  const { data: clinic } = useClinic();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDuration, setExportDuration] = useState("month");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [filterType, setFilterType] = useState("all"); // all, income, expense
  const [searchTerm, setSearchTerm] = useState("");
  const [statsDateFilter, setStatsDateFilter] = useState("month"); // week, month, 3months

  // Calculate stats date range
  const getStatsDateRange = () => {
    const end = endOfDay(new Date()).toISOString();
    let start;
    
    switch (statsDateFilter) {
      case "week":
        start = startOfDay(subDays(new Date(), 7)).toISOString();
        break;
      case "month":
        start = startOfDay(subMonths(new Date(), 1)).toISOString();
        break;
      case "3months":
        start = startOfDay(subMonths(new Date(), 3)).toISOString();
        break;
      default:
        start = startOfDay(subMonths(new Date(), 1)).toISOString();
    }
    
    return { startDate: start, endDate: end };
  };

  const statsFilters = getStatsDateRange();
  
  // Fetch records
  const { data: recordsData, isLoading: isRecordsLoading } = useFinancialRecords(1, 100, { type: filterType !== "all" ? filterType : undefined });
  const records = recordsData?.items || [];
  
  // Fetch Stats
  const { data: statsData, isLoading: isStatsLoading } = useFinancialStats(statsFilters);
  const stats = statsData || { totalIncome: 0, totalExpense: 0, netProfit: 0 };

  const createRecordMutation = useCreateFinancialRecord();

  // Form State
  const [newRecord, setNewRecord] = useState({
    type: "income",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.amount || !newRecord.description) return;

    try {
      await createRecordMutation.mutateAsync({
        type: newRecord.type,
        amount: parseFloat(newRecord.amount),
        description: newRecord.description,
        recorded_at: new Date(newRecord.date).toISOString()
      });
      setIsAddDialogOpen(false);
      setNewRecord({
        type: "income",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExportReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Calculate dates
      const end = endOfDay(new Date()).toISOString();
      let start;
      switch (exportDuration) {
        case "week":
          start = startOfDay(subDays(new Date(), 7)).toISOString();
          break;
        case "month":
          start = startOfDay(subMonths(new Date(), 1)).toISOString();
          break;
        case "3months":
          start = startOfDay(subMonths(new Date(), 3)).toISOString();
          break;
        default:
          start = startOfDay(subMonths(new Date(), 1)).toISOString();
      }
      
      const filters = { startDate: start, endDate: end };
      
      // Fetch Data
      const [summary, chartData, recordsResponse] = await Promise.all([
        getFinancialSummary(filters),
        getFinancialChartData(filters),
        getFinancialRecords(1, 1000, filters) // Fetch up to 1000 records for the report
      ]);
      
      // Generate PDF
      await generateFinancialReportPdf(
        summary,
        recordsResponse.items,
        chartData,
        filters,
        clinic,
        user?.name
      );
      
      setIsExportDialogOpen(false);
      toast.success("تم إنشاء التقرير بنجاح");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("حدث خطأ أثناء إنشاء التقرير");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: "التاريخ",
      accessor: "recorded_at",
      render: (record) => (
        <span className="font-medium">
          {format(new Date(record.recorded_at || record.created_at), "d MMMM yyyy", { locale: ar })}
        </span>
      )
    },
    {
      header: "الوصف",
      accessor: "description",
    },
    {
      header: "النوع",
      accessor: "type",
      render: (record) => (
        <Badge variant={record.type === 'income' ? 'default' : 'destructive'} className={record.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}>
          {record.type === 'income' ? 'إيراد' : 'مصروف'}
        </Badge>
      )
    },
    {
      header: "المريض",
      accessor: "patient.name",
      render: (record) => record.patient?.name || "-"
    },
    {
      header: "المبلغ",
      accessor: "amount",
      cellClassName: "text-left",
      render: (record) => (
        <div className={`text-left font-bold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {record.type === 'income' ? '+' : '-'} {formatCurrency(record.amount)}
        </div>
      )
    }
  ];

  const renderMobileTransaction = (record) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3 mb-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-900">{record.description}</h3>
          {record.patient?.name && (
            <div className="flex items-center text-sm text-slate-500 gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>{record.patient.name}</span>
            </div>
          )}
        </div>
        <Badge variant={record.type === 'income' ? 'default' : 'destructive'} className={record.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}>
          {record.type === 'income' ? 'إيراد' : 'مصروف'}
        </Badge>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <div className={`font-bold text-lg ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
          {record.type === 'income' ? '+' : '-'} {formatCurrency(record.amount)}
        </div>
        <div className="flex items-center text-xs text-slate-400 gap-1">
          <Calendar className="w-3 h-3" />
          <span>{format(new Date(record.recorded_at || record.created_at), "d MMMM yyyy", { locale: ar })}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary flex-shrink-0 mt-[-0.5rem]">
            <Wallet className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">الماليات</h1>
            <p className="text-sm text-muted-foreground">
              متابعة الإيرادات والمصروفات والوضع المالي للعيادة
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">احصائيات مالياتك</h2>
          <Select value={statsDateFilter} onValueChange={setStatsDateFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="3months">آخر 3 شهور</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {/* Total Income */}
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">الإيرادات</span>
              </div>
              {isStatsLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalIncome?.toFixed(0) || 0} جنيه
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Total Expenses */}
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">المصروفات</span>
              </div>
              {isStatsLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalExpense?.toFixed(0) || 0} جنيه
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Net Profit */}
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">صافي الربح</span>
              </div>
              {isStatsLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className={`text-base font-bold ${stats.netProfit >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.netProfit?.toFixed(0) || 0} جنيه
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-[75%] sm:w-auto h-10">
          <Plus className="ml-2 h-4 w-4" />
          معاملة جديدة
        </Button>
        <Button 
          variant="outline" 
          className="w-[25%] sm:w-auto px-1 h-10"
          onClick={() => setIsExportDialogOpen(true)}
        >
          <Download className="h-4 w-4 sm:ml-2" />
          <span className="hidden sm:inline">تصدير تقرير</span>
          <span className="sm:hidden text-xs">تصدير</span>
        </Button>
        <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
          <DialogContent className="w-full sm:max-w-[500px] p-0 overflow-hidden rounded-[var(--radius)] gap-0">
            <button
              onClick={() => setIsAddDialogOpen(false)}
              className="absolute left-4 top-4 rounded-[var(--radius)] opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>إضافة معاملة مالية جديدة</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                سجل إيراد جديد أو مصروف للعيادة.
              </p>
            </DialogHeader>

            <div className="px-6 py-4">
              <form onSubmit={handleCreateRecord} className="space-y-4">
                <div className="space-y-2">
                  <Label>نوع المعاملة</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newRecord.type === 'income' ? 'default' : 'outline'}
                      className={`flex-1 ${newRecord.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => setNewRecord({ ...newRecord, type: 'income' })}
                    >
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                      إيراد
                    </Button>
                    <Button
                      type="button"
                      variant={newRecord.type === 'expense' ? 'destructive' : 'outline'}
                      className="flex-1"
                      onClick={() => setNewRecord({ ...newRecord, type: 'expense' })}
                    >
                      <ArrowDownLeft className="ml-2 h-4 w-4" />
                      مصروف
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newRecord.amount}
                      onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                      required
                    />
                    <div className="absolute left-3 top-2.5 text-sm text-muted-foreground">جنيه</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Input
                    id="description"
                    placeholder="مثال: كشف، إيجار، مستلزمات..."
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    required
                  />
                </div>

                <DialogFooter className="p-0 pt-4 gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createRecordMutation.isPending}>
                    {createRecordMutation.isPending ? "جاري الحفظ..." : "حفظ المعاملة"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="w-full space-y-4" dir="rtl">
        <TabsList className="grid grid-cols-2 w-full h-auto p-1 bg-muted/50 rounded-[var(--radius)]">
          <TabsTrigger 
            value="transactions" 
            className="text-sm py-2.5 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
          >
            سجل المعاملات
          </TabsTrigger>
          <TabsTrigger 
            value="reports"
            className="text-sm py-2.5 data-[state=active]:bg-background rounded-[var(--radius)] transition-all duration-200"
          >
            التقارير والتحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card className="bg-card w-full overflow-hidden border border-border shadow-sm">
            <div className="border-b border-border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[var(--radius)] bg-primary/10 text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">أحدث المعاملات</h2>
                    <p className="text-sm text-muted-foreground">عرض وتصفية سجل المعاملات المالية</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في المعاملات..."
                      className="pr-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="ml-2 h-4 w-4" />
                      <SelectValue placeholder="تصفية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="income">إيرادات</SelectItem>
                      <SelectItem value="expense">مصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <CardContent className="p-0">
              {isRecordsLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="border-t-0">
                  <DataTable 
                    columns={columns} 
                    data={filteredRecords}
                    emptyLabel="لا توجد معاملات مالية مطابقة للبحث."
                    renderMobileItem={renderMobileTransaction}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FinancialAnalytics />
        </TabsContent>
      </Tabs>

      <Dialog open={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              تصدير تقرير مالي شامل
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4" dir="rtl">
            <div className="space-y-2">
              <Label>اختر الفترة الزمنية للتقرير</Label>
              <Select value={exportDuration} onValueChange={setExportDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">آخر أسبوع</SelectItem>
                  <SelectItem value="month">آخر شهر</SelectItem>
                  <SelectItem value="3months">آخر 3 شهور</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p>سيحتوي التقرير على:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>ملخص الإيرادات والمصروفات</li>
                <li>رسوم بيانية توضيحية</li>
                <li>جدول تفصيلي لجميع المعاملات</li>
                <li>صافي الربح للفترة المحددة</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="w-[25%] sm:w-auto">إلغاء</Button>
            <Button onClick={handleExportReport} disabled={isGeneratingReport} className="w-[75%] sm:w-auto gap-2">
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  إنشاء وتحميل التقرير
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
