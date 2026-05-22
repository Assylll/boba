"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  AccountKind,
  CartItemCustomization,
  OrderStatus,
  PaymentMethod,
  Product,
  ReceiptItemInput,
} from "@/types";
import {
  createInitialPersistedState,
  PersistedStoreAction,
  PersistedStoreState,
} from "@/lib/pos-state";

interface StoreState extends PersistedStoreState {
  isAdminAuthenticated: boolean;
  adminUsername: string | null;
  authInitialized: boolean;
}

interface ApiStateEnvelope {
  state: PersistedStoreState;
  auth: {
    isAdminAuthenticated: boolean;
    adminUsername: string | null;
  };
}

const initialState: StoreState = {
  ...createInitialPersistedState(),
  isAdminAuthenticated: false,
  adminUsername: null,
  authInitialized: false,
};

// ─── Context ─────────────────────────────────────────────────────────────────
interface StoreContextValue {
  state: StoreState;
  addToCart: (product: Product, customization: CartItemCustomization) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  checkout: (paymentMethod: PaymentMethod, accountId: string) => void;
  openShift: (openingCash: number) => void;
  closeShift: () => void;
  addReceipt: (
    payload: {
      supplierName: string;
      accountId: string;
      items: ReceiptItemInput[];
      comment?: string;
    }
  ) => void;
  transferBetweenAccounts: (
    payload: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      comment?: string;
    }
  ) => void;
  depositToAccount: (
    payload: {
      accountId: string;
      amount: number;
      comment?: string;
    }
  ) => void;
  withdrawFromAccount: (
    payload: {
      accountId: string;
      amount: number;
      comment?: string;
    }
  ) => void;
  addAccount: (name: string, kind: AccountKind) => void;
  toggleAccount: (accountId: string) => void;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  repeatOrder: (orderId: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  cartTotal: number;
  cartCount: number;
  activeShiftSalesTotal: number;
  activeShiftExpectedCash: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function isApiStateEnvelope(value: unknown): value is ApiStateEnvelope {
  if (!value || typeof value !== "object") return false;
  const payload = value as { state?: unknown; auth?: unknown };

  if (!payload.state || typeof payload.state !== "object") return false;
  if (!payload.auth || typeof payload.auth !== "object") return false;

  const auth = payload.auth as {
    isAdminAuthenticated?: unknown;
    adminUsername?: unknown;
  };

  const hasAuthFlag = typeof auth.isAdminAuthenticated === "boolean";
  const hasUsername =
    typeof auth.adminUsername === "string" || auth.adminUsername === null;

  return hasAuthFlag && hasUsername;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const applyEnvelope = useCallback((envelope: ApiStateEnvelope) => {
    setState({
      ...envelope.state,
      isAdminAuthenticated: envelope.auth.isAdminAuthenticated,
      adminUsername: envelope.auth.adminUsername,
      authInitialized: true,
    });
  }, []);

  const markAuthInitialized = useCallback(() => {
    setState((prev) => ({ ...prev, authInitialized: true }));
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch("/api/state", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok || !isApiStateEnvelope(payload)) {
        markAuthInitialized();
        return;
      }

      applyEnvelope(payload);
    } catch {
      markAuthInitialized();
    }
  }, [applyEnvelope, markAuthInitialized]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task).catch((error: unknown) => {
      console.error("Failed to sync action", error);
    });
  }, []);

  const dispatchRemoteAction = useCallback(
    (action: PersistedStoreAction) => {
      enqueue(async () => {
        const response = await fetch("/api/state/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(action),
        });

        if (response.status === 401) {
          await refreshState();
          return;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!response.ok || !isApiStateEnvelope(payload)) {
          return;
        }

        applyEnvelope(payload);
      });
    },
    [applyEnvelope, enqueue, refreshState]
  );

  const addToCart = useCallback(
    (product: Product, customization: CartItemCustomization) =>
      dispatchRemoteAction({ type: "ADD_TO_CART", payload: { product, customization } }),
    [dispatchRemoteAction]
  );

  const updateQuantity = useCallback(
    (id: string, delta: number) =>
      dispatchRemoteAction({ type: "UPDATE_QUANTITY", payload: { id, delta } }),
    [dispatchRemoteAction]
  );

  const removeFromCart = useCallback(
    (id: string) => dispatchRemoteAction({ type: "REMOVE_FROM_CART", payload: { id } }),
    [dispatchRemoteAction]
  );

  const clearCart = useCallback(
    () => dispatchRemoteAction({ type: "CLEAR_CART" }),
    [dispatchRemoteAction]
  );

  const checkout = useCallback(
    (paymentMethod: PaymentMethod, accountId: string) =>
      dispatchRemoteAction({
        type: "CHECKOUT",
        payload: { paymentMethod, accountId },
      }),
    [dispatchRemoteAction]
  );

  const openShift = useCallback(
    (openingCash: number) =>
      dispatchRemoteAction({ type: "OPEN_SHIFT", payload: { openingCash } }),
    [dispatchRemoteAction]
  );

  const closeShift = useCallback(
    () => dispatchRemoteAction({ type: "CLOSE_SHIFT" }),
    [dispatchRemoteAction]
  );

  const addReceipt = useCallback(
    (payload: {
      supplierName: string;
      accountId: string;
      items: ReceiptItemInput[];
      comment?: string;
    }) => dispatchRemoteAction({ type: "ADD_RECEIPT", payload }),
    [dispatchRemoteAction]
  );

  const transferBetweenAccounts = useCallback(
    (payload: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      comment?: string;
    }) => dispatchRemoteAction({ type: "TRANSFER_BETWEEN_ACCOUNTS", payload }),
    [dispatchRemoteAction]
  );

  const depositToAccount = useCallback(
    (payload: {
      accountId: string;
      amount: number;
      comment?: string;
    }) => dispatchRemoteAction({ type: "DEPOSIT_TO_ACCOUNT", payload }),
    [dispatchRemoteAction]
  );

  const withdrawFromAccount = useCallback(
    (payload: {
      accountId: string;
      amount: number;
      comment?: string;
    }) => dispatchRemoteAction({ type: "WITHDRAW_FROM_ACCOUNT", payload }),
    [dispatchRemoteAction]
  );

  const addAccount = useCallback(
    (name: string, kind: AccountKind) =>
      dispatchRemoteAction({ type: "ADD_ACCOUNT", payload: { name, kind } }),
    [dispatchRemoteAction]
  );

  const toggleAccount = useCallback(
    (accountId: string) =>
      dispatchRemoteAction({ type: "TOGGLE_ACCOUNT", payload: { accountId } }),
    [dispatchRemoteAction]
  );

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      try {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          setState((prev) => ({
            ...prev,
            isAdminAuthenticated: false,
            adminUsername: null,
            authInitialized: true,
          }));
          return false;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!isApiStateEnvelope(payload)) {
          return false;
        }

        applyEnvelope(payload);
        return true;
      } catch {
        return false;
      }
    },
    [applyEnvelope]
  );

  const logoutAdmin = useCallback(() => {
    enqueue(async () => {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (response.ok && isApiStateEnvelope(payload)) {
        applyEnvelope(payload);
        return;
      }

      setState((prev) => ({
        ...prev,
        isAdminAuthenticated: false,
        adminUsername: null,
        authInitialized: true,
      }));
    });
  }, [applyEnvelope, enqueue]);

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) =>
      dispatchRemoteAction({ type: "UPDATE_ORDER_STATUS", payload: { id, status } }),
    [dispatchRemoteAction]
  );

  const repeatOrder = useCallback(
    (orderId: string) =>
      dispatchRemoteAction({ type: "REPEAT_ORDER", payload: { orderId } }),
    [dispatchRemoteAction]
  );

  const addProduct = useCallback(
    (product: Product) => dispatchRemoteAction({ type: "ADD_PRODUCT", payload: product }),
    [dispatchRemoteAction]
  );

  const updateProduct = useCallback(
    (product: Product) =>
      dispatchRemoteAction({ type: "UPDATE_PRODUCT", payload: product }),
    [dispatchRemoteAction]
  );

  const deleteProduct = useCallback(
    (id: string) => dispatchRemoteAction({ type: "DELETE_PRODUCT", payload: { id } }),
    [dispatchRemoteAction]
  );

  const cartTotal = state.cart.reduce((sum: number, item) => sum + item.lineTotal, 0);
  const cartCount = state.cart.reduce((sum: number, item) => sum + item.quantity, 0);
  const activeShiftSalesTotal = state.activeShift
    ? state.activeShift.cashSalesTotal + state.activeShift.cashlessSalesTotal
    : 0;
  const activeShiftExpectedCash = state.activeShift
    ? state.activeShift.openingCash + state.activeShift.cashSalesTotal
    : 0;

  return (
    <StoreContext.Provider
      value={{
        state,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        checkout,
        openShift,
        closeShift,
        addReceipt,
        transferBetweenAccounts,
        depositToAccount,
        withdrawFromAccount,
        addAccount,
        toggleAccount,
        loginAdmin,
        logoutAdmin,
        updateOrderStatus,
        repeatOrder,
        addProduct,
        updateProduct,
        deleteProduct,
        cartTotal,
        cartCount,
        activeShiftSalesTotal,
        activeShiftExpectedCash,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
