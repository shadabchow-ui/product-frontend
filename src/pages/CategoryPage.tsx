import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

type CategoryIndexEntry =
  | string[]
  | Record<string, any>
  | {
    title?: string;
    items?: any[];
    products?: any[];
  };

type CategoryIndex = Record<string, CategoryIndexEntry>;

type ProductSummary = {
  handle?: string;
  slug?: string;
  asin?: string;
  id?: string;

  title?: string;
  price?: number | string;
  rating?: number | string;

  image?: unknown;
  imageUrl?: unknown;
  images?: unknown;

  // (optional) if your index ever includes these, we’ll use them too:
  gallery_images?: unknown;
  galleryImages?: unknown;
};

function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toNumberMaybe(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractKeysFromEntry(entry: any): string[] {
  if (!entry) return [];

  // Normalized index: slug -> string[]
  if (Array.isArray(entry)) {
    if (entry.length === 0) return [];
    if (typeof entry[0] === "string") return entry.filter((x) => typeof x === "string");

    // Older / alternate: array of product-ish objects
    return entry
      .map((x) => (x && (x.handle || x.slug || x.asin || x.id)) as unknown)
      .filter((x): x is string => typeof x === "string" && x.length > 0);
  }

  // Some builds wrap into { items: [...] } or { products: [...] }
  if (entry && Array.isArray(entry.items)) return extractKeysFromEntry(entry.items);
  if (entry && Array.isArray(entry.products)) return extractKeysFromEntry(entry.products);

  return [];
}

function getProductKey(p: ProductSummary): string | null {
  const key =
    (typeof p.handle === "string" && p.handle) ||
    (typeof p.slug === "string" && p.slug) ||
    (typeof p.asin === "string" && p.asin) ||
    (typeof p.id === "string" && p.id) ||
    null;
  return key && key.length ? key : null;
}

function readUrlFromMaybeObj(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const anyV = v as any;
    if (typeof anyV.url === "string") return anyV.url;
    if (typeof anyV.src === "string") return anyV.src;
    if (typeof anyV.href === "string") return anyV.href;
  }
  return null;
}

function getFirstFromImages(images: unknown): string | null {
  if (!images) return null;

  // sometimes images is a single string
  if (typeof images === "string") return images;

  // common: string[]
  if (Array.isArray(images) && typeof images[0] === "string") return images[0] as string;

  // common: [{url: "..."}]
  if (Array.isArray(images) && images[0] && typeof (images[0] as any).url === "string")
    return (images[0] as any).url as string;

  // sometimes nested like {0: ...} (rare)
  if (typeof images === "object") {
    const anyImgs = images as any;
    if (Array.isArray(anyImgs.images)) return getFirstFromImages(anyImgs.images);
  }

  return null;
}

function getImageSrc(p: ProductSummary): string | null {
  // image can be string or object {url}
  const img1 = readUrlFromMaybeObj(p.image);
  if (img1) return img1;

  // imageUrl can be string or object
  const img2 = readUrlFromMaybeObj(p.imageUrl);
  if (img2) return img2;

  // images can be string | string[] | {url}[]
  const img3 = getFirstFromImages(p.images);
  if (img3) return img3;

  // if index ever includes gallery_images / galleryImages
  const img4 = getFirstFromImages((p as any).gallery_images);
  if (img4) return img4;

  const img5 = getFirstFromImages((p as any).galleryImages);
  if (img5) return img5;

  return null;
}

/**
 * Extract a usable image from a full product JSON (not just the summary index).
 * This fixes "No image" on category pages when /products/_index.json does not contain images.
 */
function extractImageFromFullProductJson(full: any): string | null {
  if (!full) return null;

  const candidates: unknown[] = [
    full.image,
    full.imageUrl,
    full.images,
    full.gallery_images,
    full.galleryImages,
    full.description_images,
    full.descriptionImages,
  ];

  for (const c of candidates) {
    const u1 = readUrlFromMaybeObj(c);
    if (u1) return u1;

    const u2 = getFirstFromImages(c);
    if (u2) return u2;
  }

  // try common Amazon-ish variants inside image objects
  if (Array.isArray(full.images) && full.images[0] && typeof full.images[0] === "object") {
    const img0 = full.images[0] as any;
    const maybe =
      img0.url ||
      img0.src ||
      img0.hiRes ||
      img0.hires ||
      img0.large ||
      img0.largeUrl ||
      img0.main ||
      null;

    if (typeof maybe === "string" && maybe) return maybe;
  }

  return null;
}

