import { getDashboardStats } from "../../services/apiDashboard";
import { getAllAIContextData } from './aiContext';
import { getSystemPrompt } from './aiSystemPrompt';
import { isComplexQuery } from './aiUtils';
import { GoogleGenAI } from "@google/genai";

// Google Gemini Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// إرسال رسالة للـ AI
export async function sendMessageToAI(messages, userData, clinicData, subscriptionData, deepReasoning = false) {
  let statsData = null;
  let allData = null;
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(() => ({ totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 })),
      getAllAIContextData().catch(() => ({}))
    ]);
    statsData = stats;
    allData = contextData;
  } catch {
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }

  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  const chatHistory = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  const history = chatHistory.slice(0, -1);

  if (history.length > 0) {
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: { systemInstruction: systemPrompt },
      history
    });
    const res = await chat.sendMessage({ message: lastUserMessage });
    return res.text ?? (await res.responseText) ?? '';
  }

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: { systemInstruction: systemPrompt },
    contents: lastUserMessage
  });
  return res.text ?? '';
}

// Streaming version للرسائل (لو عايز تعرض الرد حرف حرف)
export async function sendMessageToAIStream(messages, userData, clinicData, subscriptionData, onChunk) {
  let statsData = null;
  let allData = null;
  try {
    const [stats, contextData] = await Promise.all([
      getDashboardStats().catch(() => ({ totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 })),
      getAllAIContextData().catch(() => ({}))
    ]);
    statsData = stats;
    allData = contextData;
  } catch {
    statsData = { totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, totalIncome: 0 };
    allData = {};
  }

  const systemPrompt = getSystemPrompt(userData, clinicData, subscriptionData, statsData, allData);
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  const chatHistory = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  const history = chatHistory.slice(0, -1);

  let fullContent = "";
  if (history.length > 0) {
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: { systemInstruction: systemPrompt },
      history
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
}
