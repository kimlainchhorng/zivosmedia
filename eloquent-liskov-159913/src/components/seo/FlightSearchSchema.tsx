import { useEffect } from 'react';

/**
 * FlightSearchSchema Component
 * Injects SearchAction structured data for flight search pages
 * SEO-safe, OTA-compliant - no affiliate/partner references
 */

interface FlightSearchSchemaProps {
  origin?: string;
  destination?: string;
}

const SITE_URL = 'https://hizivo.com';

export default function FlightSearchSchema({ origin, destination }: FlightSearchSchemaProps) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ZIVO Flights",
      "url": `${SITE_URL}/flights`,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/flights/results?origin={origin}&dest={destination}&depart={departureDate}`,
          "actionPlatform": [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform"
          ]
        },
        "query-input": [
          "required name=origin",
          "required name=destination",
          "required name=departureDate"
        ]
      },
      "provider": {
        "@type": "Organization",
        "name": "ZIVO",
        "url": SITE_URL,
        "logo": `${SITE_URL}/logo.png`
      }
    };

    // Remove existing schema
    const existingScript = document.querySelector('script[data-schema="flight-search"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject new script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'flight-search');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[data-schema="flight-search"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [origin, destination]);

  return null;
}
