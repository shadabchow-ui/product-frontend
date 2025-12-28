import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";

export const ASSISTANT_NAME = "Scout";
export const ASSISTANT_WELCOME_TITLE = "Welcome!";
export const ASSISTANT_WELCOME_TEXT =
  "Hi, I'm Scout, your shopping assistant. My answers are powered by AI, so I may not always get things right.";
export const ASSISTANT_LEARN_MORE_LABEL = "Learn more";

export type AssistantMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AssistantMode = "mock" | "api";

export type ProductCtx = {
  productId?: string;
  productTitle?: string;
  productSku?: string;
  productCategory?: string;
  productTags?: string[];
};

type AssistantContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;

  mode: AssistantMode;

  productId?: string;
  productTitle?: string;
  productSku?: string;
  productCategory?: string;
  productTags?: string[];
  setProductContext: (p?: ProductCtx) => void;

  suggestedQuestions: string[];

  messages: AssistantMsg[];
  clearMessages: () => void;

  send: (q: string) => Promise<void>;
};

const Ctx = createContext<AssistantContextType | null>(null);

function uid() {
  return Math.random().toString(36).slice(2);
}

function clampText(text: string, maxLen = 1200) {
  const t = String(text || "");
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function inferCategoryFromText(title: string, category?: string, tags?: string[]) {
  const hay = [
    safeStr(category),
    safeStr(title),
    ...(Array.isArray(tags) ? tags.map((t) => safeStr(t)) : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const has = (re: RegExp) => re.test(hay);

  if (
    has(
      /\b(shirt|dress|skirt|jean|pants|legging|hoodie|jacket|coat|sweater|top|blouse|bra|underwear|swimsuit|bikini|saree|kurta|suit|gown|tee|t-shirt)\b/
    )
  ) {
    return "apparel";
  }
  if (has(/\b(shoe|sneaker|boot|heel|loafer|sandal|slipper|sock)\b/)) {
    return "shoes";
  }
  if (
    has(
      /\b(serum|cleanser|moisturizer|lotion|cream|sunscreen|spf|mask|toner|retinol|vitamin c|makeup|foundation|concealer|lipstick|shampoo|conditioner)\b/
    )
  ) {
    return "beauty";
  }
  if (
    has(
      /\b(headphone|earbud|speaker|tv|monitor|laptop|keyboard|mouse|usb|charger|cable|bluetooth|wifi|router|camera|webcam|phone|iphone|android)\b/
    )
  ) {
    return "electronics";
  }
  if (
    has(
      /\b(pan|pot|knife|cutting board|kettle|mug|bottle|thermos|blender|air fryer|toaster|microwave|dishwasher|cookware)\b/
    )
  ) {
    return "kitchen";
  }
  if (
    has(
      /\b(chair|table|sofa|couch|lamp|rug|curtain|pillow|blanket|mattress|frame|shelf|storage)\b/
    )
  ) {
    return "home";
  }
  if (has(/\b(dog|cat|pet|leash|collar|treat|kibble|litter|aquarium)\b/)) {
    return "pets";
  }
  if (has(/\b(tool|drill|screw|wrench|hammer|saw|socket|glove|ladder)\b/)) {
    return "tools";
  }

  return "general";
}

export function buildSuggestedQuestions(p: ProductCtx | undefined) {
  const title = safeStr(p?.productTitle);
  const category = inferCategoryFromText(title, p?.productCategory, p?.productTags);

  // Keep chips short + high-signal
  if (category === "apparel") {
    return [
      "How does it fit (true to size)?",
      "Is it stretchy?",
      "Does it have pockets?",
      "How do I wash it?"
    ];
  }

  if (category === "shoes") {
    return [
      "Do these run true to size?",
      "Are they comfortable for all-day wear?",
      "Is the sole non-slip?",
      "How do I clean them?"
    ];
  }

  if (category === "beauty") {
    return [
      "Is it good for sensitive skin?",
      "How do I use it (AM/PM)?",
      "Does it have fragrance?",
      "What ingredients should I know?"
    ];
  }

  if (category === "electronics") {
    return [
      "Is it compatible with my device?",
      "What’s included in the box?",
      "Does it need batteries or charging?",
      "Any setup tips?"
    ];
  }

  if (category === "kitchen") {
    return [
      "Is it dishwasher safe?",
      "What are the dimensions?",
      "Is it food-grade / BPA-free?",
      "How much does it hold?"
    ];
  }

  if (category === "home") {
    return [
      "What are the dimensions?",
      "Is assembly required?",
      "Is it easy to clean?",
      "How durable is it?"
    ];
  }

  return ["What’s included?", "What are the dimensions?", "Is it easy to use?", "Is it returnable?"];
}

/**
 * Mock responses: no API key needed. This keeps the UI testable
 * while we wire real Gemini later.
 */
async function mockAsk(productTitle: string | undefined, q: string) {
  await sleep(450 + Math.floor(Math.random() * 450));
  const ql = q.toLowerCase();
  const title = productTitle ? ` for “${productTitle}”` : "";

  if (ql.includes("size") || ql.includes("fit") || ql.includes("true to size")) {
    return `Fit can vary by brand and cut${title}. If you tell me your usual size and how you like it to fit (snug vs relaxed), I can suggest a safer pick.`;
  }

  if (ql.includes("stretch") || ql.includes("stretchy")) {
    return `If the materials include elastane/spandex, it usually has noticeable stretch${title}. If you paste the fabric % from “Product details,” I’ll translate what it means in real terms.`;
  }

  if (ql.includes("wash") || ql.includes("machine")) {
    return `Care depends on fabric and construction${title}. Look for “Machine wash cold” vs “Hand wash only.” If you paste the care line, I’ll tell you the safest routine to avoid shrinking or fading.`;
  }

  if (ql.includes("zipper")) {
    return `Zippers are often noted under “Closure type” or “Features”${title}. If the PDP doesn’t list it, check close-up images around the back/side seam.`;
  }

  if (ql.includes("included") || ql.includes("in the box")) {
    return `What’s included should be listed in the description or package contents${title}. If it’s missing, assume only the main item unless explicitly stated.`;
  }

  if (ql.includes("return")) {
    return `Return eligibility depends on the store policy and item condition${title}. If you tell me your return window and whether it’s final sale, I’ll summarize what to watch for.`;
  }

  return `Got it${title}. I can help with fit, materials, care, compatibility, and what’s included. What’s the main thing you’re trying to confirm?`;
}

export function AssistantProvider({
  children,
  mode = "mock"
}: {
  children: React.ReactNode;
  mode?: AssistantMode;
}) {
  const [open, setOpen] = useState(false);

  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [productTitle, setProductTitle] = useState<string | undefined>(undefined);
  const [productSku, setProductSku] = useState<string | undefined>(undefined);
  const [productCategory, setProductCategory] = useState<string | undefined>(undefined);
  const [productTags, setProductTags] = useState<string[] | undefined>(undefined);

  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const inflight = useRef<Promise<void> | null>(null);

  const setProductContext = (p?: ProductCtx) => {
    setProductId(p?.productId);
    setProductTitle(p?.productTitle);
    setProductSku(p?.productSku);
    setProductCategory(p?.productCategory);
    setProductTags(p?.productTags);
  };

  const suggestedQuestions = useMemo(
    () =>
      buildSuggestedQuestions({
        productId,
        productTitle,
        productSku,
        productCategory,
        productTags
      }),
    [productId, productTitle, productSku, productCategory, productTags]
  );

  const clearMessages = () => setMessages([]);

  const send = async (q: string) => {
    const question = clampText(q, 240);
    if (!question) return;

    // Serialize sends so UI doesn't race
    if (inflight.current) await inflight.current;

    const p = (async () => {
      const userMsg: AssistantMsg = { id: uid(), role: "user", text: question };
      setMessages((m) => [...m, userMsg]);

      let answer = "";
      if (mode === "mock") {
        answer = await mockAsk(productTitle, question);
      } else {
        // Future: call your backend /api/assistant which uses Gemini
        answer = await mockAsk(productTitle, question);
      }

      const asstMsg: AssistantMsg = {
        id: uid(),
        role: "assistant",
        text: clampText(answer, 1200)
      };

      setMessages((m) => [...m, asstMsg]);
    })();

    inflight.current = p;
    await p;
    inflight.current = null;
  };

  const value = useMemo(
    () => ({
      open,
      setOpen,
      mode,
      productId,
      productTitle,
      productSku,
      productCategory,
      productTags,
      setProductContext,
      suggestedQuestions,
      messages,
      clearMessages,
      send
    }),
    [
      open,
      mode,
      productId,
      productTitle,
      productSku,
      productCategory,
      productTags,
      suggestedQuestions,
      messages
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssistant() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistant must be used within AssistantProvider");
  return v;
}
