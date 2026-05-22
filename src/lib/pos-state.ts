import {
  AccountKind,
  AccountTransaction,
  CartItem,
  CartItemCustomization,
  GoodsReceipt,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PostingAccount,
  Product,
  ReceiptItem,
  ReceiptItemInput,
  Shift,
} from "@/types";
import { PRODUCTS, TAX_RATE } from "@/data/products";
import {
  calcLineTotal,
  generateId,
  generateOrderNumber,
} from "@/lib/utils";

export interface PersistedStoreState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  receipts: GoodsReceipt[];
  accountTransactions: AccountTransaction[];
  accounts: PostingAccount[];
  lastOrderNumber: number | null;
  lastReceiptNumber: number;
  activeShift: Shift | null;
  closedShifts: Shift[];
  lastShiftNumber: number;
}

export type PersistedStoreAction =
  | {
      type: "ADD_TO_CART";
      payload: { product: Product; customization: CartItemCustomization };
    }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; delta: number } }
  | { type: "REMOVE_FROM_CART"; payload: { id: string } }
  | { type: "CLEAR_CART" }
  | { type: "CHECKOUT"; payload: { paymentMethod: PaymentMethod; accountId: string } }
  | { type: "OPEN_SHIFT"; payload: { openingCash: number } }
  | { type: "CLOSE_SHIFT" }
  | {
      type: "ADD_RECEIPT";
      payload: {
        supplierName: string;
        accountId: string;
        items: ReceiptItemInput[];
        comment?: string;
      };
    }
  | {
      type: "TRANSFER_BETWEEN_ACCOUNTS";
      payload: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        comment?: string;
      };
    }
  | {
      type: "DEPOSIT_TO_ACCOUNT";
      payload: {
        accountId: string;
        amount: number;
        comment?: string;
      };
    }
  | {
      type: "WITHDRAW_FROM_ACCOUNT";
      payload: {
        accountId: string;
        amount: number;
        comment?: string;
      };
    }
  | { type: "ADD_ACCOUNT"; payload: { name: string; kind: AccountKind } }
  | { type: "TOGGLE_ACCOUNT"; payload: { accountId: string } }
  | { type: "UPDATE_ORDER_STATUS"; payload: { id: string; status: OrderStatus } }
  | { type: "REPEAT_ORDER"; payload: { orderId: string } }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "DELETE_PRODUCT"; payload: { id: string } };

function createDefaultAccounts(nowIso: string): PostingAccount[] {
  return [
    {
      id: "account-cash-register",
      name: "Касса",
      kind: "cash_register",
      active: true,
      createdAt: nowIso,
      orderCount: 0,
      totalTurnover: 0,
      receiptCount: 0,
      receiptTotal: 0,
      balance: 0,
    },
    {
      id: "account-receipts",
      name: "Приемки",
      kind: "receipts",
      active: true,
      createdAt: nowIso,
      orderCount: 0,
      totalTurnover: 0,
      receiptCount: 0,
      receiptTotal: 0,
      balance: 0,
    },
  ];
}

export function createInitialPersistedState(now = new Date()): PersistedStoreState {
  return {
    products: PRODUCTS,
    cart: [],
    orders: [],
    receipts: [],
    accountTransactions: [],
    accounts: createDefaultAccounts(now.toISOString()),
    lastOrderNumber: null,
    lastReceiptNumber: 0,
    activeShift: null,
    closedShifts: [],
    lastShiftNumber: 0,
  };
}

function normalizeAccount(account: PostingAccount): PostingAccount {
  const totalTurnover = Number.isFinite(account.totalTurnover)
    ? account.totalTurnover
    : 0;
  const receiptTotal = Number.isFinite(account.receiptTotal) ? account.receiptTotal : 0;
  const balance = Number.isFinite(account.balance)
    ? account.balance
    : totalTurnover - receiptTotal;

  return {
    ...account,
    orderCount: Number.isFinite(account.orderCount) ? account.orderCount : 0,
    totalTurnover,
    receiptCount: Number.isFinite(account.receiptCount) ? account.receiptCount : 0,
    receiptTotal,
    balance,
  };
}

