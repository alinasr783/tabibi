import { useState, useRef, useEffect, useCallback } from "react";
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
  Sparkles,
  Clock,
  Mic,
  Paperclip,
  Brain,
  Zap,
  BadgeCheck,
  Star,
  ArrowRight
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useChat } from "./useChat";
import { useAuth } from "../../features/auth";
import { getCurrentClinic } from "../../services/apiClinic";
import { toggleOnlineBooking, changeThemeMode, reorderMenuItem, resetToDefaultSettings, changeColors, executeAIAction, getAgentProfile } from "../../services/apiAskTabibi";
import { useUserPreferencesContext } from "../../features/user-preferences/UserPreferencesProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { parseAIResponse, InlineMessageRenderer } from "./ActionRenderer";
import AppointmentCreateDialog from "../../features/calendar/AppointmentCreateDialog";
import PatientCreateDialog from "../../features/patients/PatientCreateDialog";
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
  "staff": "staff"
};

// ========================
// مكون الرسالة الواحدة مع دعم الـ Actions المضمنة
// ========================
function ChatMessage({ message, isStreaming = false, onAction, executeResults = {} }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  
  // Clean content to remove "Executing..." status text which is now handled by the UI
  let contentToParse = message.content;
  if (isAssistant && contentToParse) {
    // Remove lines starting with "جاري تنفيذ" or similar
    contentToParse = contentToParse
      .replace(/^(جاري تنفيذ|جاري العمل|جاري البحث|جاري إضافة|جاري حجز|Executing|Working on|Processing).+$/gim, "")
      // Remove specific phrase "جاري تنفيذ :"
      .replace(/جاري تنفيذ\s*:.*/gi, "")
      .trim();
  }
  
  // Parse content for actions if it's an assistant message
  const { segments } = isAssistant 
    ? parseAIResponse(contentToParse) 
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
        "max-w-[82%] sm:max-w-[80%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3",
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
      <div className="bg-card border border-border/60 rounded-2xl rounded-tl-md px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm">
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
// مكون إدخال الرسالة - Mobile Optimized
// ========================
function ChatInput({ onSend, disabled, currentAction }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
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
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center pointer-events-auto">
        {/* Real-time Status Indicator */}
        {currentAction && (
          <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-3 rounded-full bg-white/90 backdrop-blur border border-primary/20 w-fit mx-auto animate-pulse shadow-sm">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <span className="text-xs text-primary font-medium">{currentAction}</span>
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 bg-white rounded-2xl border-2 border-primary/30 shadow-lg p-1.5 sm:p-2 px-2 sm:px-3 py-1.5 sm:py-2.5 w-full mb-2 backdrop-blur-sm">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا..."
            disabled={disabled}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-[13px] sm:text-sm",
              "focus:outline-none",
              "placeholder:text-muted-foreground/70 min-h-[36px] sm:min-h-[40px] max-h-[100px]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            rows={1}
          />
          
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex-shrink-0 transition-all",
              message.trim() 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {disabled ? (
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
// مكون المحادثات الجانبية - Left Side
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
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - RIGHT side */}
      <div className={cn(
        "fixed md:static top-0 right-0 h-full w-[280px] sm:w-72 bg-card border-l border-border/50 z-50",
        "transform transition-transform duration-300 ease-in-out",
        "flex flex-col shadow-xl md:shadow-none",
        isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border/50 flex items-center justify-between flex-shrink-0">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onNew}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-semibold text-sm sm:text-base">Tabibi AI</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Plus button removed as requested */}
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
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 chat-scrollbar">
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
            conversations.map((conv) => (
              <div
                key={conv.id}
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
                      {format(new Date(conv.updated_at), "dd MMM", { locale: ar })}
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
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ========================
// شاشة الترحيب (Profile Style)
// ========================
function WelcomeScreen({ conversations, onSelectConversation }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['aiAgentProfile'],
    queryFn: getAgentProfile,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const [visibleConversations, setVisibleConversations] = useState(7);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8F8F8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A1F44]" />
      </div>
    );
  }

  // Helper for safe stats
  const stats = {
    rating: "4.9",
    status: "متاح"
  };

  return (
    <div className="min-h-full bg-[#F8F8F8] font-[Cairo] text-[#333333] pb-24 overflow-y-auto overflow-x-hidden chat-scrollbar" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&family=Quicksand:wght@700&display=swap');
        .font-body-sans { font-family: 'Cairo', sans-serif; }
        .font-amiri { font-family: 'Amiri', serif; }
        .font-quicksand { font-family: 'Quicksand', sans-serif; }
        .card-shadow-elegant { box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.08); }
        .glass-panel {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div className="max-w-md mx-auto px-4 space-y-5 pt-4">
        
        {/* Profile Card */}
        <div className="rounded-2xl overflow-hidden card-shadow-elegant relative border border-gray-100 h-[280px] flex flex-col justify-end">
          {/* Banner Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url("${profile?.banner_url || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070'}")` 
            }}
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          
          <div className="relative px-6 pb-6 z-10">
            <div className="flex items-end mb-4 gap-4">
              <div className="relative shrink-0">
                <div 
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-2xl h-24 w-24 border-2 border-white shadow-lg" 
                  style={{ backgroundImage: `url("${profile?.avatar_url || 'https://ui-avatars.com/api/?name=Tabibi+AI&background=0D9488&color=fff&size=128'}")` }}
                ></div>
              </div>
              
              <div className="glass-panel rounded-xl p-3 flex-1 mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-quicksand font-bold text-white drop-shadow-md">{profile?.name || "Tabibi AI"}</h1>
                  <BadgeCheck className="text-[#1877F2] w-6 h-6 drop-shadow-sm" fill="#C8A155" />
                </div>
                <p className="text-white text-base font-amiri font-bold drop-shadow-sm">المساعد الذكي</p>
              </div>
            </div>
            
            <div className="glass-panel rounded-xl p-3 grid grid-cols-2 gap-2">
              <div className="text-center border-l border-white/20">
                <p className="text-xs text-white/90 font-amiri font-bold mb-1">الاصدار</p>
                <p className="text-lg font-quicksand font-bold text-white drop-shadow-sm">
                    2.0
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/90 font-amiri font-bold mb-1">النوع</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-amiri font-bold text-white drop-shadow-sm">طبي</span>
                  <BadgeCheck className="text-[#C8A155] w-4 h-4 fill-white drop-shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white rounded-2xl p-5 card-shadow-elegant border border-[#E0E0E0]">
          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-[#C8A155]" />
            نبذة عني
          </h3>
          <p className="text-sm font-body-sans text-gray-600 leading-relaxed">
            {profile?.bio || "أنا هنا لمساعدتك في إدارة عيادتك بكفاءة، من حجز المواعيد وإدارة ملفات المرضى إلى تحليل البيانات وتقديم التوصيات."}
          </p>
        </div>

        {/* Recent Conversations */}
        <div className="bg-white rounded-2xl p-5 card-shadow-elegant border border-[#E0E0E0]">
          <h3 className="font-amiri font-bold text-xl text-[#0A1F44] mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#C8A155]" />
            المحادثات السابقة
          </h3>
          
          <div className="space-y-3">
            {conversations && conversations.length > 0 ? (
              <>
                {conversations.slice(0, visibleConversations).map((conv) => (
                  <div 
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-[#0A1F44]/5 hover:border-[#0A1F44]/10 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-[#0A1F44]">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0A1F44] truncate">{conv.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(conv.updated_at), "dd MMM, hh:mm a", { locale: ar })}
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
                
                {conversations.length > visibleConversations && (
                  <button 
                    onClick={() => setVisibleConversations(prev => prev + 7)}
                    className="w-full py-3 mt-2 text-sm font-bold text-[#0A1F44] bg-[#0A1F44]/5 rounded-xl hover:bg-[#0A1F44]/10 transition-colors flex items-center justify-center gap-2"
                  >
                    عرض المزيد
                    <ChevronLeft className="w-4 h-4 rotate-270" />
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">لا توجد محادثات سابقة</p>
              </div>
            )}
          </div>
        </div>
        


      </div>
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
    executeResults,
    currentAction
  } = useChat();
  
  // Watch for execution results to update patient ID
  useEffect(() => {
    if (executeResults) {
      Object.values(executeResults).forEach(res => {
        if (res.status === 'success' && res.result?.patientId) {
          setLastCreatedPatientId(res.result.patientId);
          console.log("Updated lastCreatedPatientId from executeResults:", res.result.patientId);
        }
      });
    }
  }, [executeResults]);
  
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
    
    // Handle form submission - send all form data as a message
    if (actionType === "formSubmit") {
      const { formId, data, formattedMessage, action } = actionData;
      // Send the formatted form data as a message to the AI
      handleSendMessage(formattedMessage);
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
        
        // Execute ALL AI actions through the API
        const aiActionsList = [
          'createPatientAction', 'updatePatientAction', 'searchPatientAction', 'resolvePatientAction',
          'createAppointmentAction', 'updateAppointmentAction', 'cancelAppointmentAction', 'checkAvailabilityAction',
          'createVisitAction', 'addStaffAction', 
          'setClinicDayOffAction', 'updateClinicHoursAction', 'updateBookingPriceAction',
          'rescheduleAppointments', // Reschedule all appointments from one day to another
          'databaseQueryAction', // Direct database queries
          'createNotificationAction', // Send notifications
          'analyzeUserPerformanceAction', // Analyze clinic performance
          // Daily Email Settings
          'enableDailyAppointmentsEmailAction',
          'disableDailyAppointmentsEmailAction', 
          'updateDailyAppointmentsEmailTimeAction',
          'getDailyEmailSettingsAction'
        ];
        
        if (aiActionsList.includes(actionName)) {
          console.log(`Executing ${actionName} with data:`, data);
          const result = await executeAIAction(actionName, data);
          console.log(`${actionName} result:`, result);
          
          // Handle special cases
          if (result.patientId) {
            setLastCreatedPatientId(result.patientId);
            console.log("Updated lastCreatedPatientId:", result.patientId);
          }
          
          // Show success message
          if (result?.message) {
            toast.success(result.message);
          }
          
          // Invalidate relevant queries
          if (actionName.includes('Patient')) {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          } else if (actionName.includes('Appointment')) {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          } else if (actionName.includes('Visit')) {
            queryClient.invalidateQueries({ queryKey: ['visits'] });
          } else if (actionName.includes('Staff')) {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
          } else if (actionName.includes('Clinic') || actionName.includes('Booking')) {
            queryClient.invalidateQueries({ queryKey: ['clinic'] });
          }
          
          return; // Exit early after handling AI action
        }
        
        // Handle UI-only actions
        switch (actionName) {
          case "enableOnlineBooking":
            await toggleOnlineBooking(true);
            toast.success("تم تفعيل الحجز الإلكتروني");
            queryClient.invalidateQueries({ queryKey: ["clinic"] });
            break;
            
          case "disableOnlineBooking":
            await toggleOnlineBooking(false);
            toast.success("تم إيقاف الحجز الإلكتروني");
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
            setTimeout(() => window.location.reload(), 500);
            break;
          }
          
          case "resetSettings": {
            const result = await resetToDefaultSettings();
            applyColors('#1AA19C', '#224FB5', '#FF6B6B');
            applyThemeMode('system');
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
            applyColors(primary, secondary, accent);
            toast.success(result.message);
            break;
          }
          
          case "changeColorsAction": {
            // Handle preset colors
            const presets = {
              red: { primary: '#EF4444', secondary: '#DC2626', accent: '#F87171' },
              blue: { primary: '#3B82F6', secondary: '#2563EB', accent: '#60A5FA' },
              green: { primary: '#22C55E', secondary: '#16A34A', accent: '#4ADE80' },
              purple: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
              orange: { primary: '#F97316', secondary: '#EA580C', accent: '#FB923C' },
              pink: { primary: '#EC4899', secondary: '#DB2777', accent: '#F472B6' },
              teal: { primary: '#1AA19C', secondary: '#224FB5', accent: '#FF6B6B' }
            };
            const preset = data?.preset;
            const colors = presets[preset] || presets.teal;
            applyColors(colors.primary, colors.secondary, colors.accent);
            await changeColors(colors.primary, colors.secondary, colors.accent);
            toast.success(`تم تغيير الألوان للـ ${preset || 'teal'}`);
            break;
          }
          
          case "changeThemeAction": {
            const mode = data?.mode || 'system';
            const result = await changeThemeMode(mode);
            applyThemeMode(mode);
            toast.success(result.message || `تم تغيير المظهر للـ ${mode}`);
            break;
          }
          
          case "setBrownThemeAction": {
            const brownColors = { primary: '#8B4513', secondary: '#A0522D', accent: '#D2691E' };
            applyColors(brownColors.primary, brownColors.secondary, brownColors.accent);
            applyThemeMode('light');
            await changeColors(brownColors.primary, brownColors.secondary, brownColors.accent);
            await changeThemeMode('light');
            toast.success('تم تطبيق الثيم البني');
            break;
          }
          
          case "resetThemeAction": {
            const result = await resetToDefaultSettings();
            applyColors('#1AA19C', '#224FB5', '#FF6B6B');
            applyThemeMode('system');
            toast.success(result.message || 'تم إرجاع الإعدادات الأصلية');
            break;
          }
          
          case "changeTime": {
            // Open appointment dialog with pre-filled data for time change
            const { date, time, patientId, patientName, patientPhone } = data || {};
            // Store the pending appointment data for the dialog
            sessionStorage.setItem('pendingAppointment', JSON.stringify({
              date,
              time,
              patientId,
              patientName, 
              patientPhone
            }));
            setShowAppointmentDialog(true);
            toast.success("اختار الوقت المناسب");
            break;
          }
          
          case "showMoreAppointments": {
            // Navigate to appointments page with filter
            const { date: filterDate, status: filterStatus } = data || {};
            let url = '/appointments';
            if (filterDate) {
              url += `?date=${filterDate}`;
            }
            navigate(url);
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
    <div className="h-[100dvh] md:h-[calc(100vh-6rem)] flex flex-col -m-6 md:-m-0 overflow-hidden overflow-x-hidden">
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
          
          {/* Header - Only show when in active chat */}
          {(activeConversationId || messages.length > 0) && (
            <div className="bg-card/95 backdrop-blur-md border-b border-border/50 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0">
              {/* LEFT: Back button for mobile */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => selectConversation(null)}
                  className="md:hidden h-8 w-8"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => selectConversation(null)}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-sm sm:text-base">Tabibi AI</h1>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">المساعد الذكي للمنصة</p>
                  </div>
                </div>
              </div>
              
              {/* RIGHT: Empty to keep layout or other actions if needed */}
              <div></div>
            </div>
          )}

          {/* Messages Area */}
          <div className={cn(
            "flex-1 min-h-0 chat-scrollbar",
            (!activeConversationId && messages.length === 0) 
              ? "overflow-hidden flex flex-col" 
              : "overflow-y-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-24"
          )}>
            {!activeConversationId && messages.length === 0 ? (
              <WelcomeScreen 
                onStartChat={handleStartWithSuggestion} 
                conversations={conversations}
                onSelectConversation={selectConversation}
              />
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
          <ChatInput 
            key={activeConversationId}
            onSend={handleSendMessage} 
            disabled={isStreaming || isCreatingConversation}
            currentAction={currentAction}
          />
        </div>
      </div>
    </div>
  );
}
