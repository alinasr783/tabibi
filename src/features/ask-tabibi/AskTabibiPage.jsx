import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Trash2, 
  Menu, 
  X, 
  Bot, 
  User,
  Loader2,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Clock,
  Mic,
  MicOff,
  Square,
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useChat } from "./useChat";
import { useAuth } from "../auth/AuthContext";
import { getCurrentClinic } from "../../services/apiClinic";
import { toggleOnlineBooking, changeThemeMode, reorderMenuItem, resetToDefaultSettings, changeColors, executeAIAction } from "../../services/apiAskTabibi";
import { useUserPreferencesContext } from "../user-preferences/UserPreferencesProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ActionRenderer, parseAIResponse, FormattedText, InlineMessageRenderer } from "./ActionRenderer";
import AppointmentCreateDialog from "../calendar/AppointmentCreateDialog";
import PatientCreateDialog from "../patients/PatientCreateDialog";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Component name mappings - handle multiple variations
const COMPONENT_MAP = {
  "new-appointment": "appointment",
  "add-appointment": "appointment",
  "appointment": "appointment",
  "new-patient": "patient",
  "add-patient": "patient",
  "patient": "patient",
  "new-treatment": "treatment",
  "add-treatment": "treatment",
  "treatment": "treatment",
  "new-staff": "staff",
  "add-staff": "staff",
  "staff": "staff",
  "new-visit": "visit",
  "add-visit": "visit",
  "visit": "visit",
  "new-plan": "plan",
  "add-plan": "plan",
  "plan": "plan"
};

