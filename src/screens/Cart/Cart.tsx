import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * NOTE:
 * This is your /cart route.
 * We render an Amazon-style two-column cart page:
 * - Items list on the left
 * - Subtotal box on the right
 * Wire to real cart state later.
 */

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  price: string;
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
  const cleaned = s.replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const formatRs = (n: number) => {
  const parts = n.toFixed(2).split(".");
  const intWithCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs. ${intWithCommas}.${parts[1]}`;
};

export const Cart = (): JSX.Element => {
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
    <main className="bg-[#eaeded] min-h-screen">
      {/* Simple Amazon-ish top spacer; your real nav already exists elsewhere */}
      <div className="bg-[#131921] text-white px-6 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link to="/" className="text-[20px] font-bold">
            JETCUBE
          </Link>
          <Link to="/shop" className="text-[13px] hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* LEFT: items */}
          <section className="bg-white border border-[#d5dbdb] rounded p-5">
            <div className="flex items-end justify-between">
              <h1 className="text-[22px] font-bold text-[#0F1111]">
                Shopping Cart
              </h1>
              <div className="text-[12px] text-[#565959]">
                Price
              </div>
            </div>

            <div className="border-t border-[#e7e7e7] mt-3" />

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
                    Shop now
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-5">
                  {items.map((it) => (
                    <div key={it.id} className="flex gap-4">
                      <div className="w-[120px] h-[120px] bg-[#f7f8f8] rounded overflow-hidden shrink-0">
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[16px] font-semibold text-[#0F1111] leading-snug">
                              {it.name}
                            </div>
                            <div className="mt-1 text-[12px] text-[#007600]">
                              In Stock
                            </div>

                            <div className="mt-2 flex items-center gap-3 text-[12px]">
                              <div className="flex items-center gap-2">
                                <label className="text-[#565959]">Qty:</label>
                                <select
                                  className="h-[30px] px-2 text-[13px] border border-[#d5dbdb] rounded bg-white"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    updateQty(it.id, Number(e.target.value))
                                  }
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <span className="text-[#d5dbdb]">|</span>

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

                          <div className="text-[16px] font-bold text-[#0F1111] whitespace-nowrap">
                            {it.price}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#e7e7e7] mt-5 pt-4 flex justify-end">
                  <div className="text-[18px] text-[#0F1111]">
                    Subtotal ({totalCount} item{totalCount === 1 ? "" : "s"}):{" "}
                    <span className="font-bold">{formatRs(subtotal)}</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* RIGHT: summary box */}
          <aside className="bg-white border border-[#d5dbdb] rounded p-5 h-fit">
            <div className="text-[12px] text-[#007600] mb-2">
              Your order qualifies for FREE Shipping.
            </div>

            <div className="text-[18px] text-[#0F1111] mb-4">
              Subtotal ({totalCount} item{totalCount === 1 ? "" : "s"}):{" "}
              <span className="font-bold">{formatRs(subtotal)}</span>
            </div>

            <Link
              to="/checkout"
              className="w-full inline-flex items-center justify-center bg-[#ffd814] hover:bg-[#f7ca00] text-black text-[13px] font-semibold px-4 py-2 rounded"
            >
              Proceed to checkout
            </Link>

            <div className="mt-3 text-[12px] text-[#565959]">
              By placing your order, you agree to our conditions of use and privacy notice.
            </div>

            <div className="mt-4 border-t border-[#e7e7e7] pt-4">
              <Link to="/shop" className="text-[#007185] hover:underline text-[13px]">
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Cart;
