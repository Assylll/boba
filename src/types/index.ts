// ─── Product ────────────────────────────────────────────────────────────────
export type Category =
  | "classic"
  | "milk"
  | "fruit"
  | "toppings"
  | "extras";

export interface Product {
  id: string;
  name: string;
  nameRu: string;
  category: Category;
  price: number; // base price in KGS
  description: string;
  available: boolean;
  emoji: string; // placeholder visual
  sizes?: SizeOption[];
}

export interface SizeOption {
  label: "S" | "M" | "L";
  priceModifier: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItemCustomization {
  size: "S" | "M" | "L";
  sugar: 0 | 25 | 50 | 75 | 100;
  ice: "none" | "less" | "normal" | "extra";
  toppings: string[]; // topping product IDs
  comment: string;
}

export interface CartItem {
  id: string; // unique cart line id
  product: Product;
  quantity: number;
  customization: CartItemCustomization;
  lineTotal: number;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus = "new" | "in_progress" | "ready" | "completed";
export type PaymentMethod = "cash" | "cashless";
export type AccountKind = "cash_register" | "receipts" | "custom";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  customization: CartItemCustomization;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  shiftNumber: number;
  accountId: string;
  accountName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string; // ISO string
  comment?: string;
}

// ─── Shift ───────────────────────────────────────────────────────────────────
export interface Shift {
  id: string;
  shiftNumber: number;
  openedAt: string; // ISO string
  closedAt: string | null; // ISO string
  openingCash: number;
  orderCount: number;
  cashSalesTotal: number;
  cashlessSalesTotal: number;
}

// ─── Accounts ────────────────────────────────────────────────────────────────
export interface PostingAccount {
  id: string;
  name: string;
  kind: AccountKind;
  active: boolean;
  createdAt: string; // ISO string
  orderCount: number;
  totalTurnover: number;
  receiptCount: number;
  receiptTotal: number;
  balance: number;
}

export type AccountTransactionKind = "transfer" | "deposit" | "withdrawal";

export interface AccountTransaction {
  id: string;
  kind: AccountTransactionKind;
  fromAccountId: string | null;
  fromAccountName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
  amount: number;
  createdAt: string; // ISO string
  comment?: string;
}

// ─── Receipts (Приемки) ──────────────────────────────────────────────────────
export interface ReceiptItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface ReceiptItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: number;
  supplierName: string;
  accountId: string;
  accountName: string;
  items: ReceiptItem[];
  total: number;
  createdAt: string; // ISO string
  comment?: string;
}

// ─── Admin form ──────────────────────────────────────────────────────────────
export interface ProductFormData {
  name: string;
  nameRu: string;
  category: Category;
  price: number;
  description: string;
  available: boolean;
  emoji: string;
}
