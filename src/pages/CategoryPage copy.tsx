import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

type CategoryCard = {
  handle: string;
  asin: string;
  title?: string;
  price?: number | string;
  rating?: number | string;
  image?: string | null;
  category_path?: string[];
  // optional fields if your JSON has them later
  brand?: string;
  rating_count?: number | string;
  list_price?: number | string;
};

type CategoryIndex = Record<string, CategoryCard[]>;

function titleizeSlug(slug: string) {
  return slug.replace(/-/g, " ");
}

function toNumberMaybe(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function inferBrandFromTitle(title?: string) {
  if (!title) return null;
  const cleaned = title
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  // crude but safe inference: first token unless it's generic
  const first = cleaned.split(" ")[0]?.trim();
  if (!first) return null;

  const bad = new Set([
    "women",
    "womens",
    "woman",
    "women’s",
    "women's",
    "ladies",
    "lady",
    "new",
    "fashion",
    "sexy",
    "casual",
    "summer",
    "spring",
    "fall",
    "winter",
  ]);

  const normalized = first.toLowerCase();
  if (bad.has(normalized)) return null;

  // Avoid grabbing sizes like "S", "M", "L", "XL"
  if (/^(xs|s|m|l|xl|xxl|xxxl)$/i.test(first)) return null;

  // Avoid if token is basically numeric
  if (/^\d+$/.test(first)) return null;

  return first;
}

function formatMoney(v: unknown) {
  const n = toNumberMaybe(v);
  if (n === null) return "";
  return `$${n.toFixed(2)}`;
}

function Stars({ rating }: { rating: number }) {
  // Simple visual stars (Amazon vibe) without external libs
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${rating} out of 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<CategoryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL params
  const sort = searchParams.get("sort") || "featured";
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  const minRating = searchParams.get("min_rating");
  const brandsParam = searchParams.get("brand") || ""; // comma-separated
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const perPage = 48; // Amazon-ish density; adjust later if you want

  /* ---------------- FETCH CATEGORY INDEX ---------------- */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/products/_category_index.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: CategoryIndex) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load category index");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const itemsRaw = useMemo(() => {
    if (!data || !categorySlug) return [];
    return data[categorySlug] || [];
  }, [data, categorySlug]);

  const categoryTitle = useMemo(() => {
    return categorySlug ? titleizeSlug(categorySlug) : "Category";
  }, [categorySlug]);

  const breadcrumbPath = useMemo(() => {
    const first = itemsRaw[0];
    return first?.category_path || [];
  }, [itemsRaw]);

  /* ---------------- BRAND FACET (REAL OR INFERRED) ---------------- */

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of itemsRaw) {
      const b = (p.brand || inferBrandFromTitle(p.title) || "").trim();
      if (!b) continue;
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    // top 15
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [itemsRaw]);

  const selectedBrands = useMemo(() => {
    return new Set(
      brandsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }, [brandsParam]);

  /* ---------------- FILTER + SORT ---------------- */

  const filteredItems = useMemo(() => {
    let items = [...itemsRaw];

    // Brand filter
    if (selectedBrands.size > 0) {
      items = items.filter((i) => {
        const b = (i.brand || inferBrandFromTitle(i.title) || "").trim();
        if (!b) return false;
        return selectedBrands.has(b);
      });
    }

    // Price filter
    if (minPrice) {
      const v = parseFloat(minPrice);
      if (!isNaN(v)) {
        items = items.filter((i) => (toNumberMaybe(i.price) ?? 0) >= v);
      }
    }
    if (maxPrice) {
      const v = parseFloat(maxPrice);
      if (!isNaN(v)) {
        items = items.filter((i) => (toNumberMaybe(i.price) ?? 0) <= v);
      }
    }

    // Rating filter
    if (minRating) {
      const v = parseFloat(minRating);
      if (!isNaN(v)) {
        items = items.filter((i) => (toNumberMaybe(i.rating) ?? 0) >= v);
      }
    }

    // Sorting
    if (sort === "price_asc") {
      items.sort(
        (a, b) =>
          (toNumberMaybe(a.price) ?? Infinity) -
          (toNumberMaybe(b.price) ?? Infinity)
      );
    } else if (sort === "price_desc") {
      items.sort(
        (a, b) =>
          (toNumberMaybe(b.price) ?? -1) - (toNumberMaybe(a.price) ?? -1)
      );
    } else if (sort === "rating_desc") {
      items.sort(
        (a, b) =>
          (toNumberMaybe(b.rating) ?? -1) - (toNumberMaybe(a.rating) ?? -1)
      );
    }
    // featured = keep

    return items;
  }, [itemsRaw, sort, minPrice, maxPrice, minRating, selectedBrands]);

  /* ---------------- PAGINATION ---------------- */

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = clamp(page, 1, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const pageItems = filteredItems.slice(startIdx, startIdx + perPage);

  function setParam(key: string, value?: string) {
    const sp = new URLSearchParams(searchParams);
    if (value && value.trim().length > 0) sp.set(key, value);
    else sp.delete(key);
    sp.set("page", "1");
    setSearchParams(sp);
  }

  function setPage(nextPage: number) {
    const sp = new URLSearchParams(searchParams);
    sp.set("page", String(clamp(nextPage, 1, totalPages)));
    setSearchParams(sp);
  }

  function toggleBrand(brand: string) {
    const next = new Set(selectedBrands);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);

    const sp = new URLSearchParams(searchParams);
    const joined = [...next].join(",");
    if (joined) sp.set("brand", joined);
    else sp.delete("brand");

    sp.set("page", "1");
    setSearchParams(sp);
  }

  function clearFilters() {
    const sp = new URLSearchParams(searchParams);
    sp.delete("min_price");
    sp.delete("max_price");
    sp.delete("min_rating");
    sp.delete("brand");
    sp.set("page", "1");
    setSearchParams(sp);
  }

  const activeFiltersCount =
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minRating ? 1 : 0) +
    (selectedBrands.size > 0 ? 1 : 0);

  // Pagination window like Amazon (1 … 4 5 6 … last)
  const pageWindow = useMemo(() => {
    const win = 7;
    if (totalPages <= win) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const start = clamp(safePage - 2, 1, totalPages);
    const end = clamp(start + (win - 1), 1, totalPages);
    const adjustedStart = clamp(end - (win - 1), 1, totalPages);

    const arr = [];
    for (let p = adjustedStart; p <= end; p++) arr.push(p);
    return arr;
  }, [safePage, totalPages]);

  useEffect(() => {
    if (categorySlug) {
      document.title = `${categoryTitle} | Jetcube`;
    }
  }, [categorySlug, categoryTitle]);

  if (loading) {
    return (
      <div className="max-w-[1500px] mx-auto px-4 py-6 text-sm text-gray-600">
        Loading category…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1500px] mx-auto px-4 py-6 text-sm text-red-600">
        Failed to load category index: {error}
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-4">
      {/* Breadcrumb-ish */}
      <div className="text-xs text-gray-600 mb-2">
        <Link to="/" className="hover:underline">Home</Link>
        {breadcrumbPath.map((b, idx) => (
          <span key={`${b}-${idx}`}> {"›"} <span className="capitalize">{b}</span></span>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT FILTER RAIL (Amazon-style) */}
        <aside className="hidden md:block md:col-span-3 lg:col-span-2">
          <div className="sticky top-3">
            <div className="border border-gray-200 rounded bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Filters</div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Clear ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Department */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase text-gray-700 mb-2">
                  Department
                </div>
                <div className="text-sm text-gray-800 capitalize">
                  {categoryTitle}
                </div>
              </div>

              {/* Customer Reviews */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase text-gray-700 mb-2">
                  Customer Reviews
                </div>

                {[
                  { label: "4★ & up", value: "4" },
                  { label: "3★ & up", value: "3" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setParam("min_rating", opt.value)}
                    className={`w-full text-left text-sm py-1 ${minRating === opt.value ? "text-blue-700 font-semibold" : "text-gray-800"
                      } hover:underline`}
                  >
                    <span className="mr-2 text-orange-500">{"★".repeat(parseInt(opt.value, 10))}</span>
                    {opt.label}
                  </button>
                ))}

                {minRating && (
                  <button
                    onClick={() => setParam("min_rating", "")}
                    className="mt-1 text-xs text-blue-700 hover:underline"
                  >
                    Clear review filter
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase text-gray-700 mb-2">
                  Price
                </div>

                <div className="space-y-1">
                  {[
                    { label: "Under $25", min: "", max: "25" },
                    { label: "$25 to $50", min: "25", max: "50" },
                    { label: "$50 to $100", min: "50", max: "100" },
                    { label: "$100 & Up", min: "100", max: "" },
                  ].map((b) => (
                    <button
                      key={b.label}
                      className="w-full text-left text-sm text-gray-800 hover:underline"
                      onClick={() => {
                        setParam("min_price", b.min);
                        setParam("max_price", b.max);
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <input
                    defaultValue={minPrice || ""}
                    placeholder="Min"
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    onBlur={(e) => setParam("min_price", e.target.value || "")}
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input
                    defaultValue={maxPrice || ""}
                    placeholder="Max"
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    onBlur={(e) => setParam("max_price", e.target.value || "")}
                  />
                </div>
              </div>

              {/* Brand */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase text-gray-700 mb-2">
                  Brand
                </div>

                {brandCounts.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    Brands not available yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {brandCounts.map(([b, count]) => (
                      <label key={b} className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedBrands.has(b)}
                          onChange={() => toggleBrand(b)}
                        />
                        <span className="truncate">{b}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </label>
                    ))}
                    <div className="text-[11px] text-gray-500 mt-2">
                      Brand list may be inferred from titles.
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          {/* Top bar (Amazon-like) */}
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-semibold capitalize">{categoryTitle}</h1>
              <div className="text-sm text-gray-600">
                {total.toLocaleString()} results
                {activeFiltersCount > 0 ? (
                  <span className="ml-2 text-gray-500">
                    (filtered)
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Sort by</label>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                value={sort}
                onChange={(e) => setParam("sort", e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="rating_desc">Avg. customer review</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Mobile filters summary */}
          <div className="md:hidden mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Filters {activeFiltersCount ? `(${activeFiltersCount})` : ""}
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-700 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Grid - denser cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {pageItems.map((p) => {
              const price = toNumberMaybe(p.price);
              const rating = toNumberMaybe(p.rating);
              const deliveryText =
                price !== null && price >= 35
                  ? "FREE delivery 4–8 days"
                  : "Delivery 4–8 days";

              return (
                <div
                  key={p.handle}
                  className="border border-gray-200 hover:border-gray-400 rounded bg-white overflow-hidden"
                >
                  <Link to={`/p/${p.handle}`} className="block">
                    <div className="aspect-square bg-white flex items-center justify-center">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.title || p.handle}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-xs text-gray-500">No image</div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3">
                    <Link to={`/p/${p.handle}`} className="block">
                      <div className="text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] hover:text-blue-700">
                        {p.title || p.handle}
                      </div>
                    </Link>

                    {/* Rating row */}
                    <div className="mt-1 text-xs text-gray-700 flex items-center gap-2">
                      {rating !== null && rating > 0 ? (
                        <>
                          <span className="text-orange-500 leading-none">
                            <Stars rating={clamp(rating, 0, 5)} />
                          </span>
                          <span className="text-gray-700">{rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">No rating</span>
                      )}
                    </div>


                    {/* Price */}
                    <div className="mt-2 text-base font-semibold text-gray-900">
                      {price !== null ? formatMoney(price) : ""}
                    </div>

                    {/* Delivery line */}
                    <div className="mt-1 text-xs text-gray-600">
                      {deliveryText}
                    </div>

                    {/* CTA */}
                    <div className="mt-3">
                      <Link
                        to={`/p/${p.handle}`}
                        className="inline-flex w-full justify-center items-center text-sm px-3 py-2 rounded border border-gray-300 hover:border-gray-500 bg-[#ffd814] text-black"
                      >
                        Add to Cart
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination (Amazon-ish) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
              <button
                className="px-3 py-2 text-sm border rounded disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                ‹ Previous
              </button>

              {/* First + ellipsis */}
              {pageWindow[0] > 1 && (
                <>
                  <button
                    className={`px-3 py-2 text-sm border rounded ${safePage === 1 ? "bg-black text-white" : "hover:bg-gray-100"
                      }`}
                    onClick={() => setPage(1)}
                  >
                    1
                  </button>
                  {pageWindow[0] > 2 && <span className="px-2 text-sm text-gray-500">…</span>}
                </>
              )}

              {/* Window */}
              {pageWindow.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 text-sm border rounded ${p === safePage ? "bg-black text-white" : "hover:bg-gray-100"
                    }`}
                >
                  {p}
                </button>
              ))}

              {/* Last + ellipsis */}
              {pageWindow[pageWindow.length - 1] < totalPages && (
                <>
                  {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
                    <span className="px-2 text-sm text-gray-500">…</span>
                  )}
                  <button
                    className={`px-3 py-2 text-sm border rounded ${safePage === totalPages ? "bg-black text-white" : "hover:bg-gray-100"
                      }`}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                className="px-3 py-2 text-sm border rounded disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next ›
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


