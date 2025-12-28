import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProductPdp } from "../../../../pdp/ProductPdpContext";

/* ============================================================================
   Types
============================================================================ */

type IndexProduct = {
  asin?: string;
  handle?: string;
  slug?: string;
  id?: string;

  title?: string;
  price?: number | string | null;

  category_slug?: string;

  images?: string[];
  image?: string;

  reviews?: { count?: number | null } | null;
};

/* ============================================================================
   Helpers
============================================================================ */

function getProductKey(p: IndexProduct): string | null {
  return p.slug || p.handle || p.asin || p.id || null;
}

function safeFirstImage(p: IndexProduct, fallback: string) {
  const imgs = Array.isArray(p.images) ? p.images : [];
  const candidate = imgs[0] || p.image || "";
  if (
    typeof candidate === "string" &&
    candidate.length > 0 &&
    !candidate.startsWith("blob:") &&
    !candidate.startsWith("data:")
  ) {
    return candidate;
  }
  return fallback;
}

/* ============================================================================
   Skeleton Card (Amazon-style)
============================================================================ */

function SkeletonCard() {
  return (
    <div className="w-[180px] rounded-lg border border-[#e7e7e7] animate-pulse">
      <div className="w-full h-[180px] bg-[#f3f3f3] rounded-t-lg" />
      <div className="p-3 space-y-2">
        <div className="h-[14px] bg-[#e7e7e7] rounded" />
        <div className="h-[14px] bg-[#e7e7e7] rounded w-3/4" />
        <div className="h-[18px] bg-[#e7e7e7] rounded w-1/2 mt-2" />
      </div>
    </div>
  );
}

/* ============================================================================
   Grid Row (shared by both sections)
============================================================================ */

function ProductGrid({
  title,
  items,
  loading,
}: {
  title: string;
  items: IndexProduct[];
  loading: boolean;
}) {
  const fallbackImg = "/img/group-102-1.png";

  if (!loading && !items.length) return null;

  return (
    <section className="w-full bg-white px-[24px] py-[18px]">
      <h2 className="text-[20px] font-semibold text-[#0f1111] mb-3">
        {title}
      </h2>

      <div className="grid grid-cols-4 gap-[16px]">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((p, idx) => {
            const key = getProductKey(p);
            if (!key) return null;

            const img = safeFirstImage(p, fallbackImg);
            const price =
              p.price === null || p.price === undefined || p.price === ""
                ? ""
                : typeof p.price === "number"
                  ? `$${p.price}`
                  : String(p.price);

            const label = p.title || p.handle || p.asin || "Product";

            return (
              <Link
                key={`${key}-${idx}`}
                to={`/p/${key}`}
                className="w-[180px] rounded-lg border border-[#e7e7e7] hover:shadow-sm"
              >
                <div className="w-full h-[180px] bg-[#f8f8f8] rounded-t-lg overflow-hidden">
                  <img
                    src={img}
                    alt={label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="p-3">
                  <div className="text-[13px] leading-snug text-[#0f1111] line-clamp-2">
                    {label}
                  </div>

                  <div className="mt-2 text-[16px] font-semibold text-[#0f1111]">
                    {price || "\u00A0"}
                  </div>

                  <div className="mt-1 text-[12px] text-[#565959]">
                    {(p.reviews?.count ?? 0)} reviews
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </section>
  );
}

/* ============================================================================
   Static index loader
============================================================================ */

function useIndexProducts() {
  const [items, setItems] = useState<IndexProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/static/products/_index.json", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(json) ? json : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loaded };
}

/* ============================================================================
   Related Products (8 items)
============================================================================ */

export const RelatedProductsSection = (): JSX.Element => {
  const product = useProductPdp();
  const { items: indexItems, loaded } = useIndexProducts();

  const related = useMemo(() => {
    if (!loaded || !product) return [];

    const currentKey =
      (product as any)?.slug ||
      (product as any)?.handle ||
      (product as any)?.asin ||
      "";

    const currentCat = (product as any)?.category_slug || "";

    return indexItems
      .filter(
        (p) =>
          getProductKey(p) &&
          getProductKey(p) !== currentKey &&
          p.category_slug === currentCat
      )
      .slice(0, 8);
  }, [loaded, indexItems, product]);

  return (
    <ProductGrid
      title="Related products"
      items={related}
      loading={!loaded}
    />
  );
};

/* ============================================================================
   Customers Also Viewed (8 items, same grid)
============================================================================ */

export const CustomersAlsoViewedSection = (): JSX.Element => {
  const product = useProductPdp();
  const { items: indexItems, loaded } = useIndexProducts();

  const alsoViewed = useMemo(() => {
    if (!loaded || !product || !Array.isArray(indexItems)) return [];

    const currentKey =
      (product as any)?.slug ||
      (product as any)?.handle ||
      (product as any)?.asin ||
      (product as any)?.id ||
      "";

    return indexItems
      .filter((p) => {
        const key = getProductKey(p);
        return key && key !== currentKey;
      })
      .slice(0, 8);
  }, [loaded, indexItems, product]);

  return (
    <ProductGrid
      title="Customers also viewed"
      items={alsoViewed}
      loading={!loaded}
    />
  );
};



