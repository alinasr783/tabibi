import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { TrendingUp, TrendingDown, CreditCard, Calendar, Users, PieChart as PieChartIcon, Activity } from "lucide-react";
import { formatCurrency } from "../../lib/utils";
import { useFinanceStats } from "./useFinanceStats";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

function StatCard({ title, value, icon: Icon, trend, trendLabel, isLoading }) {
  return (
    <Card className="bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {isLoading ? (
          <div className="h-6 w-20 sm:w-24 bg-muted rounded animate-pulse"></div>
        ) : (
          <>
            <div className="text-xl sm:text-2xl font-bold">{value}</div>
            {trend !== undefined && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500 ml-1" />
                ) : null}
                <span>{Math.abs(trend).toFixed(1)}% {trendLabel}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function FinanceOverview() {
  const { data: stats, isLoading } = useFinanceStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={CreditCard}
          trend={stats?.revenueTrend}
          trendLabel="من الشهر الماضي"
          isLoading={isLoading}
        />
        <StatCard
          title="عدد المعاملات"
          value={stats?.transactionCount || 0}
          icon={Calendar}
          trend={stats?.transactionTrend}
          trendLabel="من الشهر الماضي"
          isLoading={isLoading}
        />
        <StatCard
          title="متوسط قيمة المعاملة"
          value={formatCurrency(stats?.avgTransactionValue || 0)}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="العملاء النشطون"
          value={stats?.activeCustomers || 0}
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card/70">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">الإيرادات الشهرية</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          {isLoading ? (
            <div className="h-60 sm:h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stats?.monthlyRevenueData && stats.monthlyRevenueData.length > 0 ? (
            <div className="w-full" style={{ height: '240px', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <AreaChart
                  data={stats.monthlyRevenueData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                    width={45}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'الإيرادات']}
                    labelFormatter={(label) => `شهر: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="الإيرادات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">لا توجد بيانات لإظهارها</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-card/70">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">أحدث المعاملات</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                </div>
              ))
            ) : (
              <>
                {stats?.recentTransactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{transaction.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-medium">{formatCurrency(transaction.amount)}</p>
                      <Badge variant="secondary" className="text-xs">
                        {transaction.status === 'completed' ? 'مكتمل' : transaction.status}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">لا توجد معاملات حديثة</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Chart & Daily Income Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Methods Distribution */}
        <Card className="bg-card/70">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              طرق الدفع
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {isLoading ? (
              <div className="h-60 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : stats?.paymentMethodsData && stats.paymentMethodsData.length > 0 ? (
              <div className="w-full" style={{ height: '240px', minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                  <PieChart>
                    <Pie
                      data={stats.paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'المبلغ']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <PieChartIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">لا توجد بيانات</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Income Trend */}
        <Card className="bg-card/70">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              الإيرادات اليومية (آخر 7 أيام)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            {isLoading ? (
              <div className="h-60 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : stats?.dailyIncomeData && stats.dailyIncomeData.length > 0 ? (
              <div className="w-full" style={{ height: '240px', minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                  <BarChart
                    data={stats.dailyIncomeData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                      width={45}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'الإيرادات']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Bar 
                      dataKey="income" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">لا توجد بيانات</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}