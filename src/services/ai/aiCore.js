import { getDashboardStats } from "../apiDashboard";
import { getAllAIContextData } from './aiContext';
import { getSystemPrompt } from './aiSystemPrompt';
import { GoogleGenAI } from "@google/genai";
import { isComplexQuery } from './aiUtils';

// OpenRouter DeepSeek Configuration (for complex tasks)
const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL = "nex-agi/deepseek-v3.1-nex-n1:free";

// Google Gemini AI Configuration (for simple tasks)
const GEMINI_API_KEY = "AIzaSyAwOuV_UibSh9XORdJt_yf-Y9H5dDYlGJo";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// إرسال رسالة للـ AI
export async function sendMessageToAI(messages, userData, clinicData, subscriptionData, deepReasoning = false) {
  // Fetch all context data in parallel
  let statsData = null;
  let allData = null;
  
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(err => {
        console.error("Failed to fetch stats:", err);
        return { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
      }),
      getAllAIContextData().catch(err => {
        console.error("Failed to fetch context data:", err);
        return {};
      })
    ]);
    statsData = stats;
    allData = contextData;
  } catch (error) {
    console.error("Failed to fetch AI context:", error);
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }
  
  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  
  // Get the last user message to determine if it's complex or simple
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Determine if query is complex (needs DeepSeek) or simple (Gemini)
  const useDeepSeek = isComplexQuery(lastUserMessage) || deepReasoning;
  
  if (useDeepSeek) {
    // Use OpenRouter DeepSeek for complex tasks
    try {
      // Format messages for OpenRouter API
      const formattedMessages = [];
      
      // Add system message
      formattedMessages.push({
        role: "system",
        content: systemPrompt
      });
      
      // Add chat history
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
      
      // Add current user message
      formattedMessages.push({
        role: "user",
        content: lastUserMessage
      });
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          "X-Title": "Tabibi AI"
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error calling OpenRouter DeepSeek AI:", error);
      // Fallback to Gemini if OpenRouter fails
      console.log("Falling back to Gemini AI...");
    }
  }
  
  // Use Gemini for simple tasks
  try {
    // Format messages for Gemini
    // Gemini uses "user" and "model" roles, and system instructions are separate
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Configure Gemini model with system instruction
    const modelConfig = {
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      }
    };
    
    // Add thinking config for deep reasoning if enabled
    if (deepReasoning) {
      modelConfig.config.thinkingConfig = {
        thinkingBudget: 1024
      };
    }
    
    // Previous messages (history) - exclude the last one
    const history = chatHistory.slice(0, -1);
    
    // Create chat session or generate content
    if (history.length > 0) {
      // Use chat for multi-turn conversations
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: modelConfig.config,
        history: history
      });
      
      const response = await chat.sendMessage({ message: lastUserMessage });
      return response.text;
    } else {
      // Single turn - use generateContent directly
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { systemInstruction: systemPrompt },
        contents: lastUserMessage
      });
      return response.text;
    }
  } catch (error) {
    console.error("Error calling Gemini AI:", error);
    throw new Error("حصل مشكلة في التواصل مع الـ AI");
  }
}

// Streaming version للرسائل (لو عايز تعرض الرد حرف حرف)
export async function sendMessageToAIStream(messages, userData, clinicData, subscriptionData, onChunk) {
  // Fetch all context data in parallel
  let statsData = null;
  let allData = null;
  
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(err => {
        console.error("Failed to fetch stats:", err);
        return { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
      }),
      getAllAIContextData().catch(err => {
        console.error("Failed to fetch context data:", err);
        return {};
      })
    ]);
    statsData = stats;
    allData = contextData;
  } catch (error) {
    console.error("Failed to fetch AI context:", error);
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }
  
  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  
  // Get the last user message to determine if it's complex or simple
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Determine if query is complex (needs DeepSeek) or simple (Gemini)
  const useDeepSeek = isComplexQuery(lastUserMessage);
  
  if (useDeepSeek) {
    // Use OpenRouter DeepSeek for complex tasks
    try {
      // Format messages for OpenRouter API
      const formattedMessages = [];
      
      // Add system message
      formattedMessages.push({
        role: "system",
        content: systemPrompt
      });
      
      // Add chat history
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
      
      // Add current user message
      formattedMessages.push({
        role: "user",
        content: lastUserMessage
      });
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          "X-Title": "Tabibi AI",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                  const text = data.choices[0].delta.content;
                  if (text) {
                    fullContent += text;
                    onChunk(text, fullContent);
                  }
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return fullContent;
    } catch (error) {
      console.error("Error streaming OpenRouter DeepSeek AI:", error);
      // Fallback to Gemini if OpenRouter fails
      console.log("Falling back to Gemini AI streaming...");
    }
  }
  
  // Use Gemini for simple tasks
  try {
    // Format messages for Gemini
    const chatHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Previous messages (history) - exclude the last one
    const history = chatHistory.slice(0, -1);
    
    let fullContent = "";
    
    if (history.length > 0) {
      // Use chat for multi-turn conversations with streaming
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction: systemPrompt },
        history: history
      });
      
      const stream = await chat.sendMessageStream({ message: lastUserMessage });
      
      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          fullContent += text;
          onChunk(text, fullContent);
        }
      }
    } else {
      // Single turn with streaming
      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        config: { systemInstruction: systemPrompt },
        contents: lastUserMessage
      });
      
      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          fullContent += text;
          onChunk(text, fullContent);
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error("Error streaming Gemini AI:", error);
    throw new Error("حصل مشكلة في التواصل مع الـ AI");
  }
}