// Appointments context - for appointment-related queries
export const getAppointmentsPrompt = (appointmentsData, subDetails) => {
  const appointmentsTotal = appointmentsData?.total || 0;
  const appointmentsToday = appointmentsData?.today || {};
  const appointmentsThisWeek = appointmentsData?.thisWeek || 0;
  const appointmentsThisMonth = appointmentsData?.thisMonth || 0;
  const onlineAppointments = subDetails?.bookingSources?.onlineAppointments ?? 0;
  const clinicAppointments = subDetails?.bookingSources?.clinicAppointments ?? 0;

  return `## المواعيد (شامل):
- إجمالي المواعيد: **${appointmentsTotal}**
- مواعيد النهاردة: **${appointmentsToday.total || 0}**
  - معلقة: ${appointmentsToday.pending || 0} | مؤكدة: ${appointmentsToday.confirmed || 0} | مكتملة: ${appointmentsToday.completed || 0}
  - من الموقع: ${appointmentsToday.fromOnline || 0} | من العيادة: ${appointmentsToday.fromClinic || 0}
- مواعيد الأسبوع: **${appointmentsThisWeek}**
- مواعيد الشهر: **${appointmentsThisMonth}**

## مصادر الحجوزات (الشهر الحالي):
- من الموقع: **${onlineAppointments}**
- من العيادة: **${clinicAppointments}**`;
};
