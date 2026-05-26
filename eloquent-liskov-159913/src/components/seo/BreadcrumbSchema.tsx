import { useEffect } from 'react';

/**
 * BreadcrumbSchema Component for SEO
 * Injects JSON-LD structured data for breadcrumb navigation
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

const SITE_URL = 'https://hizivo.com';

export default function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
      }))
    };

    // Remove existing breadcrumb schema
    const existingScript = document.querySelector('script[data-breadcrumb-schema="true"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject new script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb-schema', 'true');
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[data-breadcrumb-schema="true"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [items]);

  return null;
}