/**
 * Fetch JSON safely.
 * - Detects HTML responses (common when path is wrong and server returns index.html)
 * - Falls back between /products and /static/products automatically via `fetchFirstJson`.
 */
async function fetchJsonSafe(url: string): Promise<any> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);

  const ct = r.headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    const t = await r.text();
    const first = t.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(`Expected JSON but got HTML for ${url}. First chars: ${first}`);
  }

  // Some servers don’t set content-type properly; still try JSON parse
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(`Failed to parse JSON for ${url}. First chars: ${first}`);
  }
}

async function fetchFirstJson(urls: string[]): Promise<any> {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fetchJsonSafe(u);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to fetch JSON");
}

function normalizeSlug(s: string) {
  return decodeURIComponent(String(s || "")).trim().toLowerCase();
}

/**
 * If the menu slug doesn’t exist in catIndex (because you regenerated categories),
 * try to find the best matching category key so pages don’t go blank.
 */
function findBestCategoryKey(catIndex: CategoryIndex, rawSlug: string): string | null {
  if (!catIndex) return null;

  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;

  // 1) exact
  if ((catIndex as any)[slug]) return slug;

  // 2) common prefix trims (keeps old menu links working)
  const candidates = [
    slug,
    slug.replace(/^women-clothing-/, "women-"),
    slug.replace(/^clothing-/, ""),
    slug.replace(/^women-/, "women-"), // no-op (keeps list stable)
  ].filter(Boolean);

  for (const c of candidates) {
    if ((catIndex as any)[c]) return c;
  }

  // 3) fuzzy: match by tokens overlap
  const keys = Object.keys(catIndex || {});
  if (keys.length === 0) return null;

  const tokens = slug.split("-").filter(Boolean);
  if (tokens.length === 0) return null;

  let bestKey: string | null = null;
  let bestScore = 0;

  // token threshold: require at least 2 matches or 60% of tokens (whichever is smaller)
  const required = Math.max(2, Math.ceil(tokens.length * 0.6));

  for (const k of keys) {
    const kk = normalizeSlug(k);
    let score = 0;
    for (const t of tokens) {
      if (kk.includes(t)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = k;
    }
  }

  if (bestKey && bestScore >= required) return bestKey;
  return null;
}

export default function CategoryPage() {
  const { categorySlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [catIndex, setCatIndex] = useState<CategoryIndex | null>(null);
  const [productIndex, setProductIndex] = useState<ProductSummary[] | null>(null);

  const [loadingCat, setLoadingCat] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters / sorting (keep existing behavior)
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState(searchParams.get("sort") || "featured");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [page, setPage] = useState<number>(Number(searchParams.get("page") || 1));

  // Image hydration cache (static-only: fetch /products/<key>.json when the summary index lacks images)
  const imageCacheRef = useRef<Map<string, string | null>>(new Map());
  const [imageTick, setImageTick] = useState(0);

  // Keep URL query in sync (existing behavior)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page]);

  // Load category index (normalized) with fallback and path fallback (/products -> /static/products)
  useEffect(() => {
    let cancelled = false;
    setLoadingCat(true);
    setError(null);

    (async () => {
      try {
        const json = (await fetchFirstJson([
          "/products/_category_index_normalized.json",
          "/static/products/_category_index_normalized.json",
          "/products/_category_index.json",
          "/static/products/_category_index.json",
        ])) as CategoryIndex;

        if (!cancelled) {
          setCatIndex(json);
          setLoadingCat(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load category index");
          setCatIndex({});
          setLoadingCat(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load product summary index (used to resolve handles -> title/image/price)
  useEffect(() => {
    let cancelled = false;
    setLoadingIndex(true);

    (async () => {
      try {
        const json = await fetchFirstJson(["/products/_index.json", "/static/products/_index.json"]);

        if (!cancelled) {
          setProductIndex(Array.isArray(json) ? (json as ProductSummary[]) : []);
          setLoadingIndex(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError((prev) => prev || e?.message || "Failed to load product index");
          setProductIndex([]);
          setLoadingIndex(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // If category slug doesn’t match the generated index key, auto-resolve.
  const matchedCategorySlug = useMemo(() => {
    if (!catIndex) return null;
    const found = findBestCategoryKey(catIndex, categorySlug);
    return found;
  }, [catIndex, categorySlug]);

  const categoryTitle = useMemo(() => {
    const slugForTitle = matchedCategorySlug || categorySlug;
    if (!slugForTitle) return "Category";
    return titleizeSlug(slugForTitle);
  }, [categorySlug, matchedCategorySlug]);

  // Lookup table for fast resolution from key -> product summary
  const productLookup = useMemo(() => {
    const m = new Map<string, ProductSummary>();
    const list = productIndex || [];
    for (const p of list) {
      const keys = [p.handle, p.slug, p.asin, p.id].filter(
        (k): k is string => typeof k === "string" && k.length > 0
      );
      for (const k of keys) {
        if (!m.has(k)) m.set(k, p);
      }
    }
    return m;
  }, [productIndex]);

  // Keys from category index (usually string[] in normalized index)
  const categoryKeys = useMemo(() => {
    if (!catIndex) return [];
    const slugKey = matchedCategorySlug || categorySlug;
    if (!slugKey) return [];

    const entry: any = (catIndex as any)[slugKey];
    const keys = extractKeysFromEntry(entry);

    // Dedupe while preserving order (prevents duplicate React keys / weird UI)
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of keys) {
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }, [catIndex, categorySlug, matchedCategorySlug]);

  // Resolve keys -> product summary (so UI can show images/titles)
  const itemsRaw = useMemo(() => {
    if (categoryKeys.length === 0) return [];
    return categoryKeys.map((k) => {
      const hit = productLookup.get(k);
      return (
        hit || {
          handle: k,
          title: k,
        }
      );
    });
  }, [categoryKeys, productLookup]);

  // The list displayed after filters & sort
  const products = useMemo(() => {
    let list = itemsRaw;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) => (p.title || "").toLowerCase().includes(q));
    }

    if (minRating !== null) {
      list = list.filter((p) => {
        const r = toNumberMaybe((p as any).rating);
        return r !== null && r >= minRating;
      });
    }

    if (minPrice !== null) {
      list = list.filter((p) => {
        const pr = toNumberMaybe((p as any).price);
        return pr !== null && pr >= minPrice;
      });
    }

    if (maxPrice !== null) {
      list = list.filter((p) => {
        const pr = toNumberMaybe((p as any).price);
        return pr !== null && pr <= maxPrice;
      });
    }

    // Sorting (keep existing behavior)
    const sorted = [...list];
    if (sort === "price_low") {
      sorted.sort(
        (a, b) => (toNumberMaybe((a as any).price) ?? 0) - (toNumberMaybe((b as any).price) ?? 0)
      );
    } else if (sort === "price_high") {
      sorted.sort(
        (a, b) => (toNumberMaybe((b as any).price) ?? 0) - (toNumberMaybe((a as any).price) ?? 0)
      );
    } else if (sort === "rating") {
      sorted.sort(
        (a, b) => (toNumberMaybe((b as any).rating) ?? 0) - (toNumberMaybe((a as any).rating) ?? 0)
      );
    }
    return sorted;
  }, [itemsRaw, searchTerm, minRating, minPrice, maxPrice, sort]);

  // Pagination (48 per page)
  const pageSize = 48;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, safePage]);

  // Hydrate images for visible items if summary index doesn’t contain images
  async function hydrateImageForKey(productKey: string): Promise<void> {
    const cache = imageCacheRef.current;
    if (cache.has(productKey)) return;

    try {
      const full = await fetchFirstJson([
        `/products/${productKey}.json`,
        `/static/products/${productKey}.json`,
      ]);
      const img = extractImageFromFullProductJson(full);
      cache.set(productKey, img);
      setImageTick((t) => t + 1);
    } catch {
      cache.set(productKey, null);
      setImageTick((t) => t + 1);
    }
  }

  const isLoading = loadingCat || loadingIndex;

  useEffect(() => {
    if (isLoading) return;

    // Only hydrate items that:
    // 1) have a valid key
    // 2) do not already have an image in the summary
    // 3) are not already cached
    const needs: string[] = [];
    for (const p of pageItems) {
      const k = getProductKey(p as any);
      if (!k) continue;
      if (imageCacheRef.current.has(k)) continue;
      const summary = productLookup.get(k) || (p as any);
      const summaryImg = getImageSrc(summary as any);
      if (!summaryImg) needs.push(k);
    }

    if (needs.length === 0) return;

    let cancelled = false;

    (async () => {
      const pool = 8;
      let i = 0;

      async function worker() {
        while (!cancelled && i < needs.length) {
          const k = needs[i++];
          // eslint-disable-next-line no-await-in-loop
          await hydrateImageForKey(k);
        }
      }

      await Promise.all(Array.from({ length: pool }, () => worker()));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pageItems, productLookup, imageTick]);

  // Simple pagination window
  const pageWindow = 5;
  const pageWindowStart = Math.max(1, safePage - Math.floor(pageWindow / 2));
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + pageWindow - 1);
  const pageWindowAdjustedStart = Math.max(1, pageWindowEnd - pageWindow + 1);
  const pageWindowArr: number[] = [];
  for (let i = pageWindowAdjustedStart; i <= pageWindowEnd; i++) pageWindowArr.push(i);

  return (
    <div className="max-w-[1400px] mx-auto px-4">
      <main className="py-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[22px] font-semibold">{categoryTitle}</div>
            <div className="text-sm text-gray-600">
              {isLoading ? "Loading…" : `${products.length.toLocaleString()} results`}
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="text-sm border rounded px-2 py-1 bg-white"
            >
              <option value="featured">Featured</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left filters */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm font-semibold mb-2">Filters</div>

              {/* Search */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1">SEARCH</div>
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>

              {/* Department */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1">DEPARTMENT</div>
                <div className="text-sm text-gray-700">{categoryTitle}</div>
              </div>

              {/* Customer reviews */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1">CUSTOMER REVIEWS</div>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline"
                  onClick={() => {
                    setMinRating(4);
                    setPage(1);
                  }}
                >
                  ⭐⭐⭐⭐&nbsp; 4★ &amp; up
                </button>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline mt-1"
                  onClick={() => {
                    setMinRating(3);
                    setPage(1);
                  }}
                >
                  ⭐⭐⭐&nbsp; 3★ &amp; up
                </button>
                {minRating !== null && (
                  <button
                    className="block text-left text-xs text-gray-600 hover:underline mt-2"
                    onClick={() => {
                      setMinRating(null);
                      setPage(1);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1">PRICE</div>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline"
                  onClick={() => {
                    setMinPrice(null);
                    setMaxPrice(25);
                    setPage(1);
                  }}
                >
                  Under $25
                </button>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline mt-1"
                  onClick={() => {
                    setMinPrice(25);
                    setMaxPrice(50);
                    setPage(1);
                  }}
                >
                  $25 to $50
                </button>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline mt-1"
                  onClick={() => {
                    setMinPrice(50);
                    setMaxPrice(100);
                    setPage(1);
                  }}
                >
                  $50 to $100
                </button>
                <button
                  className="block text-left text-sm text-[#007185] hover:underline mt-1"
                  onClick={() => {
                    setMinPrice(100);
                    setMaxPrice(null);
                    setPage(1);
                  }}
                >
                  $100 &amp; Up
                </button>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={minPrice ?? ""}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Min"
                    className="w-1/2 border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input
                    value={maxPrice ?? ""}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Max"
                    className="w-1/2 border rounded px-2 py-1 text-sm"
                  />
                </div>

                {(minPrice !== null || maxPrice !== null) && (
                  <button
                    className="block text-left text-xs text-gray-600 hover:underline mt-2"
                    onClick={() => {
                      setMinPrice(null);
                      setMaxPrice(null);
                      setPage(1);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Brand placeholder */}
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">BRAND</div>
                <div className="text-sm text-gray-500">Brands not available yet.</div>
              </div>
            </div>
          </aside>

          {/* Products grid */}
          <section className="col-span-12 md:col-span-9 lg:col-span-10">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-3 text-sm">
                {error}
              </div>
            )}

            {!isLoading && !error && categoryKeys.length === 0 && (
              <div className="border border-yellow-200 bg-yellow-50 text-yellow-900 rounded p-3 mb-3 text-sm">
                No products found for this category. (If you recently regenerated categories, the
                menu link slug may not match the new category key.)
              </div>
            )}

            {isLoading ? (
              <div className="text-sm text-gray-600">Loading products…</div>
            ) : (
              <>
                {/* Grid - denser cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {pageItems.map((p) => {
                    const productKey = getProductKey(p);
                    if (!productKey) return null;

                    const price = toNumberMaybe((p as any).price);
                    const rating = toNumberMaybe((p as any).rating);

                    const deliveryText =
                      price !== null && price >= 35 ? "FREE delivery 4-8 days" : "Delivery 4-8 days";

                    // First try summary index image, then cached hydrated image
                    const summaryImg = getImageSrc(p);
                    const cachedImg = imageCacheRef.current.get(productKey);
                    const imageSrc = summaryImg || cachedImg || null;

                    return (
                      <div
                        key={productKey}
                        className="border rounded bg-white p-2 hover:shadow-sm transition"
                      >
                        {/* Image */}
                        <Link to={`/p/${productKey}`} className="block">
                          <div className="w-full aspect-[3/4] bg-white flex items-center justify-center mb-2">
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={p.title || "Product image"}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="text-xs text-gray-400">No image</div>
                            )}
                          </div>
                        </Link>

                        {/* Title */}
                        <Link
                          to={`/p/${productKey}`}
                          className="block text-[13px] leading-tight text-[#007185] hover:underline mb-1"
                        >
                          {p.title || "Untitled product"}
                        </Link>

                        {/* Rating */}
                        {rating !== null && (
                          <div className="text-[12px] text-gray-600 mb-1">⭐ {rating.toFixed(1)}</div>
                        )}

                        {/* Price */}
                        {price !== null && (
                          <div className="text-[15px] font-semibold mb-1">${price.toFixed(2)}</div>
                        )}

                        {/* Delivery */}
                        <div className="text-[12px] text-gray-600 mb-2">{deliveryText}</div>

                        {/* Add to cart */}
                        <button className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-[13px] py-1 rounded">
                          Add to Cart
                        </button>
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
                      Previous
                    </button>

                    {/* First + ellipsis */}
                    {pageWindowArr[0] > 1 && (
                      <>
                        <button
                          className={`px-3 py-2 text-sm border rounded ${safePage === 1 ? "bg-gray-100" : "bg-white"
                            }`}
                          onClick={() => setPage(1)}
                        >
                          1
                        </button>
                        {pageWindowArr[0] > 2 && <span className="text-gray-500">…</span>}
                      </>
                    )}

                    {pageWindowArr.map((pnum) => (
                      <button
                        key={pnum}
                        className={`px-3 py-2 text-sm border rounded ${pnum === safePage ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                          }`}
                        onClick={() => setPage(pnum)}
                      >
                        {pnum}
                      </button>
                    ))}

                    {/* Ellipsis + last */}
                    {pageWindowArr[pageWindowArr.length - 1] < totalPages && (
                      <>
                        {pageWindowArr[pageWindowArr.length - 1] < totalPages - 1 && (
                          <span className="text-gray-500">…</span>
                        )}
                        <button
                          className={`px-3 py-2 text-sm border rounded ${safePage === totalPages ? "bg-gray-100" : "bg-white"
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
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
