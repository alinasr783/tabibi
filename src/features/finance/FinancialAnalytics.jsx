import React, { useMemo } from 'react';
import { useFinancialChartData } from './useFinancialStats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const INCOME_COLOR = '#10b981'; // emerald-500
const EXPENSE_COLOR = '#ef4444'; // red-500

const FinancialAnalytics = () => {
  const { data: rawData, isLoading } = useFinancialChartData();

  const processedData = useMemo(() => {
    if (!rawData) return { monthlyData: [], expenseData: [] };

    // Group by month
    const monthlyGroups = rawData.reduce((acc, record) => {
      const date = parseISO(record.recorded_at);
      const monthKey = format(startOfMonth(date), 'yyyy-MM');
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          name: format(date, 'MMM yyyy', { locale: arEG }),
          originalDate: date,
          income: 0,
          expense: 0,
          net: 0,
        };
      }

      const amount = parseFloat(record.amount) || 0;
      if (record.type === 'income') {
        acc[monthKey].income += amount;
      } else {
        acc[monthKey].expense += amount;
      }
      acc[monthKey].net = acc[monthKey].income - acc[monthKey].expense;

      return acc;
    }, {});

    const monthlyData = Object.values(monthlyGroups).sort((a, b) => a.originalDate - b.originalDate);

    // Group expenses by description (or category if we had it, using description for now)
    // Limiting to top 5 and "Others"
    const expenseGroups = rawData
      .filter(r => r.type === 'expense')
      .reduce((acc, record) => {
        const key = record.description || 'غير محدد'; // Fallback for empty description
        if (!acc[key]) acc[key] = 0;
        acc[key] += parseFloat(record.amount) || 0;
        return acc;
      }, {});

    let expenseData = Object.entries(expenseGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (expenseData.length > 5) {
      const top5 = expenseData.slice(0, 5);
      const others = expenseData.slice(5).reduce((sum, item) => sum + item.value, 0);
      expenseData = [...top5, { name: 'أخرى', value: others }];
    }

    return { monthlyData, expenseData };
  }, [rawData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
        <Skeleton className="h-[300px] w-full rounded-[var(--radius)]" />
        <Skeleton className="h-[300px] w-full rounded-[var(--radius)]" />
        <Skeleton className="h-[300px] w-full rounded-[var(--radius)] col-span-1 md:col-span-2" />
      </div>
    );
  }

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-muted/10 rounded-[var(--radius)] border border-dashed border-border">
        <p className="text-lg">لا توجد بيانات كافية لعرض التحليلات</p>
        <p className="text-sm">أضف بعض المعاملات المالية لتبدأ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Monthly Overview Chart */}
      <Card className="col-span-1 md:col-span-2 shadow-sm">
        <CardHeader>
          <CardTitle>نظرة عامة شهرية</CardTitle>
          <CardDescription>مقارنة الإيرادات والمصروفات على مدار الأشهر</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData.monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              {/* Tooltip removed to fix React Fiber error */}
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="income" name="الإيرادات" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="expense" name="المصروفات" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Net Profit Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>اتجاه صافي الربح</CardTitle>
            <CardDescription>تطور الأرباح الصافية بمرور الوقت</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processedData.monthlyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                {/* Tooltip removed to fix React Fiber error */}
                <Area 
                  type="monotone" 
                  dataKey="net" 
                  name="صافي الربح" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorNet)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>توزيع المصروفات</CardTitle>
            <CardDescription>أكثر بنود المصروفات تكلفة</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {processedData.expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {processedData.expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  {/* Tooltip removed to fix React Fiber error */}
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                لا توجد بيانات مصروفات
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
