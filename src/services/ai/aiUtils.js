// Helper to get current date/time in Arabic format
function getCurrentDateTime() {
  const now = new Date();
  const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const dayName = arabicDays[now.getDay()];
  const day = now.getDate();
  const month = arabicMonths[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'مساءً' : 'صباحًا';
  const displayHours = hours % 12 || 12;
  
  return {
    full: `${dayName} ${day} ${month} ${year}`,
    date: `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${displayHours}:${minutes} ${period}`,
    dayName,
    dayNumber: day,
    month,
    year,
    isoDate: now.toISOString().split('T')[0]
  };
}

// Helper to determine if a query is complex (needs DeepSeek) or simple (Gemini)
function isComplexQuery(message) {
  const simplePatterns = [
    /غير.*لون/i,
    /غير.*الوان/i,
    /اللون.*ال/i,
    /وضع.*ليلي/i,
    /وضع.*نهاري/i,
    /dark mode/i,
    /light mode/i,
    /فعل.*حجز/i,
    /وقف.*حجز/i,
    /انسخ.*رابط/i,
    /رابط.*حجز/i,
    /شكرا/i,
    /تمام/i,
    /حلو/i,
    /مرحبا/i,
    /ازيك/i,
    /اهلا/i,
  ];
  
  return !simplePatterns.some(pattern => pattern.test(message));
}

export {
  getCurrentDateTime,
  isComplexQuery
};