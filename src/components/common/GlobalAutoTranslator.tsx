import { useEffect, useRef } from "react";
import { useI18n } from "@/hooks/useI18n";

type AttrName = "placeholder" | "aria-label" | "title";

const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "input",
  "textarea",
  "select",
  "option",
  "[contenteditable='true']",
  "[translate='no']",
  ".notranslate",
  "[data-no-translate]",
  "[data-no-auto-translate]",
  "[data-zivo-no-auto-translate]",
].join(",");

const TEXT_CACHE_LIMIT = 1200;
const BATCH_LIMIT = 80;
const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<HTMLElement, Partial<Record<AttrName, string>>>();
const translationCache = new Map<string, string>();
const BRAND_PATTERN = /\b(?:ZIVO|ZiVO|Zivo)(?:\+| OF)?\b/g;

function cacheGet(key: string) {
  const value = translationCache.get(key);
  if (value != null) {
    translationCache.delete(key);
    translationCache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: string) {
  translationCache.set(key, value);
  if (translationCache.size > TEXT_CACHE_LIMIT) {
    const first = translationCache.keys().next().value;
    if (first) translationCache.delete(first);
  }
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldTranslateText(text: string) {
  const value = normalizeText(text);
  if (value.length < 2 || value.length > 180) return false;
  if (!/[A-Za-z\u1780-\u17FF\u00C0-\u024F]/.test(value)) return false;
  if (/^(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(value)) return false;
  if (/^[\d\s.,:$%+#\-()/]+$/.test(value)) return false;
  return true;
}

function protectBrandText(source: string) {
  const brands: string[] = [];
  const protectedSource = source.replace(BRAND_PATTERN, (match) => {
    const index = brands.push(match) - 1;
    return `ZXBRAND${index}ZX`;
  });

  return { protectedSource, brands };
}

function restoreBrandText(translated: string, brands: string[]) {
  const restored = brands.reduce(
    (value, brand, index) => value.replace(new RegExp(`\\bZXBRAND${index}ZX\\b`, "g"), brand),
    translated,
  );
  return restored.replace(/\b((?:ZIVO|ZiVO|Zivo)(?:\+| OF)?)(?=[A-Za-z\u1780-\u17FF\u00C0-\u024F])/g, "$1 ");
}

function canTranslateElement(element: HTMLElement | null) {
  if (!element) return false;
  if (element.closest(SKIP_SELECTOR)) return false;
  if (element.offsetParent === null && element.getClientRects().length === 0) return false;
  return true;
}

async function translateText(text: string, targetLang: string, signal: AbortSignal) {
  const source = normalizeText(text);
  if (!shouldTranslateText(source)) return text;

  const cacheKey = `${targetLang}:${source}`;
  const cached = cacheGet(cacheKey);
  if (cached != null) return cached;

  const { protectedSource, brands } = protectBrandText(source);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(protectedSource)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Translate failed: ${response.status}`);
  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((chunk: unknown[]) => chunk?.[0] || "").join("").trim()
    : protectedSource;
  const result = restoreBrandText(translated || protectedSource, brands);
  cacheSet(cacheKey, result);
  return result;
}

function getTextNodes(root: ParentNode) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!canTranslateElement(parent)) return NodeFilter.FILTER_REJECT;
      if (!shouldTranslateText(node.textContent || "")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (nodes.length < BATCH_LIMIT) {
    const node = walker.nextNode();
    if (!node) break;
    nodes.push(node as Text);
  }

  return nodes;
}

function getAttrElements(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]"))
    .filter(canTranslateElement)
    .slice(0, BATCH_LIMIT);
}

function restoreEnglish(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (true) {
    const node = walker.nextNode() as Text | null;
    if (!node) break;
    const original = textOriginals.get(node);
    if (original != null && node.textContent !== original) node.textContent = original;
  }

  root.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]").forEach((element) => {
    const originals = attrOriginals.get(element);
    if (!originals) return;
    (Object.keys(originals) as AttrName[]).forEach((attr) => {
      const original = originals[attr];
      if (original != null && element.getAttribute(attr) !== original) element.setAttribute(attr, original);
    });
  });
}

export default function GlobalAutoTranslator() {
  const { currentLanguage } = useI18n();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const translatePage = async () => {
      const root = document.body;
      if (!root) return;

      if (currentLanguage === "en") {
        restoreEnglish(root);
        return;
      }

      const textNodes = getTextNodes(root);
      for (const node of textNodes) {
        if (controller.signal.aborted) return;
        const original = textOriginals.get(node) || node.textContent || "";
        if (!textOriginals.has(node)) textOriginals.set(node, original);
        try {
          const translated = await translateText(original, currentLanguage, controller.signal);
          if (!controller.signal.aborted && node.textContent !== translated) node.textContent = translated;
        } catch {
          // Best-effort auto-translation. Keyed app strings still render normally if this fails.
        }
      }

      const attrElements = getAttrElements(root);
      for (const element of attrElements) {
        if (controller.signal.aborted) return;
        const originals = attrOriginals.get(element) || {};
        for (const attr of ["placeholder", "aria-label", "title"] as AttrName[]) {
          const value = element.getAttribute(attr);
          if (!value || !shouldTranslateText(value)) continue;
          const original = originals[attr] || value;
          originals[attr] = original;
          try {
            const translated = await translateText(original, currentLanguage, controller.signal);
            if (!controller.signal.aborted && element.getAttribute(attr) !== translated) element.setAttribute(attr, translated);
          } catch {
            // Best-effort auto-translation.
          }
        }
        attrOriginals.set(element, originals);
      }
    };

    const scheduleTranslate = (delay = 80) => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void translatePage();
      }, delay);
    };

    scheduleTranslate(160);
    const observer = new MutationObserver(() => {
      if (currentLanguage !== "en") scheduleTranslate(250);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
    });

    return () => {
      observer.disconnect();
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [currentLanguage]);

  return null;
}
