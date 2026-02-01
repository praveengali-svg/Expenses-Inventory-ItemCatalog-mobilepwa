import { auth } from "./firebase";
import { ExpenseData, ExpenseCategory, DocumentType, SalesDocument, SalesDocType } from "../types";

export interface GstVerificationResult {
  businessName?: string;
  address?: string;
  status?: string;
  sources: { uri: string; title: string }[];
}

// Helper to call Firebase Functions through Hosting Rewrites
async function callProxy(action: string, data: any) {
  const user = auth.currentUser;
  // If no user, wait a bit in case auth is initializing
  if (!user) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication required. Please refresh the page.");

  const token = await currentUser.getIdToken();
  const endpoint = `/api/${action}`;

  // onCall protocol requires 'data' wrapper if we were using it, 
  // but since we are using 'onRequest', we can send it directly.
  // Our function code handles both.
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Proxy Error (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      message += `: ${errorJson.error || errorJson.message || errorText}`;
    } catch {
      message += `: ${errorText}`;
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.result;
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
  try {
    const result = await callProxy('verifyGst', { gstin });
    const { text } = result;

    return {
      businessName: text.match(/Name:?\s*([^\n,]+)/i)?.[1]?.trim() || text.split('\n')[0].substring(0, 50),
      address: text.match(/Address:?\s*([^\n]+)/i)?.[1]?.trim(),
      status: text.match(/Status:?\s*([^\n,]+)/i)?.[1]?.trim() || "Active",
      sources: []
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
  try {
    const data = await callProxy('extractSales', { fileData, mimeType });

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
  try {
    const rawJson = await callProxy('extractExpense', { fileData, mimeType, hint: hintType });

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
