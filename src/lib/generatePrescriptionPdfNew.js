export default async function generatePrescriptionPdfNew(visit, doctorName, clinicName, clinicAddress, shareViaWhatsApp = false, planData = null) {
  try {
    // Check if watermark feature is enabled in the plan
    const isWatermarkEnabled = planData?.plans?.limits?.features?.watermark === true;

    // Create a minimalist, eye-friendly HTML version for printing
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>روشتة طبية</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Tajawal', Arial, sans-serif; 
            background-color: #ffffff;
            padding: 0;
            color: #333;
            direction: rtl;
            position: relative;
          }
          
          .prescription-container {
            width: 100%;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 5mm;
            position: relative;
          }
          
          ${isWatermarkEnabled ? `
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            opacity: 0.1;
            font-size: 120px;
            font-weight: bold;
            color: #2980b9;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.2);
            user-select: none;
          }
          ` : ''}
          
          .header {
            margin-bottom: 3mm;
          }
          
          .doctor-date-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1mm;
          }
          
          .doctor-info {
            font-size: 5mm;
            color: #3498db;
            font-weight: 500;
          }
          
          .visit-date {
            font-size: 3.5mm;
            color: #7f8c8d;
            font-weight: 500;
          }
          
          .clinic-address {
            font-size: 3.5mm;
            color: #7f8c8d;
            margin-top: 1mm;
          }
          
          .divider {
            height: 1mm;
            background-color: #ecf0f1;
            margin: 5mm 0;
          }
          
          .section {
            margin-bottom: 5mm;
          }
          
          .section-title {
            font-size: 5mm;
            font-weight: 500;
            color: #3498db;
            margin-bottom: 2mm;
            padding-bottom: 1mm;
            border-bottom: 0.3mm solid #ecf0f1;
          }
          
          .medications-list {
            padding: 1mm;
            max-height: 140mm;
            overflow: hidden;
          }
          
          .medication-item {
            padding: 2mm 0;
            border-bottom: 0.3mm solid #ecf0f1;
            display: flex;
          }
          
          .medication-item:last-child {
            border-bottom: none;
          }
          
          .med-number {
            color: #3498db;
            font-weight: 500;
            font-size: 4mm;
            min-width: 7mm;
            margin-left: 2mm;
          }
          
          .med-details {
            flex: 1;
          }
          
          .med-name {
            font-weight: 500;
            font-size: 4mm;
            color: #2c3e50;
            margin-bottom: 1mm;
            word-break: break-word;
            white-space: pre-wrap;
          }
          
          .med-using {
            font-size: 3.5mm;
            color: #7f8c8d;
            word-break: break-word;
            white-space: pre-wrap;
          }
          
          .no-medications {
            text-align: center;
            padding: 3mm;
            color: #95a5a6;
            font-style: italic;
          }
          
          .signature-section {
            margin-top: 8mm;
            padding-top: 3mm;
            border-top: 0.3mm solid #ecf0f1;
            position: fixed;
            bottom: 15mm;
            left: 5mm;
            right: 5mm;
          }
          
          .signature-label {
            font-weight: 500;
            color: #7f8c8d;
            margin-bottom: 5mm;
          }
          
          .signature-line {
            width: 50mm;
            border-top: 0.3mm solid #bdc3c7;
            padding-top: 1mm;
            font-size: 3mm;
            color: #95a5a6;
          }
          
          .footer {
            text-align: center;
            color: #bdc3c7;
            font-size: 3mm;
            position: fixed;
            bottom: 5mm;
            left: 0;
            right: 0;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
              margin: 0;
            }
            
            .prescription-container {
              width: 100%;
              min-height: 297mm;
              height: 297mm;
              box-shadow: none;
              padding: 5mm;
              page-break-inside: avoid;
              margin: 0;
            }
            
            .medications-list {
              max-height: 140mm;
              overflow: hidden;
            }
          }
        </style>
      </head>
      <body>
        <div class="prescription-container">
          ${isWatermarkEnabled ? '<div class="watermark">tabibi.eg</div>' : ''}
          <div class="header">
            <div class="doctor-date-info">
              <div class="doctor-info">دكتور: ${doctorName || 'اسم الطبيب غير متوفر'}</div>
              <div class="visit-date">التاريخ: ${visit.created_at ? new Date(visit.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
            </div>
            <div class="clinic-address">${clinicAddress || 'عنوان العيادة غير متوفر'}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section">
            <div class="section-title">الأدوية الموصوفة</div>
            <div class="medications-list">
              ${visit.medications && Array.isArray(visit.medications) && visit.medications.length > 0
        ? visit.medications.map((med, index) => `
                    <div class="medication-item">
                      <div class="med-number">${index + 1}.</div>
                      <div class="med-details">
                        <div class="med-name">${med.name || ''}</div>
                        <div class="med-using">${med.using || ''}</div>
                      </div>
                    </div>
                  `).join('')
        : '<div class="no-medications">لا توجد أدوية محددة</div>'
      }
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-label">التوقيع</div>
            <div class="signature-line">______________________</div>
          </div>
          
          <div class="footer">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>
      </body>
      </html>
    `;

    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-1000px';
    iframe.style.left = '-1000px';
    iframe.style.width = '100%';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    // Wait for content to load then print
    iframe.onload = function () {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    // Fallback for download with patient name if needed
    const patientName = visit.patient_name || 'مريض';
    const fileName = `روشتة-${patientName.replace(/\s+/g, '_')}-${new Date().toLocaleDateString('ar-EG')}.html`;

    // Create blob and download link for fallback
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Store the download information in case of popup blocker
    window.prescriptionDownloadInfo = {
      url: url,
      fileName: fileName
    };
  } catch (error) {
    console.error("Error generating prescription:", error);
    alert("حدث خطأ أثناء إنشاء الروشتة. يرجى المحاولة مرة أخرى.");
  }
}