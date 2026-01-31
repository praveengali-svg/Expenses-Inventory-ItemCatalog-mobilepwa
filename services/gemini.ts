import { GoogleGenAI } from "@google/genai";
import { ExpenseData, ExpenseCategory, DocumentType, SalesDocument, SalesDocType } from "../types";

export interface GstVerificationResult {
  businessName?: string;
  address?: string;
  status?: string;
  sources: { uri: string; title: string }[];
}

// Map of categories for consistency
const CATEGORIES: Record<string, ExpenseCategory> = {
  "Parts": "Parts",
  "Product": "Product",
  "Raw Materials": "Raw Materials",
  "Consumables": "Consumables",
  "Service": "Service",
  "Other": "Other",
  "Purchase": "Purchase",
  "Courier": "Courier",
  "Transportation": "Transportation",
  "Porter": "Porter"
};

export const verifyGstNumber = async (gstin: string): Promise<GstVerificationResult | null> => {
  const client = new GoogleGenAI({
    apiKey: process.env.API_KEY || ""
  });

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [{ text: `Search and verify the GSTIN number ${gstin}. Provide the official Trade Name/Business Name, the registered address, and the current registration status. Return the info in plain text.` }]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Adapted to new SDK structure if grounding info is available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as any;
    const sources = groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web)
      ?.map((chunk: any) => ({
        uri: chunk.web!.uri,
        title: chunk.web!.title || 'Verification Source'
      })) || [];

    return {
      businessName: text.match(/Name:?\s*([^\n,]+)/i)?.[1]?.trim() || text.split('\n')[0].substring(0, 50),
      address: text.match(/Address:?\s*([^\n]+)/i)?.[1]?.trim(),
      status: text.match(/Status:?\s*([^\n,]+)/i)?.[1]?.trim() || "Active",
      sources
    };
  } catch (err) {
    console.error("GST verification failed", err);
    return null;
  }
};

export const extractSalesData = async (
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<Partial<SalesDocument>> => {
  const client = new GoogleGenAI({
    apiKey: process.env.API_KEY || ""
  });

  const systemInstruction = `
    You are an expert Indian Logistics auditor. Extract data from this SALES INVOICE.
    Identify:
    1. Customer/Consignee Name and GSTIN.
    2. Document/Invoice Number and Date.
    3. State of Supply.
    4. Detailed Line Items (Description, SKU if present, Qty, Rate, GST %, Total).
    
    Output ONLY a clean JSON object.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: fileData.split(',')[1] || fileData, mimeType } },
            { text: "Extract sales document details." }
          ]
        }
      ],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseMimeType: "application/json"
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const data = JSON.parse(text);

    return {
      ...data,
      id: crypto.randomUUID(),
      type: 'sales_invoice' as SalesDocType,
      status: 'issued',
      createdAt: Date.now()
    };
  } catch (err) {
    console.error("Sales AI extraction error", err);
    throw err;
  }
};

export const extractExpenseData = async (
  fileData: string,
  mimeType: string,
  fileName: string,
  hintType?: DocumentType
): Promise<Partial<ExpenseData>> => {
  const client = new GoogleGenAI({
    apiKey: process.env.API_KEY || ""
  });

  const systemInstruction = `
    You are an expert Indian financial auditor specialized in scanning and digitizing financial documents, including HANDWRITTEN invoices, bills, and receipts.
    
    MISSION: Interpret and extract data from the provided image/PDF with maximum precision. Even if the text is handwritten, messy, or faded, use your advanced visual reasoning to interpret it.
    
    CRITICAL EXTRACTION RULES:
    1. VENDOR DETECTION: Identify the business issuing the document.
    2. HSN/SAC DETECTION: Look for 4, 6, or 8-digit codes.
    3. DATE: Extract in ISO format (YYYY-MM-DD).
    4. MATH: Total must equal sum of (Quantity * Rate) + Tax. Use INR currency.
    5. OUTPUT: You MUST return ONLY a valid JSON object matching the requested schema.
  `;

  const schema = {
    type: "object",
    properties: {
      vendorName: { type: "string" },
      docNumber: { type: "string" },
      date: { type: "string", description: "ISO date (YYYY-MM-DD)" },
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
            category: {
              type: "string",
              enum: ["Parts", "Product", "Raw Materials", "Consumables", "Service", "Other", "Purchase", "Courier", "Transportation", "Porter"]
            }
          },
          required: ["description", "amount", "category"]
        }
      }
    },
    required: ["vendorName", "date", "totalAmount", "lineItems"]
  };

  const prompt = `Perform a high-precision extraction of all financial data from this ${hintType || 'document'}. 
  NOTE: This document may contain HANDWRITTEN content. Decipher the handwriting and extract:
  - Vendor Name
  - Document Number (if present)
  - Date (ISO format)
  - Total Amount (INR)
  - Tax Amount (GST)
  - Detailed Line Item breakdown (Description, HSN, Qty, Rate, Category, Amount).`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: fileData.split(',')[1] || fileData, mimeType } },
            { text: prompt }
          ]
        }
      ],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const rawJson = JSON.parse(jsonText);

    return {
      vendorName: rawJson.vendorName || "Unknown Vendor",
      docNumber: rawJson.docNumber || `EXT-${Date.now().toString().slice(-6)}`,
      date: rawJson.date || new Date().toISOString().split('T')[0],
      totalAmount: Number(rawJson.totalAmount) || 0,
      taxAmount: Number(rawJson.taxAmount) || 0,
      lineItems: (rawJson.lineItems || []).map((item: any) => ({
        description: item.description || "Unreadable Item",
        amount: Number(item.amount) || 0,
        hsnCode: item.hsnCode || "",
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || Number(item.amount) || 0,
        category: (CATEGORIES[item.category] || "Other") as ExpenseCategory,
        gstPercentage: Number(item.gstPercentage) || 18
      })),
      id: crypto.randomUUID(),
      currency: 'INR',
      fileName,
      createdAt: Date.now(),
      type: rawJson.type || (hintType === 'purchase_order' ? 'purchase_order' : (hintType === 'invoice' ? 'invoice' : 'expense'))
    };
  } catch (err: any) {
    console.error("AI Extraction Error:", err);
    throw new Error(`Scan Failed: ${err.message || "Could not read document"}. please try again or enter details manually.`);
  }
};