// ========================
// مكون الرسالة الواحدة مع دعم الـ Actions المضمنة
// ========================
function ChatMessage({ message, isStreaming = false, onAction, executeResults = {} }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  
  // Parse content for actions if it's an assistant message
  const { segments } = isAssistant 
    ? parseAIResponse(message.content) 
    : { segments: [{ type: 'text', content: message.content }] };
  
  return (
    <div className={cn(
      "flex gap-2 sm:gap-3 mb-3 sm:mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-gradient-to-br from-primary/20 to-secondary/20 text-primary"
      )}>
        {isUser ? (
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : (
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        )}
      </div>
      
      {/* Message Bubble */}
      <div className={cn(
        "max-w-[82%] sm:max-w-[80%] rounded-[var(--radius)] px-3 py-2 sm:px-4 sm:py-3",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-md" 
          : "bg-card border border-border/60 rounded-tl-md shadow-sm"
      )}>
        <div className="text-[13px] sm:text-sm leading-relaxed">
          {isAssistant ? (
            // Use InlineMessageRenderer for inline actions
            <InlineMessageRenderer segments={segments} onAction={onAction} executeResults={executeResults} />
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 sm:w-2 sm:h-4 bg-current ml-1 animate-pulse" />
          )}
        </div>
        
        {message.created_at && (
          <p className={cn(
            "text-[9px] sm:text-[10px] mt-1.5 sm:mt-2 opacity-50",
            isUser ? "text-left" : "text-right"
          )}>
            {format(new Date(message.created_at), "hh:mm a", { locale: ar })}
          </p>
        )}
      </div>
    </div>
  );
}

// ========================
// مكون Loading للرسالة
// ========================
function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">
        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="bg-card border border-border/60 rounded-[var(--radius)] rounded-tl-md px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ========================
// مكون إدخال الرسالة - Mobile Optimized with Mic & Stop
// ========================
function ChatInput({ onSend, disabled, isStreaming, onStop }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const sendSoundRef = useRef(null);
  
  // Speech recognition hook
  const { 
    isListening, 
    isSupported: isSpeechSupported, 
    transcript, 
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition();
  
  // Update message when transcript changes (real-time)
  useEffect(() => {
    if (transcript) {
      setMessage(prev => prev + (prev ? " " : "") + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);
  
  // Play send sound
  const playSendSound = useCallback(() => {
    try {
      // Create audio context for send sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log("Audio not supported");
    }
  }, []);
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      playSendSound();
      onSend(message.trim(), false);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (isListening) {
        stopListening();
      }
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Auto-resize textarea
  const handleInput = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
    setMessage(textarea.value);
  };
  
  // Toggle microphone
  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };
  
  return (
    <div className="bg-background border-t border-border/50 px-2 sm:px-4 py-2 sm:py-3 safe-area-bottom">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        {/* Listening Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-center gap-2 mb-2 py-1.5 px-3 rounded-full bg-red-500/10 border border-red-500/20 w-fit mx-auto"
            >
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] sm:text-xs text-red-500 font-medium">بسجل صوتك</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1.5 sm:gap-2 bg-card rounded-[var(--radius)] border border-border/60 shadow-sm p-1.5 sm:p-2 px-2 sm:px-3 py-1.5 sm:py-2.5 w-[95%] mb-[8px]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="اكتب او اتكلم وانا هسمعك"
            disabled={disabled}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-[13px] sm:text-sm",
              "focus:outline-none",
              "placeholder:text-muted-foreground/70 min-h-[36px] sm:min-h-[40px] max-h-[100px]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Microphone Button */}
          {isSpeechSupported && (
            <Button
              onClick={toggleMic}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-[var(--radius)] flex-shrink-0 transition-all",
                isListening 
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                  : "hover:bg-muted text-muted-foreground"
              )}
              title={isListening ? "وقف التسجيل" : "اضغط عشان تتكلم"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          )}
          
          {/* Send / Stop Button */}
          <Button
            onClick={isStreaming ? onStop : handleSend}
            disabled={!isStreaming && (!message.trim() || disabled)}
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-[var(--radius)] flex-shrink-0 transition-all",
              isStreaming
                ? "bg-red-500 hover:bg-red-600 text-white"
                : message.trim() 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
            )}
            title={isStreaming ? "وقف الرد" : "ابعت"}
          >
            {isStreaming ? (
              <Square className="w-4 h-4" />
            ) : disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================
// Helper: Group conversations by date
// ========================
function groupConversationsByDate(conversations) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  conversations.forEach(conv => {
    const convDate = new Date(conv.updated_at);
    const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());
    
    if (convDay.getTime() === today.getTime()) {
      groups.today.push(conv);
    } else if (convDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(conv);
    } else if (convDay.getTime() > weekAgo.getTime()) {
      groups.thisWeek.push(conv);
    } else if (convDay.getTime() > monthAgo.getTime()) {
      groups.thisMonth.push(conv);
    } else {
      groups.older.push(conv);
    }
  });
  
  return groups;
}

// ========================
// مكون المحادثات الجانبية - Left Side with Grouping & Pagination
// ========================
function ChatSidebar({ 
  conversations, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete,
  isLoading,
  isOpen,
  onClose
}) {
  const [displayCount, setDisplayCount] = useState(10);
  
  // Group conversations by date
  const groupedConversations = useMemo(() => {
    return groupConversationsByDate(conversations.slice(0, displayCount));
  }, [conversations, displayCount]);
  
  const hasMore = conversations.length > displayCount;
  
  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };
  
  // Section labels
  const groupLabels = {
    today: "النهاردة",
    yesterday: "امبارح",
    thisWeek: "الاسبوع ده",
    thisMonth: "الشهر ده",
    older: "اقدم"
  };
  
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - LEFT side */}
      <div className={cn(
        "fixed md:static top-0 left-0 h-full w-[280px] sm:w-72 bg-card border-r border-border/50 z-50",
        "transform transition-transform duration-300 ease-in-out",
        "flex flex-col shadow-xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-semibold text-sm sm:text-base">المحادثات</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNew}
              className="text-primary h-8 w-8"
              title="محادثة جديدة"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
        
        {/* Conversations List with Groups */}
        <div className="flex-1 overflow-y-auto p-2 chat-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-6 sm:py-8 px-4">
              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-xs sm:text-sm text-muted-foreground">مفيش محادثات لسه</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1">ابدأ محادثة جديدة</p>
            </div>
          ) : (
            <>
              {Object.entries(groupLabels).map(([key, label]) => {
                const items = groupedConversations[key];
                if (items.length === 0) return null;
                
                return (
                  <div key={key} className="mb-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium px-2 mb-2">
                      {label}
                    </p>
                    <div className="space-y-1">
                      {items.map((conv) => (
                        <motion.div
                          key={conv.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "group relative rounded-xl p-2.5 sm:p-3 cursor-pointer transition-all",
                            "hover:bg-muted/50 active:scale-[0.98]",
                            activeId === conv.id && "bg-primary/10 border border-primary/20"
                          )}
                          onClick={() => onSelect(conv.id)}
                        >
                          <div className="flex items-start gap-2">
                            <MessageCircle className={cn(
                              "w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0",
                              activeId === conv.id ? "text-primary" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {conv.title}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {format(new Date(conv.updated_at), "hh:mm a", { locale: ar })}
                              </p>
                            </div>
                          </div>
                          
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(conv.id);
                            }}
                            className={cn(
                              "absolute left-2 top-1/2 -translate-y-1/2",
                              "opacity-0 group-hover:opacity-100 transition-opacity",
                              "p-1 sm:p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Load More Button */}
              {hasMore && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={loadMore}
                  className="w-full py-2 mt-2 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronDown className="w-4 h-4" />
                  عرض المزيد ({conversations.length - displayCount} محادثة)
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ========================
// شاشة الترحيب مع الانيميشنز
// ========================
function WelcomeScreen({ onStartChat }) {
  // اسئلة مقترحة متطورة بتوضح قوة الـ AI
  const suggestions = [
    {
      text: "اعملي رسم بياني يوضح الحجوزات من العيادة vs اللي من النت الشهر ده",
      icon: BarChart3
    },
    {
      text: "احجزلي موعد لأحمد محمد بكره الساعة 4 العصر",
      icon: Calendar
    },
    {
      text: "وريني تحليل كامل لأداء العيادة الشهر ده مع الارقام",
      icon: TrendingUp
    },
    {
      text: "عايز اعرف تفاصيل كل المواعيد اللي عندي بكره",
      icon: Users
    }
  ];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 12 }
    }
  };
  
  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.1 }
    }
  };
  
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        className="max-w-sm sm:max-w-lg text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Avatar with pulse animation */}
        <motion.div 
          className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6"
          variants={iconVariants}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          </div>
          {/* Floating sparkles */}
          <motion.div 
            className="absolute -top-1 -right-1"
            animate={{ y: [-2, 2, -2], rotate: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </motion.div>
        </motion.div>
        
        <motion.h1 
          className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          variants={itemVariants}
        >
          Tabibi AI
        </motion.h1>
        
        <motion.p 
          className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed"
          variants={itemVariants}
        >
          يلا نبدأ مع بعض.. انا هنا اساعدك في اي حاجة تخص العيادة بتاعتك من غير اي تعقيد
        </motion.p>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          variants={containerVariants}
        >
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartChat(suggestion.text)}
                className={cn(
                  "p-4 rounded-xl border border-border bg-card/50 text-[13px] sm:text-sm text-right",
                  "hover:bg-muted/50 hover:border-primary/30 hover:shadow-lg transition-all",
                  "flex items-start gap-3 group"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="leading-relaxed">{suggestion.text}</span>
              </motion.button>
            );
          })}
        </motion.div>
        
        {/* Hint text */}
        <motion.p 
          className="text-xs text-muted-foreground/60 mt-6"
          variants={itemVariants}
        >
          جرب تسألني عن اي حاجة.. هقدر اساعدك في كل تفاصيل عيادتك
        </motion.p>
      </motion.div>
    </div>
  );
}

// ========================
// الصفحة الرئيسية
// ========================
export default function AskTabibiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [lastCreatedPatientId, setLastCreatedPatientId] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { user } = useAuth();
  const { applyColors, applyThemeMode } = useUserPreferencesContext();
  
  const {
    activeConversationId,
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    startNewConversation,
    selectConversation,
    removeConversation,
    sendMessage,
    isStreaming,
    isCreatingConversation,
    executeResults
  } = useChat();
  
  // جلب بيانات العيادة
  const { data: clinicData } = useQuery({
    queryKey: ["clinic"],
    queryFn: getCurrentClinic,
    staleTime: 5 * 60 * 1000
  });
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);
  
  // Handle sending a message
  const handleSendMessage = useCallback(async (content, deepReasoning = false) => {
    if (!activeConversationId) {
      // إنشاء محادثة جديدة أولاً
      const newConv = await startNewConversation();
      if (newConv) {
        // أرسل الرسالة مباشرة باستخدام الـ ID الجديد
        sendMessage(content, clinicData, newConv.id, deepReasoning);
      }
    } else {
      sendMessage(content, clinicData, undefined, deepReasoning);
    }
  }, [activeConversationId, startNewConversation, sendMessage, clinicData]);
  
  // Start chat with a suggestion
  const handleStartWithSuggestion = useCallback(async (suggestion) => {
    const newConv = await startNewConversation();
    if (newConv) {
      // أرسل الرسالة مباشرة باستخدام الـ ID الجديد
      sendMessage(suggestion, clinicData, newConv.id);
    }
  }, [startNewConversation, sendMessage, clinicData]);
  
  // Handle actions from AI messages
  const handleAction = useCallback(async (actionType, actionData) => {
    console.log("Action triggered:", actionType, actionData);
    
    // Handle input submission - send as message to continue the conversation
    if (actionType === "input") {
      const { id, value } = actionData;
      // Format the response based on input type
      let message = value;
      if (id === 'patientPhone' || id === 'phone') {
        message = `رقم الموبايل: ${value}`;
      } else if (id === 'patientName' || id === 'name') {
        message = `الاسم: ${value}`;
      } else if (id === 'date') {
        message = `التاريخ: ${value}`;
      } else if (id === 'time') {
        message = `الوقت: ${value}`;
      }
      // Send the input as a regular message
      handleSendMessage(message);
      return;
    }
    
    // Handle component opening
    if (actionType === "openComponent") {
      const normalizedComponent = COMPONENT_MAP[actionData];
      
      switch (normalizedComponent) {
        case "appointment":
          setShowAppointmentDialog(true);
          break;
        case "patient":
          setShowPatientDialog(true);
          break;
        case "treatment":
          // Navigate to treatments page with add dialog trigger
          navigate("/treatments?action=add");
          break;
        case "staff":
          // Navigate to staff page with add dialog trigger
          navigate("/staff?action=add");
          break;
        case "visit":
          // Visit requires a patient context - navigate to patients list
          // If we have a patient ID in lastCreatedPatientId, use it
          if (lastCreatedPatientId) {
            navigate(`/patients/${lastCreatedPatientId}?action=add-visit`);
          } else {
            // Navigate to patients page to select a patient first
            toast.error("محتاج تختار مريض الأول عشان تضيفله كشف");
            navigate("/patients");
          }
          break;
        case "plan":
          // Treatment plan requires a patient context
          if (lastCreatedPatientId) {
            navigate(`/patients/${lastCreatedPatientId}?action=add-plan`);
          } else {
            toast.error("محتاج تختار مريض الأول عشان تضيفله خطة علاجية");
            navigate("/patients");
          }
          break;
        default:
          console.log("Unknown component:", actionData);
      }
      return;
    }
    
    // Replace placeholders in navigation path
    let navigationPath = actionData;
    if (typeof actionData === 'string') {
      console.log("Before replacement - actionData:", actionData, "lastCreatedPatientId:", lastCreatedPatientId);
      
      // Replace {{patientId}} with actual patient ID if available in context
      // This would be available after patient creation
      navigationPath = actionData.replace(/{{patientId}}/g, lastCreatedPatientId || '');
      
      // Additional replacements can be added here as needed
      // For example, if we have other placeholders like {{appointmentId}}
      
      console.log("Replaced navigation path:", actionData, "->", navigationPath);
    }
    
    // Handle navigation
    if (actionType === "navigate") {
      navigate(navigationPath);
      return;
    }
    
    // Handle executable actions
    if (actionType === "action") {
      try {
        // actionData is now the full action object with { action: "actionName", data: {...} }
        const actionName = typeof actionData === 'string' ? actionData : actionData?.action;
        const data = typeof actionData === 'object' ? actionData?.data : undefined;
        
        // Execute the action and capture the result
        let result;
        if (actionName === 'createPatientAction') {
          console.log("Executing createPatientAction with data:", data);
          result = await executeAIAction(actionName, data);
          console.log("createPatientAction result:", result);
          
          // If it's a patient creation, update the last created patient ID
          if (result.patientId) {
            setLastCreatedPatientId(result.patientId);
            console.log("Updated lastCreatedPatientId from execute action:", result.patientId);
          }
        }
        
        switch (actionName) {
          case "createPatientAction":
            // Success message already shown via the execution above
            if (result && result.message) {
              toast.success(result.message);
            }
            break;
          case "enableOnlineBooking":
            await toggleOnlineBooking(true);
            toast.success("تم تفعيل الحجز الإلكتروني");
            // Invalidate clinic query to refresh data
            queryClient.invalidateQueries({ queryKey: ["clinic"] });
            break;
            
          case "disableOnlineBooking":
            await toggleOnlineBooking(false);
            toast.success("تم إيقاف الحجز الإلكتروني");
            // Invalidate clinic query to refresh data
            queryClient.invalidateQueries({ queryKey: ["clinic"] });
            break;
            
          case "copyBookingLink":
            if (clinicData?.clinic_uuid) {
              const bookingLink = `${window.location.origin}/booking/${clinicData.clinic_uuid}`;
              await navigator.clipboard.writeText(bookingLink);
              toast.success("تم نسخ رابط الحجز");
            } else {
              toast.error("مش لاقي رابط الحجز");
            }
            break;
          
          case "changeTheme": {
            const mode = data?.mode || 'dark';
            const result = await changeThemeMode(mode);
            // Apply theme immediately without reload
            applyThemeMode(mode);
            toast.success(result.message);
            break;
          }
          
          case "reorderMenu": {
            const { itemId, position } = data || {};
            if (!itemId || !position) {
              toast.error("بيانات غير كاملة");
              break;
            }
            const result = await reorderMenuItem(itemId, position);
            toast.success(result.message);
            // Reload page to apply menu order
            setTimeout(() => window.location.reload(), 500);
            break;
          }
          
          case "resetSettings": {
            const result = await resetToDefaultSettings();
            // Apply default colors and theme immediately
            applyColors('#1AA19C', '#224FB5', '#FF6B6B');
            applyThemeMode('light');
            toast.success(result.message);
            break;
          }
          
          case "changeColors": {
            const { primary, secondary, accent } = data || {};
            if (!primary) {
              toast.error("بيانات الألوان غير كاملة");
              break;
            }
            const result = await changeColors(primary, secondary, accent);
            // Apply colors immediately without reload
            applyColors(primary, secondary, accent);
            toast.success(result.message);
            break;
          }
            
          default:
            console.log("Unknown action:", actionName, data);
        }
      } catch (error) {
        console.error("Action error:", error);
        toast.error(error.message || "حصل مشكلة");
      }
    }
  }, [navigate, queryClient, clinicData, applyColors, applyThemeMode, lastCreatedPatientId]);

  const handlePatientCreated = (newPatient) => {
    // Navigate to the newly created patient's profile
    if (newPatient?.id) {
      console.log("AI: Navigating to patient with ID:", newPatient.id, "Full patient object:", newPatient);
      // Update the last created patient ID for template replacement
      setLastCreatedPatientId(newPatient.id);
      console.log("Set lastCreatedPatientId to:", newPatient.id);
      navigate(`/patients/${newPatient.id}`);
      setShowPatientDialog(false); // Close the dialog after navigation
    } else {
      console.error("AI: No patient ID available for navigation", newPatient);
    }
  };

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-6rem)] flex flex-col -m-6 md:-m-0 overflow-hidden">
      {/* Appointment Create Dialog */}
      <AppointmentCreateDialog
        open={showAppointmentDialog}
        onClose={() => setShowAppointmentDialog(false)}
      />
      
      {/* Patient Create Dialog */}
      <PatientCreateDialog
        open={showPatientDialog}
        onClose={() => setShowPatientDialog(false)}
        clinicId={user?.clinic_id}
        onPatientCreated={handlePatientCreated}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - LEFT side first in flex */}
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(id) => {
            selectConversation(id);
            setSidebarOpen(false);
          }}
          onNew={() => {
            startNewConversation();
            setSidebarOpen(false);
          }}
          onDelete={removeConversation}
          isLoading={isLoadingConversations}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-muted/10 relative min-h-0">
          {/* Header */}
          <div className="bg-card/95 backdrop-blur-md border-b border-border/50 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
            {/* LEFT: Menu button for mobile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden h-8 w-8"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-sm sm:text-base">اسأل Tabibi</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">المساعد الذكي للمنصة</p>
              </div>
            </div>
            
            {/* RIGHT: New chat button - Desktop only */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => startNewConversation()}
              disabled={isCreatingConversation}
              className="hidden sm:flex h-8 text-xs"
            >
              <Plus className="w-4 h-4 ml-1" />
              محادثة جديدة
            </Button>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 min-h-0 chat-scrollbar">
            {!activeConversationId && messages.length === 0 ? (
              <WelcomeScreen onStartChat={handleStartWithSuggestion} />
            ) : isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} onAction={handleAction} executeResults={executeResults} />
                ))}
                {isStreaming && <TypingIndicator />}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </div>
          
          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0">
            <ChatInput 
              onSend={handleSendMessage} 
              disabled={isCreatingConversation} 
              isStreaming={isStreaming}
              onStop={() => {
                // Stop functionality - will be handled in useChat
                console.log("Stop generation requested");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
