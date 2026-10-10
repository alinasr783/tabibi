import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TrendingUp, Wallet, ChevronLeft, ChevronRight, Receipt, CreditCard, UserCheck, PieChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { getFinancialChartData } from '../../services/apiFinancialRecords';
import { getAppointmentTypes } from '../../services/apiAppointmentTypes';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import supabase from '../../services/supabase';
import { getAllMyClinicIds } from '../../services/clinicAccess';

// Helper to format date for title depending on date model
const getTitleDate = (offset, model) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  
  if (model === 'date') {
    return format(d, 'd MMMM', { locale: ar });
  }
  // Relative labels
  if (offset === 0) return 'اليوم';
  if (offset === 1) return 'بكرة';
  if (offset === 2) return 'بعد بكره';
  if (offset === -1) return 'امبارح';
  if (offset === -2) return 'اول امبارح';
  if (offset === -3) return 'من يومين';
  return format(d, 'd MMMM', { locale: ar });
};

export default function DailyRevenueWidget() {
  const { data: preferences } = useUserPreferences();
  const dateModel = preferences?.home_date_model ?? 'days';
  const [dateOffset, setDateOffset] = useState(0);

  // Compute day range for the target day
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + dateOffset);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  const { data: chartData, isLoading, isError, error } = useQuery({
    queryKey: ['financial-chart', dateOffset],
    queryFn: () => getFinancialChartData({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Get appointment types
  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointmentTypes'],
    queryFn: getAppointmentTypes,
  });

  // Get completed appointments for the day to calculate revenue by type
  const { data: dayAppointments } = useQuery({
    queryKey: ['appointments-revenue', dateOffset],
    queryFn: async () => {
      const clinicIds = await getAllMyClinicIds();
      const dateStr = format(startDate, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('appointments')
        .select('id, price, appointment_type, status')
        .in('clinic_id', clinicIds)
        .eq('status', 'completed')
        .like('date', dateStr + '%');
      
      return data || [];
    },
    enabled: dateOffset === 0,
  });

  // Aggregate revenue by appointment type
  const revenueByAppointmentType = useMemo(() => {
    const appointments = dayAppointments ?? [];
    const typeRevenue = {};
    
    for (const apt of appointments) {
      const typeId = apt.appointment_type;
      const price = Number(apt.price) || 0;
      
      if (!typeId) continue;
      
      if (!typeRevenue[typeId]) {
        typeRevenue[typeId] = { total: 0, count: 0 };
      }
      typeRevenue[typeId].total += price;
      typeRevenue[typeId].count += 1;
    }
    
    return typeRevenue;
  }, [dayAppointments]);

  // Aggregate revenue by type
  const revenueByType = useMemo(() => {
    const records = chartData ?? [];
    let totalIncome = 0;
    let totalCharges = 0;
    let transactionCount = 0;
    
    for (const r of records) {
      const amount = Number(r?.amount) || 0;
      if (!amount) continue;
      
      transactionCount++;
      
      if (r?.type === 'income') {
        totalIncome += amount;
      } else if (r?.type === 'charge') {
        totalCharges += amount;
      }
    }
    
    return { totalIncome, totalCharges, transactionCount };
  }, [chartData]);

  const totalRevenue = revenueByType.totalIncome + revenueByType.totalCharges;
  
  // Format currency nicely
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', { 
      maximumFractionDigits: 0 
    }).format(amount) + ' ج.م';
  };

  const titleDate = getTitleDate(dateOffset, dateModel);
  const title = `إيرادات ${titleDate}`;

  const goNext = () => setDateOffset((d) => d + 1);
  const goPrev = () => setDateOffset((d) => d - 1);

  return (
    <Card className="p-3 sm:p-4 md:p-6 bg-gradient-to-br from-card to-card/50 border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center w-full justify-between" dir="rtl">
          {/* Title on right (RTL), icon and text */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
          </div>
          {/* Navigation buttons on left (RTL) */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={goNext} disabled={dateOffset >= 30} className="h-8 w-8 p-0">
              <ChevronRight className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={goPrev} disabled={dateOffset <= -30} className="h-8 w-8 p-0">
              <ChevronLeft className="size-4" />
            </Button>                       
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2"></div>
            <span className="text-sm">جارٍ التحميل...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <Receipt className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">فشل تحميل الإيرادات</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Revenue Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</span>
                </div>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">الدخل</span>
                </div>
                <span className="text-sm font-bold text-green-700">{formatCurrency(revenueByType.totalIncome)}</span>
              </div>
              
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">الرسوم</span>
                </div>
                <span className="text-sm font-bold text-blue-700">{formatCurrency(revenueByType.totalCharges)}</span>
              </div>
            </div>

            {/* Transaction Count */}
            {revenueByType.transactionCount > 0 && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {revenueByType.transactionCount} عملية
                </span>
              </div>
            )}

            {/* Revenue by Appointment Type */}
            {Object.keys(revenueByAppointmentType).length > 0 && (
              <div className="border-t pt-3 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">الإيرادات حسب نوع الحجز</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(revenueByAppointmentType).map(([typeId, data]) => {
                    const type = appointmentTypes.find(t => t.id === typeId);
                    if (!type) return null;
                    return (
                      <div 
                        key={typeId} 
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: `${type.color}10` }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="text-sm font-medium" style={{ color: type.color }}>
                            {type.name}
                          </span>
                          <span className="text-xs text-muted-foreground">({data.count})</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: type.color }}>
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalRevenue === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Wallet className="w-10 h-10 mb-2 opacity-30" />
                <span className="text-sm">لا توجد إيرادات لهذا اليوم</span>
                <span className="text-xs opacity-70 mt-1">ستظهر هنا عند تسجيل أي مدفوعات</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}