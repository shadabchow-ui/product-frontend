import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Item = {
  slug: string;
  title: string;
  brand?: string;
  category?: string;
  image?: string | null;
  searchable: string;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function SearchBox({
  dept,
  onDeptChange,
}: {
  dept: string;
  onDeptChange: (v: string) => void;
}) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/products/search_index.json")
      .then(r => r.json())
      .then(setIndex)
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = normalize(query);
    return index
      .filter(p => p.searchable.includes(q))
      .slice(0, 8);
  }, [query, index]);

  // CLOSE ONLY WHEN CLICKING OUTSIDE SEARCH — NO GLOBAL SIDE EFFECTS
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit() {
    const q = query.trim();
    if (!q) return;
    const params = new URLSearchParams();
    if (dept !== "all") params.set("dept", dept);
    params.set("q", q);
    setOpen(false);
    navigate(`/search?${params}`);
  }

  return (
    <div ref={wrapRef} className="relative flex w-full max-w-[860px] h-[40px]">
      {/* INPUT */}
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search"
        className="flex-1 h-full px-3 text-[14px] text-black outline-none"
      />

      {/* BUTTON */}
      <button
        onClick={submit}
        className="h-full px-4"
        style={{ background: "#0571e3" }}
      >
        🔍
      </button>

      {/* DROPDOWN — SAFE Z-INDEX */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full bg-white text-black border shadow z-[50]">
          {results.map(p => (
            <div
              key={p.slug}
              onMouseDown={() => navigate(`/p/${p.slug}`)}
              className="px-3 py-2 hover:bg-[#f3f3f3] cursor-pointer"
            >
              <div className="font-semibold text-[13px]">{p.title}</div>
              <div className="text-[12px] text-[#565959]">
                {p.brand} {p.category && `• ${p.category}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
