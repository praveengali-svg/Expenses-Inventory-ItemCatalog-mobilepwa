const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const cors = require("cors")({ origin: true });

initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Middleware to verify Firebase ID Token
async function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: No token provided');
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        return await getAuth().verifyIdToken(token);
    } catch (error) {
        throw new Error('Unauthorized: Invalid token');
    }
}

// Common Extraction logic
async function runGeminiExtraction(apiKey, fileData, mimeType, prompt, systemInstruction, schema) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
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

const functionOptions = {
    secrets: [GEMINI_API_KEY],
    region: "us-central1",
    memory: "512MiB",
    invoker: "public" // Still set this to attempt automatic public access
};

exports.extractExpenseDataProxy = onRequest(functionOptions, (req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method === 'OPTIONS') return res.status(204).send();
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            const decodedToken = await verifyToken(req);
            const { fileData, mimeType, hint } = req.body.data || req.body;

            console.log(`Processing expense for user: ${decodedToken.uid}`);

            const systemInstruction = `You are an expert Indian financial auditor. Extract data from financial documents. Respond in JSON.`;
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

            const result = await runGeminiExtraction(GEMINI_API_KEY.value(), fileData, mimeType, prompt, systemInstruction, schema);
            res.json({ result });
        } catch (err) {
            console.error(err);
            res.status(err.message.includes('Unauthorized') ? 401 : 500).json({ error: err.message });
        }
    });
});

exports.extractSalesDataProxy = onRequest(functionOptions, (req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method === 'OPTIONS') return res.status(204).send();
            if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

            const decodedToken = await verifyToken(req);
            const { fileData, mimeType } = req.body.data || req.body;

            const systemInstruction = `You are an expert Indian Logistics auditor. Extract data from this SALES INVOICE. Respond in JSON.`;
            const prompt = `Identify customer, GSTIN, Doc Number, Date, State, and detailed Line Items.`;

            const result = await runGeminiExtraction(GEMINI_API_KEY.value(), fileData, mimeType, prompt, systemInstruction);
            res.json({ result });
        } catch (err) {
            console.error(err);
            res.status(err.message.includes('Unauthorized') ? 401 : 500).json({ error: err.message });
        }
    });
});

exports.verifyGstNumberProxy = onRequest(functionOptions, (req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method === 'OPTIONS') return res.status(204).send();
            const decodedToken = await verifyToken(req);
            const { gstin } = req.body.data || req.body;

            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: `Search and verify GSTIN ${gstin}. Return Name, Address, Status.` }] }]
            });

            res.json({ result: { text: result.response.text(), metadata: {} } });
        } catch (err) {
            console.error(err);
            res.status(err.message.includes('Unauthorized') ? 401 : 500).json({ error: err.message });
        }
    });
});
