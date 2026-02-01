const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Common Extraction logic
async function runGeminiExtraction(apiKey, fileData, mimeType, prompt, systemInstruction, schema) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction
    });

    const part = {
        inlineData: {
            data: fileData.split(',')[1] || fileData,
            mimeType: mimeType
        }
    };

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [part, { text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const response = await result.response;
    return JSON.parse(response.text());
}

exports.extractExpenseDataProxy = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");

    const { fileData, mimeType, hint } = request.data;

    const systemInstruction = `You are an expert Indian financial auditor. Extract data from financial documents including HANDWRITTEN ones. Decipher handwriting with maximum precision.`;
    const prompt = `Extract financial data from this ${hint || 'document'}.`;

    const schema = {
        type: "object",
        properties: {
            vendorName: { type: "string" },
            docNumber: { type: "string" },
            date: { type: "string" },
            totalAmount: { type: "number" },
            taxAmount: { type: "number" },
            type: { type: "string", enum: ["invoice", "expense", "purchase_order"] },
            lineItems: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        description: { type: "string" },
                        hsnCode: { type: "string" },
                        quantity: { type: "number" },
                        rate: { type: "number" },
                        gstPercentage: { type: "number" },
                        amount: { type: "number" },
                        category: { type: "string" }
                    }
                }
            }
        }
    };

    return runGeminiExtraction(GEMINI_API_KEY.value(), fileData, mimeType, prompt, systemInstruction, schema);
});

exports.extractSalesDataProxy = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");

    const { fileData, mimeType } = request.data;
    const systemInstruction = `You are an expert Indian Logistics auditor. Extract data from this SALES INVOICE.`;
    const prompt = `Identify customer, GSTIN, Doc Number, Date, State, and detailed Line Items.`;

    return runGeminiExtraction(GEMINI_API_KEY.value(), fileData, mimeType, prompt, systemInstruction);
});

exports.verifyGstNumberProxy = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Auth required");

    const { gstin } = request.data;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1beta' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Search and verify GSTIN ${gstin}. Return Name, Address, Status.` }] }],
        tools: [{ googleSearch: {} }]
    });

    return { text: result.response.text(), metadata: result.response.candidates[0].groundingMetadata };
});
