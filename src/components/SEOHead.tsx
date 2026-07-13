import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isZivoTravelHost, ZIVO_TRAVEL_ORIGIN } from '@/config/zivoTravelDomain';

const SITE_URL = 'https://zivosmedia.com';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noIndex?: boolean;
  ogImage?: string;
  /** Optional JSON-LD structured data object (or array of objects) */
  structuredData?: object | object[];
  /** Article published/modified date for article type */
  publishedTime?: string;
  modifiedTime?: string;
  /** App deep link for app indexing (e.g. "zivo://rides") */
  appLink?: string;
}

export default function SEOHead({
  title,
  description,
  canonical,
  type = 'website',
  noIndex = false,
  ogImage = '/og-image.png',
  structuredData,
  publishedTime,
  modifiedTime,
  appLink,
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && isZivoTravelHost()
        ? ZIVO_TRAVEL_ORIGIN
        : SITE_URL;
    const canonicalUrl = canonical
      ? (canonical.startsWith('http') ? canonical : `${origin}${canonical}`)
      : `${origin}${location.pathname}`;

    const resolvedOgImage =
      origin === ZIVO_TRAVEL_ORIGIN && ogImage === '/og-image.png'
        ? '/og-zivo-travel.jpg'
        : ogImage;
    const ogImageUrl = resolvedOgImage.startsWith('http') ? resolvedOgImage : `${origin}${resolvedOgImage}`;
    const siteName = origin === ZIVO_TRAVEL_ORIGIN ? 'Zivo Travel' : 'ZIVO';

    // robots
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    document.title = title;

    setMeta('name', 'description', description);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:site', '@ZivoApp');
    setMeta('name', 'twitter:image', ogImageUrl);
    setMeta('name', 'twitter:image:alt', title);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type === 'product' || type === 'profile' ? 'website' : type);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', ogImageUrl);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:image:alt', title);
    setMeta('property', 'og:site_name', siteName);
    setMeta('property', 'og:locale', 'en_US');
    if (import.meta.env.VITE_META_APP_ID) {
      setMeta('property', 'fb:app_id', import.meta.env.VITE_META_APP_ID);
    }

    if (publishedTime) setMeta('property', 'article:published_time', publishedTime);
    if (modifiedTime) setMeta('property', 'article:modified_time', modifiedTime);

    // Apple/Android app deep link
    if (appLink) {
      setMeta('name', 'al:ios:url', appLink);
      setMeta('name', 'al:ios:app_store_id', '6759480121');
      setMeta('name', 'al:ios:app_name', 'ZIVO');
      setMeta('name', 'al:android:url', appLink);
      setMeta('name', 'al:android:package', 'com.zivo.app');
      setMeta('name', 'al:android:app_name', 'ZIVO');
    }

    // canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // structured data injection
    const SCRIPT_ID = 'seo-head-jsonld';
    let existingScript = document.getElementById(SCRIPT_ID);
    if (structuredData) {
      if (!existingScript) {
        existingScript = document.createElement('script');
        existingScript.setAttribute('type', 'application/ld+json');
        existingScript.id = SCRIPT_ID;
        document.head.appendChild(existingScript);
      }
      const data = origin === SITE_URL
        ? structuredData
        : JSON.parse(JSON.stringify(structuredData).split(SITE_URL).join(origin));
      existingScript.textContent = JSON.stringify(Array.isArray(data) ? data : data);
    } else if (existingScript) {
      existingScript.remove();
    }

    if (origin === ZIVO_TRAVEL_ORIGIN) {
      const appleAppMeta = document.querySelector('meta[name="apple-itunes-app"]') || document.createElement('meta');
      appleAppMeta.setAttribute('name', 'apple-itunes-app');
      appleAppMeta.setAttribute('content', `app-id=6759480121, app-argument=${ZIVO_TRAVEL_ORIGIN}`);
      if (!appleAppMeta.parentElement) document.head.appendChild(appleAppMeta);

      document.head.querySelectorAll('link[href*="zivosmedia.com"]').forEach((link) => {
        if (link.getAttribute('rel') === 'alternate') link.remove();
      });
      document.head.querySelectorAll('meta[content*="zivosmedia.com"]').forEach((meta) => {
        if (meta.getAttribute('name') !== 'apple-itunes-app') meta.remove();
      });
      document.head.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        const text = script.textContent || '';
        if (script.id !== SCRIPT_ID && (text.includes(SITE_URL) || text.includes('zivosmedia.com'))) {
          script.remove();
        }
      });
    }

    return () => {
      // Only clean up the JSON-LD blob this instance owns; let the next route's SEOHead
      // (or the homepage's static <title>/<meta>) overwrite the rest. Hardcoding a reset
      // here causes back-navigation to flash stale strings into <head>.
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [title, description, canonical, type, noIndex, ogImage, structuredData, publishedTime, modifiedTime, appLink, location.pathname]);

  return null;
}

function setMeta(attrType: 'name' | 'property', key: string, value: string) {
  const selector = `meta[${attrType}="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrType, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}
