import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getConversations, 
  getMessages, 
  createConversation, 
  saveMessage, 
  sendMessageToAI,
  deleteConversation,
  updateConversationTitle,
  archiveConversation,
  executeAIAction
} from "../../services/apiAskTabibi";
import { parseAIResponse } from "./ActionRenderer";
import { useAuth } from "../auth/AuthContext";
import usePlan from "../auth/usePlan";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

// Hook لجلب كل المحادثات
export function useConversations() {
  return useQuery({
    queryKey: ["chat-conversations"],
    queryFn: getConversations,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook لجلب رسائل محادثة معينة
export function useMessages(conversationId) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Hook لإنشاء محادثة جديدة
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: () => createConversation(user?.clinic_id),
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      return newConversation;
    },
    onError: (error) => {
      toast.error(error.message || "حصل مشكلة في إنشاء محادثة جديدة");
    }
  });
}

// Hook لحذف محادثة
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast.success("تم حذف المحادثة");
    },
    onError: (error) => {
      toast.error(error.message || "حصل مشكلة في حذف المحادثة");
    }
  });
}

// Hook لتحديث عنوان محادثة
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, title }) => updateConversationTitle(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    }
  });
}

// Hook لأرشفة محادثة
export function useArchiveConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: archiveConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast.success("تم أرشفة المحادثة");
    },
    onError: (error) => {
      toast.error(error.message || "حصل مشكلة في أرشفة المحادثة");
    }
  });
}

// Hook رئيسي لإرسال رسالة والحصول على رد
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: planData } = usePlan();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [executeResults, setExecuteResults] = useState({});
  
  const sendMessage = useCallback(async (conversationId, messageContent, clinicData, deepReasoning = false) => {
    if (!conversationId || !messageContent.trim()) return;
    
    setIsStreaming(true);
    setStreamingContent("");
    setExecuteResults({});
    
    try {
      // حفظ رسالة المستخدم
      const userMessage = await saveMessage(conversationId, "user", messageContent);
      
      // تحديث الكاش برسالة المستخدم
      queryClient.setQueryData(["chat-messages", conversationId], (old) => {
        return [...(old || []), userMessage];
      });
      
      // جلب كل الرسائل للمحادثة
      const allMessages = queryClient.getQueryData(["chat-messages", conversationId]) || [];
      
      // إرسال للـ AI
      const aiResponse = await sendMessageToAI(
        allMessages,
        user,
        clinicData,
        planData,
        deepReasoning
      );
      
      // Parse the AI response to extract execute commands
      const { executeCommands } = parseAIResponse(aiResponse);
      
      // Execute any commands automatically
      if (executeCommands && executeCommands.length > 0) {
        const results = {};
        
        for (const cmd of executeCommands) {
          const execKey = JSON.stringify(cmd);
          const actionName = cmd.action;
          const actionData = cmd.data || {};
          
          try {
            const result = await executeAIAction(actionName, actionData);
            results[execKey] = { status: 'success', result };
            
            // Show success toast
            if (result?.message) {
              toast.success(result.message);
            }
            
            // Invalidate relevant queries based on action type
            if (actionName.includes('Patient')) {
              queryClient.invalidateQueries({ queryKey: ['patients'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            } else if (actionName.includes('Appointment')) {
              queryClient.invalidateQueries({ queryKey: ['appointments'] });
              queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            } else if (actionName.includes('Staff')) {
              queryClient.invalidateQueries({ queryKey: ['staff'] });
            } else if (actionName.includes('Clinic') || actionName.includes('Booking')) {
              queryClient.invalidateQueries({ queryKey: ['clinic'] });
            }
          } catch (error) {
            results[execKey] = { status: 'error', result: { message: error.message } };
            toast.error(error.message || 'حصل مشكلة');
          }
        }
        
        setExecuteResults(results);
      }
      
      // حفظ رد الـ AI
      const assistantMessage = await saveMessage(conversationId, "assistant", aiResponse);
      
      // تحديث الكاش برد الـ AI
      queryClient.setQueryData(["chat-messages", conversationId], (old) => {
        return [...(old || []), assistantMessage];
      });
      
      // تحديث قائمة المحادثات
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      
      setIsStreaming(false);
      return assistantMessage;
      
    } catch (error) {
      setIsStreaming(false);
      toast.error(error.message || "حصل مشكلة في إرسال الرسالة");
      throw error;
    }
  }, [queryClient, user, planData]);
  
  return {
    sendMessage,
    isStreaming,
    streamingContent,
    executeResults
  };
}

// Hook مركب يجمع كل الوظائف
export function useChat() {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const { user } = useAuth();
  
  const conversations = useConversations();
  const messages = useMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const archiveConversationMutation = useArchiveConversation();
  const { sendMessage: sendMessageBase, isStreaming, streamingContent, executeResults } = useSendMessage();
  
  // Wrapped sendMessage that uses active conversation ID
  const sendMessage = useCallback(async (content, clinicData, overrideConversationId = null, deepReasoning = false) => {
    const convId = overrideConversationId || activeConversationId;
    if (!convId) return;
    return sendMessageBase(convId, content, clinicData, deepReasoning);
  }, [activeConversationId, sendMessageBase]);
  
  const startNewConversation = useCallback(async () => {
    const newConversation = await createConversation.mutateAsync();
    setActiveConversationId(newConversation.id);
    return newConversation;
  }, [createConversation]);
  
  const selectConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
  }, []);
  
  const removeConversation = useCallback(async (conversationId) => {
    await deleteConversationMutation.mutateAsync(conversationId);
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [deleteConversationMutation, activeConversationId]);
  
  return {
    // State
    activeConversationId,
    user,
    
    // Data
    conversations: conversations.data || [],
    messages: messages.data || [],
    isLoadingConversations: conversations.isLoading,
    isLoadingMessages: messages.isLoading,
    
    // Actions
    startNewConversation,
    selectConversation,
    removeConversation,
    sendMessage,
    
    // Streaming
    isStreaming,
    streamingContent,
    executeResults,
    
    // Mutations loading states
    isCreatingConversation: createConversation.isPending,
    isDeletingConversation: deleteConversationMutation.isPending
  };
}

export default useChat;
