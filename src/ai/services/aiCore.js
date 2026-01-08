import { getDashboardStats } from "../../services/apiDashboard";
import { getAllAIContextData } from './aiContext';
import { getSystemPrompt } from './aiSystemPrompt';
import { isComplexQuery } from './aiUtils';
import OpenAI from "openai";
import { Mistral } from '@mistralai/mistralai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Cerebras from '@cerebras/cerebras_cloud_sdk';

// OpenRouter DeepSeek Configuration (primary)
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek/deepseek-chat";

// SiliconFlow DeepSeek Configuration (fallback 1)
const SILICONFLOW_API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY;
const SILICONFLOW_API_URL = "https://api.siliconflow.com/v1/chat/completions";
const SILICONFLOW_MODEL = "Qwen/QwQ-32B";

// Groq Configuration (fallback 2)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  dangerouslyAllowBrowser: true
});

// Mistral AI Configuration (fallback 3)
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const mistralClient = new Mistral({ apiKey: MISTRAL_API_KEY });

// Cerebras Configuration (fallback 4)
const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY;
const cerebrasClient = new Cerebras({ apiKey: CEREBRAS_API_KEY });

// Google Gemini Configuration (fallback 5)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  
  // Use DeepSeek as primary, Groq as fallback 1, Mistral as fallback 2, Gemini as fallback 3
  // Try DeepSeek first
  try {
    const formattedMessages = [];
    formattedMessages.push({ role: "system", content: systemPrompt });
    
    // Only include last 5 messages to reduce tokens
    const recentMessages = messages.slice(-5);
    for (let i = 0; i < recentMessages.length - 1; i++) {
      formattedMessages.push({ role: recentMessages[i].role, content: recentMessages[i].content });
    }
    formattedMessages.push({ role: "user", content: lastUserMessage });
    
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
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling DeepSeek:", error);
    console.log("Falling back to SiliconFlow DeepSeek...");
    
    // Try SiliconFlow as fallback 1
    try {
      const formattedMessages = [];
      formattedMessages.push({ role: "system", content: systemPrompt });
      
      const recentMessages = messages.slice(-5);
      for (let i = 0; i < recentMessages.length - 1; i++) {
        formattedMessages.push({ role: recentMessages[i].role, content: recentMessages[i].content });
      }
      formattedMessages.push({ role: "user", content: lastUserMessage });
      
      const siliconResponse = await fetch(SILICONFLOW_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SILICONFLOW_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: SILICONFLOW_MODEL,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: false
        })
      });
      
      if (!siliconResponse.ok) {
        throw new Error(`SiliconFlow API error: ${siliconResponse.status}`);
      }
      
      const siliconData = await siliconResponse.json();
      return siliconData.choices[0].message.content;
    } catch (siliconError) {
      console.error("Error calling SiliconFlow:", siliconError);
      console.log("Falling back to Groq AI...");
      
      // Try Groq as fallback 2
      try {
        const formattedMessages = [];
        formattedMessages.push({ role: "system", content: systemPrompt });
        
        const recentMessages = messages.slice(-5);
        for (let i = 0; i < recentMessages.length - 1; i++) {
          formattedMessages.push({ role: recentMessages[i].role, content: recentMessages[i].content });
        }
        formattedMessages.push({ role: "user", content: lastUserMessage });
        
        const groqResponse = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 1500
        });
        
        return groqResponse.choices[0].message.content;
      } catch (groqError) {
        console.error("Error calling Groq:", groqError);
        console.log("Falling back to Mistral AI...");
        
        // Try Mistral as fallback 3
        try {
          const mistralMessages = [];
          mistralMessages.push({ role: "system", content: systemPrompt });
          
          const recentMessages = messages.slice(-5);
          for (let i = 0; i < recentMessages.length - 1; i++) {
            mistralMessages.push({ role: recentMessages[i].role, content: recentMessages[i].content });
          }
          mistralMessages.push({ role: "user", content: lastUserMessage });
          
          const mistralResponse = await mistralClient.chat.complete({
            model: 'mistral-medium-latest',
            messages: mistralMessages,
            temperature: 0.7,
            maxTokens: 1500
          });
          
          return mistralResponse.choices[0].message.content;
        } catch (mistralError) {
          console.error("Error calling Mistral:", mistralError);
          console.log("Falling back to Cerebras AI...");
          
          // Try Cerebras as fallback 4
          try {
            const cerebrasMessages = [];
            cerebrasMessages.push({ role: "system", content: systemPrompt });
            
            const recentMessages = messages.slice(-5);
            for (let i = 0; i < recentMessages.length - 1; i++) {
              cerebrasMessages.push({ role: recentMessages[i].role, content: recentMessages[i].content });
            }
            cerebrasMessages.push({ role: "user", content: lastUserMessage });
            
            const cerebrasResponse = await cerebrasClient.chat.completions.create({
              model: 'llama-3.3-70b',
              messages: cerebrasMessages,
              temperature: 0.2,
              max_completion_tokens: 1024,
              top_p: 1,
              stream: false
            });
            
            return cerebrasResponse.choices[0].message.content;
          } catch (cerebrasError) {
            console.error("Error calling Cerebras:", cerebrasError);
            console.log("Falling back to Gemini AI...");
            
            // Try Gemini as final fallback
            try {
              const model = genAI.getGenerativeModel({ model: "gemini-pro" });
              
              // Format conversation for Gemini
              const recentMessages = messages.slice(-5);
              let conversationHistory = systemPrompt + "\n\n";
              for (let i = 0; i < recentMessages.length - 1; i++) {
                conversationHistory += `${recentMessages[i].role}: ${recentMessages[i].content}\n`;
              }
              conversationHistory += `user: ${lastUserMessage}`;
              
              const result = await model.generateContent(conversationHistory);
              const response = await result.response;
              return response.text();
            } catch (geminiError) {
              console.error("Error calling Gemini:", geminiError);
              throw new Error("فشلت كل محاولات الاتصال بالـ AI. حاول تاني.");
            }
          }
        }
      }
    }
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
      console.log("Falling back to Groq AI streaming...");
      
      // Try Groq streaming fallback (Note: Groq supports streaming)
      try {
        const formattedMessages = [];
        formattedMessages.push({ role: "system", content: systemPrompt });
        for (let i = 0; i < messages.length - 1; i++) {
          formattedMessages.push({ role: messages[i].role, content: messages[i].content });
        }
        formattedMessages.push({ role: "user", content: lastUserMessage });
        
        const stream = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true
        });
        
        let fullContent = "";
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            fullContent += text;
            onChunk(text, fullContent);
          }
        }
        return fullContent;
      } catch (groqError) {
        console.error("Error streaming Groq AI:", groqError);
        console.log("Falling back to Gemini AI streaming...");
        // Will fall through to Gemini below
      }
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
    
    // Fixed: Use genAI instance and correct model name (gemini-1.5-flash)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt
    });

    if (history.length > 0) {
      // Use chat for multi-turn conversations with streaming
      const chat = model.startChat({
        history: history
      });
      
      const result = await chat.sendMessageStream(lastUserMessage);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          onChunk(text, fullContent);
        }
      }
    } else {
      // Single turn with streaming
      const result = await model.generateContentStream(lastUserMessage);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
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
