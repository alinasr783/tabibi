import OpenAI from 'openai';

// Initialize OpenAI client compatible with Groq
// NOTE: In a production environment, API keys should not be exposed on the client side.
// This should be moved to a server-side API route or Edge Function.
import databaseSchemaRaw from '../../database.txt?raw';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  dangerouslyAllowBrowser: true 
});

function extractPatientsTableSchema(text) {
  if (!text) return "";
  const marker = "CREATE TABLE public.patients";
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const after = text.slice(start);
  const endIdx = after.indexOf(");");
  if (endIdx < 0) return after.slice(0, 1500);
  return after.slice(0, Math.min(after.length, endIdx + 2));
}

function chooseDeepseekModel({ userInput }) {
  const len = String(userInput || "").trim().length;
  if (len >= 650) return { model: "deepseek-reasoner", temperature: 0.2 };
  return { model: "deepseek-chat", temperature: 1 };
}

function tryExtractReplyFromJsonBuffer(buffer) {
  const str = String(buffer || "");
  const idx = str.indexOf("\"reply\"");
  if (idx < 0) return null;
  const slice = str.slice(idx);
  const match = slice.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)/);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return null;
  }
}

export async function processPatientInputStream(patientData, userInput, schemaConfig = null, chatHistory = [], opts = {}) {
  const { onPartialReply, signal } = opts || {};
  const patientsTableSchema = extractPatientsTableSchema(databaseSchemaRaw);
  const { model, temperature } = chooseDeepseekModel({ userInput });
  const systemPrompt = `
You are an elite clinical AI assistant for "Tabibi" (My Doctor).
Your capabilities go beyond simple extraction; you possess **Clinical Reasoning** and **Contextual Awareness**.

OBJECTIVES:
1. **Contextual Analysis**: Distinguish between the Doctor's observations/questions and the Patient's responses if the input is a conversation.
2. **Deep Inference**: Deduce patient attributes from indirect statements.
3. **Database Mastery**: You fully understand the "patients" table structure and its capabilities.

DATABASE REFERENCE (EXTRACT FROM database.txt):
${patientsTableSchema || "(patients table schema not found)"}

CURRENT PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

CHAT HISTORY (Previous Interactions):
${chatHistory.map(msg => {
  const content = typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content;
  return `${msg.role === 'user' ? 'Doctor/User' : 'AI'}: ${content}`;
}).join('\n')}

${schemaConfig ? `
================================================================================
FIELDS CATALOG (BUILT-IN + CUSTOM SECTIONS + EXISTING PATIENT CUSTOM FIELDS)
${JSON.stringify(schemaConfig, null, 2)}
================================================================================
` : ''}

TASK:
1. **Read & Plan**: Analyze the new input in the context of the Chat History and Current Data.
2. **Identify Speaker**: Differentiate between doctor and patient if needed.
3. **Extract & Infer**: Extract facts and infer attributes (e.g., "husband" -> married).
4. **Map Data**:
   - Update ONLY columns that exist in patients table.
   - Standard fields are stored directly as columns (name, phone, age, gender, address, job, marital_status, blood_type, email, notes, date_of_birth, age_unit).
   - Medical details MUST go ONLY inside medical_history (JSONB).
   - Insurance details MUST go ONLY inside insurance_info (JSONB).
   - Existing patient custom fields are stored in custom_fields (JSONB array). When updating values, you MUST output custom_fields as an object mapping { "<field_id>": <value> }.
   - If the conversation contains a medically-relevant fact that has NO appropriate existing field (standard/medical_history/insurance/custom), then propose a NEW custom field in create_fields (do NOT invent standard columns).
5. **Formulate Reply**: Generate a response directed specifically **TO THE DOCTOR**.
   - **Persona**: You are a professional, concise Clinical Assistant.
   - **Tone**: Formal yet direct (e.g., "تمام يا دكتور، تم تسجيل...").
   - **Content**:
     - The reply MUST include ONLY the changes you applied (no questions, no suggestions).
     - Keep it short and formatted as 2-6 bullets in Arabic.

OUTPUT FORMAT:
Return ONLY a JSON object with these keys:
1. "updates": object. Fields to update. Use only existing patients columns. For custom field updates: { "custom_fields": { "<field_id>": <value> } }.
2. "create_fields": array. New custom field proposals when needed. Each item: { "name": string, "type": string, "section_id": string, "options": string[], "initial_value": any, "reason": string }.
3. "ui": object. A structured UI payload that the frontend will render as a React component. Required shape:
   - version: "tabibi_intelligence_v2"
   - title: string
   - changes: { label: string, field_ref: string, preview: string }[]
4. "reply": string. Plain Arabic reply (short) containing ONLY applied changes.

Example Output:
{
  "updates": {
    "marital_status": "Married",
    "custom_fields": { "uuid...": "Value" }
  },
  "create_fields": [],
  "ui": {
    "version": "tabibi_intelligence_v2",
    "title": "تم تحديث بيانات المريض",
    "changes": [
      { "label": "الحالة الاجتماعية", "field_ref": "marital_status", "preview": "Married" }
    ]
  },
  "reply": "- تم تحديث الحالة الاجتماعية: Married"
}

Rules:
- Return ONLY JSON (no markdown).
- Never output non-existent columns in updates.
- If schemaConfig is provided, prefer matching existing fields before proposing new ones.
    `;

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    temperature,
    max_completion_tokens: 1024,
    top_p: 1,
    response_format: { type: "json_object" },
    stream: true,
    ...(signal ? { signal } : {})
  });

  let buffer = "";
  let lastReply = null;
  for await (const chunk of stream) {
    const delta = chunk?.choices?.[0]?.delta?.content;
    if (!delta) continue;
    buffer += delta;
    const extracted = typeof onPartialReply === "function" ? tryExtractReplyFromJsonBuffer(buffer) : null;
    if (extracted && extracted !== lastReply) {
      lastReply = extracted;
      onPartialReply(extracted);
    }
  }

  try {
    return JSON.parse(buffer);
  } catch (e) {
    console.error("Failed to parse AI response as JSON", buffer);
    throw new Error("AI response was not valid JSON");
  }
}

export async function processPatientInput(patientData, userInput, schemaConfig = null, chatHistory = [], opts = {}) {
  try {
    return await processPatientInputStream(patientData, userInput, schemaConfig, chatHistory, opts);
  } catch (error) {
    console.error("Error processing patient input with Groq:", error);
    throw error;
  }
}

export async function chatWithAI(messages) {
    try {
        const completion = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: messages,
            temperature: 0.7,
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Chat error:", error);
        throw error;
    }
}
