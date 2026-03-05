import OpenAI from 'openai';

// Initialize OpenAI client compatible with Groq
// NOTE: In a production environment, API keys should not be exposed on the client side.
// This should be moved to a server-side API route or Edge Function.
const client = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true 
});

export async function processPatientInput(patientData, userInput, schemaConfig = null, chatHistory = []) {
  try {
    const systemPrompt = `
You are an elite clinical AI assistant for "Tabibi" (My Doctor).
Your capabilities go beyond simple extraction; you possess **Clinical Reasoning** and **Contextual Awareness**.

OBJECTIVES:
1. **Contextual Analysis**: Distinguish between the Doctor's observations/questions and the Patient's responses if the input is a conversation.
2. **Deep Inference**: Deduce patient attributes from indirect statements.
3. **Database Mastery**: You fully understand the "patients" table structure and its capabilities.

CURRENT PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

CHAT HISTORY:
${chatHistory.map(msg => `${msg.role === 'user' ? 'Doctor/User' : 'AI'}: ${msg.content}`).join('\n')}

${schemaConfig ? `
================================================================================
CUSTOM FORMS & FIELDS CONFIGURATION
${JSON.stringify(schemaConfig.custom_sections, null, 2)}

INSTRUCTIONS FOR CUSTOM FIELDS:
1. **Analyze Context**: Look at the "title" of the sections (Forms).
2. **Field Matching**: Match the user's input to the "label" of the fields.
3. **Options Validation**: Strictly map extracted values to provided options.
4. **Data Types**: Extract as number, boolean, date, etc.
================================================================================
` : ''}

TASK:
1. **Read & Plan**: Analyze the new input in the context of the Chat History and Current Data.
2. **Identify Speaker**: Differentiate between doctor and patient if needed.
3. **Extract & Infer**: Extract facts and infer attributes (e.g., "husband" -> married).
4. **Map Data**: Map to standard fields (name, phone, etc.) and Custom Fields (using IDs).
5. **Formulate Reply**: Generate a response directed specifically **TO THE DOCTOR**.
   - **Persona**: You are a professional, concise Clinical Assistant.
   - **Tone**: Formal yet direct (e.g., "تمام يا دكتور، تم تسجيل...").
   - **Content**:
     - Confirm exactly what was recorded/updated.
     - **Crucial**: Suggest asking about MISSING relevant information that would aid diagnosis based on what has been entered so far.
       - **Strict Rule**: ONLY suggest questions about information that is **NOT** present in the "CURRENT PATIENT DATA" or "CHAT HISTORY".
       - **Field Constraint**: You MUST ONLY suggest questions related to fields that exist in the "CUSTOM FORMS & FIELDS CONFIGURATION" or standard fields (Name, Age, Phone, Address, Job, Marital Status, Blood Type, Email, Notes, Chronic Diseases, Allergies, Past Surgeries, Family History). Do NOT invent new fields.
       - If all relevant fields are filled or the context doesn't require more info, do NOT suggest anything.
       - Do NOT ask about things that were already discussed.
     - **Brevity**: Keep it short. Do not be chatty.

OUTPUT FORMAT:
Return a JSON object with TWO keys:
1. "updates": The JSON object of fields to update (or empty object {} if none).
2. "reply": A string containing your conversational response to the doctor.

Example Output:
{
  "updates": {
    "marital_status": "Married",
    "custom_fields": { "uuid...": "Value" }
  },
  "reply": "تمام يا دكتور، سجلت الحالة الاجتماعية. قد يكون مفيداً السؤال عن مدة الزواج أو وجود أطفال لاستكمال التاريخ الاجتماعي."
}

Response Format:
Return ONLY the JSON object. Do not include markdown formatting like \`\`\`json.
    `;

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant", // User requested model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      temperature: 1, // User requested temperature
      max_completion_tokens: 1024, // User requested max tokens
      top_p: 1, // User requested top_p
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    try {
        return JSON.parse(responseContent);
    } catch (e) {
        console.error("Failed to parse AI response as JSON", responseContent);
        throw new Error("AI response was not valid JSON");
    }
  } catch (error) {
    console.error("Error processing patient input with Groq:", error);
    throw error;
  }
}

export async function chatWithAI(messages) {
    try {
        const completion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.7,
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Chat error:", error);
        throw error;
    }
}
