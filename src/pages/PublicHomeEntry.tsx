import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react';
import { BrowserRouter } from 'react-router-dom';
import CambodiaHome from './CambodiaHome';
const CookieConsent = lazy(async () => {
  const loadStyles = (window as Window & { __zivoLoadPublicStyles?: () => Promise<void> }).__zivoLoadPublicStyles;
  const [component] = await Promise.all([import('@/components/common/CookieConsent'), loadStyles?.()]);
  return component;
});
import { authSupabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

/** The anonymous web homepage does not initialize the authenticated app shell. */
export default function PublicHomeEntry() {
  const leaving = useRef(false);
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    const cleanup = () => events.forEach(name => window.removeEventListener(name, reveal));
    const reveal = () => { setInteracted(true); cleanup(); };
    events.forEach(name => window.addEventListener(name, reveal, { once: true, passive: true }));
    return cleanup;
  }, []);
  useEffect(() => {
    let active = true;
    // Update an existing installation without precaching the full app for new visitors.
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration()
        .then(registration => registration?.update())
        .catch(() => { /* An offline visitor can continue reading the public page. */ });
    }
    const showFeed = () => {
      if (active && !leaving.current) {
        leaving.current = true;
        window.location.replace('/feed');
      }
    };
    void authSupabase.auth.getSession().then(({ data }) => {
      if (data.session) showFeed();
    }).catch(() => { /* Public information stays available when session recovery fails. */ });
    const { data: { subscription } } = authSupabase.auth.onAuthStateChange((_event, session) => {
      if (session) showFeed();
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const enterApp = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === '/') return;
    event.preventDefault();
    event.stopPropagation();
    leaving.current = true;
    window.location.assign(url.href);
  };

  return <ErrorBoundary><BrowserRouter><div onClickCapture={enterApp}><CambodiaHome />{interacted && <Suspense fallback={null}><CookieConsent interactionDetected /></Suspense>}</div></BrowserRouter></ErrorBoundary>;
}
