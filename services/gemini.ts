import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
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
  const proxy = httpsCallable(functions, 'verifyGstNumberProxy');
  try {
    const result = await proxy({ gstin }) as any;
    const { text, metadata } = result.data;

    const sources = metadata?.groundingChunks
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
    console.error("GST verification proxy failed", err);
    return null;
  }
};

export const extractSalesData = async (
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<Partial<SalesDocument>> => {
  const proxy = httpsCallable(functions, 'extractSalesDataProxy');
  try {
    const result = await proxy({ fileData, mimeType }) as any;
    const data = result.data;

    return {
      ...data,
      id: crypto.randomUUID(),
      type: 'sales_invoice' as SalesDocType,
      status: 'issued',
      createdAt: Date.now()
    };
  } catch (err) {
    console.error("Sales AI proxy extraction error", err);
    throw err;
  }
};

export const extractExpenseData = async (
  fileData: string,
  mimeType: string,
  fileName: string,
  hintType?: DocumentType
): Promise<Partial<ExpenseData>> => {
  const proxy = httpsCallable(functions, 'extractExpenseDataProxy');
  try {
    const result = await proxy({ fileData, mimeType, hint: hintType }) as any;
    const rawJson = result.data;

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
    console.error("AI Proxy Extraction Error:", err);
    throw new Error(`Scan Failed: ${err.message || "Could not read document"}. please try again or enter details manually.`);
  }
};
