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
      "alternateName": ["ZIVO App", "ZIVO Travel"],
      "url": "https://zivollc.com",
      "logo": "https://zivollc.com/og-image.png",
      "description": "ZIVO is an all-in-one app for travel booking, rides, food, social feed, reels, creator subscriptions, online shops, jobs, hiring, chat, and calls.",
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
        "Travel booking",
        "Flight comparison",
        "Hotel reservations",
        "Car rentals",
        "Ride services",
        "Food delivery",
        "Social networking",
        "Short-form video",
        "Creator subscriptions",
        "Online shops",
        "Job marketplace",
        "Messaging and video calls"
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
