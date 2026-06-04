/**
 * Auto Repair — Third-Party Warranty Networks / Administrators
 * Logos load from Clearbit Logo API via the `domain` field, with monogram fallback.
 */
export interface WarrantyNetwork {
  id: string;
  name: string;
  shortName?: string;
  domain?: string;
  phone?: string;
  /** Short qualifier shown next to the phone, e.g. "non-CarMax", "claims line". */
  phoneNote?: string;
  /** Explicit website; when omitted it is derived from `domain`. */
  website?: string;
  category?: "VSC Admin" | "Marketplace" | "Aftermarket" | "Dealer-Backed" | "Referral Partner" | "Telematics" | "Roadside" | "Other";
}

export const WARRANTY_NETWORKS: WarrantyNetwork[] = [
  { id: "1800warranty", name: "1800 Warranty", domain: "1800warranty.com", category: "VSC Admin" },
  { id: "aegis-heroprotect", name: "AEGIS / HeroProtects", domain: "heroprotects.com", category: "VSC Admin" },
  { id: "agws", name: "American Guardian Warranty Services (AGWS)", shortName: "AGWS", domain: "agws.com", category: "VSC Admin" },
  { id: "allegiance", name: "Allegiance Administrators", domain: "allegianceadmin.com", category: "VSC Admin" },
  { id: "alpha", name: "Alpha Warranty Services", domain: "alphawarranty.com", category: "VSC Admin" },
  { id: "amynta", name: "Amynta (Warranty Solutions & Warrantech)", domain: "amyntagroup.com", category: "VSC Admin" },
  { id: "asc", name: "ASC Warranty", domain: "ascwarranty.com", category: "VSC Admin" },
  { id: "assurant-twg", name: "Assurant (TWG)", domain: "assurant.com", phone: "800-621-2130", phoneNote: "non-CarMax", category: "VSC Admin" },
  { id: "aul", name: "AUL", domain: "aulcorp.com", category: "VSC Admin" },
  { id: "autopom", name: "autopom!", domain: "autopom.com", category: "Marketplace" },
  { id: "axiom", name: "Axiom Admin", domain: "axiomadmin.com", category: "VSC Admin" },
  { id: "beecovered", name: "BeeCovered", domain: "beecovered.com", category: "Marketplace" },
  { id: "bumper", name: "Bumper", domain: "bumper.com", category: "Marketplace" },
  { id: "caredge", name: "CarEdge", domain: "caredge.com", category: "Marketplace" },
  { id: "carchex", name: "Carchex", domain: "carchex.com", category: "Marketplace" },
  { id: "chaiz", name: "Chaiz", domain: "chaiz.com", category: "Marketplace" },
  { id: "coveragex", name: "CoverageX", domain: "coveragex.com", category: "VSC Admin" },
  { id: "dowc", name: "DOWC", domain: "dowc.com", category: "VSC Admin" },
  { id: "drivesmart", name: "DriveSmart Warranty", domain: "drivesmartwarranty.com", category: "Marketplace" },
  { id: "efg", name: "EFG Companies", domain: "efgcompanies.com", category: "Dealer-Backed" },
  { id: "empire-auto-protect", name: "Empire Auto Protect", domain: "empireautoprotect.com", category: "Marketplace" },
  { id: "empire-state", name: "Empire State Warranty", domain: "empirestatewarranty.com", category: "VSC Admin" },
  { id: "endurance", name: "Endurance", domain: "endurancewarranty.com", category: "Marketplace" },
  { id: "fair", name: "Fair Warranty", domain: "fairwarranty.com", category: "Marketplace" },
  { id: "forevercar", name: "ForeverCar", domain: "forevercar.com", category: "Marketplace" },
  { id: "goldkey", name: "GoldKey Warranty (Consumer Care Direct)", shortName: "GoldKey", domain: "goldkeywarranty.com", category: "VSC Admin" },
  { id: "gwc", name: "GWC", domain: "gwcwarranty.com", category: "VSC Admin" },
  { id: "haspro", name: "Haspro", domain: "haspro.com", category: "VSC Admin" },
  { id: "hwg", name: "Headstart Warranty Group (HWG)", shortName: "HWG", domain: "headstartwarranty.com", category: "VSC Admin" },
  { id: "integrity", name: "Integrity Warranty", domain: "integritywarranty.com", category: "VSC Admin" },
  { id: "naac", name: "North American Auto Care (NAAC)", shortName: "NAAC", domain: "naacwarranty.com", category: "VSC Admin" },
  { id: "nac", name: "National Auto Care (NAC)", shortName: "NAC", domain: "nationalautocare.com", category: "VSC Admin" },
  { id: "natix", name: "NATIX", domain: "natix.com", category: "VSC Admin" },
  { id: "nvp", name: "NVP Warranty", domain: "nvpwarranty.com", category: "VSC Admin" },
  { id: "olive", name: "olive", domain: "oliveaftermarket.com", category: "Marketplace" },
  { id: "omega", name: "Omega Auto Care", domain: "omegaautocare.com", category: "VSC Admin" },
  { id: "optimus", name: "Optimus Warranty", domain: "optimuswarranty.com", category: "VSC Admin" },
  { id: "owl", name: "Owl Warranty", domain: "owlwarranty.com", category: "VSC Admin" },
  { id: "proguard", name: "ProGuard Warranty", domain: "proguardwarranty.com", category: "VSC Admin" },
  { id: "protectmycar", name: "Protect My Car", domain: "protectmycar.com", category: "Marketplace" },
  { id: "servicecontract", name: "ServiceContract.com", domain: "servicecontract.com", category: "Marketplace" },
  { id: "smart-autocare", name: "Smart Autocare (ASI)", shortName: "Smart Autocare", domain: "smartautocare.com", category: "VSC Admin" },
  { id: "veritas", name: "Veritas", domain: "veritasglobal.com", category: "VSC Admin" },
  { id: "warranty-outlet", name: "Warranty Outlet", domain: "warrantyoutlet.com", category: "Marketplace" },
  { id: "zoomi", name: "Zoomi", domain: "zoomiwarranty.com", category: "VSC Admin" },

  // ── Consumer Referral Partners (lead-gen / customer retention) ──
  { id: "1800battery", name: "1-800-Battery", domain: "1800battery.com", category: "Referral Partner" },
  { id: "1800repairs", name: "1-800 Repairs", category: "Referral Partner" },
  { id: "autoist", name: "Autoist", category: "Referral Partner" },
  { id: "autonation", name: "AutoNation", domain: "autonation.com", category: "Referral Partner" },
  { id: "audiocityusa", name: "Audio City USA", domain: "audiocityusa.com", category: "Referral Partner" },
  { id: "agirlsguidetocars", name: "A Girl's Guide to Cars", domain: "agirlsguidetocars.com", category: "Referral Partner" },
  { id: "americascarmart", name: "America's Car-Mart", domain: "car-mart.com", category: "Referral Partner" },
  { id: "bestmobilemechanic", name: "Best Mobile Mechanic", category: "Referral Partner" },
  { id: "carcarekiosk", name: "CarCareKiosk", domain: "carcarekiosk.com", category: "Referral Partner" },
  { id: "carlightscan", name: "CarLightScan", category: "Referral Partner" },
  { id: "carmax", name: "CarMax", domain: "carmax.com", category: "Referral Partner" },
  { id: "catsecurity", name: "Cat Security", category: "Referral Partner" },
  { id: "carparts", name: "CarParts.com", domain: "carparts.com", category: "Referral Partner" },
  { id: "consumerreports", name: "Consumer Reports", domain: "consumerreports.org", category: "Referral Partner" },
  { id: "croozly", name: "Croozly", category: "Referral Partner" },
  { id: "drivertechnologies", name: "Driver Technologies", domain: "drivertechnologies.com", category: "Referral Partner" },
  { id: "expertise", name: "Expertise.com", domain: "expertise.com", category: "Referral Partner" },
  { id: "gasbuddy", name: "GasBuddy", domain: "gasbuddy.com", category: "Referral Partner" },
  { id: "glassnet", name: "Glass.net", domain: "glass.net", category: "Referral Partner" },
  { id: "goodcar", name: "GoodCar", domain: "goodcar.com", category: "Referral Partner" },
  { id: "govx", name: "GovX", domain: "govx.com", category: "Referral Partner" },
  { id: "howtoo", name: "HowToo", category: "Referral Partner" },
  { id: "innova", name: "Innova / RepairSolutions2 / CarMD", shortName: "Innova", domain: "innova.com", category: "Referral Partner" },
  { id: "justanswer", name: "JustAnswer", domain: "justanswer.com", category: "Referral Partner" },
  { id: "keysavvy", name: "KeySavvy", domain: "keysavvy.com", category: "Referral Partner" },
  { id: "lojackgo", name: "LoJackGo by Spireon", domain: "spireon.com", category: "Referral Partner" },
  { id: "nationwide", name: "Nationwide", domain: "nationwide.com", category: "Referral Partner" },
  { id: "nationwidereport", name: "Nationwide Report", category: "Referral Partner" },
  { id: "oempartsonline", name: "OEMPartsOnline.com", domain: "oempartsonline.com", category: "Referral Partner" },
  { id: "overalls", name: "Overalls", category: "Referral Partner" },
  { id: "ownli", name: "Ownli", category: "Referral Partner" },
  { id: "premierautoprotect", name: "Premier Auto Protect", domain: "premierautoprotect.com", category: "Referral Partner" },
  { id: "reviver", name: "REVIVER", domain: "reviver.com", category: "Referral Partner" },
  { id: "revvup", name: "Revv-Up", category: "Referral Partner" },
  { id: "salvagereseller", name: "Salvage Reseller", domain: "salvagereseller.com", category: "Referral Partner" },
  { id: "samedaypros", name: "SameDayPros", domain: "samedaypros.com", category: "Referral Partner" },
  { id: "simpletire", name: "SimpleTire", domain: "simpletire.com", category: "Referral Partner" },
  { id: "shift", name: "Shift", category: "Referral Partner" },
  { id: "spiffy", name: "Spiffy", domain: "getspiffy.com", category: "Referral Partner" },
  { id: "usaa", name: "USAA & USAA Services", shortName: "USAA", domain: "usaa.com", category: "Referral Partner" },
  { id: "waycom", name: "Way.com", domain: "way.com", category: "Referral Partner" },
  { id: "wrench", name: "Wrench", domain: "wrench.com", category: "Referral Partner" },
  { id: "treads", name: "Treads", domain: "treads.com", category: "Referral Partner" },
  { id: "vincheckup", name: "VINCheckUp", category: "Referral Partner" },
  { id: "yelp", name: "Yelp", domain: "yelp.com", category: "Referral Partner" },
  { id: "zilocar", name: "ZiloCar", category: "Referral Partner" },

  // ── Telematics Providers ──
  { id: "arity", name: "Arity (Allstate Drivewise)", shortName: "Arity", domain: "arity.com", category: "Telematics" },
  { id: "axiom-connected", name: "Axiom Connected", category: "Telematics" },
  { id: "fixd", name: "FIXD", domain: "fixdapp.com", category: "Telematics" },
  { id: "harman", name: "Harman (Sprint Drive, AT&T Spark)", shortName: "Harman", domain: "harman.com", category: "Telematics" },
  { id: "pocketgeek", name: "Pocket Geek Auto (Assurant)", shortName: "Pocket Geek Auto", domain: "assurant.com", category: "Telematics" },
  { id: "verizonhum", name: "Verizon Hum", domain: "hum.com", category: "Telematics" },

  // ── Roadside Assistance / Tow ──
  { id: "agero", name: "Agero", domain: "agero.com", category: "Roadside" },
  { id: "drivensolutions", name: "Driven Solutions", category: "Roadside" },
  { id: "geico", name: "GEICO", domain: "geico.com", category: "Roadside" },
  { id: "roadsideprotect", name: "Roadside Protect", category: "Roadside" },
  { id: "trxnow", name: "TRX-Now", category: "Roadside" },
  { id: "driveroadside", name: "Drive Roadside", domain: "driveroadside.com", category: "Roadside" },
  { id: "honk", name: "Honk", domain: "honkforhelp.com", category: "Roadside" },
];

export const getWarrantyNetwork = (id?: string | null): WarrantyNetwork | undefined =>
  id ? WARRANTY_NETWORKS.find((n) => n.id === id) : undefined;

/** Best website URL for a provider — explicit override, else derived from domain. */
export const getNetworkWebsite = (
  network?: Pick<WarrantyNetwork, "domain" | "website"> | null,
): string | null => {
  if (!network) return null;
  if (network.website) return network.website;
  return network.domain ? `https://www.${network.domain}/` : null;
};

/** Clearbit Logo API URL for a domain, or null. */
export const getNetworkLogoUrl = (
  network?: Pick<WarrantyNetwork, "domain"> | null,
  size: number = 80,
): string | null => {
  if (!network?.domain) return null;
  return `https://logo.clearbit.com/${network.domain}?size=${size}`;
};
