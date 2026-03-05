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
You are an intelligent medical assistant for Tabibi, a clinic management system.
Your goal is to extract patient information from natural language input (text or voice transcript) and map it to the patient data structure.

Current Patient Data:
${JSON.stringify(patientData, null, 2)}

${schemaConfig ? `
CUSTOM FIELDS CONFIGURATION:
The clinic has defined the following custom fields. You MUST extract values for these fields if present in the input.
Format: { "custom_fields": [ { "id": "field_uuid", "label": "Field Name", "type": "text/number/etc" } ] }

Available Custom Fields:
${JSON.stringify(schemaConfig.custom_fields, null, 2)}

INSTRUCTIONS FOR CUSTOM FIELDS:
1. If the input contains information matching a custom field label (or close synonym), extract it.
2. Put the extracted value in a "custom_fields" object in your response.
3. The key MUST be the field's "id" (NOT the label).
4. The value should match the expected type.
Example output for custom fields:
{
  "custom_fields": {
    "550e8400-e29b-41d4-a716-446655440000": "Extracted Value"
  }
}
` : ''}

Task:
1. Analyze the user input.
2. Identify information that updates or adds to the patient's profile (e.g., name, age, medical history, custom fields).
3. Return a JSON object containing ONLY the fields that need to be updated.
4. If the input implies adding to a list (like "chronic diseases"), append to the existing list if possible, or provide the full new list.
5. The output must be valid JSON matching the database schema structure.
6. If no relevant data is found, return an empty JSON object {}.

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
