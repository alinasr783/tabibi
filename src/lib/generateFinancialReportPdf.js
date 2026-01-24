import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function generateFinancialReportPdf(stats, records, chartData, dateRange, clinicInfo, doctorName) {
  // Aggregate chart data by day
  const dailyData = {};
  chartData.forEach(record => {
    const date = record.recorded_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { date, income: 0, expense: 0 };
    }
    if (record.type === 'income') {
      dailyData[date].income += parseFloat(record.amount);
    } else {
      dailyData[date].expense += parseFloat(record.amount);
    }
  });

  const sortedDays = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate max value for chart scaling
  const maxVal = Math.max(
    ...sortedDays.map(d => Math.max(d.income, d.expense)),
    1 // avoid division by zero
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP'
    }).format(amount);
  };

  // SVG Icons
  const icons = {
    clinic: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M14 22v-4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/><rect x="6" y="5" width="4" height="4"/><rect x="12" y="5" width="4" height="4"/><rect x="6" y="11" width="4" height="4"/><rect x="12" y="11" width="4" height="4"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    income: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    expense: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`,
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h2v-4Z"></path></svg>`,
    chart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`,
    list: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
  };

  const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير مالي شامل</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #2563eb;
          --primary-light: #eff6ff;
          --success: #16a34a;
          --success-light: #dcfce7;
          --danger: #dc2626;
          --danger-light: #fee2e2;
          --text: #1e293b;
          --text-light: #64748b;
          --border: #e2e8f0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Tajawal', sans-serif;
          color: var(--text);
          background: white;
          padding: 20px;
          font-size: 14px;
          direction: rtl;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--border);
        }

        .clinic-info {
          text-align: right;
          flex: 1;
        }

        .clinic-info h2 {
          font-size: 20px;
          font-weight: 800;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .clinic-info h2 svg {
          color: var(--primary);
        }

        .clinic-info p {
          color: var(--text-light);
          font-size: 13px;
          margin-right: 32px; /* Indent to align with text start */
        }

        .header-info {
          text-align: left;
          flex: 1;
        }

        .header-info h1 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 8px;
        }

        .header-info .meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        
        .header-info .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-light);
          font-size: 13px;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .card {
          padding: 20px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .card.income { background: var(--success-light); border-color: var(--success); }
        .card.expense { background: var(--danger-light); border-color: var(--danger); }
        .card.net { background: var(--primary-light); border-color: var(--primary); }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card h3 {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.9;
        }
        
        .card-icon {
          opacity: 0.2;
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
        }
        
        .card-icon svg {
          width: 100%;
          height: 100%;
        }

        .card .amount {
          font-size: 28px;
          font-weight: 800;
          z-index: 1;
          position: relative;
        }

        .chart-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .section-header svg {
          color: var(--primary);
        }

        .chart-title {
          font-size: 18px;
          font-weight: 700;
        }

        .chart-container {
          height: 300px;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 20px 0;
          border-bottom: 1px solid var(--border);
        }

        .bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          height: 100%;
          gap: 4px;
          position: relative;
        }

        .bar-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 4px;
          align-items: flex-end;
          height: 100%;
        }

        .bar {
          width: 40%;
          border-radius: 4px 4px 0 0;
          min-height: 2px;
          transition: height 0.3s;
        }

        .bar.income { background: var(--success); opacity: 0.8; }
        .bar.expense { background: var(--danger); opacity: 0.8; }

        .bar-label {
          font-size: 10px;
          color: var(--text-light);
          margin-top: 8px;
          text-align: center;
          transform: rotate(-45deg);
          white-space: nowrap;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }

        th {
          text-align: right;
          padding: 12px;
          background: #f1f5f9;
          font-weight: 700;
          color: var(--text);
          border-bottom: 2px solid var(--border);
        }

        td {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }

        tr:nth-child(even) {
          background: #f8fafc;
        }

        .type-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }

        .type-income { background: var(--success-light); color: var(--success); }
        .type-expense { background: var(--danger-light); color: var(--danger); }

        .footer {
          text-align: center;
          color: var(--text-light);
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="clinic-info">
          <h2>${icons.clinic} ${clinicInfo?.name || 'العيادة'}</h2>
          <p>د. ${doctorName || ''}</p>
          <p>${clinicInfo?.address || ''}</p>
        </div>
        
        <div class="header-info">
          <h1>تقرير مالي شامل</h1>
          <div class="meta">
            <div class="meta-item">
              ${icons.calendar}
              <span>${format(new Date(dateRange.startDate), 'dd MMMM yyyy', { locale: ar })} - ${format(new Date(dateRange.endDate), 'dd MMMM yyyy', { locale: ar })}</span>
            </div>
            <div class="meta-item">
              <span>تاريخ الإصدار: ${format(new Date(), 'dd MMMM yyyy - hh:mm a', { locale: ar })}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="card income">
          <div class="card-header">
            <h3>إجمالي الإيرادات</h3>
          </div>
          <div class="amount" style="color: var(--success)">${formatCurrency(stats.totalIncome)}</div>
          <div class="card-icon">${icons.income}</div>
        </div>
        <div class="card expense">
          <div class="card-header">
            <h3>إجمالي المصروفات</h3>
          </div>
          <div class="amount" style="color: var(--danger)">${formatCurrency(stats.totalExpense)}</div>
          <div class="card-icon">${icons.expense}</div>
        </div>
        <div class="card net">
          <div class="card-header">
            <h3>صافي الربح</h3>
          </div>
          <div class="amount" style="color: var(--primary)">${formatCurrency(stats.netProfit)}</div>
          <div class="card-icon">${icons.wallet}</div>
        </div>
      </div>

      <div class="chart-section">
        <div class="section-header">
          ${icons.chart}
          <div class="chart-title">تحليل الإيرادات والمصروفات</div>
        </div>
        <div class="chart-container">
          ${sortedDays.map(day => `
            <div class="bar-group">
              <div class="bar-wrapper">
                <div class="bar income" style="height: ${(day.income / maxVal) * 100}%"></div>
                <div class="bar expense" style="height: ${(day.expense / maxVal) * 100}%"></div>
              </div>
              <div class="bar-label">${format(new Date(day.date), 'dd/MM')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="transactions-section">
        <div class="section-header">
          ${icons.list}
          <div class="chart-title">تفاصيل المعاملات</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>الوصف</th>
              <th>المبلغ</th>
              <th>المريض</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr>
                <td>${format(new Date(record.recorded_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}</td>
                <td>
                  <span class="type-badge ${record.type === 'income' ? 'type-income' : 'type-expense'}">
                    ${record.type === 'income' ? 'إيراد' : 'مصروف'}
                  </span>
                </td>
                <td>${record.description || '-'}</td>
                <td style="font-weight: 700; color: ${record.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                  ${formatCurrency(record.amount)}
                </td>
                <td>${record.patient?.name || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام طبيبي</p>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  } else {
    alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير");
  }
}
