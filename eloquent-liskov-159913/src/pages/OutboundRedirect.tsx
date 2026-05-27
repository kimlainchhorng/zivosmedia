/**
 * ZIVO Outbound Redirect Page
 * 
 * All affiliate CTAs route through this page for tracking
 * URL format: /out?partner=XXXX&name=NAME&product=PRODUCT&page=PAGE&url=ENCODED_URL
 * 
 * SECURITY: Only allows redirects to pre-approved partner domains.
 * Blocks open-redirect attacks where attacker crafts phishing links.
 */

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { logOutboundClick } from "@/lib/outboundTracking";
import { isAllowedPartnerUrl, sanitizePartnerName } from "@/lib/urlSafety";
import SEOHead from "@/components/SEOHead";

export default function OutboundRedirect() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'redirecting' | 'error' | 'blocked'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');
  const [finalUrl, setFinalUrl] = useState<string>('');
  
  useEffect(() => {
    const partnerId = searchParams.get('partner');
    const name = searchParams.get('name');
    const product = searchParams.get('product');
    const pageSource = searchParams.get('page');
    const destinationUrl = searchParams.get('url');
    
    setPartnerName(sanitizePartnerName(name || 'Partner'));
    
    // Validate required params
    if (!partnerId || !destinationUrl) {
      setStatus('error');
      setErrorMessage('Missing required parameters');
      return;
    }
    
    // Decode URL if needed
    let decodedUrl = destinationUrl;
    try {
      decodedUrl = decodeURIComponent(destinationUrl);
    } catch {
      // URL was not encoded
    }
    
    // SECURITY: Validate destination against allowed partner domains
    if (!isAllowedPartnerUrl(decodedUrl)) {
      console.warn('[OutboundRedirect] Blocked redirect to unallowed domain:', decodedUrl);
      setStatus('blocked');
      return;
    }
    
    // Log the click and get the final URL with SubID
    const processRedirect = async () => {
      const result = await logOutboundClick({
        partnerId,
        partnerName: sanitizePartnerName(name || partnerId),
        product: product || 'general',
        pageSource: pageSource || 'unknown',
        destinationUrl: decodedUrl,
      });
      
      setFinalUrl(result.finalUrl);
      setStatus('ready');
    };
    
    processRedirect();
  }, [searchParams]);

  const handleContinue = async () => {
    setStatus('redirecting');
    try {
      const { openExternalUrl } = await import("@/lib/openExternalUrl");
      await openExternalUrl(finalUrl);
    } catch {
      setStatus('error');
      setErrorMessage('Failed to open link. Click the link below to continue.');
    }
  };
  
  return (
    <>
      <SEOHead 
        title="Redirecting - ZIVO"
        description="You are being redirected to our trusted partner."
        noIndex
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
              ZIVO
            </Link>
          </div>
          
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground">Preparing your redirect...</p>
            </div>
          )}
          
          {status === 'ready' && (
            <div className="space-y-6">
              {/* Interstitial Message */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-lg hover:border-primary/20 hover:shadow-xl transition-all duration-200">
                <ExternalLink className="w-12 h-12 mx-auto text-primary mb-4" />
                
                <h1 className="text-xl font-semibold mb-2">
                  Redirecting to {partnerName}
                </h1>
                
                <p className="text-muted-foreground text-sm mb-6">
                  You're leaving ZIVO to complete your booking on a trusted partner website.
                </p>
                
                {/* Continue Button */}
                <button type="button"
                  onClick={handleContinue}
                  className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation min-h-[48px] shadow-lg shadow-primary/20"
                >
                  Continue to {partnerName}
                  <ExternalLink className="w-4 h-4" />
                </button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Opens in a new tab
                </p>
              </div>
              
              {/* Disclosure */}
              <p className="text-xs text-muted-foreground px-4">
                ZIVO may earn a commission when you book through partner links. 
                This is at no extra cost to you.
              </p>
            </div>
          )}
          
          {status === 'redirecting' && (
            <div className="space-y-4">
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground">Opening partner site...</p>
            </div>
          )}

          {status === 'blocked' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-card border border-destructive/30 shadow-lg">
                <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
                <h1 className="text-xl font-semibold mb-2">
                  Link Blocked
                </h1>
                <p className="text-muted-foreground text-sm">
                  This redirect destination is not a recognized ZIVO partner.
                  For your safety, we've blocked this request.
                </p>
              </div>
              
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Return to ZIVO
              </Link>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-card border border-destructive/30 shadow-lg">
                <p className="text-destructive font-medium mb-2">
                  {errorMessage || 'Something went wrong'}
                </p>
                
                {/* Only show fallback link if the URL is an allowed domain */}
                {searchParams.get('url') && (() => {
                  try {
                    const decoded = decodeURIComponent(searchParams.get('url') || '');
                    return isAllowedPartnerUrl(decoded) ? (
                      <button type="button"
                        onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(decoded))}
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Click here to continue to partner site
                      </button>
                    ) : null;
                  } catch {
                    return null;
                  }
                })()}
              </div>
              
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Return to ZIVO
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
