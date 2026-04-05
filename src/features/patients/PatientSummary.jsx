import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Sparkles, Loader2, Save, RefreshCw, Trash2, FileText, ChevronDown, User, Activity, AlertCircle, ClipboardList, Stethoscope } from "lucide-react";
import { updatePatient } from "../../services/apiPatients";
import { processUniversalIntelligenceStream } from "../../services/groqService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function PatientSummary({ patient, visits = [], appointments = [] }) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(patient?.summary || "");
  const [isNewSummary, setIsNewSummary] = useState(false);
  const queryClient = useQueryClient();

  // Update current summary when patient data changes (if it's not a new unsaved summary)
  useEffect(() => {
    if (!isNewSummary) {
      setCurrentSummary(patient?.summary || "");
    }
  }, [patient?.summary, isNewSummary]);

  const generateSummary = async () => {
    setIsSummarizing(true);
    setIsNewSummary(true);
    
    // Construct context for the AI
    const context = {
      patient_info: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        job: patient.job,
        marital_status: patient.marital_status,
        blood_type: patient.blood_type,
        medical_history: patient.medical_history,
        notes: patient.notes,
        custom_fields: patient.custom_fields
      },
      visits: (visits || []).map(v => ({
        date: v.created_at,
        diagnosis: v.diagnosis,
        notes: v.notes,
        medications: v.medications
      })),
      appointments: (appointments || []).map(a => ({
        date: a.date,
        status: a.status,
        notes: a.notes
      })),
      chat_history: (patient?.ai_chat_log || patient?.medical_history?.ai_chat_log || []).map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : (msg.content?.text || "")
      }))
    };

    const prompt = `أنت مساعد طبي ذكي في منصة "طبيبي". 
قم بتلخيص ملف المريض المذكور أدناه باللهجة المصرية العامية البسيطة وبدقة شاملة جداً.

يجب أن يكون الرد عبارة عن كود HTML بسيط ومنظم (بدون <html> أو <body>) يستخدم التنسيقات التالية فقط:
- <h3> للعناوين الرئيسية
- <p> للفقرات
- <ul> و <li> للقوائم
- <strong> للكلمات الهامة
- <span class="badge"> للقيم الهامة

قواعد التلخيص (هامة جداً):
1. الشمولية التامة: اقرأ كل البيانات المدخلة في الملف، وخصوصاً "سجل الدردشة مع المساعد الشخصي" (chat_history). أي معلومة طبية أو ملاحظة ذكرها المريض أو الطبيب في الشات لازم تطلع منها في الملخص.
2. لا تترك أي تفصيلة: لو فيه أي حاجة مهمة تخص المريض (حتى لو صغيرة) لازم تقولها.
3. الهيكل: 
   - ابدأ بالفقرة التعريفية (الاسم، الوظيفة، آخر زيارة، الأمراض المزمنة).
   - ثم عنوان <h3> اسمه "الخلاصة الطبية والتفاصيل الهامة".
   - تحت العنوان، استخدم قائمة <ul> لذكر كل الملاحظات المستخرجة من الزيارات، السجل الطبي، والدردشة مع المساعد.
4. اللهجة: استخدم اللهجة المصرية البسيطة والمفهومة.
5. لا تذكر "لا يوجد": لو مفيش معلومة، متكتبش عنها.

تنبيه: سجل الدردشة (chat_history) كنز للمعلومات، حلله كويس وطلع منه أي شكوى أو طلب أو ملاحظة طبية اتقالت فيه.`;

    try {
      const result = await processUniversalIntelligenceStream(context, prompt, {
        onPartialReply: (text) => {
          if (typeof text === 'object' && text?.reply) {
            setCurrentSummary(text.reply);
          } else if (typeof text === 'string') {
            setCurrentSummary(text);
          }
        }
      });
      
      if (result?.reply) {
        setCurrentSummary(result.reply);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("فشل في توليد التلخيص. حاول مرة أخرى.");
      setIsNewSummary(false);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = async () => {
    try {
      await updatePatient(patient.id, { summary: currentSummary });
      setIsNewSummary(false);
      queryClient.invalidateQueries({ queryKey: ["patient", patient.id] });
      toast.success("تم حفظ التلخيص بنجاح");
    } catch (error) {
      console.error("Error saving summary:", error);
      toast.error("فشل في حفظ التلخيص.");
    }
  };

  const handleClear = async () => {
    try {
      if (patient?.summary) {
        await updatePatient(patient.id, { summary: null });
        queryClient.invalidateQueries({ queryKey: ["patient", patient.id] });
      }
      setCurrentSummary("");
      setIsNewSummary(false);
      toast.success("تم مسح التلخيص");
    } catch (error) {
      console.error("Error clearing summary:", error);
      toast.error("فشل في مسح التلخيص.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative rounded-2xl p-0.5"
    >
      {/* Border Glow matching TabibiIntelligence */}
      <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-2xl" />
      
      <div className="relative bg-transparent backdrop-blur-lg border border-primary/35 ring-1 ring-primary/20 shadow-none rounded-2xl overflow-hidden">
        
        {/* Header matching TabibiIntelligence */}
        <div className="px-4 py-3 border-b border-primary/25 bg-transparent backdrop-blur-0 flex flex-row items-center justify-between" dir="rtl">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-sans">
              ملخص المريض الذكي
            </span>
          </div>
          
          <Button 
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 rounded-full px-4 text-xs font-bold transition-all ${currentSummary ? 'text-red-500 hover:bg-red-50' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'}`}
            onClick={currentSummary ? handleClear : generateSummary}
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : currentSummary ? (
              <Trash2 className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isSummarizing ? "جاري التلخيص..." : currentSummary ? "امسح" : "لخص"}
          </Button>
        </div>
        
        <AnimatePresence>
          {(currentSummary || isSummarizing) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-4 space-y-4 bg-slate-50/50" dir="rtl">
                <div className="relative">
                  {/* Chat-style Assistant Message Box */}
                  <div className="max-w-full rounded-2xl px-5 py-4 text-sm leading-relaxed bg-primary/10 text-slate-900 rounded-tl-none border border-primary/10 shadow-sm relative">
                    {isSummarizing && !currentSummary ? (
                      <div className="flex items-center gap-3 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري معالجة بيانات المريض وتحليل السجل الطبي...</span>
                      </div>
                    ) : (
                      <div 
                        className="summary-content prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: currentSummary }}
                      />
                    )}
                    
                    {/* CSS for HTML Summary Content */}
                    <style dangerouslySetInnerHTML={{ __html: `
                      .summary-content h3 { 
                        color: #1e40af; 
                        font-weight: 800; 
                        margin-top: 1rem; 
                        margin-bottom: 0.5rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.95rem;
                      }
                      .summary-content p { margin-bottom: 0.75rem; color: #334155; line-height: 1.6; }
                      .summary-content ul { margin-bottom: 1rem; padding-right: 1.25rem; list-style-type: disc; }
                      .summary-content li { margin-bottom: 0.25rem; color: #475569; }
                      .summary-content strong { color: #1e293b; font-weight: 700; }
                      .summary-content .badge {
                        display: inline-block;
                        padding: 0.1rem 0.5rem;
                        background-color: #eff6ff;
                        color: #2563eb;
                        border: 1px solid #dbeafe;
                        border-radius: 9999px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin: 0 0.2rem;
                      }
                    `}} />
                  </div>
                </div>
                
                {currentSummary && !isSummarizing && (
                  <div className="flex flex-row gap-3 mt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10 gap-2 rounded-xl border-primary/30 hover:bg-primary/5 text-primary font-bold shadow-sm text-xs"
                      onClick={generateSummary}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      إعادة التلخيص
                    </Button>
                    <Button 
                      variant="default" 
                      className={`flex-1 h-10 gap-2 rounded-xl font-bold shadow-md transition-all text-xs ${isNewSummary ? 'bg-primary hover:bg-primary/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      onClick={handleSave}
                      disabled={!isNewSummary}
                    >
                      <Save className="w-3.5 h-3.5" />
                      حفظ التلخيص
                    </Button>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

