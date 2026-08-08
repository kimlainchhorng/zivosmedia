import { useEffect } from "react";

import { COMPANY_INFO, hasPostalAddress } from "@/config/legalContent";

/**
 * schema.org PostalAddress for the registered entity, or null when
 * COMPANY_INFO does not yet hold a real one. Registered rather than operations
 * because this schema describes the legal Organization.
 */
const postalAddress = hasPostalAddress(COMPANY_INFO.registeredAddress)
  ? {
      "@type": "PostalAddress",
      ...(COMPANY_INFO.registeredAddress.line1.trim()
        ? { "streetAddress": [COMPANY_INFO.registeredAddress.line1, COMPANY_INFO.registeredAddress.line2]
            .map((part) => part.trim())
            .filter(Boolean)
            .join(", ") }
        : {}),
      ...(COMPANY_INFO.registeredAddress.city.trim()
        ? { "addressLocality": COMPANY_INFO.registeredAddress.city.trim() }
        : {}),
      ...(COMPANY_INFO.registeredAddress.region.trim()
        ? { "addressRegion": COMPANY_INFO.registeredAddress.region.trim() }
        : {}),
      ...(COMPANY_INFO.registeredAddress.postalCode.trim()
        ? { "postalCode": COMPANY_INFO.registeredAddress.postalCode.trim() }
        : {}),
      "addressCountry": COMPANY_INFO.registeredAddress.country.trim(),
    }
  : null;

/**
 * Injects Organization and WebSite structured data for SEO
 * This component should be rendered once at the app level
 */
export default function OrganizationSchema() {
  useEffect(() => {
    // Organization Schema
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "ZIVO",
      "legalName": "ZIVO LLC",
      "alternateName": "ZIVO Super-App",
      "url": "https://zivosmedia.com",
      "logo": "https://zivosmedia.com/og-image.png",
      // Describes the business as it operates, matching /about, the Terms, and
      // the Refund Policy. The previous text called ZIVO a travel comparison
      // site — the machine-readable twin of the same outdated claim, and the
      // version aggregators and search engines actually consume.
      "description": "ZIVO is a super-app for rides, food and package delivery, shopping, and travel booking, operating principally in Cambodia. ZIVO is the merchant of record for the services it operates; flights are ticketed by licensed airline partners.",
      "foundingDate": "2024",
      "email": "info@zivosmedia.com",
      // Emitted only when COMPANY_INFO actually holds an address. An
      // `address` key with empty strings is worse than no key: it publishes a
      // machine-readable claim that the business has no location.
      ...(postalAddress ? { "address": postalAddress } : {}),
      ...(COMPANY_INFO.supportPhone.trim()
        ? { "telephone": COMPANY_INFO.supportPhone.trim() }
        : {}),
      "sameAs": [
        "https://twitter.com/zivotravel",
        "https://facebook.com/zivotravel",
        "https://instagram.com/zivotravel"
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "email": "info@zivosmedia.com",
          "contactType": "customer service",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "email": "payment@zivosmedia.com",
          "contactType": "billing support",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "email": "kimlain@zivosmedia.com",
          "contactType": "business inquiries",
          "availableLanguage": ["English"]
        }
      ],
      "areaServed": {
        "@type": "Place",
        "name": "Worldwide"
      },
      "knowsAbout": [
        "Ride hailing",
        "Food delivery",
        "Package delivery",
        "Online shopping",
        "Hotel reservations",
        "Car rentals",
        "Flight booking"
      ]
    };

    // Find or create Organization script element
    let orgScript = document.querySelector('script[data-schema="organization"]');
    if (!orgScript) {
      orgScript = document.createElement("script");
      orgScript.setAttribute("type", "application/ld+json");
      orgScript.setAttribute("data-schema", "organization");
      document.head.appendChild(orgScript);
    }
    orgScript.textContent = JSON.stringify(organizationSchema);

    return () => {
      orgScript?.remove();
    };
  }, []);

  return null;
}
