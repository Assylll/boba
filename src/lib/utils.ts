import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CartItemCustomization, PaymentMethod, Product } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ru-KG", {
    style: "currency",
    currency: "KGS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getSizeModifier(
  product: Product,
  size: "S" | "M" | "L"
): number {
  const sizeOpt = product.sizes?.find((s) => s.label === size);
  return sizeOpt?.priceModifier ?? 0;
}

export function calcLineTotal(
  product: Product,
  quantity: number,
  customization: CartItemCustomization,
  toppingProducts: Product[]
): number {
  const base = product.price + getSizeModifier(product, customization.size);
  const toppingCost = customization.toppings.reduce((acc, tId) => {
    const tp = toppingProducts.find((t) => t.id === tId);
    return acc + (tp?.price ?? 0);
  }, 0);
  return (base + toppingCost) * quantity;
}

export function generateOrderNumber(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  in_progress: "В работе",
  ready: "Готов",
  completed: "Завершён",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-boba-pink-light text-boba-pink-dark border-boba-pink",
  in_progress: "bg-boba-cream text-boba-cream-dark border-boba-cream-dark",
  ready: "bg-boba-mint-light text-boba-mint-dark border-boba-mint-dark",
  completed: "bg-gray-100 text-gray-500 border-gray-300",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  cashless: "Безнал",
};

export const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  cash: "bg-amber-100 text-amber-700 border-amber-200",
  cashless: "bg-sky-100 text-sky-700 border-sky-200",
};
