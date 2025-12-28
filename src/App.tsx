import React from "react";
import {
  RouterProvider,
  createBrowserRouter,
  useParams,
  Navigate,
} from "react-router-dom";

/* ---------------- Screens / Pages ---------------- */

import { Cart } from "./screens/Cart";
import { CartSidebar } from "./screens/CartSidebar";
import { Checkout } from "./screens/Checkout";
import { ProductComparison } from "./screens/ProductComparison";
import { Shop } from "./screens/Shop";
import { SingleProduct } from "./screens/SingleProduct";
import SearchResultsPage from "./pages/SearchResultsPage";
import CategoryPage from "./pages/CategoryPage";

/* ---------------- Layout ---------------- */

import MainLayout from "./layouts/MainLayout";

/* ---------------- PDP Context ---------------- */

import * as PdpContext from "./pdp/ProductPdpContext";

/* =================================================
   PDP ROUTE WRAPPER (UNCHANGED BEHAVIOR)
   ================================================= */

function ProductRoute({ children }: { children: React.ReactNode }) {
  const { id } = useParams();

  const ProductPdpProvider =
    (PdpContext as any).ProductPdpProvider ??
    (PdpContext as any).default ??
    null;

  const [product, setProduct] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setError(null);
        setProduct(null);

        if (!id) {
          throw new Error("Missing :id param in route.");
        }

        const res = await fetch(`/products/${id}.json`, {
          cache: "no-store",
        });

        const ct = res.headers.get("content-type") || "";

        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status} when fetching /products/${id}.json`
          );
        }

        // Guard against Vite HTML fallback
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Expected JSON but got "${ct}". File missing? First chars: ${text.slice(
              0,
              80
            )}`
          );
        }

        const data = await res.json();
        if (!cancelled) setProduct(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load product");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!ProductPdpProvider) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <div className="text-lg font-semibold text-red-600">
          PDP Provider missing
        </div>
        <p className="mt-2 text-sm text-gray-700">
          Could not find <code>ProductPdpProvider</code> export in{" "}
          <code>src/pdp/ProductPdpContext.tsx</code>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <div className="text-lg font-semibold text-red-600">
          Product failed to load
        </div>
        <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-800">
          {error}
        </pre>
        <div className="mt-3 text-sm text-gray-600">
          Expected file on disk:{" "}
          <code>public/products/{id}.json</code>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[900px] mx-auto p-6 text-sm text-gray-600">
        Loading product…
      </div>
    );
  }

  return (
    <ProductPdpProvider product={product}>
      {children}
    </ProductPdpProvider>
  );
}

/* =================================================
   ROUTER (LAYOUT LOCKED IN)
   ================================================= */

const router = createBrowserRouter([
  /* ---------- PAGES THAT SHARE HEADER + FOOTER ---------- */
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <Shop /> },
      { path: "/shop", element: <Shop /> },

      // Search
      { path: "/search", element: <SearchResultsPage /> },

      // Categories (guaranteed layout)
      {
        path: "/c/:categorySlug",
        element: <CategoryPage />,
      },
    ],
  },

  /* ---------- PDPs (SELF-CONTAINED) ---------- */
  {
    path: "/p/:id",
    element: (
      <ProductRoute>
        <SingleProduct />
      </ProductRoute>
    ),
  },
  {
    path: "/products/:id",
    element: (
      <ProductRoute>
        <SingleProduct />
      </ProductRoute>
    ),
  },

  /* ---------- CART / CHECKOUT ---------- */
  { path: "/checkout", element: <Checkout /> },
  { path: "/cart", element: <Cart /> },
  { path: "/cart-sidebar", element: <CartSidebar /> },

  /* ---------- COMPARISON ---------- */
  { path: "/product-comparison", element: <ProductComparison /> },

  /* ---------- LEGACY SAFETY ---------- */
  { path: "/single-product", element: <Navigate to="/shop" replace /> },

  /* ---------- WILDCARD (LAST) ---------- */
  { path: "*", element: <Shop /> },
]);

/* =================================================
   APP ROOT
   ================================================= */

export const App = () => {
  return <RouterProvider router={router} />;
};

export default App;


