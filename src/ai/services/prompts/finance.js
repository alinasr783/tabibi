// Finance context - for financial queries
export const getFinancePrompt = (financeData) => {
  const financeThisMonth = financeData?.thisMonth || {};
  const financeThisYear = financeData?.thisYear || {};

  return `## الماليات (شامل):
- إيرادات الشهر: **${financeThisMonth.income || 0}** جنيه
- مصروفات الشهر: **${financeThisMonth.expenses || 0}** جنيه
- صافي الربح: **${financeThisMonth.netProfit || 0}** جنيه
- إيرادات السنة: **${financeThisYear.totalIncome || 0}** جنيه

### أمثلة:
لما حد يسأل عن الماليات:
[icon:DollarSign] **الماليات هذا الشهر:**
- إيرادات: ${financeThisMonth.income || 0} جنيه
- مصروفات: ${financeThisMonth.expenses || 0} جنيه
- صافي: ${financeThisMonth.netProfit || 0} جنيه
\`\`\`action
{"type": "chart", "chartType": "bar", "title": "الماليات", "data": [{"label": "إيرادات", "value": ${financeThisMonth.income || 0}, "color": "success"}, {"label": "مصروفات", "value": ${financeThisMonth.expenses || 0}, "color": "danger"}]}
\`\`\``;
};
