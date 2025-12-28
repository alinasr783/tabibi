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

// Prayer times approximation (can be replaced with actual API)
const PRAYER_TIMES = {
  fajr: '04:30',
  sunrise: '06:00',
  dhuhr: '12:00',
  asr: '15:30',
  maghrib: '18:00',
  isha: '19:30'
};

// Parse natural language time to 24-hour format
function parseNaturalTime(text, referenceDate = new Date()) {
  const lowerText = text.toLowerCase();
  
  // Handle relative times
  if (lowerText.includes('بكرة') || lowerText.includes('بكرا')) {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: tomorrow.toISOString().split('T')[0] };
  }
  
  if (lowerText.includes('بعد بكرة') || lowerText.includes('بعد بكرا')) {
    const dayAfterTomorrow = new Date(referenceDate);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return { date: dayAfterTomorrow.toISOString().split('T')[0] };
  }
  
  // Handle prayer-based times
  const prayerMatch = lowerText.match(/(بعد|قبل)\s*(ال)?(فجر|الشروق|الظهر|العصر|المغرب|العشاء)/);
  if (prayerMatch) {
    const [_, beforeAfter, __, prayer] = prayerMatch;
    const prayerMap = {
      'فجر': 'fajr',
      'شروق': 'sunrise',
      'ظهر': 'dhuhr',
      'عصر': 'asr',
      'مغرب': 'maghrib',
      'عشاء': 'isha'
    };
    
    const prayerKey = prayerMap[prayer];
    if (prayerKey && PRAYER_TIMES[prayerKey]) {
      const [hours, minutes] = PRAYER_TIMES[prayerKey].split(':').map(Number);
      
      // Add or subtract 30 minutes based on بعد/قبل
      const adjustedMinutes = beforeAfter === 'بعد' ? minutes + 30 : minutes - 30;
      const adjustedHours = hours + Math.floor(adjustedMinutes / 60);
      const finalMinutes = adjustedMinutes % 60;
      
      return { 
        time: `${adjustedHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}` 
      };
    }
  }
  
  // Handle numeric times
  const numericMatch = lowerText.match(/الساعة\s*(\d+)/);
  if (numericMatch) {
    const hour = parseInt(numericMatch[1]);
    // Determine AM/PM based on context
    const isPM = lowerText.includes('مساء') || lowerText.includes('بعد الظهر') || (hour < 8 && !lowerText.includes('صباح'));
    const hour24 = isPM && hour < 12 ? hour + 12 : hour;
    return { time: `${hour24.toString().padStart(2, '0')}:00` };
  }
  
  // Handle Arabic number words
  const arabicNumbers = {
    'واحدة': 1, 'اتنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5,
    'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    'حداشر': 11, 'اثناشر': 12
  };
  
  for (const [word, num] of Object.entries(arabicNumbers)) {
    if (lowerText.includes(word)) {
      const isPM = lowerText.includes('مساء') || lowerText.includes('بعد الظهر') || (num < 8 && !lowerText.includes('صباح'));
      const hour24 = isPM && num < 12 ? num + 12 : num;
      return { time: `${hour24.toString().padStart(2, '0')}:00` };
    }
  }
  
  return null;
}

export {
  getCurrentDateTime,
  isComplexQuery,
  parseNaturalTime
};