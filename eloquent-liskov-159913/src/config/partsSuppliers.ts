/**
 * Auto Parts Suppliers / Vendors
 *
 * For repair shops, we point to each brand's PROFESSIONAL / B2B portal
 * (e.g. AutoZonePro, FirstCallOnline, NAPA PROLink) — not the consumer site.
 * That's where shops have real accounts, jobber pricing, and trade ordering.
 *
 * `consumerDomain` (optional) keeps the public-facing site available as a
 * fallback for quick part lookups when the user is signed out of the pro portal.
 *
 * Logos load via favicon fallback chain in <PartsSupplierLogo /> (Google S2 →
 * DuckDuckGo → icon.horse → monogram). Most pro portals share branding with the
 * consumer site so favicons resolve cleanly.
 */
export interface PartsSupplier {
  id: string;
  name: string;
  shortName?: string;
  /** Primary domain shop opens — usually the pro / B2B portal. */
  domain?: string;
  /** Optional exact portal/login URL when the root domain is not the best entry. */
  portalUrl?: string;
  /** Public consumer site, when different from the pro portal. */
  consumerDomain?: string;
  category: "Retail Chain" | "OE / Dealer" | "Wholesale Distributor" | "Online Marketplace" | "Specialty";
  /** Short tagline shown under the name on supplier cards. */
  description?: string;
  /** Optional URL pattern to look up a part by SKU (e.g. site search). */
  searchUrlTemplate?: string;
  /** Login flow shape — "two-step" suppliers ask username then password on a separate screen. */
  loginFlow?: "single" | "two-step";
  /** If true, skip the iframe embed entirely and go straight to credential-launcher mode.
   *  Set for suppliers that use Akamai/Cloudflare bot detection that blocks iframes. */
  skipEmbed?: boolean;
}

