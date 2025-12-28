import { GoogleGenAI } from "@google/genai";
import { isComplexQuery, getCurrentDateTime } from './aiUtils';
import { sendMessageToAI as originalSendMessageToAI, sendMessageToAIStream as originalSendMessageToAIStream } from './aiCore';

// Google Gemini AI Configuration (for simple tasks)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Export the main AI service functions
export {
  originalSendMessageToAI as sendMessageToAI,
  originalSendMessageToAIStream as sendMessageToAIStream,
  ai,
  getCurrentDateTime,
  isComplexQuery
};