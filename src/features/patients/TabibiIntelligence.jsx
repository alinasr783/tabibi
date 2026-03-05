import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Plus, Paperclip, Sparkles, X, Loader2, StopCircle, ArrowUp } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { processPatientInput } from '../../services/groqService';
import { updatePatient } from '../../services/apiPatients';
import supabase from '../../services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { normalizeMedicalFieldsConfig } from '../../lib/medicalFieldsConfig';
import 'regenerator-runtime/runtime';

export default function TabibiIntelligence({ patient }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const textareaRef = useRef(null);
  const previousInputRef = useRef('');
  const [chatLog, setChatLog] = useState([]);
  
  const queryClient = useQueryClient();
  const { data: preferences } = useUserPreferences();

  // Load chat history from patient data
  useEffect(() => {
    if (patient?.medical_history?.ai_chat_log) {
      setChatLog(patient.medical_history.ai_chat_log);
    }
  }, [patient?.medical_history?.ai_chat_log]);

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
    setChatLog(newChatLog);
    setInput('');
    setIsProcessing(true);
    handleStopListening(); // Ensure mic is off

    try {
      // Prepare simplified schema for AI
      let simplifiedSchema = null;
      // Map to store definitions for later lookup when merging
      const fieldDefinitions = new Map();

      if (medicalFieldsConfig?.patient?.customSections) {
        const sections = [];
        medicalFieldsConfig.patient.customSections.forEach(section => {
          if (Array.isArray(section.templates) && section.templates.length > 0) {
             const activeFields = section.templates.filter(f => f.enabled !== false);
             if (activeFields.length > 0) {
                 sections.push({
                     id: section.id,
                     title: section.title,
                     fields: activeFields.map(field => {
                         // Store definition for merging
                         fieldDefinitions.set(field.id, { ...field, section_id: section.id });
                         
                         return {
                             id: field.id,
                             label: field.name, // Custom fields use 'name'
                             type: field.type,
                             options: field.options,
                             placeholder: field.placeholder
                         };
                     })
                 });
             }
          }
        });
        
        if (sections.length > 0) {
          simplifiedSchema = { custom_sections: sections };
        }
      }

      // 1. Process with AI (Pass chat history)
      const result = await processPatientInput(patient, userMessage.content, simplifiedSchema, chatLog);
      
      const updates = result.updates || {};
      const reply = result.reply || "تم استلام البيانات.";

      // Generate success message with field names
      let successDetails = [];
      
      // Handle Standard Fields
      Object.keys(updates).forEach(key => {
        if (key !== 'custom_fields') {
          successDetails.push(getFieldName(key, fieldDefinitions));
        }
      });

      // Handle custom_fields merge if present
      let finalUpdates = { ...updates };
      
      if (updates.custom_fields) {
        // Prepare existing fields array (ensure it's an array)
        const existingFields = Array.isArray(patient.custom_fields) 
          ? [...patient.custom_fields] 
          : [];
        
        const newValues = updates.custom_fields;
        
        // Map existing fields for quick access
        const existingMap = new Map(existingFields.map(f => [f.id, f]));
        
        Object.entries(newValues).forEach(([id, value]) => {
          // Add to success details
          successDetails.push(getFieldName(id, fieldDefinitions));

          if (existingMap.has(id)) {
            // Update existing field value
            const field = existingMap.get(id);
            field.value = value;
          } else if (fieldDefinitions.has(id)) {
            // Add new field from definition
            const def = fieldDefinitions.get(id);
            existingFields.push({
              id: def.id,
              name: def.name,
              type: def.type,
              section_id: def.section_id,
              value: value,
              options: def.options || []
            });
          }
        });
        
        finalUpdates.custom_fields = existingFields;
      }

      // Prepare final AI message with details
      // Use the AI's natural reply which now includes confirmation and suggestions
      const finalAiMessageContent = reply;
      
      const aiMessage = { role: 'assistant', content: finalAiMessageContent, timestamp: new Date().toISOString() };
      const updatedChatLog = [...newChatLog, aiMessage];
      setChatLog(updatedChatLog);

      // 2. Update Patient in Supabase (Data + Chat Log)
      const currentMedicalHistory = patient.medical_history || {};
      const payload = {
        ...finalUpdates,
        medical_history: {
          ...currentMedicalHistory,
          ...(finalUpdates.medical_history || {}), // Merge if AI updated medical history
          ai_chat_log: updatedChatLog // Save chat log
        }
      };

      // Optimistic update
      const updatedPatientData = { ...patient, ...payload };
      queryClient.setQueryData(['patient', patient.id], updatedPatientData);
      queryClient.setQueryData(['patient', String(patient.id)], updatedPatientData);

      const savedData = await updatePatient(patient.id, payload);

      // 3. Confirm with server data
      if (savedData) {
        queryClient.setQueryData(['patient', patient.id], savedData);
        queryClient.setQueryData(['patient', String(patient.id)], savedData);
      }
      
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // 4. Show success
      if (successDetails.length > 0) {
        toast.success(`تم تحديث: ${successDetails.join('، ')}`);
      }
      resetTranscript();
      setShowResult(true);

    } catch (error) {
      console.error('Error in Tabibi Intelligence:', error);
      toast.error('حدث خطأ أثناء معالجة البيانات');
      setChatLog(prev => [...prev, { role: 'assistant', content: "عذراً، حدث خطأ أثناء المعالجة.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsProcessing(false);
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
            
            {/* Header - LTR Layout */}
            <div className="px-4 py-3 border-b border-primary/25 bg-transparent backdrop-blur-0 flex flex-row items-center justify-between" dir="ltr">
                <div className="flex items-center gap-2 text-primary font-bold">
                    <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-sans">
                        Tabibi Intelligence
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {isProcessing && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                        </div>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold shadow-sm tracking-wider">
                        NEW
                    </span>
                </div>
            </div>

            {/* Chat Area / Result */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px] min-h-[150px] bg-slate-50/50 rounded-lg mb-2 border border-slate-100"
            >
              {chatLog.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">
                  <p>ابدأ المحادثة مع المساعد الذكي...</p>
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
                    <p className="font-medium !text-black" style={{ color: 'black' }}>{msg.content}</p>
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
