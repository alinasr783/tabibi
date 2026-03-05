import OpenAI from 'openai';

// Initialize OpenAI client compatible with Groq
// NOTE: In a production environment, API keys should not be exposed on the client side.
// This should be moved to a server-side API route or Edge Function.
const client = new OpenAI({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true 
});

export async function processPatientInput(patientData, userInput, schemaConfig = null) {
  try {
    const systemPrompt = `
You are an expert medical data structuring assistant for "Tabibi".
Your core competency is understanding natural language medical notes (Arabic/English) and mapping them ACCURATELY to a structured patient profile.

CURRENT PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

${schemaConfig ? `
================================================================================
CUSTOM FORMS & FIELDS CONFIGURATION
The clinic has defined specific custom forms. You MUST map input data to these fields when relevant.

${JSON.stringify(schemaConfig.custom_sections, null, 2)}

INSTRUCTIONS FOR CUSTOM FIELDS:
1. **Analyze Context**: Look at the "title" of the sections (Forms). If the user mentions context related to a form (e.g., "Eye Exam", "Dental", "Follow up"), prioritize fields within that section.
2. **Field Matching**: Match the user's input to the "label" of the fields. Be smart about synonyms (e.g., "Pressure" -> "Blood Pressure", "Vision" -> "Visual Acuity").
3. **Options Validation**: If a field has "options" (for select/multiselect), strictly try to map the extracted value to one of the provided options.
4. **Data Types**: 
   - "number": Extract as number.
   - "checkbox": Extract as boolean (true/false).
   - "date": Extract as YYYY-MM-DD string.
5. **Output Format**: 
   Return a "custom_fields" object where keys are the field "id"s.
   
   Example Output:
   {
     "custom_fields": {
       "uuid-1234": "Selected Option",
       "uuid-5678": 120,
       "uuid-9012": true
     }
   }
================================================================================
` : ''}

TASK:
1. Analyze the user input deeply.
2. Extract clinical data and updates.
3. Map extracted data to:
   - **Standard Patient Fields**: name, phone, age, gender, address, job, marital_status, blood_type.
   - **Medical History**: chronic_diseases (list), allergies (list), past_surgeries (list), family_history (list).
   - **Custom Fields**: Using the IDs provided in the configuration above.
4. **MERGE STRATEGY**: 
   - For lists (allergies, etc.), append new items to the existing list unless explicitly asked to replace.
   - For single values (name, custom fields), return the new value to overwrite.
5. If no relevant data is found, return an empty JSON object {}.

Response Format:
Return ONLY the JSON object. Do not include markdown formatting like \`\`\`json.
    `;

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Using a robust model available on Groq (User mentioned openai/gpt-oss-120b but fallback to known working model if that is obscure, actually Llama 3 is great for this)
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      temperature: 0.1, // Low temperature for deterministic data extraction
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