export function normalizePersistedState(
  input: Partial<PersistedStoreState> | null | undefined
): PersistedStoreState {
  const initial = createInitialPersistedState();
  if (!input) return initial;

  const accounts = Array.isArray(input.accounts)
    ? input.accounts.map((account) => normalizeAccount(account))
    : initial.accounts;

  return {
    ...initial,
    ...input,
    products: Array.isArray(input.products) ? input.products : initial.products,
    cart: Array.isArray(input.cart) ? input.cart : initial.cart,
    orders: Array.isArray(input.orders) ? input.orders : initial.orders,
    receipts: Array.isArray(input.receipts) ? input.receipts : initial.receipts,
    accountTransactions: Array.isArray(input.accountTransactions)
      ? input.accountTransactions
      : initial.accountTransactions,
    accounts,
    closedShifts: Array.isArray(input.closedShifts)
      ? input.closedShifts
      : initial.closedShifts,
  };
}

function toppingProducts(products: Product[]) {
  return products.filter((product) => product.category === "toppings");
}

export function applyPersistedAction(
  sourceState: PersistedStoreState,
  action: PersistedStoreAction
): PersistedStoreState {
  const state = normalizePersistedState(sourceState);

  switch (action.type) {
    case "ADD_TO_CART": {
      const { product, customization } = action.payload;
      const lineTotal = calcLineTotal(
        product,
        1,
        customization,
        toppingProducts(state.products)
      );
      const item: CartItem = {
        id: generateId(),
        product,
        quantity: 1,
        customization,
        lineTotal,
      };
      return { ...state, cart: [...state.cart, item] };
    }
    case "UPDATE_QUANTITY": {
      const { id, delta } = action.payload;
      const cart = state.cart
        .map((item) => {
          if (item.id !== id) return item;
          const quantity = item.quantity + delta;
          if (quantity <= 0) return null;
          const lineTotal = calcLineTotal(
            item.product,
            quantity,
            item.customization,
            toppingProducts(state.products)
          );
          return { ...item, quantity, lineTotal };
        })
        .filter(Boolean) as CartItem[];
      return { ...state, cart };
    }
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((item) => item.id !== action.payload.id) };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    case "OPEN_SHIFT": {
      if (state.activeShift) return state;
      const nextShiftNumber = state.lastShiftNumber + 1;
      const openingCash = Number.isFinite(action.payload.openingCash)
        ? Math.max(0, Math.round(action.payload.openingCash))
        : 0;
      const shift: Shift = {
        id: generateId(),
        shiftNumber: nextShiftNumber,
        openedAt: new Date().toISOString(),
        closedAt: null,
        openingCash,
        orderCount: 0,
        cashSalesTotal: 0,
        cashlessSalesTotal: 0,
      };
      return {
        ...state,
        activeShift: shift,
        lastShiftNumber: nextShiftNumber,
      };
    }
    case "CLOSE_SHIFT": {
      if (!state.activeShift) return state;
      const closedShift: Shift = {
        ...state.activeShift,
        closedAt: new Date().toISOString(),
      };
      return {
        ...state,
        activeShift: null,
        closedShifts: [closedShift, ...state.closedShifts],
      };
    }
    case "ADD_RECEIPT": {
      const supplierName = action.payload.supplierName.trim();
      if (!supplierName || action.payload.items.length === 0) return state;

      const account =
        state.accounts.find(
          (item) => item.id === action.payload.accountId && item.active
        ) ?? state.accounts.find((item) => item.active);
      if (!account) return state;

      const items: ReceiptItem[] = action.payload.items
        .map((input) => {
          const product = state.products.find((item) => item.id === input.productId);
          if (!product) return null;

          const quantity = Math.max(1, Math.round(input.quantity));
          const unitCost = Math.max(0, Math.round(input.unitCost));
          const lineTotal = quantity * unitCost;

          return {
            id: generateId(),
            productId: product.id,
            productName: product.nameRu,
            quantity,
            unitCost,
            lineTotal,
          };
        })
        .filter(Boolean) as ReceiptItem[];

      if (items.length === 0) return state;

      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const receiptNumber = state.lastReceiptNumber + 1;

      const receipt: GoodsReceipt = {
        id: generateId(),
        receiptNumber,
        supplierName,
        accountId: account.id,
        accountName: account.name,
        items,
        total,
        createdAt: new Date().toISOString(),
        comment: action.payload.comment?.trim() || undefined,
      };

      return {
        ...state,
        receipts: [receipt, ...state.receipts],
        lastReceiptNumber: receiptNumber,
        accounts: state.accounts.map((item) =>
          item.id === account.id
            ? {
                ...item,
                receiptCount: item.receiptCount + 1,
                receiptTotal: item.receiptTotal + total,
                balance: item.balance - total,
              }
            : item
        ),
      };
    }
    case "TRANSFER_BETWEEN_ACCOUNTS": {
      const fromAccount = state.accounts.find(
        (item) => item.id === action.payload.fromAccountId && item.active
      );
      const toAccount = state.accounts.find(
        (item) => item.id === action.payload.toAccountId && item.active
      );
      if (!fromAccount || !toAccount) return state;
      if (fromAccount.id === toAccount.id) return state;

      const amount = Math.max(0, Math.round(action.payload.amount));
      if (amount <= 0 || fromAccount.balance < amount) return state;

      const transaction: AccountTransaction = {
        id: generateId(),
        kind: "transfer",
        fromAccountId: fromAccount.id,
        fromAccountName: fromAccount.name,
        toAccountId: toAccount.id,
        toAccountName: toAccount.name,
        amount,
        createdAt: new Date().toISOString(),
        comment: action.payload.comment?.trim() || undefined,
      };

      return {
        ...state,
        accountTransactions: [transaction, ...state.accountTransactions],
        accounts: state.accounts.map((item) => {
          if (item.id === fromAccount.id) {
            return { ...item, balance: item.balance - amount };
          }
          if (item.id === toAccount.id) {
            return { ...item, balance: item.balance + amount };
          }
          return item;
        }),
      };
    }
    case "DEPOSIT_TO_ACCOUNT": {
      const account = state.accounts.find(
        (item) => item.id === action.payload.accountId && item.active
      );
      if (!account) return state;

      const amount = Math.max(0, Math.round(action.payload.amount));
      if (amount <= 0) return state;

      const transaction: AccountTransaction = {
        id: generateId(),
        kind: "deposit",
        fromAccountId: null,
        fromAccountName: null,
        toAccountId: account.id,
        toAccountName: account.name,
        amount,
        createdAt: new Date().toISOString(),
        comment: action.payload.comment?.trim() || undefined,
      };

      return {
        ...state,
        accountTransactions: [transaction, ...state.accountTransactions],
        accounts: state.accounts.map((item) =>
          item.id === account.id
            ? { ...item, balance: item.balance + amount }
            : item
        ),
      };
    }
    case "WITHDRAW_FROM_ACCOUNT": {
      const account = state.accounts.find(
        (item) => item.id === action.payload.accountId && item.active
      );
      if (!account) return state;

      const amount = Math.max(0, Math.round(action.payload.amount));
      if (amount <= 0 || account.balance < amount) return state;

      const transaction: AccountTransaction = {
        id: generateId(),
        kind: "withdrawal",
        fromAccountId: account.id,
        fromAccountName: account.name,
        toAccountId: null,
        toAccountName: null,
        amount,
        createdAt: new Date().toISOString(),
        comment: action.payload.comment?.trim() || undefined,
      };

      return {
        ...state,
        accountTransactions: [transaction, ...state.accountTransactions],
        accounts: state.accounts.map((item) =>
          item.id === account.id
            ? { ...item, balance: item.balance - amount }
            : item
        ),
      };
    }
    case "ADD_ACCOUNT": {
      const name = action.payload.name.trim();
      if (!name) return state;
      const account: PostingAccount = {
        id: generateId(),
        name,
        kind: action.payload.kind,
        active: true,
        createdAt: new Date().toISOString(),
        orderCount: 0,
        totalTurnover: 0,
        receiptCount: 0,
        receiptTotal: 0,
        balance: 0,
      };
      return {
        ...state,
        accounts: [account, ...state.accounts],
      };
    }
    case "TOGGLE_ACCOUNT": {
      const account = state.accounts.find((item) => item.id === action.payload.accountId);
      if (!account) return state;

      if (account.active) {
        const activeCount = state.accounts.filter((item) => item.active).length;
        if (activeCount <= 1) return state;
      }

      return {
        ...state,
        accounts: state.accounts.map((item) =>
          item.id === action.payload.accountId
            ? { ...item, active: !item.active }
            : item
        ),
      };
    }
    case "CHECKOUT": {
      if (state.cart.length === 0 || !state.activeShift) return state;
      const account =
        state.accounts.find(
          (item) => item.id === action.payload.accountId && item.active
        ) ?? state.accounts.find((item) => item.active);
      if (!account) return state;

      const subtotal = state.cart.reduce((sum, item) => sum + item.lineTotal, 0);
      const tax = Math.round(subtotal * TAX_RATE);
      const total = subtotal + tax;
      const orderNumber = generateOrderNumber();
      const items: OrderItem[] = state.cart.map((cartItem) => ({
        productId: cartItem.product.id,
        productName: cartItem.product.nameRu,
        quantity: cartItem.quantity,
        customization: cartItem.customization,
        unitPrice: cartItem.product.price,
        lineTotal: cartItem.lineTotal,
      }));
      const order: Order = {
        id: generateId(),
        orderNumber,
        shiftNumber: state.activeShift.shiftNumber,
        accountId: account.id,
        accountName: account.name,
        items,
        subtotal,
        discount: 0,
        tax,
        total,
        paymentMethod: action.payload.paymentMethod,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      const updatedShift: Shift = {
        ...state.activeShift,
        orderCount: state.activeShift.orderCount + 1,
        cashSalesTotal:
          state.activeShift.cashSalesTotal +
          (action.payload.paymentMethod === "cash" ? total : 0),
        cashlessSalesTotal:
          state.activeShift.cashlessSalesTotal +
          (action.payload.paymentMethod === "cashless" ? total : 0),
      };
      return {
        ...state,
        cart: [],
        orders: [order, ...state.orders],
        accounts: state.accounts.map((item) =>
          item.id === account.id
            ? {
                ...item,
                orderCount: item.orderCount + 1,
                totalTurnover: item.totalTurnover + total,
                balance: item.balance + total,
              }
            : item
        ),
        lastOrderNumber: orderNumber,
        activeShift: updatedShift,
      };
    }
    case "UPDATE_ORDER_STATUS":
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.id
            ? { ...order, status: action.payload.status }
            : order
        ),
      };
    case "REPEAT_ORDER": {
      const order = state.orders.find((item) => item.id === action.payload.orderId);
      if (!order) return state;
      const newCart: CartItem[] = order.items
        .map((item) => {
          const product = state.products.find((stored) => stored.id === item.productId);
          if (!product || !product.available) return null;
          const lineTotal = calcLineTotal(
            product,
            item.quantity,
            item.customization,
            toppingProducts(state.products)
          );
          return {
            id: generateId(),
            product,
            quantity: item.quantity,
            customization: item.customization,
            lineTotal,
          };
        })
        .filter(Boolean) as CartItem[];
      return { ...state, cart: newCart };
    }
    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.payload] };
    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id ? action.payload : product
        ),
      };
    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((product) => product.id !== action.payload.id),
      };
    default:
      return state;
  }
}
