import {
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

type SearchIndexItem = {
  id?: string;
  slug?: string;
  asin?: string;
  title?: string;
  brand?: string;
  category?: string;
  searchable?: string;
  keywords?: string;
};

export const NavigationSection = (): JSX.Element => {
  const navigate = useNavigate();

  // LEFT DRAWER
  const [menuOpen, setMenuOpen] = useState(false);

  // RIGHT FLYOUT (Account & Lists)
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement | null>(null);

  // SEARCH
  const [dept, setDept] = useState("all");
  const [query, setQuery] = useState("");

  // ✅ Suggestions + index (added, does not affect drawer/account logic)
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // CART (placeholder for now)
  // Replace this with your real cart count source later (context/store/localStorage).
  const cartCount = 0;

  const deptOptions = useMemo(
    () => [
      { value: "all", label: "All" },
      { value: "women", label: "Women" },
      { value: "men", label: "Men" },
      { value: "kids", label: "Kids" },
      { value: "shoes", label: "Shoes" },
      { value: "accessories", label: "Accessories" },
      { value: "new", label: "New Arrivals" },
      { value: "deals", label: "Sales & Deals" },
    ],
    []
  );

  // ESC to close + lock body scroll while left drawer is open
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  // Close Account flyout on ESC + outside click
  useEffect(() => {
    if (!accountOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };

    const onMouseDown = (e: MouseEvent) => {
      const el = accountWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setAccountOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [accountOpen]);

  // Avoid overlap: opening drawer closes account flyout
  useEffect(() => {
    if (menuOpen) setAccountOpen(false);
  }, [menuOpen]);

  // ✅ Load search index once (tries both common locations)
  useEffect(() => {
    let cancelled = false;

    const normalize = (data: any): SearchIndexItem[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data as SearchIndexItem[];

      // common shapes: { items: [...] } or { products: [...] } or { byId: {...} }
      if (Array.isArray(data.items)) return data.items as SearchIndexItem[];
      if (Array.isArray(data.products)) return data.products as SearchIndexItem[];

      if (data.byId && typeof data.byId === "object") {
        return Object.values(data.byId) as SearchIndexItem[];
      }

      // map/object of items
      if (typeof data === "object") {
        return Object.values(data) as SearchIndexItem[];
      }

      return [];
    };

    const load = async () => {
      const urls = ["/static/products/search_index.json", "/products/search_index.json"];

      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (!res.ok) continue;
          const data = await res.json();
          const items = normalize(data);
          if (!cancelled) setSearchIndex(items);
          return;
        } catch {
          // try next
        }
      }

      if (!cancelled) setSearchIndex([]);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored = searchIndex
      .map((p) => {
        const title = (p.title || "").toLowerCase();
        const searchable = (p.searchable || p.keywords || "").toLowerCase();
        const haystack = `${title} ${searchable}`.trim();

        if (!haystack) return null;

        // simple scoring: title match > keyword match
        let score = 0;
        if (title.includes(q)) score += 3;
        if (searchable.includes(q)) score += 1;
        if (score === 0) return null;

        return { p, score };
      })
      .filter(Boolean) as { p: SearchIndexItem; score: number }[];

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.p);
  }, [query, searchIndex]);

  const getPdpId = (p: SearchIndexItem) => p.slug || p.id || p.asin || "";

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    if (dept && dept !== "all") params.set("dept", dept);
    if (q) params.set("q", q);

    const qs = params.toString();
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    navigate(qs ? `/search?${qs}` : "/search");
  };

  const onPickSuggestion = (p: SearchIndexItem) => {
    const id = getPdpId(p);
    if (!id) {
      // fallback: just go to search page
      const params = new URLSearchParams();
      if (dept && dept !== "all") params.set("dept", dept);
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      setShowSuggestions(false);
      setActiveSuggestion(-1);
      navigate(qs ? `/search?${qs}` : "/search");
      return;
    }

    setShowSuggestions(false);
    setActiveSuggestion(-1);
    navigate(`/p/${id}`);
  };

  return (
    <>
      <header
        className="w-full border-b"
        style={{
          backgroundColor: "#000",
          color: "#fff",
          borderColor: "#262626",
        }}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-[28px] py-[14px] gap-4">
          {/* LEFT: HAMBURGER + LOGO */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-[40px] px-2 flex items-center gap-2 rounded-sm hover:bg-white/10"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon className="h-[26px] w-[26px]" color="#fff" strokeWidth={2.5} />
              <span className="text-[14px] font-bold leading-none">All</span>
            </Button>

            <Link to="/" className="text-[26px] font-extrabold tracking-wide">
              JETCUBE
            </Link>
          </div>

          {/* AMAZON-STYLE SEARCH BAR */}
          <form
            onSubmit={onSubmitSearch}
            className="flex-1 flex items-center justify-center"
          >
            <div
              className="relative flex w-full max-w-[860px] h-[40px]"
              style={{ borderRadius: 4 }}
            >
              {/* Dept dropdown */}
              <div
                className="h-full"
                style={{
                  background: "#f3f3f3",
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                  borderRight: "1px solid #cdcdcd",
                }}
              >
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="h-full px-3 text-[12px] text-black outline-none"
                  style={{
                    background: "transparent",
                    border: "none",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    cursor: "pointer",
                    minWidth: 64,
                  }}
                  aria-label="Search department"
                >
                  {deptOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input */}
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                  setActiveSuggestion(-1);
                }}
                onFocus={() => {
                  if (query.trim()) setShowSuggestions(true);
                }}
                onBlur={() => {
                  // small delay so click can register
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setActiveSuggestion(-1);
                  }, 120);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestions || suggestions.length === 0) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveSuggestion((v) =>
                      Math.min(v + 1, suggestions.length - 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveSuggestion((v) => Math.max(v - 1, 0));
                  } else if (e.key === "Enter") {
                    if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
                      e.preventDefault();
                      onPickSuggestion(suggestions[activeSuggestion]);
                    }
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                    setActiveSuggestion(-1);
                  }
                }}
                placeholder="Search"
                className="flex-1 h-full px-3 text-[14px] text-black outline-none"
                style={{
                  border: "none",
                }}
                aria-label="Search query"
              />

              {/* Search button */}
              <button
                type="submit"
                aria-label="Search"
                className="h-full px-4 flex items-center justify-center"
                style={{
                  background: "#0571e3",
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {/* simple magnifier */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm11 3-6-6"
                    fill="none"
                    stroke="#111"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* ✅ Amazon-style suggestions dropdown (LOW z-index; won't mess drawer) */}
              {showSuggestions && query.trim() && suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white text-[#0F1111] border border-[#d5dbdb] shadow-xl"
                  style={{
                    zIndex: 50, // drawer is 9999, account dropdown is 10000
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                  role="listbox"
                  aria-label="Search suggestions"
                >
                  {suggestions.map((p, idx) => {
                    const id = getPdpId(p);
                    const title = p.title || id || "Untitled";
                    const meta = [p.brand, p.category].filter(Boolean).join(" • ");
                    const isActive = idx === activeSuggestion;

                    return (
                      <div
                        key={`${id}-${idx}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onPickSuggestion(p);
                        }}
                        onMouseEnter={() => setActiveSuggestion(idx)}
                        className="px-3 py-2 cursor-pointer"
                        style={{
                          background: isActive ? "#f3f3f3" : "#fff",
                        }}
                      >
                        <div className="text-[13px] font-semibold">{title}</div>
                        {meta ? (
                          <div className="text-[12px]" style={{ color: "#565959" }}>
                            {meta}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {/* See all results row */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const params = new URLSearchParams();
                      if (dept && dept !== "all") params.set("dept", dept);
                      if (query.trim()) params.set("q", query.trim());
                      const qs = params.toString();
                      setShowSuggestions(false);
                      setActiveSuggestion(-1);
                      navigate(qs ? `/search?${qs}` : "/search");
                    }}
                    className="px-3 py-2 cursor-pointer border-t"
                    style={{ borderColor: "#e7e7e7", background: "#fff" }}
                  >
                    <span className="text-[13px]" style={{ color: "#007185" }}>
                      See all results for “{query.trim()}”
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* RIGHT: Account flyout + Wishlist + Amazon-style Cart */}
          <div className="flex items-center gap-[14px] shrink-0">
            {/* Amazon-style Account & Lists flyout */}
            <div className="relative" ref={accountWrapRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10 transition"
                aria-haspopup="dialog"
                aria-expanded={accountOpen}
              >
                <div className="text-left leading-none">
                  <div className="text-[12px] opacity-90">Hello, shadab</div>
                  <div className="text-[13px] font-bold flex items-center gap-1">
                    Account &amp; Lists
                    <span className="text-[10px] opacity-80">▼</span>
                  </div>
                </div>
              </button>

              {/* dropdown */}
              <div
                className={`absolute right-0 top-[calc(100%+10px)] z-[10000] w-[520px] bg-white text-[#0F1111] shadow-2xl border border-[#d5dbdb] rounded-sm transition-opacity ${accountOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                role="dialog"
                aria-label="Account menu"
              >
                {/* caret */}
                <div className="absolute -top-[9px] right-10 h-0 w-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[9px] border-b-[#d5dbdb]" />
                <div className="absolute -top-2 right-10 h-0 w-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white" />

                <div className="px-4 py-3 border-b border-[#e7e7e7] flex items-center justify-between">
                  <Link
                    to="/account"
                    onClick={() => setAccountOpen(false)}
                    className="bg-[#ffd814] hover:bg-[#f7ca00] text-black text-[13px] font-semibold px-4 py-2 rounded"
                  >
                    Sign in
                  </Link>

                  <div className="text-[12px] text-[#565959]">
                    New customer?{" "}
                    <Link
                      className="text-[#007185] hover:underline"
                      to="/account"
                      onClick={() => setAccountOpen(false)}
                    >
                      Start here.
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0">
                  <div className="p-4">
                    <div className="text-[13px] font-bold mb-2">Your Lists</div>
                    <div className="space-y-1">
                      {[
                        "Create a List",
                        "Find a List or Registry",
                        "Your Saved Books",
                        "Your Recommendations",
                        "Browse History",
                        "Watchlist",
                      ].map((label) => (
                        <Link
                          key={label}
                          className="block text-[13px] text-[#0F1111] hover:text-[#c45500] hover:underline"
                          to="/shop"
                          onClick={() => setAccountOpen(false)}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border-l border-[#e7e7e7]">
                    <div className="text-[13px] font-bold mb-2">Your Account</div>
                    <div className="space-y-1">
                      {[
                        "Account",
                        "Orders",
                        "Keep Shopping For",
                        "Recommendations",
                        "Your Addresses",
                        "Payment options",
                        "Prime Membership",
                        "Customer Service",
                      ].map((label) => (
                        <Link
                          key={label}
                          className="block text-[13px] text-[#0F1111] hover:text-[#c45500] hover:underline"
                          to="/account"
                          onClick={() => setAccountOpen(false)}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#e7e7e7] flex justify-between text-[12px]">
                      <Link
                        className="text-[#007185] hover:underline"
                        to="/account"
                        onClick={() => setAccountOpen(false)}
                      >
                        Switch Accounts
                      </Link>
                      <Link
                        className="text-[#007185] hover:underline"
                        to="/account"
                        onClick={() => setAccountOpen(false)}
                      >
                        Sign Out
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wishlist (keep) */}
            <Button variant="ghost" size="icon" className="p-0" asChild>
              <Link to="/wishlist" aria-label="Wishlist">
                <HeartIcon className="h-[20px] w-[20px]" color="#fff" />
              </Link>
            </Button>

            {/* Amazon-style Cart */}
            <Link
              to="/cart-sidebar"
              className="relative flex items-end gap-2 rounded px-2 py-1 hover:bg-white/10 transition"
              aria-label="Cart"
            >
              {/* badge */}
              <div
                className="absolute left-[18px] top-[2px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: "#0571e3", color: "#111" }}
              >
                {cartCount}
              </div>

              <ShoppingCartIcon className="h-[26px] w-[26px]" color="#fff" />
              <div className="text-[13px] font-bold leading-none pb-[2px]">
                Cart
              </div>
            </Link>
          </div>
        </div>

        {/* Optional: you still have your old nav links available here if you want.
            Keeping it out to stay closer to Amazon’s top bar. */}
      </header>

      {/* AMAZON-STYLE LEFT DRAWER (AMAZON COLORS) */}
      <div
        className={`fixed inset-0 z-[9999] ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        {/* overlay */}
        <button
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"
            }`}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          tabIndex={menuOpen ? 0 : -1}
        />

        {/* panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={`absolute left-0 top-0 h-full w-[365px] bg-white text-[#0F1111] shadow-xl transition-transform duration-200 ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="h-full flex flex-col">
            {/* drawer header (Amazon navy) */}
            <div className="bg-gradient-to-b from-[#111] via-[#0b0b0b] to-[#000] text-white px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
                  <UserIcon className="h-5 w-5" color="#fff" />
                </div>
                <div className="text-[16px] font-semibold leading-none">
                  Hello, shadab
                </div>
              </div>

              <button
                className="p-2 rounded hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <XIcon className="w-5 h-5" color="#fff" />
              </button>
            </div>

            {/* drawer body */}
            <div className="flex-1 overflow-y-auto">
              {/* Trending */}
              <div className="py-3">
                <div className="px-4 py-2 text-[13px] font-bold">Trending</div>
                <div className="border-t border-[#d5dbdb]" />

                {[
                  { label: "Best Sellers", href: "/shop" },
                  { label: "New Releases", href: "/shop" },
                  { label: "Movers & Shakers", href: "/shop" },
                  { label: "Prescription Delivery", href: "/shop" },
                ].map((it) => (
                  <Link
                    key={it.label}
                    to={it.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-[14px] hover:bg-[#eaeded]"
                    style={{ color: "rgba(15, 17, 17, 1)" }}
                  >
                    {it.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#d5dbdb]" />

              {/* Digital Content & Devices */}
              <div className="py-3">
                <div className="px-4 py-2 text-[13px] font-bold">
                  Digital Content &amp; Devices
                </div>
                <div className="border-t border-[#d5dbdb]" />

                {[
                  "Prime Video",
                  "Amazon Music",
                  "Echo & Alexa",
                  "Fire Tablets",
                  "Fire TV",
                  "Amazon Luna",
                  "Kindle E-readers & Books",
                  "Audible Books & Originals",
                  "Amazon Photos",
                  "Amazon Appstore",
                ].map((label) => (
                  <Link
                    key={label}
                    to="/shop"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-[14px] hover:bg-[#eaeded]"
                    style={{ color: "#0F1111" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#d5dbdb]" />

              {/* Shop by Department */}
              <div className="py-3">
                <div className="px-4 py-2 text-[13px] font-bold">
                  Shop by Department
                </div>
                <div className="border-t border-[#d5dbdb]" />

                {[
                  { label: "Women’s Dresses", href: "/c/women-clothing-dresses" },
                  { label: "Formal Dresses", href: "/c/clothing-dresses-formal" },
                  { label: "Cocktail Dresses", href: "/c/clothing-dresses-cocktail" },
                  { label: "Maxi Dresses", href: "/c/clothing-dresses-maxi" },
                  { label: "Bodycon Dresses", href: "/c/clothing-dresses-bodycon" },
                  { label: "Evening Dresses", href: "/c/clothing-dresses-evening" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-[14px] hover:bg-[#eaeded]"
                    style={{ color: "#0F1111" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>




              <div className="border-t border-[#d5dbdb]" />

              <div className="px-4 py-4 text-[12px] text-[#565959]">
                Test menu — links can be wired later.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default NavigationSection;