export const PARTS_SUPPLIERS: PartsSupplier[] = [
  // -------- Retail chains — Pro/B2B portals --------
  {
    id: "autozone",
    name: "AutoZonePro (Commercial)",
    shortName: "AutoZonePro",
    domain: "autozonepro.com",
    portalUrl: "https://www.autozonepro.com/ui/login",
    consumerDomain: "autozone.com",
    category: "Retail Chain",
    description: "Trade portal · login required",
    searchUrlTemplate: "https://www.autozonepro.com/azprolanding/searchPage?searchText={q}",
    loginFlow: "two-step",
  },
  {
    id: "oreilly",
    name: "FirstCallOnline (O'Reilly Pro)",
    shortName: "FirstCall",
    domain: "firstcallonline.com",
    consumerDomain: "oreillyauto.com",
    category: "Retail Chain",
    description: "O'Reilly pro shop portal",
    searchUrlTemplate: "https://www.firstcallonline.com/webapp/wcs/stores/servlet/SearchDisplay?searchTerm={q}",
  },
  {
    id: "napa",
    name: "NAPA PROLink",
    shortName: "PROLink",
    domain: "napaprolink.com",
    portalUrl: "https://www.napaprolink.com/",
    consumerDomain: "napaonline.com",
    category: "Retail Chain",
    description: "Trade portal · login required",
    searchUrlTemplate: "https://www.napaprolink.com/",
    loginFlow: "two-step",
  },
  {
    id: "advance",
    name: "Advance Professional",
    shortName: "Advance Pro",
    domain: "advancepro.com",
    portalUrl: "https://www.advancepro.com/",
    consumerDomain: "advanceautoparts.com",
    category: "Retail Chain",
    description: "AdvancePro B2B",
    searchUrlTemplate: "https://www.advancepro.com/search?q={q}",
  },
  {
    id: "carquest",
    name: "Carquest Professional",
    shortName: "Carquest Pro",
    domain: "carquestpro.com",
    consumerDomain: "carquest.com",
    category: "Retail Chain",
    description: "Shop / trade orders",
  },
  {
    id: "pepboys",
    name: "Pep Boys Fleet",
    shortName: "Pep Boys Fleet",
    domain: "fleet.pepboys.com",
    consumerDomain: "pepboys.com",
    category: "Retail Chain",
    description: "Fleet & trade accounts",
  },
  {
    id: "autopartsway",
    name: "AutoPartsWAY",
    domain: "autopartsway.com",
    category: "Retail Chain",
  },

  // -------- Wholesale / distributor --------
  {
    id: "worldpac",
    name: "WORLDPAC speedDIAL",
    shortName: "speedDIAL",
    domain: "speeddial.worldpac.com",
    consumerDomain: "worldpac.com",
    category: "Wholesale Distributor",
    description: "Pro ordering · login required",
  },
  {
    id: "parts-authority",
    name: "Parts Authority",
    domain: "partsauthority.com",
    category: "Wholesale Distributor",
    description: "Pro distribution",
  },
  {
    id: "factory-motor-parts",
    name: "Factory Motor Parts",
    shortName: "FMP",
    domain: "factorymotorparts.com",
    category: "Wholesale Distributor",
    description: "OE & aftermarket trade",
  },
  { id: "uap", name: "UAP", domain: "uapinc.com", category: "Wholesale Distributor" },
  {
    id: "keystone",
    name: "Keystone Automotive",
    domain: "ekeystone.com",
    consumerDomain: "keystoneautomotive.com",
    category: "Wholesale Distributor",
    description: "eKeystone B2B",
  },
  { id: "lkq", name: "LKQ", domain: "lkqonline.com", consumerDomain: "lkqcorp.com", category: "Wholesale Distributor", description: "LKQ Online B2B" },
  { id: "fcp-euro", name: "FCP Euro", domain: "fcpeuro.com", category: "Specialty", description: "Euro specialty parts" },

  // -------- OE / Dealer — pro/shop portals --------
  {
    id: "mopar",
    name: "Mopar Repair Connect",
    shortName: "Mopar",
    domain: "moparrepairconnect.com",
    consumerDomain: "mopar.com",
    category: "OE / Dealer",
    description: "Stellantis pro portal",
  },
  {
    id: "gm-parts",
    name: "ACDelco Connection (GM)",
    shortName: "ACDelco",
    domain: "acdelcoconnection.com",
    consumerDomain: "gmpartsdirect.com",
    category: "OE / Dealer",
    description: "GM technician portal",
  },
  {
    id: "ford-parts",
    name: "Ford Motorcraft Service",
    shortName: "Motorcraft",
    domain: "motorcraftservice.com",
    consumerDomain: "parts.ford.com",
    category: "OE / Dealer",
    description: "Ford pro service portal",
  },
  {
    id: "toyota-parts",
    name: "Toyota TIS",
    shortName: "Toyota TIS",
    domain: "techinfo.toyota.com",
    consumerDomain: "parts.toyota.com",
    category: "OE / Dealer",
    description: "Tech info & parts",
  },
  {
    id: "honda-parts",
    name: "Honda ServiceExpress",
    shortName: "ServiceExpress",
    domain: "serviceexpress.honda.com",
    consumerDomain: "hondapartsnow.com",
    category: "OE / Dealer",
    description: "Honda pro portal",
  },
  {
    id: "subaru-parts",
    name: "Subaru Tech Info System",
    shortName: "Subaru STIS",
    domain: "techinfo.subaru.com",
    consumerDomain: "subarupartsonline.com",
    category: "OE / Dealer",
    description: "Tech & parts portal",
  },
  {
    id: "bmw-parts",
    name: "BMW TIS",
    shortName: "BMW TIS",
    domain: "tis.bmwgroup.net",
    consumerDomain: "getbmwparts.com",
    category: "OE / Dealer",
    description: "BMW tech portal",
  },
  {
    id: "vw-parts",
    name: "VW erWin",
    shortName: "VW erWin",
    domain: "erwin.volkswagen.de",
    consumerDomain: "parts.vw.com",
    category: "OE / Dealer",
    description: "VW workshop info",
  },

  // -------- Online marketplaces --------
  { id: "rockauto", name: "RockAuto", domain: "rockauto.com", category: "Online Marketplace", searchUrlTemplate: "https://www.rockauto.com/en/partsearch/?partnum={q}" },
  { id: "partsgeek", name: "PartsGeek", domain: "partsgeek.com", category: "Online Marketplace" },
  { id: "1aauto", name: "1A Auto", domain: "1aauto.com", category: "Online Marketplace" },
  { id: "amazon-auto", name: "Amazon Business (Auto)", shortName: "Amazon Biz", domain: "business.amazon.com", consumerDomain: "amazon.com", category: "Online Marketplace", description: "Tax-exempt B2B" },
  { id: "ebay-motors", name: "eBay Motors", domain: "ebay.com", category: "Online Marketplace" },
  { id: "summit-racing", name: "Summit Racing", domain: "summitracing.com", category: "Specialty" },
  { id: "jegs", name: "JEGS", domain: "jegs.com", category: "Specialty" },

  // -------- Specialty / tools --------
  { id: "snap-on", name: "Snap-on", domain: "snapon.com", category: "Specialty" },
  { id: "matco", name: "Matco Tools", domain: "matcotools.com", category: "Specialty" },
  { id: "harbor-freight", name: "Harbor Freight", domain: "harborfreight.com", category: "Specialty" },
];

export const getPartsSupplier = (id?: string | null): PartsSupplier | undefined =>
  id ? PARTS_SUPPLIERS.find((s) => s.id === id) : undefined;

/** Strip leading subdomain (e.g. proline.napaonline.com → napaonline.com). */
const rootDomain = (domain: string): string => {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  // Keep last 2 labels for plain TLDs; this is best-effort and fine for our list.
  return parts.slice(-2).join(".");
};

export const getSupplierLogoUrls = (
  supplier?: Pick<PartsSupplier, "domain"> | null,
  size: number = 80,
): string[] => {
  if (!supplier?.domain) return [];
  const root = rootDomain(supplier.domain);
  const urls = [`https://logo.clearbit.com/${supplier.domain}?size=${size}`];
  if (root !== supplier.domain) {
    urls.push(`https://logo.clearbit.com/${root}?size=${size}`);
  }
  return urls;
};

/** Back-compat single-URL helper. */
export const getSupplierLogoUrl = (
  supplier?: Pick<PartsSupplier, "domain"> | null,
  size: number = 80,
): string | null => getSupplierLogoUrls(supplier, size)[0] ?? null;

export const getSupplierSearchUrl = (supplier: PartsSupplier, query: string): string | null => {
  if (!supplier.searchUrlTemplate) return null;
  return supplier.searchUrlTemplate.replace("{q}", encodeURIComponent(query));
};
