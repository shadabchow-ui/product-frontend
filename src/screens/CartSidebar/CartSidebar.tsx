import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { XIcon } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

/**
 * NOTE:
 * This component is used by your /cart-sidebar route.
 * We keep it as a right-side Amazon-like drawer page for now.
 * Wire real cart state later (context/store).
 */

// Basic placeholder items (swap to real cart later)
type CartItem = {
  id: string;
  name: string;
  quantity: number;
  price: string; // ex: "Rs. 250,000.00"
  image: string;
};

const cartItemsSeed: CartItem[] = [
  {
    id: "1",
    name: "Asgaard sofa",
    quantity: 1,
    price: "Rs. 250,000.00",
    image: "/img/mask-group-1.png",
  },
  {
    id: "2",
    name: "Casaliving Wood",
    quantity: 1,
    price: "Rs. 270,000.00",
    image: "/img/mask-group-2.png",
  },
];

const parseMoney = (s: string) => {
  // "Rs. 250,000.00" -> 250000
  const cleaned = s.replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const formatRs = (n: number) => {
  // Keep your existing "Rs." style
  const parts = n.toFixed(2).split(".");
  const intWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs. ${intWithCommas}.${parts[1]}`;
};

export const CartSidebar = (): JSX.Element => {
  const [items, setItems] = useState<CartItem[]>(cartItemsSeed);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + parseMoney(it.price) * it.quantity, 0);
  }, [items]);

  const totalCount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const updateQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: qty } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <div className="text-[18px] font-bold text-[#0F1111]">
            Shopping Cart
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.history.back()}
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="py-10">
              <div className="text-[#0F1111] text-[16px] font-semibold">
                Your Cart is empty
              </div>
              <div className="mt-2 text-[13px] text-[#565959]">
                Add items to your cart to see them here.
              </div>
              <div className="mt-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center bg-[#ffd814] hover:bg-[#f7ca00] text-black text-[13px] font-semibold px-4 py-2 rounded"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[12px] text-[#565959] mb-3">
                {totalCount} item{totalCount === 1 ? "" : "s"}
              </div>

              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.id} className="border border-[#e7e7e7] rounded p-3">
                    <div className="flex gap-3">
                      <div className="w-[88px] h-[88px] bg-[#f7f8f8] rounded overflow-hidden shrink-0">
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-[#0F1111] leading-snug">
                          {it.name}
                        </div>

                        <div className="mt-1 text-[12px] text-[#007600]">
                          In Stock
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[14px] font-bold text-[#0F1111]">
                            {it.price}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[12px] text-[#565959]">
                              Qty:
                            </label>
                            <select
                              className="h-[30px] px-2 text-[13px] border border-[#d5dbdb] rounded bg-white"
                              value={it.quantity}
                              onChange={(e) =>
                                updateQty(it.id, Number(e.target.value))
                              }
                              aria-label="Quantity"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-[12px]">
                          <button
                            className="text-[#007185] hover:underline"
                            onClick={() => removeItem(it.id)}
                          >
                            Delete
                          </button>
                          <span className="text-[#d5dbdb]">|</span>
                          <button
                            className="text-[#007185] hover:underline"
                            onClick={() => {
                              // placeholder
                            }}
                          >
                            Save for later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer summary */}
        <div className="border-t px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] text-[#0F1111] font-semibold">
              Subtotal
            </div>
            <div className="text-[16px] text-[#0F1111] font-bold">
              {formatRs(subtotal)}
            </div>
          </div>

          <Link
            to="/checkout"
            className="w-full inline-flex items-center justify-center bg-[#ffd814] hover:bg-[#f7ca00] text-black text-[13px] font-semibold px-4 py-2 rounded"
          >
            Proceed to checkout
          </Link>

          <div className="mt-3 flex items-center justify-between text-[12px]">
            <Link to="/cart" className="text-[#007185] hover:underline">
              View cart
            </Link>
            <Link to="/shop" className="text-[#007185] hover:underline">
              Continue shopping
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CartSidebar;
