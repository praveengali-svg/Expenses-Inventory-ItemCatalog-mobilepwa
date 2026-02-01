
export interface LineItem {
  description: string;
  amount: number;
  hsnCode?: string;
  gstPercentage?: number;
  quantity?: number;
  rate?: number;
  category?: ExpenseCategory;
  sku?: string; // Linked SKU from catalog
  unitOfMeasure?: string; // PCS, SET, KGS etc.
  isStocked?: boolean; // Track if this specific line item has updated inventory
}

export type MovementType =
  | 'Purchase_GRN'
  | 'Sales_Dispatch'
  | 'Manual_Adjustment'
  | 'Sale_Return'
  | 'Manufacturing_Consumption'
  | 'Manufacturing_Output';

export interface StockMovement {
  id: string;
  sku: string;
  type: MovementType;
  quantity: number; // Positive for inward, negative for outward
  referenceId: string; // ID of the source document (Expense, Sales, or Production Order)
  date: number;
  notes?: string;
}

export interface BOMItem {
  sku: string;
  quantity: number; // Quantity required for 1 unit of the parent
}

export type DocumentType = 'invoice' | 'expense' | 'purchase_order';
export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export type SalesDocType = 'sales_invoice' | 'credit_note' | 'quotation' | 'proforma' | 'delivery_challan';

export interface SalesDocument {
  id: string;
  docNumber: string;
  type: SalesDocType;
  customerName: string;
  customerGst?: string;
  customerAddress?: string;
  customerState?: string;
  shippingAddress?: string;
  poNumber?: string;
  poDate?: string;
  date: string;
  lineItems: LineItem[];
  totalAmount: number;
  taxAmount: number;
  amountPaid?: number;
  balanceAmount?: number;
  notes?: string;
  createdAt: number;
  createdBy: string;
  status: 'draft' | 'issued' | 'cancelled';
}

export interface User {
  phone: string;
  pin: string;
  name: string;
  role: 'admin' | 'staff';
  createdAt: number;
}

export type ExpenseCategory = 'Parts' | 'Product' | 'Raw Materials' | 'Consumables' | 'Service' | 'Other' | 'Purchase' | 'Courier' | 'Transportation' | 'Porter';

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  hsnCode: string;
  gstPercentage: number;
  basePrice: number; // Purchase/Procurement Cost
  sellingPrice: number; // Standard Sale Rate
  unitOfMeasure: string; // PCS, SET, PAIR, KGS, etc.
  category: ExpenseCategory;
  type: 'good' | 'service';
  imageUrl?: string;
  bom?: BOMItem[]; // Bill of Materials for manufacturing
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ExpenseCategory;
  stockLevel: number;
  unit: string;
  lastUpdated: number;
  minThreshold: number;
}

export interface ExpenseData {
  id: string;
  vendorName: string;
  vendorGst?: string;
  vendorAddress?: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  currency: 'INR';
  lineItems: LineItem[];
  imageUrl?: string;
  fileName: string;
  createdAt: number;
  type: DocumentType;
  createdBy: string;
  docNumber?: string;
  status?: PurchaseStatus;
}

export interface ProductionOrder {
  id: string;
  productSku: string;
  quantity: number;
  date: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
}

export interface AppAsset {
  id: string;
  name: string;
  data: string; // Base64 or URL
  mimeType: string;
  type: 'logo' | 'product' | 'document' | 'other';
  createdAt: number;
  isSystem?: boolean;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SCANNING = 'SCANNING',
  ERROR = 'ERROR'
}
