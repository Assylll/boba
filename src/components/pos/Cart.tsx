"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  CheckCircle,
  Wallet,
  Banknote,
  Landmark,
  Printer,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  cn,
  formatDateTime,
  formatPrice,
  PAYMENT_LABELS,
} from "@/lib/utils";
import { TAX_RATE } from "@/data/products";
import { Order, PaymentMethod } from "@/types";
import { printOrderReceipt, printTestReceipt } from "@/lib/receipt-printer";

const PAYMENT_OPTIONS: PaymentMethod[] = ["cash", "cashless"];
const PRINTER_NAME_STORAGE_KEY = "boba_pos_printer_name";
const AUTO_PRINT_STORAGE_KEY = "boba_pos_auto_print_enabled";

export default function Cart() {
  const {
    state,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    openShift,
    closeShift,
    cartTotal,
    cartCount,
    activeShiftSalesTotal,
    activeShiftExpectedCash,
  } = useStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [lastAccountName, setLastAccountName] = useState("");
  const [openingCashInput, setOpeningCashInput] = useState("0");
  const [printerName, setPrinterName] = useState("");
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState("");
  const pendingCheckoutTopOrderIdRef = useRef<string | null>(null);

  const activeShift = state.activeShift;
  const activeAccounts = state.accounts.filter((account) => account.active);
  const lastClosedShift = state.closedShifts[0];
  const selectedAccount =
    activeAccounts.find((account) => account.id === selectedAccountId) ??
    activeAccounts[0] ??
    null;
  const tax = Math.round(cartTotal * TAX_RATE);
  const total = cartTotal + tax;
  const canCheckout = Boolean(activeShift) && state.cart.length > 0 && Boolean(selectedAccount);
  const paymentText = paymentMethod === "cash" ? "наличными" : "безналом";

  useEffect(() => {
    if (!selectedAccountId && activeAccounts.length > 0) {
      setSelectedAccountId(activeAccounts[0].id);
      return;
    }

    if (
      selectedAccountId &&
      !activeAccounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId(activeAccounts[0]?.id ?? "");
    }
  }, [activeAccounts, selectedAccountId]);

  useEffect(() => {
    try {
      const savedPrinter = window.localStorage.getItem(PRINTER_NAME_STORAGE_KEY);
      if (savedPrinter !== null) {
        setPrinterName(savedPrinter);
      }

      const savedAutoPrint = window.localStorage.getItem(AUTO_PRINT_STORAGE_KEY);
      if (savedAutoPrint !== null) {
        setAutoPrintEnabled(savedAutoPrint === "true");
      }
    } catch {
      // Ignore storage errors, local settings are optional.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRINTER_NAME_STORAGE_KEY, printerName);
    } catch {
      // Ignore storage errors, printing can still work with in-memory settings.
    }
  }, [printerName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTO_PRINT_STORAGE_KEY, String(autoPrintEnabled));
    } catch {
      // Ignore storage errors.
    }
  }, [autoPrintEnabled]);

  const printCurrentOrder = useCallback(
    async (order: Order, mode: "auto" | "manual") => {
      const resolvedPrinterName = printerName.trim() || undefined;
      setIsPrinting(true);
      setPrintMessage("");
      try {
        await printOrderReceipt({ order, printerName: resolvedPrinterName });
        setPrintMessage(
          mode === "auto"
            ? `Чек по заказу #${order.orderNumber} отправлен на печать.`
            : `Чек заказа #${order.orderNumber} отправлен на печать.`
        );
      } catch (error) {
        const fallbackMessage =
          mode === "auto"
            ? "Автопечать не удалась. Проверьте QZ Tray и принтер."
            : "Печать не удалась. Проверьте QZ Tray и принтер.";
        const message = error instanceof Error ? error.message : fallbackMessage;
        setPrintMessage(`Ошибка печати: ${message}`);
      } finally {
        setIsPrinting(false);
      }
    },
    [printerName]
  );

  const handleTestPrint = async () => {
    const resolvedPrinterName = printerName.trim() || undefined;
    setIsPrinting(true);
    setPrintMessage("");
    try {
      await printTestReceipt({ printerName: resolvedPrinterName });
      setPrintMessage("Тест-чек отправлен на печать.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось отправить тестовый чек на печать.";
      setPrintMessage(`Ошибка печати: ${message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintLastOrder = async () => {
    const latestOrder = state.orders[0];
    if (!latestOrder) {
      setPrintMessage("Нет заказов для печати.");
      return;
    }
    await printCurrentOrder(latestOrder, "manual");
  };

  useEffect(() => {
    const trackedTopOrderId = pendingCheckoutTopOrderIdRef.current;
    if (trackedTopOrderId === null) return;

    const latestOrder = state.orders[0];
    if (!latestOrder || latestOrder.id === trackedTopOrderId) return;

    pendingCheckoutTopOrderIdRef.current = null;

    if (!autoPrintEnabled) {
      setPrintMessage(
        `Заказ #${latestOrder.orderNumber} сохранен. Автопечать выключена.`
      );
      return;
    }

    void printCurrentOrder(latestOrder, "auto");
  }, [state.orders, autoPrintEnabled, printCurrentOrder]);

  const handleCheckout = () => {
    if (!canCheckout || !selectedAccount) return;
    pendingCheckoutTopOrderIdRef.current = state.orders[0]?.id ?? "__no_orders_yet__";
    setPrintMessage("");
    setLastPaymentMethod(paymentMethod);
    setLastAccountName(selectedAccount.name);
    checkout(paymentMethod, selectedAccount.id);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleOpenShift = () => {
    const rawValue = openingCashInput.trim().replace(",", ".");
    const parsed = rawValue ? Number(rawValue) : 0;

    if (Number.isNaN(parsed) || parsed < 0) {
      window.alert("Введите корректную сумму открытия смены.");
      return;
    }

    openShift(parsed);
    setOpeningCashInput("0");
  };

  const handleCloseShift = () => {
    if (!activeShift) return;

    if (state.cart.length > 0) {
      const allowCloseWithCart = window.confirm(
        "В корзине есть позиции. Закрыть смену всё равно?"
      );
      if (!allowCloseWithCart) return;
    }

    const shouldClose = window.confirm(
      `Закрыть смену #${activeShift.shiftNumber}?\n` +
        `Заказов: ${activeShift.orderCount}\n` +
        `Наличные: ${formatPrice(activeShift.cashSalesTotal)}\n` +
        `Безнал: ${formatPrice(activeShift.cashlessSalesTotal)}\n` +
        `Итого продаж: ${formatPrice(activeShiftSalesTotal)}`
    );

    if (!shouldClose) return;
    closeShift();
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-boba-mint-light to-white border border-boba-mint/40 flex items-center justify-center mb-4 animate-float">
          <CheckCircle size={40} className="text-boba-mint-dark" />
        </div>
        <h2 className="font-display text-3xl text-gray-900 mb-2">
          Заказ принят!
        </h2>
        <p className="text-gray-500 mb-1">Номер заказа</p>
        <p className="text-5xl font-extrabold text-boba-pink-dark">
          #{state.lastOrderNumber ?? "..."}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Оплата: {PAYMENT_LABELS[lastPaymentMethod]}
        </p>
        {lastAccountName && (
          <p className="text-sm text-gray-400 mt-1">Счет: {lastAccountName}</p>
        )}
        <p className="text-sm text-gray-400 mt-1">Корзина очищена</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/10">
      <div className="px-5 py-4 border-b border-gray-200/70 flex items-center justify-between bg-white/45 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-boba-pink-dark" />
          <span className="font-display text-xl text-gray-900">Корзина</span>
          <span className="bg-boba-pink-dark text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-glow">
            {cartCount}
          </span>
        </div>
        <button
          onClick={clearCart}
          disabled={state.cart.length === 0}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Очистить
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-200/70 bg-white/45 backdrop-blur-sm">
        <div
          className={cn(
            "rounded-2xl border p-3 shadow-sm",
            activeShift
              ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white"
              : "border-gray-200 bg-gradient-to-br from-gray-50 to-white"
          )}
        >
          {activeShift ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Смена #{activeShift.shiftNumber} открыта
                  </p>
                  <p className="text-xs text-emerald-700">
                    {formatDateTime(activeShift.openedAt)}
                  </p>
                </div>
                <button
                  onClick={handleCloseShift}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
                >
                  Закрыть смену
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2">
                  <p className="text-[11px] text-gray-500">Открытие</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(activeShift.openingCash)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2">
                  <p className="text-[11px] text-gray-500">Заказов</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activeShift.orderCount}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2">
                  <p className="text-[11px] text-gray-500">Наличные</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(activeShift.cashSalesTotal)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2">
                  <p className="text-[11px] text-gray-500">Безнал</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(activeShift.cashlessSalesTotal)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Wallet size={14} />
                    Наличная касса
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(activeShiftExpectedCash)}
                  </span>
                </div>
                <div className="rounded-xl bg-white/80 border border-emerald-100 p-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Оборот смены</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(activeShiftSalesTotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Смена закрыта</p>
              <p className="text-xs text-gray-500">
                Откройте смену перед оформлением заказов.
              </p>
              {lastClosedShift && (
                <p className="text-xs text-gray-400">
                  Последняя смена #{lastClosedShift.shiftNumber}:{" "}
                  {formatPrice(
                    lastClosedShift.cashSalesTotal + lastClosedShift.cashlessSalesTotal
                  )}{" "}
                  продаж
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input h-10"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  placeholder="Сумма открытия, сом"
                />
                <button
                  onClick={handleOpenShift}
                  className="h-10 px-3 rounded-xl bg-gradient-to-r from-boba-pink-dark to-boba-pink text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow"
                >
                  Открыть
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5">
                <Printer size={13} />
                Чековый принтер
              </p>
              <label className="text-[11px] text-gray-500 inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={autoPrintEnabled}
                  onChange={(event) => setAutoPrintEnabled(event.target.checked)}
                  className="rounded border-gray-300"
                />
                Автопечать
              </label>
            </div>

            <input
              className="input h-9 text-xs"
              value={printerName}
              onChange={(event) => setPrinterName(event.target.value)}
              placeholder="Имя принтера (если пусто — по умолчанию)"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTestPrint}
                disabled={isPrinting}
                className={cn(
                  "h-9 rounded-xl border text-xs font-semibold transition-colors",
                  isPrinting
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                Тест-чек
              </button>
              <button
                onClick={() => void handlePrintLastOrder()}
                disabled={isPrinting || state.orders.length === 0}
                className={cn(
                  "h-9 rounded-xl border text-xs font-semibold transition-colors",
                  isPrinting || state.orders.length === 0
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                Последний чек
              </button>
            </div>

            {printMessage && (
              <p
                className={cn(
                  "text-[11px]",
                  printMessage.startsWith("Ошибка")
                    ? "text-red-500"
                    : "text-emerald-600"
                )}
              >
                {printMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {state.cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-4">🧋</div>
          <p className="text-gray-400 font-medium">Корзина пуста</p>
          <p className="text-sm text-gray-300 mt-1">Добавьте напитки из меню</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {state.cart.map((item) => (
              <div key={item.id} className="card p-3">
                <div className="flex items-start gap-2">
                  <span className="text-2xl shrink-0">{item.product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 leading-tight">
                      {item.product.nameRu}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {item.customization.size} · Сахар {item.customization.sugar}%
                      · Лёд:{" "}
                      {item.customization.ice === "none"
                        ? "нет"
                        : item.customization.ice === "less"
                        ? "мало"
                        : item.customization.ice === "normal"
                        ? "нормально"
                        : "много"}
                    </p>
                    {item.customization.toppings.length > 0 && (
                      <p className="text-[11px] text-boba-mint-dark mt-0.5">
                        + {item.customization.toppings.length} топпинг(а)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-gray-50/80 rounded-xl p-1 border border-gray-100">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-boba-pink-light transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-boba-pink-light transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="font-bold text-boba-pink-dark text-sm">
                    {formatPrice(item.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-gray-200/70 bg-white/60 backdrop-blur-sm">
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Подытог</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>НДС (12%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
                <span>Итого</span>
                <span className="text-boba-pink-dark">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {PAYMENT_OPTIONS.map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                    paymentMethod === method
                      ? "border-boba-pink-dark bg-gradient-to-r from-boba-pink-light to-white text-boba-pink-dark shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white/70"
                  )}
                >
                  {method === "cash" ? <Banknote size={14} /> : <Landmark size={14} />}
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1.5">Счет</label>
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="input text-sm"
                disabled={activeAccounts.length === 0}
              >
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {!activeShift && (
              <p className="text-xs text-red-500 mb-2">
                Сначала откройте смену, затем можно закрывать заказ.
              </p>
            )}
            {activeAccounts.length === 0 && (
              <p className="text-xs text-red-500 mb-2">
                Нет активных счетов. Добавьте или включите счет во вкладке «Счета».
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className={cn(
                "btn-primary w-full text-base py-3.5",
                !canCheckout && "opacity-50 cursor-not-allowed"
              )}
            >
              Оплатить {paymentText} {formatPrice(total)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
