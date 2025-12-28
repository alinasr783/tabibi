// Patients context - for patient-related queries
export const getPatientsPrompt = (patientsData) => {
  const patientsTotal = patientsData?.total || 0;
  const patientsThisMonth = patientsData?.thisMonth || 0;
  const patientsMales = patientsData?.males || 0;
  const patientsFemales = patientsData?.females || 0;
  const recentPatients = patientsData?.recentPatients || [];
  const recentPatientsPreview = recentPatients.slice(0, 5).map(p => p.name).join('، ') || 'لا يوجد';

  return `## المرضى (شامل):
- إجمالي المرضى: **${patientsTotal}**
- هذا الشهر: **${patientsThisMonth}** مريض جديد
- ذكور: **${patientsMales}** | إناث: **${patientsFemales}**
- آخر المرضى: ${recentPatientsPreview}

### أمثلة:
لما حد يسأل عن المرضى:
[icon:Users] عندك **${patientsTotal}** مريض (${patientsThisMonth} جديد هذا الشهر)
\`\`\`action
{"type": "chart", "chartType": "pie", "title": "توزيع المرضى", "data": [{"label": "ذكور", "value": ${patientsMales}, "color": "blue"}, {"label": "إناث", "value": ${patientsFemales}, "color": "pink"}]}
\`\`\`
\`\`\`action
{"type": "button", "label": "عرض المرضى", "navigate": "/patients", "icon": "Users"}
\`\`\``;
};
