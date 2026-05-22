"use client";
import { useMemo, useState } from "react";
import { Search, Sparkles, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { CATEGORIES } from "@/data/products";
import { cn } from "@/lib/utils";
import ProductCard from "@/components/pos/ProductCard";
import Cart from "@/components/pos/Cart";

export default function POSPage() {
  const { state, cartCount } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showCart, setShowCart] = useState(false);

  const filtered = useMemo(() => {
    return state.products.filter((product) => {
      const matchCat = category === "all" || product.category === category;
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        product.nameRu.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q);
      return matchCat && matchQ && product.available;
    });
  }, [state.products, category, query]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 md:px-5">
          <div className="panel-surface p-4 md:p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  <Sparkles size={12} className="text-boba-pink-dark" />
                  Boba Experience
                </p>
                <h1 className="font-display text-2xl md:text-3xl text-gray-900 mt-1">
                  Касса
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Соберите заказ и закройте его в один тап.
                </p>
              </div>

              <button
                className="lg:hidden relative w-11 h-11 rounded-2xl bg-gradient-to-br from-boba-pink-light to-boba-cream border border-boba-pink/30 text-boba-pink-dark flex items-center justify-center"
                onClick={() => setShowCart(true)}
              >
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-boba-pink-dark text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </div>

            <div className="mt-4 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="input pl-9 pr-9 text-sm"
                placeholder="Поиск напитков..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 md:px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all shrink-0",
                  category === id
                    ? "bg-gradient-to-r from-boba-pink-dark to-boba-pink text-white border-transparent shadow-glow"
                    : "bg-white/75 text-gray-600 border-gray-200/80 hover:bg-white hover:border-gray-300"
                )}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5">
          {filtered.length === 0 ? (
            <div className="h-full min-h-[220px] panel-surface flex flex-col items-center justify-center text-center p-8">
              <p className="text-5xl mb-3">🔎</p>
              <p className="text-gray-600 font-semibold">Ничего не найдено</p>
              <p className="text-sm text-gray-400 mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] border-l border-gray-200/60 bg-white/35 backdrop-blur-sm">
        <Cart />
      </aside>

      {showCart && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/45 backdrop-blur-[2px]" onClick={() => setShowCart(false)} />
          <div className="w-[88vw] max-w-[390px] panel-surface rounded-none rounded-l-3xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/70">
              <span className="font-display text-xl text-gray-900">Корзина</span>
              <button onClick={() => setShowCart(false)} className="btn-ghost">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Cart />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
