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
  const [aiResponse, setAiResponse] = useState(null);
  const textareaRef = useRef(null);
  const previousInputRef = useRef('');
  
  const queryClient = useQueryClient();
  const { data: preferences } = useUserPreferences();

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
          // Invalidate queries to refresh UI immediately
          // Try both number and string keys to be safe
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

  const handleSend = async () => {
    if (!input.trim()) return;

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

      // 1. Process with AI
      const updates = await processPatientInput(patient, input, simplifiedSchema);

      if (Object.keys(updates).length === 0) {
        toast.info('لم يتم العثور على بيانات لتحديثها');
        setAiResponse("لم أتمكن من استخراج معلومات جديدة من النص.");
        setIsProcessing(false);
        return;
      }

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

      // 2. Update Patient in Supabase
      await updatePatient(patient.id, finalUpdates);

      // 3. Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // 4. Show success
      setAiResponse(`تم تحديث البيانات بنجاح: ${Object.keys(updates).join(', ')}`);
      toast.success('تم تحديث ملف المريض بنجاح');
      setInput('');
      resetTranscript();
      setShowResult(true);

    } catch (error) {
      console.error('Error in Tabibi Intelligence:', error);
      toast.error('حدث خطأ أثناء معالجة البيانات');
      setAiResponse("عذراً، حدث خطأ أثناء المعالجة.");
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
            <AnimatePresence>
                {showResult && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-transparent px-4 py-3 text-sm text-black border-b border-primary/25 relative font-medium"
                    >
                        <div className="flex justify-between items-start gap-2" dir="rtl">
                            <p className="leading-relaxed text-black font-semibold !text-black" style={{ color: 'black' }}>{aiResponse}</p>
                            <button 
                                onClick={() => setShowResult(false)}
                                className="text-slate-500 hover:text-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
