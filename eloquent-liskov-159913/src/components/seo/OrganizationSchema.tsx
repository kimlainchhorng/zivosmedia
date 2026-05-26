import { useEffect } from "react";

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
      "alternateName": "ZIVO Travel",
      "url": "https://hizivo.com",
      "logo": "https://hizivo.com/og-image.png",
      "description": "ZIVO is a travel search and comparison platform helping users find the best deals on flights, hotels, and car rentals from 500+ partners.",
      "foundingDate": "2024",
      "email": "info@hizivo.com",
      "sameAs": [
        "https://twitter.com/zivotravel",
        "https://facebook.com/zivotravel",
        "https://instagram.com/zivotravel"
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "email": "info@hizivo.com",
          "contactType": "customer service",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "email": "payment@hizivo.com",
          "contactType": "billing support",
          "availableLanguage": ["English"]
        },
        {
          "@type": "ContactPoint",
          "email": "kimlain@hizivo.com",
          "contactType": "business inquiries",
          "availableLanguage": ["English"]
        }
      ],
      "areaServed": {
        "@type": "Place",
        "name": "Worldwide"
      },
      "knowsAbout": [
        "Flight booking",
        "Hotel reservations",
        "Car rentals",
        "Travel comparison",
        "Ride services",
        "Food delivery"
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
