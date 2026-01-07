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
  Coins
} from "lucide-react";
import { format } from "date-fns";
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

export default function Finance() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, income, expense
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch records
  const { data: recordsData, isLoading: isRecordsLoading } = useFinancialRecords(1, 100, { type: filterType !== "all" ? filterType : undefined });
  const records = recordsData?.items || [];
  
  // Fetch Stats
  const { data: statsData, isLoading: isStatsLoading } = useFinancialStats();
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-[-0.5rem]">
            <Wallet className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">الماليات</h1>
            <p className="text-sm text-muted-foreground">
              متابعة الإيرادات والمصروفات والوضع المالي للعيادة
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="ml-2 h-4 w-4" />
            تصدير تقرير
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            معاملة جديدة
          </Button>
          <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
            <DialogContent className="w-full sm:max-w-[500px] p-0 overflow-hidden rounded-xl gap-0">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3" dir="rtl">
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="w-full space-y-4" dir="rtl">
        <TabsList className="grid grid-cols-2 w-full h-auto p-1 bg-muted/50 rounded-lg">
          <TabsTrigger 
            value="transactions" 
            className="text-sm py-2.5 data-[state=active]:bg-background rounded-md transition-all duration-200"
          >
            سجل المعاملات
          </TabsTrigger>
          <TabsTrigger 
            value="reports"
            className="text-sm py-2.5 data-[state=active]:bg-background rounded-md transition-all duration-200"
          >
            التقارير والتحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card className="bg-card w-full overflow-hidden border border-border shadow-sm">
            <div className="border-b border-border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
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
    </div>
  );
}
