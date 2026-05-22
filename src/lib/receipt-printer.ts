import { Order, PaymentMethod } from "@/types";

const QZ_SCRIPT_ID = "qz-tray-script";
const QZ_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
const RECEIPT_WIDTH = 32;

interface QzSecurityApi {
  setCertificatePromise: (handler: () => Promise<string | null>) => void;
  setSignaturePromise: (handler: (toSign: string) => Promise<string>) => void;
}

interface QzWebsocketApi {
  isActive: () => boolean;
  connect: (options?: { retries?: number; delay?: number }) => Promise<void>;
}

interface QzPrintersApi {
  find: (printer: string) => Promise<string>;
  getDefault: () => Promise<string>;
}

interface QzConfigsApi {
  create: (printer: string, options?: Record<string, unknown>) => unknown;
}

interface QzApi {
  security: QzSecurityApi;
  websocket: QzWebsocketApi;
  printers: QzPrintersApi;
  configs: QzConfigsApi;
  print: (
    config: unknown,
    data: Array<{ type: "raw"; format: "plain"; data: string }>
  ) => Promise<void>;
}

declare global {
  interface Window {
    qz?: QzApi;
  }
}

let scriptPromise: Promise<void> | null = null;
let qzSecurityConfigured = false;

function paymentMethodLabel(method: PaymentMethod): string {
  return method === "cash" ? "Наличные" : "Безнал";
}

function formatKgs(amount: number): string {
  return `${Math.round(amount)} KGS`;
}

function fitText(text: string, width: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= width) return compact;
  return `${compact.slice(0, Math.max(0, width - 1))}…`;
}

function lineWithValue(left: string, right: string, width = RECEIPT_WIDTH): string {
  const leftValue = fitText(left, width);
  const rightValue = fitText(right, width);
  const spaces = Math.max(1, width - leftValue.length - rightValue.length);
  return `${leftValue}${" ".repeat(spaces)}${rightValue}`;
}

function divider(): string {
  return "-".repeat(RECEIPT_WIDTH);
}

function formatDateForReceipt(isoDate: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function buildOrderReceipt(order: Order): string {
  const ESC = "\x1B";
  const GS = "\x1D";
  const lines: string[] = [];

  lines.push(`${ESC}@`); // init
  lines.push(`${ESC}t\x11`); // codepage CP866
  lines.push(`${ESC}a\x01`);
  lines.push(`${ESC}E\x01BOBA POS${ESC}E\x00\n`);
  lines.push("КАССОВЫЙ ЧЕК\n");
  lines.push(`${ESC}a\x00`);
  lines.push(`${divider()}\n`);
  lines.push(`Заказ: #${order.orderNumber}\n`);
  lines.push(`Смена: #${order.shiftNumber}\n`);
  lines.push(`Дата: ${formatDateForReceipt(order.createdAt)}\n`);
  lines.push(`Оплата: ${paymentMethodLabel(order.paymentMethod)}\n`);
  lines.push(`Счет: ${fitText(order.accountName, RECEIPT_WIDTH - 6)}\n`);
  lines.push(`${divider()}\n`);

  for (const item of order.items) {
    lines.push(`${fitText(item.productName, RECEIPT_WIDTH)}\n`);
    lines.push(
      `${lineWithValue(
        `${item.quantity} x ${formatKgs(item.unitPrice)}`,
        formatKgs(item.lineTotal)
      )}\n`
    );
  }

  lines.push(`${divider()}\n`);
  lines.push(`${lineWithValue("Подытог", formatKgs(order.subtotal))}\n`);
  lines.push(`${lineWithValue("НДС", formatKgs(order.tax))}\n`);
  lines.push(`${ESC}E\x01${lineWithValue("ИТОГО", formatKgs(order.total))}${ESC}E\x00\n`);
  lines.push("\n");
  lines.push(`${ESC}a\x01Спасибо за заказ!${ESC}a\x00\n`);
  lines.push("\n\n\n");
  lines.push(`${GS}V\x41\x10`); // cut

  return lines.join("");
}

function buildTestReceipt(): string {
  const ESC = "\x1B";
  const GS = "\x1D";
  const now = new Date().toISOString();

  return [
    `${ESC}@`,
    `${ESC}t\x11`,
    `${ESC}a\x01`,
    `${ESC}E\x01BOBA POS${ESC}E\x00\n`,
    "ТЕСТОВАЯ ПЕЧАТЬ\n",
    `${ESC}a\x00`,
    `${divider()}\n`,
    `Дата: ${formatDateForReceipt(now)}\n`,
    "Проверка подключения\n",
    "к чековому принтеру.\n",
    `${divider()}\n`,
    `${lineWithValue("Тест", formatKgs(0))}\n`,
    "\n",
    `${ESC}a\x01OK${ESC}a\x00\n`,
    "\n\n\n",
    `${GS}V\x41\x10`,
  ].join("");
}

async function loadQzScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Печать доступна только в браузере.");
  }

  if (window.qz) return;
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(QZ_SCRIPT_ID) as HTMLScriptElement | null;

    const onReady = () => {
      if (window.qz) {
        resolve();
        return;
      }
      reject(new Error("Не удалось загрузить библиотеку QZ Tray."));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Ошибка загрузки QZ Tray скрипта.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = QZ_SCRIPT_ID;
    script.src = QZ_SCRIPT_SRC;
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Ошибка загрузки QZ Tray скрипта."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function configureSecurity(qz: QzApi): void {
  if (qzSecurityConfigured) return;

  qz.security.setCertificatePromise(() => Promise.resolve(null));
  qz.security.setSignaturePromise(() => Promise.resolve(""));
  qzSecurityConfigured = true;
}

async function getQzApi(): Promise<QzApi> {
  await loadQzScript();

  const qz = window.qz;
  if (!qz) {
    throw new Error("QZ Tray не найден. Установите QZ Tray на кассовом ПК.");
  }

  configureSecurity(qz);
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }
  return qz;
}

async function resolvePrinterName(qz: QzApi, preferredPrinterName?: string): Promise<string> {
  const preferred = preferredPrinterName?.trim();

  if (preferred) {
    try {
      return await qz.printers.find(preferred);
    } catch {
      throw new Error(`Принтер "${preferred}" не найден.`);
    }
  }

  try {
    return await qz.printers.getDefault();
  } catch {
    throw new Error("Не найден принтер по умолчанию.");
  }
}

async function printRawReceipt(
  rawData: string,
  preferredPrinterName?: string
): Promise<void> {
  const qz = await getQzApi();
  const printerName = await resolvePrinterName(qz, preferredPrinterName);
  const config = qz.configs.create(printerName, {
    encoding: "CP866",
    copies: 1,
  });

  await qz.print(config, [{ type: "raw", format: "plain", data: rawData }]);
}

export async function printOrderReceipt(params: {
  order: Order;
  printerName?: string;
}): Promise<void> {
  await printRawReceipt(buildOrderReceipt(params.order), params.printerName);
}

export async function printTestReceipt(params?: {
  printerName?: string;
}): Promise<void> {
  await printRawReceipt(buildTestReceipt(), params?.printerName);
}
