import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, Paperclip, Sparkles, X, Loader2, StopCircle, ArrowUp, Settings } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { NotificationToast } from '../../features/Notifications/NotificationToast';
import { processPatientInputStream } from '../../services/groqService';
import { updatePatient } from '../../services/apiPatients';
import { updateAppointment } from '../../services/apiAppointments';
import { updateVisit } from '../../services/apiVisits';
import supabase from '../../services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { flattenCustomFieldTemplates, mergeTemplatesIntoCustomFields, normalizeMedicalFieldsConfig } from '../../lib/medicalFieldsConfig';
import 'regenerator-runtime/runtime';
import { useNavigate } from 'react-router-dom';

export default function TabibiIntelligence({ patient }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const textareaRef = useRef(null);
  const previousInputRef = useRef('');
  const [chatLog, setChatLog] = useState(() => {
      const log = patient?.ai_chat_log || patient?.medical_history?.ai_chat_log;
      return Array.isArray(log) ? log : [];
    });
   const activeRequestRef = useRef({ abortController: null, timeoutId: null });
   
   const queryClient = useQueryClient();
   const navigate = useNavigate();
   const { data: preferences } = useUserPreferences();
 
   // Early return if AI is disabled for this page
   if (preferences?.ai_settings?.enabled_pages?.patient_file === false) {
     return null;
   }
 
   const normalizeProposedFieldType = (type) => {
     const t = String(type || "").toLowerCase().trim();
     const allowed = new Set(["text", "textarea", "number", "date", "checkbox", "select", "multiselect", "progress"]);
     return allowed.has(t) ? t : "text";
   };
 
   const defaultValueForType = (type) => {
     const t = normalizeProposedFieldType(type);
     if (t === "checkbox") return false;
     if (t === "multiselect") return [];
     if (t === "progress") return 50;
     return "";
   };
 
   const TabibiAiMessage = ({ ui }) => {
     const changes = Array.isArray(ui?.changes) ? ui.changes : [];
 
     return (
       <div className="space-y-3">
         <div className="flex items-center gap-2">
           <Sparkles className="w-4 h-4 text-blue-700" />
           <div className="text-sm font-bold text-slate-900">{ui?.title || "مساعد المريض الشخصي"}</div>
         </div>
 
         {changes.length > 0 && (
           <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
             <div className="text-xs font-bold text-blue-900">التغييرات</div>
             <div className="space-y-1">
               {changes.slice(0, 8).map((c, i) => (
                 <div key={i} className="text-xs text-slate-800">
                   <span className="font-semibold">{c?.label || "حقل"}</span>
                   {c?.preview ? <span className="opacity-70"> — {c.preview}</span> : null}
                 </div>
               ))}
             </div>
           </div>
         )}
       </div>
     );
   };
 
   // Sync chat history from patient data when it changes externally
   useEffect(() => {
    // Only sync if the incoming data is non-empty or if it's a completely different patient
    const incomingLog = (patient?.ai_chat_log?.length > 0) 
      ? patient.ai_chat_log 
      : (patient?.medical_history?.ai_chat_log?.length > 0)
        ? patient.medical_history.ai_chat_log
        : null;

    if (incomingLog) {
      setChatLog(incomingLog);
    }
  }, [patient?.id, patient?.ai_chat_log, patient?.medical_history?.ai_chat_log]);

  // Scroll to bottom of chat
  const chatContainerRef = useRef(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLog]);

  // Memoize config to ensure we always have valid structure
  const medicalFieldsConfig = useMemo(
    () => normalizeMedicalFieldsConfig(preferences?.medical_fields_config),
    [preferences?.medical_fields_config]
  );
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Realtime subscription for patient updates
  useEffect(() => {
    if (!patient?.id) return;

    const channel = supabase
      .channel(`patient-${patient.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patient.id}`,
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
          queryClient.invalidateQueries({ queryKey: ['patient', String(patient.id)] });
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patient?.id, queryClient]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Sync transcript with input safely
  useEffect(() => {
    if (listening) {
      const prefix = previousInputRef.current ? previousInputRef.current + (previousInputRef.current.endsWith(' ') ? '' : ' ') : '';
      setInput(prefix + transcript);
    }
  }, [transcript, listening]);

  const handleStartListening = () => {
    previousInputRef.current = input; // Save current text
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'ar-EG' });
  };

  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };

  const getFieldName = (key, fieldDefinitions) => {
    // Check standard fields
    const standardFields = {
      name: "اسم المريض",
      phone: "رقم الهاتف",
      age: "العمر",
      gender: "النوع",
      address: "العنوان",
      job: "الوظيفة",
      marital_status: "الحالة الاجتماعية",
      blood_type: "فصيلة الدم",
      email: "البريد الإلكتروني",
      notes: "ملاحظات",
      date_of_birth: "تاريخ الميلاد",
      age_unit: "وحدة العمر",
      chronic_diseases: "الأمراض المزمنة",
      allergies: "الحساسية",
      past_surgeries: "العمليات السابقة",
      family_history: "التاريخ العائلي"
    };

    if (standardFields[key]) return standardFields[key];
    
    // Check custom fields
    if (fieldDefinitions.has(key)) {
      const def = fieldDefinitions.get(key);
      return def.label || def.name;
    }

    return key;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const newChatLog = [...chatLog, userMessage];
    setInput('');
    setIsProcessing(true);
    handleStopListening(); // Ensure mic is off

    if (activeRequestRef.current.abortController) {
      activeRequestRef.current.abortController.abort();
    }
    if (activeRequestRef.current.timeoutId) {
      clearTimeout(activeRequestRef.current.timeoutId);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 35000);
    activeRequestRef.current = { abortController, timeoutId };

    const assistantMessageId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setChatLog([...newChatLog, { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    try {
      // Prepare simplified schema for AI
      let simplifiedSchema = null;
      // Map to store definitions for later lookup when merging
      const fieldDefinitions = new Map();

      const patientSections = medicalFieldsConfig?.patient?.sections;
      const builtinSectionKeys = Array.isArray(patientSections?.order)
        ? patientSections.order.map(String).filter((k) => k && !k.startsWith("custom:"))
        : ["personal", "medical", "insurance"];

      const customSections = Array.isArray(medicalFieldsConfig?.patient?.customSections)
        ? medicalFieldsConfig.patient.customSections
        : [];

      const knownSectionIds = new Set([
        ...builtinSectionKeys.map(String),
        ...customSections.map((s) => String(s?.id)).filter(Boolean),
      ]);

      const sectionTitleById = new Map();
      builtinSectionKeys.forEach((k) => {
        const title = patientSections?.items?.[k]?.title;
        if (title) sectionTitleById.set(String(k), String(title));
      });
      customSections.forEach((s) => {
        if (s?.id && s?.title) sectionTitleById.set(String(s.id), String(s.title));
      });

      const templatesBySection = {};
      builtinSectionKeys.forEach((sectionKey) => {
        const list = Array.isArray(medicalFieldsConfig?.patient?.sectionTemplates?.[sectionKey])
          ? medicalFieldsConfig.patient.sectionTemplates[sectionKey]
          : [];
        templatesBySection[sectionKey] = list
          .filter((t) => t?.enabled !== false)
          .map((t) => ({ ...t, section_id: String(sectionKey) }));
      });

      customSections.forEach((section) => {
        const sectionId = String(section?.id || "");
        const list = Array.isArray(section?.templates) ? section.templates : [];
        templatesBySection[sectionId] = list
          .filter((t) => t?.enabled !== false)
          .map((t) => ({ ...t, section_id: sectionId }));
      });

      const allTemplates = flattenCustomFieldTemplates({ config: medicalFieldsConfig, context: "patient" })
        .filter((t) => t?.enabled !== false)
        .map((t) => ({ ...t, section_id: String(t?.section_id || "") }));

      const existingPatientFieldsRaw = Array.isArray(patient?.custom_fields) ? patient.custom_fields : [];
      const existingPatientFields = mergeTemplatesIntoCustomFields(existingPatientFieldsRaw, allTemplates).map((f) => {
        const rawSection = typeof f?.section_id === "string" ? f.section_id : "";
        const mapped = rawSection === "default" ? "personal" : rawSection;
        if (!mapped) return { ...f, section_id: "" };
        if (!knownSectionIds.has(mapped)) return { ...f, section_id: mapped };
        return { ...f, section_id: mapped };
      });

      const fieldsCatalog = [];
      Object.entries(templatesBySection).forEach(([sectionId, list]) => {
        const sectionTitle = sectionTitleById.get(String(sectionId)) || String(sectionId);
        (list || []).forEach((t) => {
          if (!t?.id) return;
          fieldDefinitions.set(String(t.id), { ...t, label: t.name, section_id: String(sectionId) });
          fieldsCatalog.push({
            id: String(t.id),
            label: String(t.name || ""),
            type: String(t.type || "text"),
            options: Array.isArray(t.options) ? t.options : [],
            placeholder: String(t.placeholder || ""),
            section_id: String(sectionId),
            section_title: sectionTitle,
            source: "template",
          });
        });
      });

      existingPatientFields.forEach((f) => {
        if (!f?.id) return;
        fieldDefinitions.set(String(f.id), { ...f, label: f.name, section_id: String(f.section_id || "") });
        fieldsCatalog.push({
          id: String(f.id),
          label: String(f.name || ""),
          type: String(f.type || "text"),
          options: Array.isArray(f.options) ? f.options : [],
          placeholder: String(f.placeholder || ""),
          section_id: String(f.section_id || ""),
          section_title: sectionTitleById.get(String(f.section_id || "")) || String(f.section_id || ""),
          source: "patient",
          current_value: f.value,
        });
      });

      simplifiedSchema = {
        sections: [
          ...builtinSectionKeys.map((k) => ({ id: String(k), title: sectionTitleById.get(String(k)) || String(k), kind: "builtin" })),
          ...customSections.map((s) => ({ id: String(s?.id || ""), title: String(s?.title || ""), kind: "custom" })).filter((x) => x.id),
        ],
        custom_fields_catalog: fieldsCatalog,
        standard_fields: [
          "name",
          "phone",
          "address",
          "date_of_birth",
          "blood_type",
          "gender",
          "age",
          "age_unit",
          "job",
          "marital_status",
          "email",
          "notes",
        ],
        medical_history_keys: ["chief_complaint", "chronic_diseases", "blood_pressure", "blood_sugar", "allergies", "past_surgeries", "family_history"],
        insurance_info_keys: ["provider_name", "policy_number", "coverage_percent"],
      };

      const result = await processPatientInputStream(patient, userMessage.content, simplifiedSchema, chatLog, {
        signal: abortController.signal,
        aiContext: preferences?.ai_settings?.context,
        onPartialReply: (text) => {
          setChatLog((prev) =>
            prev.map((m) => (m?.id === assistantMessageId ? { ...m, content: text } : m))
          );
        },
      });
      
      const { 
        patient_updates = {}, 
        appointment_updates = {}, 
        visit_updates = {}, 
        reply = "تم استلام البيانات.",
        ui = null,
        create_fields = []
      } = result;

      let successDetails = [];

      // 1. Process Patient Updates
      let finalPatientUpdates = { ...patient_updates };
      const currentPatientFields = Array.isArray(patient.custom_fields) ? [...patient.custom_fields] : [];

      if (patient_updates.custom_fields) {
        Object.entries(patient_updates.custom_fields).forEach(([id, value]) => {
          const idx = currentPatientFields.findIndex(f => String(f.id) === String(id));
          if (idx >= 0) currentPatientFields[idx].value = value;
          else if (fieldDefinitions.has(id)) {
            const def = fieldDefinitions.get(id);
            currentPatientFields.push({ ...def, value });
          }
          successDetails.push(getFieldName(id, fieldDefinitions));
        });
        finalPatientUpdates.custom_fields = currentPatientFields;
      }

      // Handle medical_history/insurance_info nesting
      const medicalHistoryKeys = new Set(["chief_complaint", "chronic_diseases", "blood_pressure", "blood_sugar", "allergies", "past_surgeries", "family_history"]);
      const insuranceKeys = new Set(["provider", "policy_number", "card_id", "expiry_date", "notes"]);
      
      const patientMedicalHistory = {};
      const patientInsuranceInfo = {};

      Object.keys(patient_updates).forEach(key => {
        if (medicalHistoryKeys.has(key)) {
          patientMedicalHistory[key] = patient_updates[key];
          delete finalPatientUpdates[key];
        } else if (insuranceKeys.has(key)) {
          patientInsuranceInfo[key] = patient_updates[key];
          delete finalPatientUpdates[key];
        }
        if (key !== 'custom_fields') successDetails.push(getFieldName(key, fieldDefinitions));
      });

      if (Object.keys(patientMedicalHistory).length > 0) {
        finalPatientUpdates.medical_history = {
          ...(patient.medical_history || {}),
          ...patientMedicalHistory
        };
      }
      if (Object.keys(patientInsuranceInfo).length > 0) {
        finalPatientUpdates.insurance_info = {
          ...(patient.insurance_info || {}),
          ...patientInsuranceInfo
        };
      }

      // 2. Process Appointment/Visit Updates (Requires ID lookup)
      // Since we are on Patient page, we'd need to identify which appointment/visit to update.
      // Usually the active/latest one. For now, we'll focus on patient updates.

      setChatLog((prev) =>
        prev.map((m) =>
          m?.id === assistantMessageId
            ? { ...m, content: { version: "tabibi_intelligence_v2", title: "المساعد الشخصي", changes: ui?.changes || [], reply } }
            : m
        )
      );

      // Get latest chat log for saving
      const finalChatLog = [...newChatLog, { 
        id: assistantMessageId, 
        role: "assistant", 
        content: { version: "tabibi_intelligence_v2", title: "المساعد الشخصي", changes: ui?.changes || [], reply },
        timestamp: new Date().toISOString() 
      }];

      // Save to server
      const savedData = await updatePatient(patient.id, { 
        ...finalPatientUpdates, 
        ai_chat_log: finalChatLog 
      });

      // 3. Confirm with server data
      if (savedData) {
        queryClient.setQueryData(['patient', patient.id], savedData);
        queryClient.setQueryData(['patient', String(patient.id)], savedData);
        // Force refresh chat log from saved data
        if (savedData.ai_chat_log) {
          setChatLog(savedData.ai_chat_log);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // 4. Show success
      if (successDetails.length > 0) {
        toast.custom((id) => (
          <NotificationToast
            id={id}
            notification={{
              title: "تم تحديث البيانات",
              message: `تم تحديث: ${successDetails.join('، ')}`,
              type: "patient",
              created_at: new Date().toISOString(),
            }}
            onClick={() => {}}
          />
        ), {
          duration: preferences?.toast_duration || 4000,
          position: 'top-center'
        });
      }
      resetTranscript();
      setShowResult(true);

    } catch (error) {
      console.error('Error in Tabibi Intelligence:', error);
      if (error?.name === "AbortError") {
        toast.error("تم إيقاف الطلب بسبب طول المعالجة");
      } else if (String(error?.message || "").toLowerCase().includes("authentication")) {
        toast.error('فشل تسجيل الدخول لمزود الذكاء الاصطناعي');
      } else {
      toast.error('حدث خطأ أثناء معالجة البيانات');
      }
      setChatLog((prev) =>
        prev.map((m) =>
          m?.id && m.id === assistantMessageId ? { ...m, content: "عذراً، حدث خطأ أثناء المعالجة." } : m
        )
      );
    } finally {
      setIsProcessing(false);
      if (activeRequestRef.current.timeoutId) {
        clearTimeout(activeRequestRef.current.timeoutId);
      }
      activeRequestRef.current = { abortController: null, timeoutId: null };
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!browserSupportsSpeechRecognition) {
    // Fallback or warning if needed, but modern browsers support it
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative rounded-2xl p-0.5"
    >
        {/* Border Glow */}
        <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-2xl" />
        
        <div className="relative bg-transparent backdrop-blur-lg border border-primary/35 ring-1 ring-primary/20 shadow-none rounded-2xl overflow-hidden">
            
            {/* Header - RTL Layout */}
            <div className="px-4 py-3 border-b border-primary/25 bg-transparent backdrop-blur-0 flex flex-row items-center justify-between" dir="rtl">
                <div className="flex items-center gap-2 text-primary font-bold">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-sans">
                        مساعد المريض الشخصي
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {isProcessing && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => navigate('/settings?tab=ai')}
                        title="إعدادات المساعد الذكي"
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Area / Result */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px] min-h-[150px] bg-slate-50/50 rounded-lg mb-2 border border-slate-100"
            >
              {chatLog.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">
                  <p>ابدا اديني معلومات عن المريض وانا هنظم ملفه</p>
                </div>
              )}
              {chatLog.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none' 
                        : 'bg-primary/10 text-slate-900 rounded-tl-none border border-primary/10'
                    }`}
                  >
                    {msg.role === "assistant" && typeof msg.content === "object" && msg.content?.version === "tabibi_intelligence_v2" ? (
                      <TabibiAiMessage ui={msg.content} />
                    ) : (
                      <p className="font-medium !text-black" style={{ color: 'black' }}>
                        {typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content}
                      </p>
                    )}
                    <span className="text-[10px] opacity-50 mt-1 block">
                      {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 flex flex-col gap-3" dir="rtl">
                <div className="relative flex items-end gap-2">
                    {/* Upload Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 shrink-0 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="رفع ملفات"
                        onClick={() => toast.info('ميزة رفع الملفات قادمة قريباً')}
                    >
                        <Plus className="w-5 h-5" />
                    </Button>

                    <div className="relative flex-1 bg-transparent rounded-[15px] transition-all mt-8 translate-y-2">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={listening ? "جاري الاستماع..." : "اكتب ملاحظاتك أو تحدث لتحديث الملف..."}
                            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 focus:border-none ring-0 outline-none resize-none py-3 px-4 text-sm md:text-base placeholder:text-slate-500 placeholder:text-sm text-slate-800 dark:text-slate-200 min-h-[40px] overflow-hidden shadow-none rounded-[35px]"
                            disabled={isProcessing}
                            style={{ maxHeight: '300px' }}
                            rows={1}
                        />
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                         {/* Mic Button */}
                        <Button
                            variant={listening ? "destructive" : "secondary"}
                            size="icon"
                            className={`rounded-full h-10 w-10 shadow-sm border border-blue-100 transition-all ${listening ? 'animate-pulse bg-red-500 text-white hover:bg-red-600 border-red-500' : 'bg-white/50 hover:bg-blue-50 text-slate-600'}`}
                            onClick={listening ? handleStopListening : handleStartListening}
                            disabled={isProcessing}
                        >
                            {listening ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>

                        {/* Send Button */}
                        <Button
                            size="icon"
                            className="rounded-full h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-blue-300/30 disabled:opacity-50 disabled:cursor-not-allowed border-none"
                            onClick={handleSend}
                            disabled={(!input.trim() && !listening) || isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
                
                {listening && (
                    <div className="text-xs text-center text-red-500 animate-pulse font-medium flex items-center justify-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        جاري الاستماع... اضغط على الميكروفون للإيقاف
                    </div>
                )}
            </div>
        </div>
    </motion.div>
  );
}
