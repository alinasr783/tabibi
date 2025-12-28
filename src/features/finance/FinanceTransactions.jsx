import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table-primitives";
import { Badge } from "../../components/ui/badge";
import { Search, Filter, Download, CreditCard, Calendar, User, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useFinanceTransactions } from "./useFinanceTransactions";

function TransactionCard({ transaction }) {
  const transactionId = transaction.id ? String(transaction.id).slice(-6) : 'N/A';
  
  return (
    <Card className="bg-card/70 hover:bg-card transition-colors">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base truncate">{transaction.patientName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={
                  transaction.status === 'completed' ? 'default' :
                  transaction.status === 'pending' ? 'secondary' : 'destructive'
                } className="text-xs">
                  {transaction.status === 'completed' ? 'مكتمل' :
                   transaction.status === 'pending' ? 'معلق' : 'ملغي'}
                </Badge>
                <span className="text-xs text-muted-foreground">#{transactionId}</span>
              </div>
            </div>
          </div>
          <div className="text-left flex-shrink-0">
            <p className="font-bold text-base sm:text-lg">{formatCurrency(transaction.amount)}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{transaction.date ? new Date(transaction.date).toLocaleDateString('ar-EG') : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            <span>{transaction.paymentMethod}</span>
          </div>
        </div>
        
        {transaction.notes && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground line-clamp-2">{transaction.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionRow({ transaction }) {
  // Ensure transaction.id is a string before slicing
  const transactionId = transaction.id ? String(transaction.id).slice(-6) : 'N/A';
  
  return (
    <TableRow>
      <TableCell className="font-medium">{transactionId}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{transaction.patientName}</div>
            <div className="text-xs text-muted-foreground">
              {transaction.date ? new Date(transaction.date).toLocaleDateString('ar-EG') : 'N/A'}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
      <TableCell>
        <Badge variant={
          transaction.status === 'completed' ? 'default' :
          transaction.status === 'pending' ? 'secondary' : 'destructive'
        }>
          {transaction.status === 'completed' ? 'مكتمل' :
           transaction.status === 'pending' ? 'معلق' : 'ملغي'}
        </Badge>
      </TableCell>
      <TableCell>{transaction.paymentMethod}</TableCell>
      <TableCell>{transaction.notes || '-'}</TableCell>
    </TableRow>
  );
}

export default function FinanceTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const { data: transactions, isLoading } = useFinanceTransactions();

  const filteredTransactions = transactions?.filter(transaction => {
    // Check if transaction has required properties
    if (!transaction) return false;
    
    const matchesSearch = searchTerm === "" || 
      (transaction.patientName && transaction.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.id && String(transaction.id).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    // Date range filtering
    let matchesDateRange = true;
    if (dateRange !== "all" && transaction.date) {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      
      switch (dateRange) {
        case "today":
          matchesDateRange = transactionDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          matchesDateRange = transactionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          matchesDateRange = transactionDate >= monthAgo;
          break;
        case "year":
          const yearAgo = new Date(now);
          yearAgo.setFullYear(now.getFullYear() - 1);
          matchesDateRange = transactionDate >= yearAgo;
          break;
        default:
          matchesDateRange = true;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  }) || [];

  const handleExport = () => {
    // In a real implementation, this would export the data to CSV or Excel
    alert("تصدير البيانات إلى ملف Excel");
  };

  // Calculate summary statistics
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  const completedTransactions = filteredTransactions.filter(t => t.status === 'completed');
  const pendingTransactions = filteredTransactions.filter(t => t.status === 'pending');
  const cancelledTransactions = filteredTransactions.filter(t => t.status === 'cancelled');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">إجمالي المعاملات</CardTitle>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">معاملة</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">الإجمالي</CardTitle>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">إجمالي المبالغ</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">مكتملة</CardTitle>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{completedTransactions.length}</div>
            <p className="text-xs text-muted-foreground">معاملة مكتملة</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">معلقة</CardTitle>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{pendingTransactions.length}</div>
            <p className="text-xs text-muted-foreground">معاملة معلقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/70">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            تصفية البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم المعاملة أو اسم المريض"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="year">هذه السنة</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="gap-2 h-9 text-sm">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-card/70">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              قائمة المعاملات
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              إجمالي المعاملات: {filteredTransactions.length}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">لا توجد معاملات</h3>
              <p className="text-sm text-muted-foreground">جرب تغيير فلاتر البحث</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards - Visible on small screens */}
              <div className="block lg:hidden space-y-3">
                {filteredTransactions.map((transaction) => (
                  <TransactionCard key={transaction.id || transaction.date} transaction={transaction} />
                ))}
              </div>

              {/* Desktop Table - Hidden on small screens */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">رقم المعاملة</TableHead>
                      <TableHead className="text-xs sm:text-sm">المريض والتاريخ</TableHead>
                      <TableHead className="text-xs sm:text-sm">المبلغ</TableHead>
                      <TableHead className="text-xs sm:text-sm">الحالة</TableHead>
                      <TableHead className="text-xs sm:text-sm">طريقة الدفع</TableHead>
                      <TableHead className="text-xs sm:text-sm">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TransactionRow key={transaction.id || transaction.date} transaction={transaction} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}