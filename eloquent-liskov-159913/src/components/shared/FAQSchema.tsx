import { useEffect } from 'react';

/**
 * FAQ Schema Component for SEO
 * Injects structured data (JSON-LD) for FAQ pages
 * to enable rich snippets in search results
 */

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
  pageType?: 'flights' | 'hotels' | 'cars' | 'general';
}

export default function FAQSchema({ faqs, pageType = 'general' }: FAQSchemaProps) {
  useEffect(() => {
    // Create the JSON-LD structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    // Check if script already exists
    const existingScript = document.querySelector(`script[data-faq-schema="${pageType}"]`);
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject the script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-faq-schema', pageType);
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector(`script[data-faq-schema="${pageType}"]`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [faqs, pageType]);

  return null; // This component only injects the schema, no visible output
}
