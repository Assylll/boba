"use client";
import { useStore } from "@/lib/store";
import { OrderStatus } from "@/types";
import {
  formatPrice,
  formatDateTime,
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_LABELS,
  PAYMENT_COLORS,
  cn,
} from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS: OrderStatus[] = ["new", "in_progress", "ready", "completed"];

export default function OrdersPage() {
  const { state, updateOrderStatus, repeatOrder } = useStore();
  const router = useRouter();

  const handleRepeat = (orderId: string) => {
    repeatOrder(orderId);
    router.push("/");
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white/40 to-white/10">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200/70 bg-white/45 backdrop-blur-sm">
        <h1 className="font-display text-2xl text-gray-900">История заказов</h1>
        <p className="text-sm text-gray-500 mt-0.5">{state.orders.length} заказов</p>
      </div>

      {state.orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
          <p className="text-6xl mb-4">📋</p>
          <p className="text-gray-500 font-medium">Заказов пока нет</p>
          <p className="text-sm text-gray-400 mt-1">Оформите первый заказ на кассе</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {state.orders.map((order) => (
            <div key={order.id} className="card p-4 animate-fade-up">
              {/* Order header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-lg">
                      #{order.orderNumber}
                    </span>
                    <span className="badge bg-gray-100/80 text-gray-600 border-gray-200">
                      Смена #{order.shiftNumber}
                    </span>
                    <span
                      className={cn(
                        "badge",
                        STATUS_COLORS[order.status]
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span
                      className={cn(
                        "badge",
                        PAYMENT_COLORS[order.paymentMethod]
                      )}
                    >
                      {PAYMENT_LABELS[order.paymentMethod]}
                    </span>
                    <span className="badge bg-gray-100 text-gray-600 border-gray-200">
                      Счет: {order.accountName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="font-bold text-boba-pink-dark">
                  {formatPrice(order.total)}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}× {item.productName}
                      <span className="text-gray-400 text-xs ml-1">
                        ({item.customization.size})
                      </span>
                    </span>
                    <span className="text-gray-500">{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {/* Status changer */}
                <select
                  value={order.status}
                  onChange={(e) =>
                    updateOrderStatus(order.id, e.target.value as OrderStatus)
                  }
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none focus:border-boba-pink"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleRepeat(order.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-boba-cream text-boba-cream-dark text-xs font-semibold hover:opacity-80 transition-opacity"
                >
                  <RefreshCw size={12} />
                  Повторить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
