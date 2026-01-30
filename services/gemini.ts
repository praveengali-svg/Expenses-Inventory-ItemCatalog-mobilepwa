
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ExpenseData, ExpenseCategory, DocumentType, SalesDocument, SalesDocType } from "../types";

export interface GstVerificationResult {
  businessName?: string;
  address?: string;
  status?: string;
  sources: { uri: string; title: string }[];
}

export const verifyGstNumber = async (gstin: string): Promise<GstVerificationResult | null> => {
  const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [{ googleSearch: {} } as any]
  });

  try {
    const result = await model.generateContent(
      `Search and verify the GSTIN number ${gstin}. Provide the official Trade Name/Business Name, the registered address, and the current registration status. Return the info in plain text.`
    );
    const response = result.response;
    const text = response.text();

    // Adapted to new SDK structure if grounding info is available
    const candidates = response.candidates || [];
    const groundingMetadata = candidates[0]?.groundingMetadata as any;
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
  const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

  const systemInstruction = `
    You are an expert Indian Logistics auditor. Extract data from this SALES INVOICE.
    Identify:
    1. Customer/Consignee Name and GSTIN.
    2. Document/Invoice Number and Date.
    3. State of Supply.
    4. Detailed Line Items (Description, SKU if present, Qty, Rate, GST %, Total).
    
    Output ONLY a clean JSON object.
  `;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          customerName: { type: SchemaType.STRING },
          customerGst: { type: SchemaType.STRING },
          docNumber: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING },
          customerAddress: { type: SchemaType.STRING },
          customerState: { type: SchemaType.STRING },
          lineItems: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                description: { type: SchemaType.STRING },
                quantity: { type: SchemaType.NUMBER },
                rate: { type: SchemaType.NUMBER },
                gstPercentage: { type: SchemaType.NUMBER },
                amount: { type: SchemaType.NUMBER },
                category: { type: SchemaType.STRING }
              }
            }
          },
          totalAmount: { type: SchemaType.NUMBER },
          taxAmount: { type: SchemaType.NUMBER }
        }
      }
    }
  });

  try {
    const result = await model.generateContent([
      { inlineData: { data: fileData.split(',')[1] || fileData, mimeType } },
      "Extract sales document details."
    ]);

    const data = JSON.parse(result.response.text());
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
  const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

  const systemInstruction = `
    You are an expert Indian financial auditor specialized in scanning and digitizing financial documents, including HANDWRITTEN invoices, bills, and receipts.
    
    MISSION: Interpret and extract data from the provided image/PDF with maximum precision. Even if the text is handwritten, messy, or faded, use your advanced visual reasoning to interpret it.
    
    HANDWRITING & UNCERTAINTY RULES:
    1. If text is handwritten, perform OCR and interpret the most likely characters based on financial context.
    2. If a word is unreadable, use context (e.g., if the shop sells "Electricals", a messy word might be "Cable" or "Switch").
    3. If an item name is completely unreadable but the price is clear, use "Handwritten Item" as the description.
    4. If Vendor name is unclear, use "Local Vendor" or look for small print/stamps.
    5. NEVER return an empty response or failure message. Always provide a best-effort JSON object with as much information as you can decipher.
    
    CRITICAL EXTRACTION RULES:
    1. VENDOR DETECTION: Identify the business issuing the document.
    2. HSN/SAC DETECTION: Look for 4, 6, or 8-digit codes.
    3. DATE: Extract in ISO format (YYYY-MM-DD). If year is missing, assume current year (2024).
    4. DOCUMENT TYPE: 
       - If hint is provided, prioritize it.
       - "invoice": Tax invoices with GST details.
       - "expense": Simple retail receipts, petrol bills, travel tickets.
       - "purchase_order": Documents titled "Purchase Order".
    5. ITEM CATEGORIZATION (Mandatory per item):
       - Parts, Product, Raw Materials, Consumables, Service, Courier, Transportation, Porter, Other.
    6. MATH: Total must equal sum of (Quantity * Rate) + Tax. Use INR currency.
    7. OUTPUT: You MUST return ONLY a valid JSON object. No markdown, no explanations.
  `;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          vendorName: { type: SchemaType.STRING },
          docNumber: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING, description: "ISO date (YYYY-MM-DD)" },
          totalAmount: { type: SchemaType.NUMBER },
          taxAmount: { type: SchemaType.NUMBER },
          type: { type: SchemaType.STRING, enum: ["invoice", "expense", "purchase_order"] },
          lineItems: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                description: { type: SchemaType.STRING },
                hsnCode: { type: SchemaType.STRING },
                quantity: { type: SchemaType.NUMBER },
                rate: { type: SchemaType.NUMBER },
                gstPercentage: { type: SchemaType.NUMBER },
                amount: { type: SchemaType.NUMBER },
                category: {
                  type: SchemaType.STRING,
                  enum: ["Parts", "Product", "Raw Materials", "Consumables", "Service", "Other", "Purchase", "Courier", "Transportation", "Porter"]
                }
              },
              required: ["description", "amount", "category"]
            }
          }
        },
        required: ["vendorName", "date", "totalAmount", "lineItems"]
      }
    }
  });

  const prompt = `Perform a high-precision extraction of all financial data from this ${hintType || 'document'}. 
  NOTE: This document may contain HANDWRITTEN content. Decipher the handwriting and extract:
  - Vendor Name
  - Document Number (if present)
  - Date (ISO format)
  - Total Amount (INR)
  - Tax Amount (GST)
  - Detailed Line Item breakdown (Description, HSN, Qty, Rate, Category, Amount).
  
  If some fields are unreadable, provide your best guess or "Unknown". Do not skip items.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: fileData.split(',')[1] || fileData,
          mimeType: mimeType,
        },
      },
      prompt
    ]);

    const jsonText = result.response.text().trim();
    const rawJson = JSON.parse(jsonText);

    // Sanitize extraction results
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
        category: item.category || "Other",
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

    // Check for API Key issues
    if (err.message?.includes('API key') || err.status === 403) {
      throw new Error("Configuration Error: Invalid or missing Gemini API Key. Please check your settings.");
    }

    if (err.message?.includes('fetch failed')) {
      throw new Error("Network Error: Could not connect to Google AI. check internet connection.");
    }

    throw new Error(`Scan Failed: ${err.message || "Could not read document"}. please try again or enter details manually.`);
  }
};
