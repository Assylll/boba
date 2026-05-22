"use client";
import { useState } from "react";
import { X, ShoppingBag } from "lucide-react";
import { Product, CartItemCustomization } from "@/types";
import { useStore } from "@/lib/store";

import { formatPrice, calcLineTotal, cn } from "@/lib/utils";

interface CustomizeModalProps {
  product: Product;
  onClose: () => void;
}

const SIZES: Array<"S" | "M" | "L"> = ["S", "M", "L"];
const SUGARS: Array<0 | 25 | 50 | 75 | 100> = [0, 25, 50, 75, 100];
const ICE_OPTIONS = [
  { value: "none", label: "Без льда" },
  { value: "less", label: "Мало" },
  { value: "normal", label: "Нормально" },
  { value: "extra", label: "Много" },
] as const;

function OptionBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all",
        active
          ? "bg-gradient-to-r from-boba-pink-dark to-boba-pink text-white border-transparent shadow-glow"
          : "bg-white/85 text-gray-600 border-gray-200/80 hover:bg-white hover:border-gray-300"
      )}
    >
      {children}
    </button>
  );
}

export default function CustomizeModal({ product, onClose }: CustomizeModalProps) {
  const { addToCart, state } = useStore();
  const [customization, setCustomization] = useState<CartItemCustomization>({
    size: "M",
    sugar: 50,
    ice: "normal",
    toppings: [],
    comment: "",
  });

  const toppingProducts = state.products.filter((p) => p.category === "toppings");

  const lineTotal = calcLineTotal(product, 1, customization, toppingProducts);

  const toggleTopping = (id: string) => {
    setCustomization((prev) => ({
      ...prev,
      toppings: prev.toppings.includes(id)
        ? prev.toppings.filter((t) => t !== id)
        : [...prev.toppings, id],
    }));
  };

  const handleAdd = () => {
    addToCart(product, customization);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm">
      <div className="panel-surface rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 rounded-t-3xl px-5 sm:px-6 pt-6 pb-4 border-b border-gray-200/70 z-10 bg-gradient-to-r from-white/95 via-white/90 to-boba-pink-light/60 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-float">{product.emoji}</span>
              <div>
                <h2 className="font-display text-2xl leading-tight text-gray-900">{product.nameRu}</h2>
                <p className="text-sm text-gray-400">{product.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/85 border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-5">
          {/* Size */}
          {product.sizes && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Размер</h3>
              <div className="flex gap-2">
                {SIZES.map((s) => {
                  const mod = product.sizes?.find((x) => x.label === s)?.priceModifier ?? 0;
                  return (
                    <OptionBtn
                      key={s}
                      active={customization.size === s}
                      onClick={() => setCustomization((p) => ({ ...p, size: s }))}
                    >
                      {s}
                      {mod > 0 && (
                        <span className="ml-1 text-[10px] opacity-70">+{mod}</span>
                      )}
                    </OptionBtn>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sugar */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Сахар</h3>
            <div className="flex flex-wrap gap-2">
              {SUGARS.map((s) => (
                <OptionBtn
                  key={s}
                  active={customization.sugar === s}
                  onClick={() => setCustomization((p) => ({ ...p, sugar: s }))}
                >
                  {s}%
                </OptionBtn>
              ))}
            </div>
          </section>

          {/* Ice */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Лёд</h3>
            <div className="flex flex-wrap gap-2">
              {ICE_OPTIONS.map(({ value, label }) => (
                <OptionBtn
                  key={value}
                  active={customization.ice === value}
                  onClick={() => setCustomization((p) => ({ ...p, ice: value }))}
                >
                  {label}
                </OptionBtn>
              ))}
            </div>
          </section>

          {/* Toppings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Топпинги</h3>
            <div className="grid grid-cols-2 gap-2">
              {toppingProducts.map((tp) => {
                const active = customization.toppings.includes(tp.id);
                return (
                  <button
                    key={tp.id}
                    onClick={() => toggleTopping(tp.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left",
                      active
                        ? "bg-gradient-to-r from-boba-mint-light to-white border-boba-mint text-boba-mint-dark"
                        : "bg-white/80 border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300"
                    )}
                  >
                    <span>{tp.emoji}</span>
                    <span className="flex-1 text-xs">{tp.nameRu}</span>
                    <span className="text-[10px] opacity-60">+{tp.price}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Comment */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Комментарий</h3>
            <textarea
              className="input resize-none h-16 text-sm"
              placeholder="Пожелания к заказу..."
              value={customization.comment}
              onChange={(e) =>
                setCustomization((p) => ({ ...p, comment: e.target.value }))
              }
            />
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 rounded-b-3xl px-5 sm:px-6 py-4 border-t border-gray-200/70 bg-white/90 backdrop-blur-sm">
          <button onClick={handleAdd} className="btn-primary w-full flex items-center justify-center gap-2">
            <ShoppingBag size={18} />
            <span>Добавить в корзину</span>
            <span className="ml-auto font-bold">{formatPrice(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
