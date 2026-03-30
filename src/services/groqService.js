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

function extractAppointmentsTableSchema(text) {
  if (!text) return "";
  const marker = "CREATE TABLE public.appointments";
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const after = text.slice(start);
  const endIdx = after.indexOf(");");
  if (endIdx < 0) return after.slice(0, 1500);
  return after.slice(0, Math.min(after.length, endIdx + 2));
}

function extractVisitsTableSchema(text) {
  if (!text) return "";
  const marker = "CREATE TABLE public.visits";
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

export async function processUniversalIntelligenceStream(context, userInput, opts = {}) {
  const { onPartialReply, signal, aiContext, chatHistory = [] } = opts || {};
  
  const patientsTableSchema = extractPatientsTableSchema(databaseSchemaRaw);
  const appointmentsTableSchema = extractAppointmentsTableSchema(databaseSchemaRaw);
  const visitsTableSchema = extractVisitsTableSchema(databaseSchemaRaw);
  
  const { model, temperature } = chooseDeepseekModel({ userInput });

  const clinicContextStr = aiContext ? `
CLINIC CONTEXT:
- Specialty: ${aiContext.specialty || "General Practice"}
- Clinic Goal: ${aiContext.clinic_goal || "Provide excellent patient care"}
- Doctor Persona: ${aiContext.doctor_persona || "Professional and concise"}
- Custom Instructions: ${aiContext.custom_instructions || ""}
` : "";

  const systemPrompt = `
You are the **Universal Medical Intelligence Engine** for "Tabibi" (My Doctor).
Your intellect is a fusion of a **Clinical Strategist**, **Operational Commander**, and **Clinical Specialist**.
You have the power to control and update **Patients**, **Appointments**, and **Visits** simultaneously from any page.

${clinicContextStr}

### **CORE CAPABILITIES:**
1. **Holistic Control**: You can update a patient's profile, adjust their appointment details, and document their medical visit in a single response.
2. **Clinical Reasoning**: Infer medical risks, social status, and pharmacological needs from natural conversation.
3. **Database Mastery**: You understand the schema for 'patients', 'appointments', and 'visits'.

### **DATABASE ARCHITECTURES:**
--- PATIENTS ---
${patientsTableSchema}
--- APPOINTMENTS ---
${appointmentsTableSchema}
--- VISITS ---
${visitsTableSchema}

### **ACTIVE CONTEXT (Current Data):**
${JSON.stringify(context, null, 2)}

### **INTERACTION HISTORY:**
${chatHistory.map(msg => {
  const content = typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content;
  return `${msg.role === 'user' ? 'Doctor' : 'AI'}: ${content}`;
}).join('\n')}

### **OPERATIONAL DIRECTIVES:**
1. **Multi-Entity Mapping**:
   - If the doctor mentions patient info (name, age, etc.) -> Put in "patient_updates".
   - If the doctor mentions booking info (date, status, price) -> Put in "appointment_updates".
   - If the doctor mentions clinical info (diagnosis, medications, follow-up) -> Put in "visit_updates".
2. **Standard Rules**:
   - Never invent columns. Use only the provided schemas.
   - Medications MUST be a JSONB array of objects in 'visit_updates'.
   - Custom fields for each entity MUST be mapped as { "custom_fields": { "<id>": <value> } }.
3. **Voice of Tabibi**:
   - **Persona**: Elite, hyper-efficient medical assistant${aiContext?.doctor_persona ? ` acting as: "${aiContext.doctor_persona}"` : ""}.
   - **Tone**: Professional Egyptian Medical Arabic.
   - **Output**: ONLY report what was updated. No fluff.

### **OUTPUT SCHEMA (JSON ONLY):**
{
  "patient_updates": { ...columns for patients table... },
  "appointment_updates": { ...columns for appointments table... },
  "visit_updates": { ...columns for visits table... },
  "create_fields": [ ...{ "entity": "patient|appointment|visit", "name", "type", "section_id", "options", "initial_value" }... ],
  "ui": { 
    "version": "tabibi_intelligence_v2", 
    "title": "تحديث البيانات المتكامل", 
    "changes": [ { "label": "اسم الحقل", "entity": "patient|appointment|visit", "preview": "القيمة الجديدة" } ] 
  },
  "reply": "Short Arabic summary of all actions across all entities."
}
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
  } catch {
    console.error("Failed to parse AI response as JSON", buffer);
    throw new Error("AI response was not valid JSON");
  }
}

export async function processPatientInputStream(patientData, userInput, schemaConfig = null, chatHistory = [], opts = {}) {
  // Use the new Universal engine but wrap it for backward compatibility if needed, 
  // or just pass through with patient context.
  const context = { patient: patientData, current_page: "patient_details", schemaConfig };
  return processUniversalIntelligenceStream(context, userInput, { ...opts, chatHistory });
}

export async function processAppointmentInputStream(appointmentData, userInput, schemaConfig = null, chatHistory = [], opts = {}) {
  const context = { appointment: appointmentData, patient: appointmentData.patient, current_page: "appointment_details", schemaConfig };
  return processUniversalIntelligenceStream(context, userInput, { ...opts, chatHistory });
}

export async function processVisitInputStream(visitData, userInput, schemaConfig = null, chatHistory = [], opts = {}) {
  const context = { visit: visitData, patient: visitData.patient, current_page: "visit_details", schemaConfig };
  return processUniversalIntelligenceStream(context, userInput, { ...opts, chatHistory });
}

export async function processMedicalFieldsIntelligenceStream(currentConfig, userInput, opts = {}) {
  const { onPartialReply, signal, aiContext, chatHistory = [] } = opts || {};
  const { model, temperature } = chooseDeepseekModel({ userInput });

  const systemPrompt = `
You are the **Universal Medical Systems Architect** for "Tabibi" (My Doctor).
You are not a consultant; you are the **Executor**. When the doctor speaks, you **Build**.
Your goal is to transform the system's structure by adding, modifying, or removing fields and sections.

### **ARCHITECTURAL MANDATE:**
1. **Direct Execution**: You must return the COMPLETE updated configuration object. You are modifying the live system.
2. **Clinical Precision**: Structure data for high-efficiency medical workflows.
3. **Data Types Excellence**: Choose the correct type: text, textarea, number, date, checkbox, select, multiselect, or progress.

### **DATABASE CONFIGURATION STRUCTURE:**
The configuration has three contexts: 'patient', 'appointment', and 'visit'.
Each contains:
- 'sections': visibility and order.
- 'customSections': user-defined structures.
- 'sectionTemplates': fields within sections.

### **CURRENT CONFIGURATION (SOURCE OF TRUTH):**
${JSON.stringify(currentConfig, null, 2)}

### **OPERATIONAL DIRECTIVES:**
1. **Analyze & Execute**: Apply changes directly to the 'config_updates' object.
2. **Persistence**: You MUST return the ENTIRE updated configuration object, not just the changes.
3. **Full Authority**:
   - **Adding Sections**: Add a new object to 'customSections' with a unique UUID 'id', 'title', 'enabled: true', and an empty 'templates' array. Also, add the ID prefixed with "custom:" to 'sections.order'.
   - **Removing Sections**: Remove the section from 'customSections' and its ID from 'sections.order'.
   - **Adding Fields**: Add a field object to the 'templates' array of a custom section, or to the appropriate key in 'sectionTemplates'. Each field needs a unique 'id', 'name', 'type', 'enabled: true', and 'placeholder'.
   - **Modifying**: Update any property (title, name, type, order, enabled).
   - **Reordering**: Change the position of elements in the 'order' or 'templates' arrays.
4. **Voice of Tabibi**:
   - **Persona**: Elite architect.
   - **Tone**: Professional and authoritative Egyptian Arabic.
   - **Output**: Report actions as "COMPLETED" (e.g., "تم إنشاء قسم...", "تم حذف حقل...").

### **OUTPUT SCHEMA (JSON ONLY):**
{
  "config_updates": { ...the complete updated configuration for ALL contexts (patient, appointment, visit)... },
  "ui": { 
    "version": "tabibi_intelligence_v2", 
    "title": "تم تنفيذ التعديلات الهيكلية", 
    "changes": [ { "label": "اسم الحقل/القسم", "action": "إضافة|تعديل|حذف|ترتيب", "preview": "تم التنفيذ" } ] 
  },
  "reply": "Authoritative Arabic summary of the structural engineering actions performed."
}
`;

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    temperature,
    max_completion_tokens: 2048,
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
  } catch {
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
