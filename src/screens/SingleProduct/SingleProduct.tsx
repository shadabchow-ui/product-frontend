import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ProductPdpProvider } from "../../pdp/ProductPdpContext";
import {
  RelatedProductsSection,
  CustomersAlsoViewedSection,
} from "./sections/RelatedProductsSection";

// Rufus assistant (LEFT drawer + launcher)
import {
  AssistantProvider,
  AssistantDrawer,
  AssistantLauncher,
} from "../../components/RufusAssistant";

// Import whole modules so we can support BOTH default + named exports safely
import * as NavModule from "../Shop/sections/NavigationSection";
import * as FooterModule from "./sections/FooterSection";
import * as HeroModule from "./sections/ProductHeroSection";
import * as DetailsModule from "./sections/ProductDetailsSection";
import * as BreadcrumbModule from "./sections/ProductBreadcrumb";

type AnyComponent = React.ComponentType<any>;

function pickComponent(mod: any, preferredName: string): AnyComponent | null {
  const named = mod?.[preferredName];
  const def = mod?.default;
  return (named || def || null) as AnyComponent | null;
}

function normalizeId(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  return s.endsWith(".json") ? s.slice(0, -5) : s;
}

// Support /p/<id>, /products/<id>.json, and accidental /products<id>
function getIdFromPathname(pathname: string): string {
  const p = pathname || "";

  let m = p.match(/^\/p\/([^/?#]+)/);
  if (m?.[1]) return decodeURIComponent(normalizeId(m[1]));

  m = p.match(/^\/products\/([^/?#]+)/);
  if (m?.[1]) return decodeURIComponent(normalizeId(m[1]));

  m = p.match(/^\/products([^/?#]+)/);
  if (m?.[1]) return decodeURIComponent(normalizeId(m[1]).replace(/^\/+/, ""));

  return "";
}

function isLikelyAsin(id: string) {
  return /^[A-Za-z0-9]{10}$/.test(id || "");
}

function isBlockedId(id: string) {
  const s = (id || "").trim().toLowerCase();
  return s === "unknownasin" || s === "product" || s === "_index" || s === "_asin_map";
}

function buildProductsBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(`${base}static/products/`, window.location.origin).toString();
}

function buildProductJsonUrl(productId: string): string {
  return new URL(`${productId}.json`, buildProductsBaseUrl()).toString();
}

function buildAsinMapUrl(): string {
  return new URL(`_asin_map.json`, buildProductsBaseUrl()).toString();
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false as const, status: res.status, data: null as any, text: "" };

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const preview = (await res.text()).slice(0, 180);
    return { ok: false as const, status: 200, data: null as any, text: preview };
  }

  const data = await res.json();
  return { ok: true as const, status: 200, data, text: "" };
}

export const SingleProduct = (): JSX.Element => {
  const params = useParams();
  const paramId = typeof (params as any)?.id === "string" ? (params as any).id : "";

  const pathId = useMemo(() => getIdFromPathname(window.location.pathname), []);
  const productId = useMemo(() => normalizeId(paramId || pathId), [paramId, pathId]);

  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const NavigationSection = useMemo(
    () => pickComponent(NavModule, "NavigationSection"),
    []
  );
  const FooterSection = useMemo(
    () => pickComponent(FooterModule, "FooterSection"),
    []
  );
  const ProductHeroSection = useMemo(
    () => pickComponent(HeroModule, "ProductHeroSection"),
    []
  );
  const ProductDetailsSection = useMemo(
    () => pickComponent(DetailsModule, "ProductDetailsSection"),
    []
  );
  const ProductBreadcrumb = useMemo(
    () => pickComponent(BreadcrumbModule, "ProductBreadcrumb"),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setProduct(null);

      if (!productId) {
        setError("Missing product id in URL.");
        return;
      }

      if (isBlockedId(productId)) {
        setError("Invalid product id.");
        return;
      }

      const candidates: string[] = [productId];
      if (isLikelyAsin(productId)) {
        const up = productId.toUpperCase();
        if (up !== productId) candidates.push(up);
      }

      try {
        for (const id of candidates) {
          const r = await fetchJson(buildProductJsonUrl(id));
          if (r.ok) {
            if (!cancelled) setProduct(r.data);
            return;
          }
          if (r.status !== 404 && r.text) {
            if (!cancelled) setError(`Expected JSON but got non-JSON: ${r.text}`);
            return;
          }
        }

        const mapRes = await fetchJson(buildAsinMapUrl());
        if (mapRes.ok && mapRes.data && typeof mapRes.data === "object") {
          const map = mapRes.data as Record<string, string>;
          const mapped = map[productId] || map[productId.toUpperCase()];
          if (mapped && !isBlockedId(mapped)) {
            const r2 = await fetchJson(buildProductJsonUrl(mapped));
            if (r2.ok && !cancelled) {
              setProduct(r2.data);
              return;
            }
          }
        }

        if (!cancelled) setError("Failed to load product (404).");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unknown error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <AssistantProvider mode="mock">
      <div className="bg-white text-black">
        {NavigationSection ? <NavigationSection /> : null}

        {!product && !error && (
          <div className="w-full px-6 py-10">Loading product…</div>
        )}

        {!!error && (
          <div className="w-full px-6 py-10 text-red-600">{error}</div>
        )}

        {product && (
          <ProductPdpProvider product={product}>
            {ProductBreadcrumb ? <ProductBreadcrumb /> : null}
            {ProductHeroSection ? <ProductHeroSection /> : null}
            {ProductDetailsSection ? <ProductDetailsSection /> : null}

            {/* Amazon-style related sections */}
            <RelatedProductsSection />
            <CustomersAlsoViewedSection />

            {FooterSection ? <FooterSection /> : null}
          </ProductPdpProvider>
        )}

        {/* Rufus UI surfaces */}
        <AssistantDrawer />
        <AssistantLauncher label="Ask" />
      </div>
    </AssistantProvider>
  );
};

export default SingleProduct;

