"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  ClipboardList,
  Settings,
  Coffee,
  Clock3,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatPrice } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Касса", icon: ShoppingBag },
  { href: "/orders", label: "Заказы", icon: ClipboardList },
  { href: "/admin", label: "Админ", icon: Settings },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cartCount, state, activeShiftExpectedCash } = useStore();

  const activeShift = state.activeShift;

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-boba-pink/25 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute top-24 -right-20 h-72 w-72 rounded-full bg-boba-mint/20 blur-3xl animate-float"
        style={{ animationDelay: "900ms" }}
      />

      <aside className="hidden lg:flex w-72 shrink-0 p-4 pr-3">
        <div className="panel-surface w-full p-4 flex flex-col">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200/60">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-boba-pink-dark via-boba-pink to-boba-cream-dark shadow-glow flex items-center justify-center">
              <Coffee className="text-white" size={22} />
            </div>
            <div>
              <p className="font-display text-xl leading-none text-gray-900">Boba POS</p>
              <p className="text-xs text-gray-500 mt-1">Управление точкой продаж</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative rounded-2xl px-3 py-3 flex items-center gap-3 transition-all border",
                    active
                      ? "bg-gradient-to-r from-boba-pink-light via-white to-boba-cream border-boba-pink/30 shadow-card"
                      : "bg-white/55 border-gray-200/70 hover:bg-white/90 hover:border-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                      active
                        ? "bg-boba-pink-dark text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        active ? "text-boba-pink-dark" : "text-gray-700"
                      )}
                    >
                      {label}
                    </p>
                  </div>

                  {href === "/" && cartCount > 0 && (
                    <span className="badge bg-boba-pink-dark text-white border-boba-pink-dark">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-auto space-y-2 pt-6">
            <div className="rounded-2xl border border-gray-200/60 bg-white/70 p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                Статус смены
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Clock3 size={14} className="text-boba-mint-dark" />
                <p className="text-sm font-semibold text-gray-800">
                  {activeShift ? `Открыта #${activeShift.shiftNumber}` : "Смена закрыта"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/60 bg-white/70 p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                Наличная касса
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Wallet size={14} className="text-boba-pink-dark" />
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(activeShiftExpectedCash)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-3 pb-24 lg:p-4 lg:pb-4 lg:pl-0">
        <div className="panel-surface h-full overflow-hidden">{children}</div>
      </main>

      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50 panel-surface px-1.5 py-1.5 flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex-1 rounded-xl py-2 flex flex-col items-center justify-center gap-1 transition-all",
                active ? "bg-boba-pink-dark text-white" : "text-gray-500"
              )}
            >
              <div className="relative">
                <Icon size={18} />
                {href === "/" && cartCount > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-2.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center",
                      active ? "bg-white text-boba-pink-dark" : "bg-boba-pink-dark text-white"
                    )}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
