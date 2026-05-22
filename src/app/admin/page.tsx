"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ReceiptText,
  Package2,
  WalletCards,
  Building2,
  CirclePlus,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Lock,
  CircleDollarSign,
  ShoppingCart,
  Calculator,
  ChevronRight,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  LucideIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  AccountKind,
  Category,
  OrderStatus,
  Product,
  ProductFormData,
} from "@/types";
import { CATEGORIES } from "@/data/products";
import {
  cn,
  formatDateTime,
  formatPrice,
  generateId,
  PAYMENT_COLORS,
  PAYMENT_LABELS,
} from "@/lib/utils";

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.id !== "all");

const EMPTY_FORM: ProductFormData = {
  name: "",
  nameRu: "",
  category: "classic",
  price: 0,
  description: "",
  available: true,
  emoji: "🧋",
};

type AdminTab =
  | "dashboard"
  | "orders"
  | "accounts"
  | "receipts"
  | "transfers"
  | "products";
type AdminOrderStatus = "new" | "ready";
type AdminOrderFilter = "all" | AdminOrderStatus;

const ADMIN_TABS: Array<{
  id: AdminTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "dashboard", label: "📊 Дашборд", icon: BarChart3 },
  { id: "orders", label: "🧾 Заказы", icon: ReceiptText },
  { id: "accounts", label: "💼 Счета", icon: WalletCards },
  { id: "receipts", label: "📦 Приемки", icon: Building2 },
  { id: "transfers", label: "🔁 Переводы", icon: ArrowRightLeft },
  { id: "products", label: "Товары", icon: Package2 },
];

const ADMIN_ORDER_STATUS_OPTIONS: AdminOrderStatus[] = ["new", "ready"];
const ADMIN_ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  new: "Новый",
  ready: "Готов",
};

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash_register: "Касса",
  receipts: "Приемки",
  custom: "Пользовательский",
};

const ACCOUNT_TRANSACTION_LABELS = {
  transfer: "Перевод",
  deposit: "Вложение",
  withdrawal: "Изъятие",
} as const;

const ACCOUNT_TRANSACTION_COLORS = {
  transfer: "bg-sky-100 text-sky-700 border-sky-200",
  deposit: "bg-emerald-100 text-emerald-700 border-emerald-200",
  withdrawal: "bg-amber-100 text-amber-700 border-amber-200",
} as const;

function normalizeAdminOrderStatus(status: OrderStatus): AdminOrderStatus {
  return status === "ready" || status === "completed" ? "ready" : "new";
}

function isSameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function AdminPage() {
  const {
    state,
    addProduct,
    updateProduct,
    deleteProduct,
    addReceipt,
    transferBetweenAccounts,
    depositToAccount,
    withdrawFromAccount,
    addAccount,
    toggleAccount,
    updateOrderStatus,
    loginAdmin,
    logoutAdmin,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState("all");
  const [orderFilter, setOrderFilter] = useState<AdminOrderFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountKind, setNewAccountKind] = useState<AccountKind>("cash_register");
  const [receiptSupplierName, setReceiptSupplierName] = useState("");
  const [receiptComment, setReceiptComment] = useState("");
  const [receiptAccountId, setReceiptAccountId] = useState("");
  const [receiptItems, setReceiptItems] = useState<
    Array<{ id: string; productId: string; quantity: number; unitCost: number }>
  >([
    { id: generateId(), productId: "", quantity: 1, unitCost: 0 },
  ]);
  const [transferFromAccountId, setTransferFromAccountId] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [transferAmountInput, setTransferAmountInput] = useState("");
  const [transferComment, setTransferComment] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositComment, setDepositComment] = useState("");
  const [withdrawAccountId, setWithdrawAccountId] = useState("");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawComment, setWithdrawComment] = useState("");

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const filteredProducts = useMemo(
    () => state.products.filter((p) => filterCat === "all" || p.category === filterCat),
    [state.products, filterCat]
  );

  const filteredOrders = useMemo(
    () =>
      state.orders.filter(
        (order) =>
          orderFilter === "all" ||
          normalizeAdminOrderStatus(order.status) === orderFilter
      ),
    [state.orders, orderFilter]
  );

  const activeAccounts = useMemo(
    () => state.accounts.filter((account) => account.active),
    [state.accounts]
  );

  useEffect(() => {
    if (!selectedOrderId || !filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id ?? null);
    }
  }, [filteredOrders, selectedOrderId]);

  useEffect(() => {
    if (
      !selectedReceiptId ||
      !state.receipts.some((receipt) => receipt.id === selectedReceiptId)
    ) {
      setSelectedReceiptId(state.receipts[0]?.id ?? null);
    }
  }, [state.receipts, selectedReceiptId]);

  useEffect(() => {
    if (!receiptAccountId && activeAccounts.length > 0) {
      setReceiptAccountId(activeAccounts[0].id);
      return;
    }
    if (
      receiptAccountId &&
      !activeAccounts.some((account) => account.id === receiptAccountId)
    ) {
      setReceiptAccountId(activeAccounts[0]?.id ?? "");
    }
  }, [activeAccounts, receiptAccountId]);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      setTransferFromAccountId("");
      return;
    }

    if (
      !transferFromAccountId ||
      !activeAccounts.some((account) => account.id === transferFromAccountId)
    ) {
      setTransferFromAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, transferFromAccountId]);

  useEffect(() => {
    if (activeAccounts.length < 2) {
      setTransferToAccountId("");
      return;
    }

    if (
      transferToAccountId &&
      activeAccounts.some(
        (account) =>
          account.id === transferToAccountId && account.id !== transferFromAccountId
      )
    ) {
      return;
    }

    const fallback =
      activeAccounts.find((account) => account.id !== transferFromAccountId)?.id ?? "";
    setTransferToAccountId(fallback);
  }, [activeAccounts, transferFromAccountId, transferToAccountId]);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      setDepositAccountId("");
      return;
    }

    if (
      !depositAccountId ||
      !activeAccounts.some((account) => account.id === depositAccountId)
    ) {
      setDepositAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, depositAccountId]);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      setWithdrawAccountId("");
      return;
    }

    if (
      !withdrawAccountId ||
      !activeAccounts.some((account) => account.id === withdrawAccountId)
    ) {
      setWithdrawAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, withdrawAccountId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId]
  );

  const selectedReceipt = useMemo(
    () => state.receipts.find((receipt) => receipt.id === selectedReceiptId) ?? null,
    [state.receipts, selectedReceiptId]
  );

  const todayOrders = useMemo(() => {
    const now = new Date();
    return state.orders.filter((order) => isSameLocalDate(new Date(order.createdAt), now));
  }, [state.orders]);

  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const orderCountToday = todayOrders.length;
  const averageCheckToday = orderCountToday > 0 ? revenueToday / orderCountToday : 0;
  const cashToday = todayOrders
    .filter((order) => order.paymentMethod === "cash")
    .reduce((sum, order) => sum + order.total, 0);
  const cashlessToday = todayOrders
    .filter((order) => order.paymentMethod === "cashless")
    .reduce((sum, order) => sum + order.total, 0);
  const accountsTurnover = state.accounts.reduce(
    (sum, account) => sum + account.totalTurnover,
    0
  );
  const receiptsTotal = state.receipts.reduce((sum, receipt) => sum + receipt.total, 0);
  const receiptsToday = state.receipts.filter((receipt) =>
    isSameLocalDate(new Date(receipt.createdAt), new Date())
  );
  const receiptDraftTotal = receiptItems.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const unitCost = Math.max(0, Number(line.unitCost) || 0);
    return sum + quantity * unitCost;
  }, 0);
  const canCreateReceipt =
    Boolean(receiptSupplierName.trim()) &&
    Boolean(receiptAccountId) &&
    receiptItems.some((line) => line.productId && (line.quantity || 0) > 0);
  const accountsBalanceTotal = state.accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  );
  const transferAmount = Math.max(0, Math.round(Number(transferAmountInput) || 0));
  const depositAmount = Math.max(0, Math.round(Number(depositAmountInput) || 0));
  const withdrawAmount = Math.max(0, Math.round(Number(withdrawAmountInput) || 0));
  const transferFromAccount =
    activeAccounts.find((account) => account.id === transferFromAccountId) ?? null;
  const transferToAccount =
    activeAccounts.find((account) => account.id === transferToAccountId) ?? null;
  const depositAccount =
    activeAccounts.find((account) => account.id === depositAccountId) ?? null;
  const withdrawAccount =
    activeAccounts.find((account) => account.id === withdrawAccountId) ?? null;
  const canTransfer =
    Boolean(transferFromAccount) &&
    Boolean(transferToAccount) &&
    transferFromAccount?.id !== transferToAccount?.id &&
    transferAmount > 0 &&
    (transferFromAccount?.balance ?? 0) >= transferAmount;
  const canDeposit = Boolean(depositAccount) && depositAmount > 0;
  const canWithdraw =
    Boolean(withdrawAccount) &&
    withdrawAmount > 0 &&
    (withdrawAccount?.balance ?? 0) >= withdrawAmount;
  const transactionsToday = state.accountTransactions.filter((transaction) =>
    isSameLocalDate(new Date(transaction.createdAt), new Date())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (product: Product) => {
    setCreating(false);
    setForm({
      name: product.name,
      nameRu: product.nameRu,
      category: product.category,
      price: product.price,
      description: product.description,
      available: product.available,
      emoji: product.emoji,
    });
    setEditing(product);
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSaveProduct = () => {
    if (!form.name || !form.nameRu || form.price <= 0) return;
    if (creating) {
      addProduct({ ...form, id: generateId(), sizes: undefined });
    } else if (editing) {
      updateProduct({ ...editing, ...form });
    }
    closeForm();
  };

  const handleToggleProduct = (product: Product) => {
    updateProduct({ ...product, available: !product.available });
  };

  const handleAdminStatusChange = (orderId: string, nextStatus: AdminOrderStatus) => {
    updateOrderStatus(orderId, nextStatus);
  };

  const handleAddAccount = () => {
    const name = newAccountName.trim();
    if (!name) return;
    addAccount(name, newAccountKind);
    setNewAccountName("");
  };

  const handleAddReceiptLine = () => {
    setReceiptItems((prev) => [
      ...prev,
      { id: generateId(), productId: "", quantity: 1, unitCost: 0 },
    ]);
  };

  const handleRemoveReceiptLine = (lineId: string) => {
    setReceiptItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.id !== lineId);
    });
  };

  const handleChangeReceiptLine = (
    lineId: string,
    patch: Partial<{ productId: string; quantity: number; unitCost: number }>
  ) => {
    setReceiptItems((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    );
  };

  const handleCreateReceipt = () => {
    const supplierName = receiptSupplierName.trim();
    if (!supplierName) return;
    if (!receiptAccountId) return;

    const validItems = receiptItems
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        quantity: Math.max(1, Math.round(line.quantity || 0)),
        unitCost: Math.max(0, Math.round(line.unitCost || 0)),
      }))
      .filter((line) => line.quantity > 0);

    if (validItems.length === 0) return;

    addReceipt({
      supplierName,
      accountId: receiptAccountId,
      items: validItems,
      comment: receiptComment.trim() || undefined,
    });

    setReceiptSupplierName("");
    setReceiptComment("");
    setReceiptItems([{ id: generateId(), productId: "", quantity: 1, unitCost: 0 }]);
  };

  const handleTransferBetweenAccounts = () => {
    if (!transferFromAccount || !transferToAccount) return;
    if (transferFromAccount.id === transferToAccount.id) return;
    if (transferAmount <= 0 || transferFromAccount.balance < transferAmount) return;

    transferBetweenAccounts({
      fromAccountId: transferFromAccount.id,
      toAccountId: transferToAccount.id,
      amount: transferAmount,
      comment: transferComment.trim() || undefined,
    });

    setTransferAmountInput("");
    setTransferComment("");
  };

  const handleDeposit = () => {
    if (!depositAccount || depositAmount <= 0) return;

    depositToAccount({
      accountId: depositAccount.id,
      amount: depositAmount,
      comment: depositComment.trim() || undefined,
    });

    setDepositAmountInput("");
    setDepositComment("");
  };

  const handleWithdraw = () => {
    if (!withdrawAccount || withdrawAmount <= 0) return;
    if (withdrawAccount.balance < withdrawAmount) return;

    withdrawFromAccount({
      accountId: withdrawAccount.id,
      amount: withdrawAmount,
      comment: withdrawComment.trim() || undefined,
    });

    setWithdrawAmountInput("");
    setWithdrawComment("");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    const ok = await loginAdmin(username, password);
    if (!ok) {
      setAuthError("Неверный логин или пароль");
      return;
    }
    setPassword("");
  };

  if (!state.authInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-white/40 to-white/10">
        <p className="text-sm text-gray-400">Проверка доступа…</p>
      </div>
    );
  }

  if (!state.isAdminAuthenticated) {
    return (
      <div className="h-full bg-gradient-to-b from-white/40 to-white/10 p-5 flex items-center justify-center">
        <div className="w-full max-w-md card p-6 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-boba-pink-light flex items-center justify-center mb-4">
            <Lock size={20} className="text-boba-pink-dark" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Авторизация</h1>
          <p className="text-sm text-gray-500 mt-1">
            Войдите, чтобы открыть админ-панель.
          </p>

          <form onSubmit={handleLogin} className="mt-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Логин
              </label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button type="submit" className="btn-primary w-full">
              Войти
            </button>
          </form>

          <p className="text-[11px] text-gray-400 mt-3">
            По умолчанию: логин `admin`, пароль `admin123`.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white/40 to-white/10">
      <div className="px-5 py-4 bg-white/45 backdrop-blur-sm border-b border-gray-200/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Админ-панель</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Пользователь: {state.adminUsername ?? "admin"}
          </p>
        </div>
        <button
          onClick={logoutAdmin}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut size={14} />
          Выйти
        </button>
      </div>

      <div className="px-5 py-3 bg-white/35 backdrop-blur-sm border-b border-gray-200/70 flex gap-2 overflow-x-auto">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0",
              tab === id
                ? "bg-boba-pink-dark text-white border-boba-pink-dark"
                : "bg-white text-gray-600 border-gray-200 hover:border-boba-pink"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CircleDollarSign size={16} />
                Выручка за день
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatPrice(revenueToday)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <ShoppingCart size={16} />
                Количество заказов
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{orderCountToday}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calculator size={16} />
                Средний чек
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatPrice(averageCheckToday)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-sm text-gray-500">Оплаты за день</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Наличные</span>
                  <span className="font-semibold text-gray-900">{formatPrice(cashToday)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Безнал</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(cashlessToday)}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-4 lg:col-span-2">
              <p className="text-sm text-gray-500">Последние заказы</p>
              {state.orders.length === 0 ? (
                <p className="text-sm text-gray-400 mt-3">Заказов пока нет</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {state.orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-gray-100 px-3 py-2 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "badge mb-1",
                            PAYMENT_COLORS[order.paymentMethod]
                          )}
                        >
                          {PAYMENT_LABELS[order.paymentMethod]}
                        </span>
                        <p className="text-[11px] text-gray-400">{order.accountName}</p>
                        <p className="text-sm font-semibold text-boba-pink-dark">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="lg:w-[440px] border-r border-gray-100 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Список заказов</p>
              <p className="text-xs text-gray-400 mt-0.5">{filteredOrders.length} заказов</p>
              <div className="mt-3 flex gap-2">
                {(["all", "new", "ready"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs border",
                      orderFilter === filter
                        ? "bg-boba-pink-light border-boba-pink text-boba-pink-dark"
                        : "bg-white border-gray-200 text-gray-500"
                    )}
                  >
                    {filter === "all" ? "Все" : ADMIN_ORDER_STATUS_LABELS[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredOrders.length === 0 ? (
                <p className="text-sm text-gray-400 p-3">Заказов нет</p>
              ) : (
                filteredOrders.map((order) => {
                  const normalizedStatus = normalizeAdminOrderStatus(order.status);
                  const isSelected = order.id === selectedOrderId;

                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border p-3 transition-all",
                        isSelected
                          ? "border-boba-pink bg-boba-pink-light/40"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-boba-pink-dark">
                            {formatPrice(order.total)}
                          </span>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {PAYMENT_LABELS[order.paymentMethod]} · {order.accountName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex rounded-xl border border-gray-200 p-0.5">
                          {ADMIN_ORDER_STATUS_OPTIONS.map((status) => (
                            <span
                              key={status}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAdminStatusChange(order.id, status);
                              }}
                              className={cn(
                                "px-2 py-1 rounded-lg text-[11px] cursor-pointer transition-colors",
                                normalizedStatus === status
                                  ? "bg-boba-pink-dark text-white"
                                  : "text-gray-500 hover:bg-gray-100"
                              )}
                            >
                              {ADMIN_ORDER_STATUS_LABELS[status]}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                          Детали
                          <ChevronRight size={12} />
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!selectedOrder ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-sm text-gray-400">Выберите заказ слева, чтобы посмотреть детали.</p>
              </div>
            ) : (
              <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-gray-900">
                      Заказ #{selectedOrder.orderNumber}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatDateTime(selectedOrder.createdAt)} · Смена #{selectedOrder.shiftNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn("badge", PAYMENT_COLORS[selectedOrder.paymentMethod])}
                    >
                      {PAYMENT_LABELS[selectedOrder.paymentMethod]}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Счет: {selectedOrder.accountName}
                    </p>
                    <p className="text-2xl font-bold text-boba-pink-dark mt-2">
                      {formatPrice(selectedOrder.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">Статус заказа</p>
                  <div className="flex rounded-xl border border-gray-200 p-0.5 max-w-xs">
                    {ADMIN_ORDER_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleAdminStatusChange(selectedOrder.id, status)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          normalizeAdminOrderStatus(selectedOrder.status) === status
                            ? "bg-boba-pink-dark text-white"
                            : "text-gray-600 hover:bg-white"
                        )}
                      >
                        {ADMIN_ORDER_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Позиции</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div
                        key={`${selectedOrder.id}-${index}`}
                        className="rounded-xl border border-gray-100 p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.quantity}× {item.productName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Размер {item.customization.size}, сахар {item.customization.sugar}%
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {formatPrice(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Подытог</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>НДС</span>
                    <span>{formatPrice(selectedOrder.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-gray-900">
                    <span>Итого</span>
                    <span className="text-boba-pink-dark">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "receipts" && (
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="lg:w-[430px] border-r border-gray-100 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">История приемок</p>
              <p className="text-xs text-gray-400 mt-0.5">{state.receipts.length} документов</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-gray-100 p-2">
                  <p className="text-[11px] text-gray-500">Приемки за день</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {receiptsToday.length}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-2">
                  <p className="text-[11px] text-gray-500">Сумма приемок</p>
                  <p className="text-sm font-semibold text-boba-pink-dark mt-1">
                    {formatPrice(receiptsTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {state.receipts.length === 0 ? (
                <p className="text-sm text-gray-400 p-3">Приемок пока нет</p>
              ) : (
                state.receipts.map((receipt) => (
                  <button
                    key={receipt.id}
                    onClick={() => setSelectedReceiptId(receipt.id)}
                    className={cn(
                      "w-full text-left rounded-2xl border p-3 transition-all",
                      selectedReceiptId === receipt.id
                        ? "border-boba-pink bg-boba-pink-light/40"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">Приемка #{receipt.receiptNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {receipt.supplierName}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatDateTime(receipt.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="badge bg-gray-100 text-gray-600 border-gray-200">
                          {receipt.accountName}
                        </span>
                        <p className="text-sm font-semibold text-boba-pink-dark mt-1">
                          {formatPrice(receipt.total)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="card p-4">
              <p className="font-semibold text-gray-800">Новая приемка</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Добавьте товары, сумму и счет для документа приемки.
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Поставщик"
                  value={receiptSupplierName}
                  onChange={(event) => setReceiptSupplierName(event.target.value)}
                />
                <select
                  className="input"
                  value={receiptAccountId}
                  onChange={(event) => setReceiptAccountId(event.target.value)}
                  disabled={activeAccounts.length === 0}
                >
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="input mt-2 resize-none h-20 text-sm"
                placeholder="Комментарий к приемке"
                value={receiptComment}
                onChange={(event) => setReceiptComment(event.target.value)}
              />

              <div className="mt-3 space-y-2">
                {receiptItems.map((line, index) => {
                  const lineTotal = Math.max(0, Number(line.quantity) || 0) *
                    Math.max(0, Number(line.unitCost) || 0);
                  return (
                    <div
                      key={line.id}
                      className="rounded-xl border border-gray-100 p-2.5 grid grid-cols-1 md:grid-cols-[1fr_90px_120px_120px_auto] gap-2 items-center"
                    >
                      <select
                        className="input text-sm"
                        value={line.productId}
                        onChange={(event) =>
                          handleChangeReceiptLine(line.id, { productId: event.target.value })
                        }
                      >
                        <option value="">Выберите товар</option>
                        {state.products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nameRu}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="input text-sm"
                        value={line.quantity}
                        onChange={(event) =>
                          handleChangeReceiptLine(line.id, {
                            quantity: Number(event.target.value),
                          })
                        }
                        placeholder="Кол-во"
                      />
                      <input
                        type="number"
                        min={0}
                        className="input text-sm"
                        value={line.unitCost}
                        onChange={(event) =>
                          handleChangeReceiptLine(line.id, {
                            unitCost: Number(event.target.value),
                          })
                        }
                        placeholder="Цена"
                      />
                      <div className="text-sm font-semibold text-boba-pink-dark px-2">
                        {formatPrice(lineTotal)}
                      </div>
                      <button
                        onClick={() => handleRemoveReceiptLine(line.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:opacity-80 transition-opacity"
                        title={`Удалить строку ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={handleAddReceiptLine}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <CirclePlus size={14} />
                  Добавить позицию
                </button>
                <div className="text-sm">
                  <span className="text-gray-500">Сумма документа: </span>
                  <span className="font-semibold text-boba-pink-dark">
                    {formatPrice(receiptDraftTotal)}
                  </span>
                </div>
              </div>

              {activeAccounts.length === 0 && (
                <p className="text-xs text-red-500 mt-2">
                  Нет активных счетов. Включите счет во вкладке «Счета».
                </p>
              )}

              <button
                onClick={handleCreateReceipt}
                disabled={!canCreateReceipt || activeAccounts.length === 0}
                className="btn-primary mt-3 w-full"
              >
                Сохранить приемку
              </button>
            </div>

            <div className="card p-4">
              {!selectedReceipt ? (
                <p className="text-sm text-gray-400">
                  Выберите приемку слева, чтобы посмотреть детали.
                </p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl text-gray-900">
                        Приемка #{selectedReceipt.receiptNumber}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedReceipt.supplierName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(selectedReceipt.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="badge bg-gray-100 text-gray-600 border-gray-200">
                        {selectedReceipt.accountName}
                      </span>
                      <p className="text-2xl font-bold text-boba-pink-dark mt-2">
                        {formatPrice(selectedReceipt.total)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedReceipt.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-gray-100 p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.quantity} × {formatPrice(item.unitCost)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {formatPrice(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {selectedReceipt.comment && (
                    <div className="mt-4 rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500 mb-1">Комментарий</p>
                      <p className="text-sm text-gray-700">{selectedReceipt.comment}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "transfers" && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Активные счета</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {activeAccounts.length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Баланс по всем счетам</p>
              <p className="text-2xl font-semibold text-boba-pink-dark mt-1">
                {formatPrice(accountsBalanceTotal)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Операции за день</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {transactionsToday.length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Всего операций</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {state.accountTransactions.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-sky-600" />
                <p className="font-semibold text-gray-800">Перевод между счетами</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Перемещение средств между активными счетами.
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  className="input"
                  value={transferFromAccountId}
                  onChange={(event) => setTransferFromAccountId(event.target.value)}
                  disabled={activeAccounts.length < 2}
                >
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      Откуда: {account.name} ({formatPrice(account.balance)})
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={transferToAccountId}
                  onChange={(event) => setTransferToAccountId(event.target.value)}
                  disabled={activeAccounts.length < 2}
                >
                  {activeAccounts
                    .filter((account) => account.id !== transferFromAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        Куда: {account.name} ({formatPrice(account.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2">
                <input
                  type="number"
                  min={1}
                  className="input"
                  placeholder="Сумма"
                  value={transferAmountInput}
                  onChange={(event) => setTransferAmountInput(event.target.value)}
                />
                <input
                  className="input"
                  placeholder="Комментарий (необязательно)"
                  value={transferComment}
                  onChange={(event) => setTransferComment(event.target.value)}
                />
              </div>

              {transferFromAccount && transferAmount > transferFromAccount.balance && (
                <p className="text-xs text-red-500 mt-2">
                  Недостаточно средств на счете «{transferFromAccount.name}».
                </p>
              )}
              {activeAccounts.length < 2 && (
                <p className="text-xs text-red-500 mt-2">
                  Для перевода нужно минимум два активных счета.
                </p>
              )}

              <button
                onClick={handleTransferBetweenAccounts}
                disabled={!canTransfer}
                className="btn-primary mt-3 w-full"
              >
                Выполнить перевод
              </button>
            </div>

            <div className="space-y-3">
              <div className="card p-4">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle size={16} className="text-emerald-600" />
                  <p className="font-semibold text-gray-800">Вложить в счет</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Увеличить баланс выбранного счета.
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
                  <select
                    className="input"
                    value={depositAccountId}
                    onChange={(event) => setDepositAccountId(event.target.value)}
                    disabled={activeAccounts.length === 0}
                  >
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatPrice(account.balance)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    placeholder="Сумма"
                    value={depositAmountInput}
                    onChange={(event) => setDepositAmountInput(event.target.value)}
                  />
                </div>
                <input
                  className="input mt-2"
                  placeholder="Комментарий (необязательно)"
                  value={depositComment}
                  onChange={(event) => setDepositComment(event.target.value)}
                />
                <button
                  onClick={handleDeposit}
                  disabled={!canDeposit}
                  className="btn-primary mt-3 w-full"
                >
                  Вложить деньги
                </button>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle size={16} className="text-amber-600" />
                  <p className="font-semibold text-gray-800">Изъять со счета</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Списание средств с выбранного счета.
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
                  <select
                    className="input"
                    value={withdrawAccountId}
                    onChange={(event) => setWithdrawAccountId(event.target.value)}
                    disabled={activeAccounts.length === 0}
                  >
                    {activeAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatPrice(account.balance)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    placeholder="Сумма"
                    value={withdrawAmountInput}
                    onChange={(event) => setWithdrawAmountInput(event.target.value)}
                  />
                </div>
                <input
                  className="input mt-2"
                  placeholder="Комментарий (необязательно)"
                  value={withdrawComment}
                  onChange={(event) => setWithdrawComment(event.target.value)}
                />
                {withdrawAccount && withdrawAmount > withdrawAccount.balance && (
                  <p className="text-xs text-red-500 mt-2">
                    Недостаточно средств на счете «{withdrawAccount.name}».
                  </p>
                )}
                <button
                  onClick={handleWithdraw}
                  disabled={!canWithdraw}
                  className="btn-primary mt-3 w-full"
                >
                  Изъять деньги
                </button>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <p className="font-semibold text-gray-800">Журнал операций</p>
            <p className="text-xs text-gray-400 mt-0.5">
              История переводов, вложений и изъятий по счетам.
            </p>

            {state.accountTransactions.length === 0 ? (
              <p className="text-sm text-gray-400 mt-3">Операций пока нет</p>
            ) : (
              <div className="mt-3 space-y-2">
                {state.accountTransactions.map((transaction) => {
                  const routeText =
                    transaction.kind === "transfer"
                      ? `${transaction.fromAccountName} → ${transaction.toAccountName}`
                      : transaction.kind === "deposit"
                        ? `Вложение в счет ${transaction.toAccountName}`
                        : `Изъятие со счета ${transaction.fromAccountName}`;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-xl border border-gray-100 p-3 flex flex-wrap items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "badge",
                              ACCOUNT_TRANSACTION_COLORS[transaction.kind]
                            )}
                          >
                            {ACCOUNT_TRANSACTION_LABELS[transaction.kind]}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(transaction.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1">{routeText}</p>
                        {transaction.comment && (
                          <p className="text-xs text-gray-500 mt-1">{transaction.comment}</p>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-base font-semibold",
                          transaction.kind === "withdrawal"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        )}
                      >
                        {transaction.kind === "withdrawal" ? "-" : "+"}
                        {formatPrice(transaction.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Всего счетов</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {state.accounts.length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Активные счета</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {state.accounts.filter((account) => account.active).length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Баланс по счетам</p>
              <p className="text-2xl font-semibold text-boba-pink-dark mt-1">
                {formatPrice(accountsBalanceTotal)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Оборот продаж по счетам</p>
              <p className="text-2xl font-semibold text-boba-pink-dark mt-1">
                {formatPrice(accountsTurnover)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Сумма приемок</p>
              <p className="text-2xl font-semibold text-boba-pink-dark mt-1">
                {formatPrice(receiptsTotal)}
              </p>
            </div>
          </div>

          <div className="card p-4">
            <p className="font-semibold text-gray-800">Добавить счет</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Счета доступны для выбора при закрытии заказа в кассе.
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
              <input
                className="input"
                placeholder="Название счета"
                value={newAccountName}
                onChange={(event) => setNewAccountName(event.target.value)}
              />
              <select
                className="input"
                value={newAccountKind}
                onChange={(event) => setNewAccountKind(event.target.value as AccountKind)}
              >
                <option value="cash_register">Касса</option>
                <option value="receipts">Приемки</option>
                <option value="custom">Пользовательский</option>
              </select>
              <button
                onClick={handleAddAccount}
                disabled={!newAccountName.trim()}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <CirclePlus size={16} />
                Добавить
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {state.accounts.map((account) => (
              <div key={account.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{account.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge bg-gray-100 text-gray-600 border-gray-200">
                        {ACCOUNT_KIND_LABELS[account.kind]}
                      </span>
                      <span
                        className={cn(
                          "badge",
                          account.active
                            ? "bg-boba-mint-light text-boba-mint-dark border-boba-mint"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}
                      >
                        {account.active ? "Активен" : "Отключен"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAccount(account.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors",
                      account.active
                        ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        : "bg-boba-pink-light border-boba-pink text-boba-pink-dark hover:opacity-90"
                    )}
                  >
                    {account.active ? "Выключить" : "Включить"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[11px] text-gray-500">Баланс счета</p>
                    <p className="text-sm font-semibold text-boba-pink-dark mt-1">
                      {formatPrice(account.balance)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[11px] text-gray-500">Заказов на счете</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {account.orderCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[11px] text-gray-500">Оборот счета</p>
                    <p className="text-sm font-semibold text-boba-pink-dark mt-1">
                      {formatPrice(account.totalTurnover)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[11px] text-gray-500">Приемок на счете</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {account.receiptCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[11px] text-gray-500">Сумма приемок</p>
                    <p className="text-sm font-semibold text-boba-pink-dark mt-1">
                      {formatPrice(account.receiptTotal)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 mt-3 inline-flex items-center gap-1">
                  <Building2 size={12} />
                  Создан: {formatDateTime(account.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="font-semibold text-gray-800">Управление товарами</p>
                <p className="text-xs text-gray-400 mt-0.5">{state.products.length} позиций</p>
              </div>
              <button
                onClick={openCreate}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Добавить
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto mb-4">
              {CATEGORIES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => setFilterCat(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap border transition-all shrink-0",
                    filterCat === id
                      ? "bg-boba-pink-dark text-white border-boba-pink-dark"
                      : "bg-white text-gray-600 border-gray-200 hover:border-boba-pink"
                  )}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "card p-4 flex items-center gap-4 transition-opacity",
                    !product.available && "opacity-50"
                  )}
                >
                  <span className="text-3xl shrink-0">{product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{product.nameRu}</p>
                    <p className="text-xs text-gray-400 truncate">{product.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-boba-pink-dark">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-gray-400">{product.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleProduct(product)}
                      className={cn(
                        "transition-colors",
                        product.available ? "text-boba-mint-dark" : "text-gray-300"
                      )}
                      title={product.available ? "Доступен" : "Недоступен"}
                    >
                      {product.available ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                    <button
                      onClick={() => openEdit(product)}
                      className="w-8 h-8 rounded-xl bg-boba-cream flex items-center justify-center text-boba-cream-dark hover:opacity-80 transition-opacity"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:opacity-80 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(creating || editing) && (
            <div className="lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">
                  {creating ? "Новый товар" : "Редактировать"}
                </h2>
                <button onClick={closeForm} className="btn-ghost p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Эмодзи</label>
                  <input
                    className="input text-2xl w-20 text-center"
                    value={form.emoji}
                    onChange={(e) => setForm((value) => ({ ...value, emoji: e.target.value }))}
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название (RU) *
                  </label>
                  <input
                    className="input"
                    value={form.nameRu}
                    onChange={(e) =>
                      setForm((value) => ({ ...value, nameRu: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название (EN) *
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((value) => ({ ...value, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Категория
                  </label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) =>
                      setForm((value) => ({
                        ...value,
                        category: e.target.value as Category,
                      }))
                    }
                  >
                    {CATEGORY_OPTIONS.map(({ id, label }) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена (сом) *
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm((value) => ({ ...value, price: Number(e.target.value) }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    className="input resize-none h-20 text-sm"
                    value={form.description}
                    onChange={(e) =>
                      setForm((value) => ({ ...value, description: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setForm((value) => ({ ...value, available: !value.available }))}
                    className={cn(
                      "transition-colors",
                      form.available ? "text-boba-mint-dark" : "text-gray-300"
                    )}
                  >
                    {form.available ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <span className="text-sm text-gray-600">
                    {form.available ? "Доступен для продажи" : "Недоступен"}
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={closeForm} className="btn-secondary flex-1">
                  Отмена
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={!form.nameRu || !form.name || form.price <= 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
