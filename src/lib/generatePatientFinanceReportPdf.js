import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function generatePatientFinanceReportPdf(summary, ledger, dateRange, clinicInfo, doctorName, patientInfo) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(Number(amount) || 0);
  };

  const rowsHtml = (ledger || [])
    .map((r) => {
      const date = r.recorded_at || r.created_at;
      const typeLabel = r.type === "charge" ? "مستحقات" : r.type === "income" ? "مدفوعات" : r.type;
      const typeColor = r.type === "charge" ? "#d97706" : r.type === "income" ? "#16a34a" : "#64748b";
      const sign = r.type === "income" ? "-" : "+";

      const sources = [];
      if (r.appointment_id) sources.push(`موعد #${r.appointment_id}`);
      if (r.visit_id) sources.push(`كشف #${r.visit_id}`);
      if (r.patient_plan_id) sources.push(`خطة #${r.patient_plan_id}`);
      if (r.plan?.treatment_templates?.name) sources.push(r.plan.treatment_templates.name);
      if (r.reference_key) sources.push(r.reference_key);

      return `
        <tr>
          <td>${date ? format(new Date(date), "dd/MM/yyyy hh:mm a", { locale: ar }) : "-"}</td>
          <td><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f1f5f9;color:${typeColor};font-weight:700">${typeLabel}</span></td>
          <td>${r.description || "-"}</td>
          <td style="font-weight:800;color:${typeColor}">${sign} ${formatCurrency(r.amount)}</td>
          <td style="font-size:12px;color:#475569">${sources.length ? sources.join(" • ") : "-"}</td>
        </tr>
      `;
    })
    .join("");

  const title = "تقرير مراقبة ماليات المريض";
  const patientName = patientInfo?.name || "مريض";

  const dateText = dateRange?.startDate && dateRange?.endDate
    ? `${format(new Date(dateRange.startDate), "dd/MM/yyyy", { locale: ar })} - ${format(new Date(dateRange.endDate), "dd/MM/yyyy", { locale: ar })}`
    : "كل الفترة";

  const html = `
    <!doctype html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Tajawal', sans-serif; color: #0f172a; background: #fff; padding: 20px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; margin-bottom: 18px;}
          .h1 { font-size: 20px; font-weight: 800; color:#1d4ed8; margin-bottom: 6px;}
          .sub { font-size: 12px; color:#64748b; line-height: 1.6; }
          .cards { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0 18px; }
          .card { border:1px solid #e2e8f0; border-radius: 12px; padding: 12px; background:#f8fafc; }
          .card .k { font-size: 12px; color:#64748b; margin-bottom: 6px; }
          .card .v { font-size: 18px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; border:1px solid #e2e8f0; border-radius: 12px; overflow:hidden; }
          th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          th { background:#f1f5f9; text-align: right; font-size: 12px; color:#334155; }
          td { font-size: 13px; }
          .footer { margin-top: 14px; color:#64748b; font-size: 11px; text-align:center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="h1">${title}</div>
            <div class="sub">
              <div>المريض: <strong>${patientName}</strong></div>
              <div>الفترة: <strong>${dateText}</strong></div>
              <div>العيادة: <strong>${clinicInfo?.name || "-"}</strong></div>
              <div>الطبيب: <strong>${doctorName || "-"}</strong></div>
            </div>
          </div>
          <div class="sub" style="text-align:left">
            <div>تاريخ الطباعة:</div>
            <div><strong>${format(new Date(), "dd/MM/yyyy hh:mm a", { locale: ar })}</strong></div>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="k">إجمالي المستحقات</div>
            <div class="v" style="color:#d97706">${formatCurrency(summary?.totalCharges)}</div>
          </div>
          <div class="card">
            <div class="k">إجمالي المدفوعات</div>
            <div class="v" style="color:#16a34a">${formatCurrency(summary?.totalPayments)}</div>
          </div>
          <div class="card">
            <div class="k">الرصيد (مستحق)</div>
            <div class="v" style="color:${(summary?.balance || 0) > 0 ? "#dc2626" : "#0f172a"}">${formatCurrency(summary?.balance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:140px">التاريخ</th>
              <th style="width:110px">النوع</th>
              <th>السبب/الوصف</th>
              <th style="width:140px">المبلغ</th>
              <th style="width:260px">المصدر</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="5" style="text-align:center;color:#64748b">لا توجد بيانات</td></tr>`}
          </tbody>
        </table>

        <div class="footer">تم إنشاء هذا التقرير تلقائياً بواسطة نظام طبيبي</div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 400); };
        </script>
      </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  } else {
    alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير");
  }
}
