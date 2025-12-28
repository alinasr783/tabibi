// Context selector - determines which context modules to include based on query
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Available context modules
const CONTEXT_MODULES = {
  patients: 'معلومات عن المرضى (عدد المرضى، آخر المرضى، توزيع الجنس)',
  appointments: 'معلومات عن المواعيد (مواعيد اليوم، الأسبوع، الشهر، مصادر الحجز)',
  finance: 'معلومات مالية (إيرادات، مصروفات، صافي الربح)',
  subscription: 'معلومات الباقة والاشتراك (حدود الباقة، الاستخدام الحالي)',
  staff: 'معلومات عن الموظفين والسكرتارية',
  treatments: 'معلومات عن الخطط العلاجية وقوالبها',
  clinic: 'إعدادات العيادة (مواعيد العمل، الحجز الإلكتروني)',
  actions: 'تنفيذ الأوامر المباشرة (إضافة مريض، حجز موعد)'
};

// Determine required contexts from user query
export async function selectContextModules(userQuery) {
  try {
    const selectionPrompt = `أنت نظام ذكي لتحديد السياق المطلوب. بناءً على سؤال المستخدم، حدد أي من وحدات السياق التالية مطلوبة للإجابة:

الوحدات المتاحة:
${Object.entries(CONTEXT_MODULES).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

سؤال المستخدم: "${userQuery}"

أرجع JSON فقط بدون أي نص إضافي على الشكل التالي:
{"modules": ["module1", "module2", ...]}

قواعد مهمة:
1. لو السؤال عن إضافة أو عمل شيء (موعد، مريض)، اختار "actions" دائماً
2. لو السؤال عن عدد أو إحصائيات، اختار الوحدة المناسبة
3. لو السؤال عام عن العيادة، اختار أكثر من وحدة
4. اختار فقط الوحدات الضرورية للإجابة`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: selectionPrompt
    });

    const responseText = response.text.trim();
    
    // Extract JSON from response (remove markdown code blocks if present)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }
    
    const result = JSON.parse(jsonText);
    
    // Always include 'actions' as it's core functionality
    const selectedModules = new Set(result.modules || []);
    selectedModules.add('actions'); // Always include actions
    
    return Array.from(selectedModules);
  } catch (error) {
    console.error('Error selecting context modules:', error);
    
    // Fallback: simple keyword-based selection
    return selectContextByKeywords(userQuery);
  }
}

// Fallback keyword-based selection
function selectContextByKeywords(query) {
  const lowerQuery = query.toLowerCase();
  const selected = ['actions']; // Always include actions
  
  // Patient keywords
  if (lowerQuery.match(/مريض|مرضى|patient/i)) {
    selected.push('patients');
  }
  
  // Appointment keywords
  if (lowerQuery.match(/موعد|مواعيد|حجز|appointment/i)) {
    selected.push('appointments');
  }
  
  // Finance keywords
  if (lowerQuery.match(/مالي|فلوس|إيراد|مصروف|finance|money/i)) {
    selected.push('finance');
  }
  
  // Subscription keywords
  if (lowerQuery.match(/باقة|اشتراك|subscription|plan/i)) {
    selected.push('subscription');
  }
  
  // Staff keywords
  if (lowerQuery.match(/موظف|سكرتير|staff/i)) {
    selected.push('staff');
  }
  
  // Treatment keywords
  if (lowerQuery.match(/علاج|خطة|treatment/i)) {
    selected.push('treatments');
  }
  
  // Clinic keywords
  if (lowerQuery.match(/عيادة|إعداد|clinic|setting/i)) {
    selected.push('clinic');
  }
  
  // If general query or no specific keywords, include common contexts
  if (selected.length === 1) { // Only 'actions'
    selected.push('patients', 'appointments');
  }
  
  return selected;
}

export { CONTEXT_MODULES };
