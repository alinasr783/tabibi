import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, StopCircle, Mic, Plus, ArrowUp } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { processMedicalFieldsIntelligenceStream } from '../../services/groqService';
import supabase from '../../services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { normalizeMedicalFieldsConfig } from '../../lib/medicalFieldsConfig';
import 'regenerator-runtime/runtime';

export default function MedicalFieldsIntelligence() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef(null);
  const previousInputRef = useRef('');
  const [chatLog, setChatLog] = useState([]);
  const activeRequestRef = useRef({ abortController: null, timeoutId: null });
  
  const queryClient = useQueryClient();
  const { data: preferences } = useUserPreferences();

  const TabibiAiMessage = ({ ui }) => {
    const changes = Array.isArray(ui?.changes) ? ui.changes : [];

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-700" />
          <div className="text-sm font-bold text-slate-900">{ui?.title || "مهندس الحقول الذكي"}</div>
        </div>

        {changes.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
            <div className="text-xs font-bold text-blue-900">التعديلات المنفذة</div>
            <div className="space-y-1">
              {changes.map((c, i) => (
                <div key={i} className="text-xs text-slate-800">
                  <span className="font-semibold">[{c?.action || "تعديل"}] {c?.label || "عنصر"}</span>
                  {c?.preview ? <span className="opacity-70"> — {c.preview}</span> : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Load chat history from preferences
  useEffect(() => {
    if (preferences?.ai_field_chat_log) {
      setChatLog(preferences.ai_field_chat_log);
    }
  }, [preferences?.ai_field_chat_log]);

  // Scroll to bottom of chat
  const chatContainerRef = useRef(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLog]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Sync transcript with input
  useEffect(() => {
    if (listening) {
      const prefix = previousInputRef.current ? previousInputRef.current + (previousInputRef.current.endsWith(' ') ? '' : ' ') : '';
      setInput(prefix + transcript);
    }
  }, [transcript, listening]);

  const handleStartListening = () => {
    previousInputRef.current = input;
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: 'ar-EG' });
  };

  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const newChatLog = [...chatLog, userMessage];
    setInput('');
    setIsProcessing(true);
    handleStopListening();

    if (activeRequestRef.current.abortController) {
      activeRequestRef.current.abortController.abort();
    }
    if (activeRequestRef.current.timeoutId) {
      clearTimeout(activeRequestRef.current.timeoutId);
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 45000);
    activeRequestRef.current = { abortController, timeoutId };

    const assistantMessageId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setChatLog([...newChatLog, { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    try {
      const currentConfig = normalizeMedicalFieldsConfig(preferences?.medical_fields_config);

      const result = await processMedicalFieldsIntelligenceStream(currentConfig, userMessage.content, {
        signal: abortController.signal,
        chatHistory: chatLog,
        onPartialReply: (text) => {
          setChatLog((prev) =>
            prev.map((m) => (m?.id === assistantMessageId ? { ...m, content: text } : m))
          );
        },
      });
      
      const { 
        config_updates = null, 
        reply = "تم تحديث الإعدادات بنجاح.",
        ui = null
      } = result;

      const finalAiMessageContent = ui ? { ...ui, version: "tabibi_intelligence_v2" } : reply;
      const updatedChatLog = [...newChatLog, { id: assistantMessageId, role: 'assistant', content: finalAiMessageContent, timestamp: new Date().toISOString() }];

      // Update preferences in database using the confirmed user ID
      const { error } = await supabase
        .from('user_preferences')
        .update({
          medical_fields_config: config_updates || currentConfig,
          ai_field_chat_log: updatedChatLog
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setChatLog(updatedChatLog);
      queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
      toast.success("تم تحديث هيكلة الحقول بنجاح");

    } catch (error) {
      console.error('Error in Medical Fields Intelligence:', error);
      toast.error('حدث خطأ أثناء معالجة الطلب');
      setChatLog((prev) =>
        prev.map((m) =>
          m?.id && m.id === assistantMessageId ? { ...m, content: "عذراً، حدث خطأ أثناء تعديل الحقول." } : m
        )
      );
    } finally {
      setIsProcessing(false);
      activeRequestRef.current = { abortController: null, timeoutId: null };
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                        مهندس الحقول الذكي
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
                        ARCHITECT
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
                  <p>اطلب مني إضافة حقول جديدة أو تنظيم الأقسام..</p>
                  <p className="text-xs mt-1">مثال: "ضف قسم جديد اسمه العمليات السابقة فيه حقول تاريخ ونوع العملية"</p>
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
                            placeholder={listening ? "جاري الاستماع..." : "اطلب تعديل الحقول هنا..."}
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
