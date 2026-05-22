"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Product } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import CustomizeModal from "./CustomizeModal";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border border-gray-200/70 bg-white/80 backdrop-blur-sm shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover animate-fade-up",
          !product.available && "opacity-50 pointer-events-none"
        )}
        onClick={() => setShowModal(true)}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-boba-pink/10 via-transparent to-boba-mint/10" />
        </div>

        <div className="relative p-3.5">
          <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-boba-pink-light via-boba-brown-light to-boba-mint-light min-h-[98px] flex items-center justify-center text-5xl select-none animate-float">
            {product.emoji}
          </div>

          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 truncate">
              {product.name}
            </p>
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mt-0.5 min-h-[2.5rem]">
              {product.nameRu}
            </p>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-boba-pink-dark font-extrabold text-sm">
              {formatPrice(product.price)}
            </span>
            <button
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-boba-pink-dark to-boba-pink text-white flex items-center justify-center shadow-glow hover:opacity-90 active:scale-90 transition-all"
              onClick={(event) => {
                event.stopPropagation();
                setShowModal(true);
              }}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <CustomizeModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
