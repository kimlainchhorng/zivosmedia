import { cambodiaGuides } from "../src/content/cambodiaGuides";
const origin = "https://zivosmedia.com";
const pages: Record<string, { title: [string, string]; description: [string, string]; image: string }> = {
  "/": {
    title: ["One app for Cambodia | Zivo - Media", "កម្មវិធីតែមួយសម្រាប់កម្ពុជា | Zivo - Media"],
    description: ["Explore rides, food, delivery, hotels, flights and business with ZIVO. Start your next journey in Cambodia.", "ស្វែងរកការធ្វើដំណើរ អាហារ ការដឹកជញ្ជូន សណ្ឋាគារ ជើងហោះហើរ និងអាជីវកម្មជាមួយ ZIVO។"],
    image: "/og-image.png",
  },
  "/flights": {
    title: ["Search Flights from Cambodia – ZIVO", "ស្វែងរកជើងហោះហើរពីកម្ពុជា – ZIVO"],
    description: ["Search flights from Cambodia. Choose your destination and dates to compare available partner fares.", "ស្វែងរកជើងហោះហើរពីប្រទេសកម្ពុជា។ ជ្រើសរើសគោលដៅ និងកាលបរិច្ឆេទ ដើម្បីប្រៀបធៀបតម្លៃពីដៃគូ។"],
    image: "/og-image.png",
  },
  "/hotels": {
    title: ["Hotels & Resorts - Find Your Stay | ZIVO", "សណ្ឋាគារ និងរមណីយដ្ឋាន - ស្វែងរកកន្លែងស្នាក់នៅ | ZIVO"],
    description: ["Discover hotels, resorts and guesthouses in Phnom Penh, Siem Reap, Sihanoukville and more. Explore stays with ZIVO.", "ស្វែងរកសណ្ឋាគារ រមណីយដ្ឋាន និងផ្ទះសំណាក់នៅភ្នំពេញ សៀមរាប ក្រុងព្រះសីហនុ និងទីក្រុងផ្សេងៗក្នុងប្រទេសកម្ពុជា។"],
    image: "/og-hotels.jpg",
  },
};
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
for (const guide of cambodiaGuides) pages[guide.path] = { title: [`${guide.title[0]} | ZIVO`, `${guide.title[1]} | ZIVO`], description: guide.intro, image: "/og-image.png" };

export function mediaPrerenderAsset(url: URL): string | null {
  if (!hasMediaPublicSeo(url) || (url.pathname !== "/" && !cambodiaGuides.some(guide => guide.path === url.pathname))) return null;
  const name = url.pathname === "/" ? "home" : `guide${url.pathname.replaceAll("/", "-")}`;
  return `/_prerender/${name}.${url.searchParams.get("lang") === "km" ? "km" : "en"}.txt`;
}

/** Rewrite only fixed public entry pages. Never interpolate arbitrary query values. */
export function mediaPublicSeoHtml(html: string, url: URL): string {
  if (!hasMediaPublicSeo(url)) return html;
  const page = pages[url.pathname];
  const language = url.searchParams.get("lang") === "km" ? "km" : "en";
  const index = language === "km" ? 1 : 0;
  const title = escape(page.title[index]);
  const description = escape(page.description[index]);
  const canonical = origin + url.pathname;
  const tags = `<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${origin}${page.image}">
<meta property="og:locale" content="${language === "km" ? "km_KH" : "en_US"}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${origin}${page.image}">
${["en", "km", "x-default"].map(lang => `<link data-zivo-edge-alternate rel="alternate" hreflang="${lang}" href="${canonical}${lang === "x-default" ? "" : `?lang=${lang}`}">`).join("\n")}`;
  const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.toLowerCase();
  // Preserve scripts, security/CSP, app metadata and structured data.
  // Remove comments before tag matching: prose can contain an unmatched <title>.
  // A second edge pass must never consume the startup script after that comment.
  const cleaned = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => head.replace(/<!--[\s\S]*?-->/g, "")).replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*>/gi, tag => {
      const key = attribute(tag, "name") || attribute(tag, "property");
      return key && ["description", "og:title", "og:description", "og:url", "og:image", "og:locale", "twitter:title", "twitter:description", "twitter:image"].includes(key) ? "" : tag;
    })
    .replace(/<link\b[^>]*>/gi, tag => attribute(tag, "rel") === "canonical" || (attribute(tag, "rel") === "alternate" && attribute(tag, "hreflang")) ? "" : tag)
    .replace(/<html\b([^>]*)>/i, (_match, attributes: string) => `<html${attributes.replace(/\s+lang\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")} lang="${language}">`);
  return cleaned.replace(/<\/head>/i, `${tags}\n</head>`);
}

export function hasMediaPublicSeo(url: URL): boolean {
  return url.hostname === "zivosmedia.com" && Object.hasOwn(pages, url.pathname)
    && !["p", "code", "error", "error_description", "access_token", "refresh_token"].some(key => url.searchParams.has(key));
}
