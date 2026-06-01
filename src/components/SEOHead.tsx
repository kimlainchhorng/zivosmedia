import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ANDROID_APP_PACKAGE, IOS_APP_STORE_ID } from '@/lib/deepLinks';

const SITE_URL = 'https://zivollc.com';
const META_APP_ID = import.meta.env.VITE_META_APP_ID?.trim();

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noIndex?: boolean;
  ogImage?: string;
  keywords?: string[] | string;
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
  keywords,
  structuredData,
  publishedTime,
  modifiedTime,
  appLink,
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = canonical
      ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`)
      : `${SITE_URL}${location.pathname}`;

    const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

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
    setMeta('name', 'application-name', 'ZIVO');
    setMeta('name', 'apple-mobile-web-app-title', 'ZIVO');
    setMeta('name', 'theme-color', '#ffffff');
    if (keywords) {
      setMeta('name', 'keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
    } else {
      removeMeta('name', 'keywords');
    }
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
    setMeta('property', 'og:site_name', 'ZIVO');
    setMeta('property', 'og:locale', 'en_US');
    setMeta('property', 'al:web:url', canonicalUrl);
    if (META_APP_ID) setMeta('property', 'fb:app_id', META_APP_ID);

    if (publishedTime) setMeta('property', 'article:published_time', publishedTime);
    if (modifiedTime) setMeta('property', 'article:modified_time', modifiedTime);

    // Apple/Android app deep link
    if (appLink) {
      setMeta('property', 'al:ios:url', appLink);
      setMeta('property', 'al:ios:app_store_id', IOS_APP_STORE_ID);
      setMeta('property', 'al:ios:app_name', 'ZIVO');
      setMeta('property', 'al:android:url', appLink);
      setMeta('property', 'al:android:package', ANDROID_APP_PACKAGE);
      setMeta('property', 'al:android:app_name', 'ZIVO');
      setMeta('name', 'apple-itunes-app', `app-id=${IOS_APP_STORE_ID}, app-argument=${appLink}`);
    } else {
      removeMeta('property', 'al:ios:url');
      removeMeta('property', 'al:ios:app_store_id');
      removeMeta('property', 'al:ios:app_name');
      removeMeta('property', 'al:android:url');
      removeMeta('property', 'al:android:package');
      removeMeta('property', 'al:android:app_name');
      removeMeta('name', 'apple-itunes-app');
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
      existingScript.textContent = JSON.stringify(
        Array.isArray(structuredData) ? structuredData : structuredData
      );
    } else if (existingScript) {
      existingScript.remove();
    }

    return () => {
      // Only clean up the JSON-LD blob this instance owns; let the next route's SEOHead
      // (or the homepage's static <title>/<meta>) overwrite the rest. Hardcoding a reset
      // here causes back-navigation to flash stale strings into <head>.
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [title, description, canonical, type, noIndex, ogImage, keywords, structuredData, publishedTime, modifiedTime, appLink, location.pathname]);

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

function removeMeta(attrType: 'name' | 'property', key: string) {
  document.querySelector(`meta[${attrType}="${key}"]`)?.remove();
}
