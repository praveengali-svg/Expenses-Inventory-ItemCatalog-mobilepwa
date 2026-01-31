
import { GoogleGenAI } from "@google/genai";

async function listModels() {
    const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || "",
        apiVersion: 'v1beta'
    });

    try {
        const result = await client.models.list();
        console.log("Raw result:", JSON.stringify(result, null, 2));
        if (result && result.models) {
            result.models.forEach((m) => {
                console.log(`- ${m.name}`);
            });
        } else if (Array.isArray(result)) {
            result.forEach(m => console.log(`- ${m.name}`));
        }
    } catch (err) {
        console.error("Error listing models:", err);
    }
}

listModels();
