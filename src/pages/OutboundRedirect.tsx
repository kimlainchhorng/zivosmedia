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
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { logOutboundClick } from "@/lib/outboundTracking";
import { isAllowedPartnerUrl, sanitizePartnerName } from "@/lib/urlSafety";
import SEOHead from "@/components/SEOHead";
import AppLayout from "@/components/app/AppLayout";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";

const RENTAL_SEARCH_KEYS = [
  "pickup",
  "pickup_date",
  "pickup_time",
  "dropoff_date",
  "dropoff_time",
  "age",
] as const;

function buildRentalResultsReturnPath(searchParams: URLSearchParams) {
  const rentalParams = new URLSearchParams();

  for (const key of RENTAL_SEARCH_KEYS) {
    const value = searchParams.get(key);
    if (value) rentalParams.set(key, value);
  }

  const query = rentalParams.toString();
  return query ? `/rent-car/results?${query}` : "/rent-car";
}

export default function OutboundRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "loading" | "ready" | "redirecting" | "error" | "blocked"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [finalUrl, setFinalUrl] = useState<string>("");
  const isRentalProviderHandoff =
    searchParams.get("page") === "car-results-provider-handoff";
  const useAppShell =
    isRentalProviderHandoff &&
    typeof window !== "undefined" &&
    !isZivoTravelHost();
  const rentalResultsReturnPath = buildRentalResultsReturnPath(searchParams);

  useEffect(() => {
    const partnerId = searchParams.get("partner");
    const name = searchParams.get("name");
    const product = searchParams.get("product");
    const pageSource = searchParams.get("page");
    const destinationUrl = searchParams.get("url");

    setPartnerName(sanitizePartnerName(name || "Partner"));

    // Validate required params
    if (!partnerId || !destinationUrl) {
      setStatus("error");
      setErrorMessage("Missing required parameters");
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
      console.warn(
        "[OutboundRedirect] Blocked redirect to unallowed domain:",
        decodedUrl,
      );
      setStatus("blocked");
      return;
    }

    // Log the click and get the final URL with SubID
    const processRedirect = async () => {
      const result = await logOutboundClick({
        partnerId,
        partnerName: sanitizePartnerName(name || partnerId),
        product: product || "general",
        pageSource: pageSource || "unknown",
        destinationUrl: decodedUrl,
      });

      setFinalUrl(result.finalUrl);
      setStatus("ready");
    };

    processRedirect();
  }, [searchParams]);

  const handleReturn = () => {
    const historyIndex =
      typeof window !== "undefined" ? window.history.state?.idx : null;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(rentalResultsReturnPath, { replace: true });
  };

  const handleContinue = async () => {
    setStatus("redirecting");
    try {
      const { openExternalUrl } = await import("@/lib/openExternalUrl");
      await openExternalUrl(finalUrl);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorMessage("Failed to open link. Click the link below to continue.");
    }
  };

  const StatusHeading = useAppShell ? "h2" : "h1";

  const redirectContent = (
    <div className="max-w-md w-full text-center space-y-6">
      {isRentalProviderHandoff && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleReturn}
            aria-label="Back to rental results"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to rental results
          </button>
        </div>
      )}

      {!useAppShell && (
        <div className="flex justify-center">
          <Link
            to="/"
            className="text-3xl font-bold bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent"
          >
            ZIVO
          </Link>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Preparing your redirect...</p>
        </div>
      )}

      {status === "ready" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-lg hover:border-primary/20 hover:shadow-xl transition-all duration-200">
            <ExternalLink className="w-12 h-12 mx-auto text-primary mb-4" />

            <StatusHeading className="text-xl font-semibold mb-2">
              {isRentalProviderHandoff ? "Continue to" : "Redirecting to"}{" "}
              {partnerName}
            </StatusHeading>

            <p className="text-muted-foreground text-sm mb-6">
              {isRentalProviderHandoff
                ? `Open ${partnerName} to see current vehicles, exact rental terms, and the final price.`
                : "You're leaving ZIVO to complete your booking on a trusted partner website."}
            </p>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-3 px-6 rounded-xl bg-ig-gradient text-white font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation min-h-[48px] shadow-lg shadow-primary/20"
            >
              {isRentalProviderHandoff ? "Open" : "Continue to"} {partnerName}
              <ExternalLink className="w-4 h-4" />
            </button>

            <p className="text-xs text-muted-foreground mt-4">
              {isRentalProviderHandoff
                ? "Opens the partner site"
                : "Opens in a new tab"}
            </p>
          </div>

          <p className="text-xs text-muted-foreground px-4">
            ZIVO may earn a commission when you book through partner links. This
            is at no extra cost to you.
          </p>
        </div>
      )}

      {status === "redirecting" && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground">Opening partner site...</p>
        </div>
      )}

      {status === "blocked" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-card border border-destructive/30 shadow-lg">
            <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
            <StatusHeading className="text-xl font-semibold mb-2">
              Link Blocked
            </StatusHeading>
            <p className="text-muted-foreground text-sm">
              This redirect destination is not a recognized ZIVO partner. For
              your safety, we've blocked this request.
            </p>
          </div>

          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Return to ZIVO
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-card border border-destructive/30 shadow-lg">
            <p className="text-destructive font-medium mb-2">
              {errorMessage || "Something went wrong"}
            </p>

            {searchParams.get("url") &&
              (() => {
                try {
                  const decoded = decodeURIComponent(
                    searchParams.get("url") || "",
                  );
                  return isAllowedPartnerUrl(decoded) ? (
                    <button
                      type="button"
                      onClick={() =>
                        import("@/lib/openExternalUrl").then(
                          ({ openExternalUrl }) => openExternalUrl(decoded),
                        )
                      }
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

          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Return to ZIVO
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <SEOHead
        title={
          useAppShell && partnerName
            ? `Continue to ${partnerName} | ZIVO`
            : "Redirecting - ZIVO"
        }
        description={
          useAppShell
            ? "Review the rental partner handoff before leaving ZIVO."
            : "You are being redirected to our trusted partner."
        }
        noIndex
      />

      {useAppShell ? (
        <div
          data-rental-provider-app-shell
          className="lg:[&>div>header]:hidden"
        >
          <AppLayout
            title="Rental Partner"
            className="bg-muted/20 lg:!pt-[88px]"
          >
            <div
              id="main-content"
              tabIndex={-1}
              className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-xl items-center justify-center px-4 py-8 outline-none"
            >
              {redirectContent}
            </div>
          </AppLayout>
        </div>
      ) : (
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-screen bg-background flex items-center justify-center p-4 outline-none"
        >
          {redirectContent}
        </main>
      )}
    </>
  );
}
