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
  category?: "VSC Admin" | "Marketplace" | "Aftermarket" | "Dealer-Backed" | "Other";
}

export const WARRANTY_NETWORKS: WarrantyNetwork[] = [
  { id: "1800warranty", name: "1800 Warranty", domain: "1800warranty.com", category: "VSC Admin" },
  { id: "aegis-heroprotect", name: "AEGIS / HeroProtects", domain: "heroprotects.com", category: "VSC Admin" },
  { id: "agws", name: "American Guardian Warranty Services (AGWS)", shortName: "AGWS", domain: "agws.com", category: "VSC Admin" },
  { id: "allegiance", name: "Allegiance Administrators", domain: "allegianceadmin.com", category: "VSC Admin" },
  { id: "alpha", name: "Alpha Warranty Services", domain: "alphawarranty.com", category: "VSC Admin" },
  { id: "amynta", name: "Amynta (Warranty Solutions & Warrantech)", domain: "amyntagroup.com", category: "VSC Admin" },
  { id: "asc", name: "ASC Warranty", domain: "ascwarranty.com", category: "VSC Admin" },
  { id: "assurant-twg", name: "Assurant (TWG)", domain: "assurant.com", category: "VSC Admin" },
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
];

export const getWarrantyNetwork = (id?: string | null): WarrantyNetwork | undefined =>
  id ? WARRANTY_NETWORKS.find((n) => n.id === id) : undefined;

/** Clearbit Logo API URL for a domain, or null. */
export const getNetworkLogoUrl = (
  network?: Pick<WarrantyNetwork, "domain"> | null,
  size: number = 80,
): string | null => {
  if (!network?.domain) return null;
  return `https://logo.clearbit.com/${network.domain}?size=${size}`;
};
