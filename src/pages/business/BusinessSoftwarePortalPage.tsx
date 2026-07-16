import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  LockKeyhole,
  Menu,
  Package,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useSoftwarePricingCatalog } from "@/hooks/useSoftwarePricingCatalog";
import { resolveSoftwarePortalAccountDashboardPath } from "@/lib/business/softwarePortal";
import {
  catalogAnnualSavingsPercent,
  catalogBillingAmountCents,
  catalogMonthlyAmountCents,
  formatTrialLabel,
  formatUSDCents,
} from "@/lib/software/publicPricingCatalog";

const navigation = [
  ["Product", "#product"],
  ["Features", "#features"],
  ["Industries", "#industries"],
  ["Pricing", "#pricing"],
  ["Security", "#security"],
  ["Contact", "#contact"],
] as const;

const SOFTWARE_PAGE_TITLE = "ZIVO Software | Business Management Software";
const SOFTWARE_PAGE_DESCRIPTION =
  "Business management software for customers, vehicles, appointments, inspections, estimates, repair orders, invoices, inventory, staff and reporting.";
const SOFTWARE_PAGE_CANONICAL = "https://zivosoftware.com/business";

const modules = [
  {
    title: "Customers",
    copy: "Keep contact history, notes, and service context connected to every interaction.",
    icon: Users,
  },
  {
    title: "Vehicles",
    copy: "Keep vehicle details and service context with the customer record.",
    icon: ClipboardList,
  },
  {
    title: "Appointments",
    copy: "See bookings, staff availability, and upcoming work from one clear schedule.",
    icon: CalendarDays,
  },
  {
    title: "Inspections",
    copy: "Record technician findings before an estimate is sent for approval.",
    icon: ClipboardList,
  },
  {
    title: "Repair orders",
    copy: "Move approved work through a traceable repair-order lifecycle.",
    icon: ClipboardList,
  },
  {
    title: "Estimates",
    copy: "Prepare priced work and collect customer decisions from the saved document.",
    icon: FileText,
  },
  {
    title: "Invoices & payments",
    copy: "Create invoices, track balances, and keep payment activity with the work it covers.",
    icon: CreditCard,
  },
  {
    title: "Inventory & parts",
    copy: "Know what is on hand, what was used, and what needs attention before the day gets busy.",
    icon: Package,
  },
  {
    title: "Employees & access",
    copy: "Keep team access, assignments, and owner-controlled settings in the right workspace.",
    icon: Users,
  },
  {
    title: "Reporting",
    copy: "Review recorded revenue, workflow volume, and team activity without stitching together spreadsheets.",
    icon: BarChart3,
  },
  {
    title: "Reminders",
    copy: "Use owner-configured customer reminders and communication preferences.",
    icon: CalendarDays,
  },
];

const workflow = [
  "Customer arrives",
  "Add a vehicle or decode a VIN",
  "Create an appointment",
  "Perform an inspection",
  "Prepare an estimate",
  "Record customer approval or rejection",
  "Complete the repair order",
  "Issue an invoice",
  "Collect payment and send a receipt",
  "Review the customer history",
];

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SETUP_PATH = "/business/new";
const LOGIN_PATH = "/login?redirect=%2Fbusiness";
const SIGNUP_PATH = `/signup?redirect=${encodeURIComponent(SETUP_PATH)}`;

function BrandMark() {
  return (
    <span className="sl-brand-mark" aria-hidden="true">
      <span>Z</span>
    </span>
  );
}

function ProductPreview() {
  return (
    <figure className="sl-preview" aria-labelledby="product-preview-caption">
      <div className="sl-preview-topbar">
        <div className="sl-preview-brand">
          <BrandMark />
          <strong>ZIVO</strong>
        </div>
        <div className="sl-preview-topbar-actions" aria-hidden="true">
          <span />
          <span />
          <i />
        </div>
      </div>
      <div className="sl-preview-body">
        <aside className="sl-preview-sidebar" aria-hidden="true">
          <b>Workspace</b>
          <span className="active">Overview</span>
          <span>Customers</span>
          <span>Calendar</span>
          <span>Work orders</span>
          <span>Invoices</span>
          <span>Reports</span>
        </aside>
        <div className="sl-preview-content">
          <div className="sl-preview-heading">
            <div>
              <small>Signed-in workspace</small>
              <strong>Live business data stays private to your account</strong>
            </div>
            <span className="sl-preview-status">Secure access</span>
          </div>
          <div className="sl-preview-kpis">
            <div>
              <small>Customer records</small>
              <strong>Private</strong>
              <span>Shown only after sign-in</span>
            </div>
            <div>
              <small>Operational data</small>
              <strong>Scoped</strong>
              <span>From your workspace</span>
            </div>
            <div>
              <small>Payments</small>
              <strong>Recorded</strong>
              <span>Against source records</span>
            </div>
          </div>
          <div className="sl-preview-grid">
            <div className="sl-preview-card">
              <strong>Account-specific workspace</strong>
              <p>Operational records load after you sign in to an authorized business account.</p>
            </div>
            <div className="sl-preview-card">
              <strong>Public-page policy</strong>
              <p>No customer, booking, work-order, invoice, or payment records are shown here.</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption id="product-preview-caption" className="sl-preview-caption">
        Interface preview — live account data appears only in a signed-in workspace.
      </figcaption>
    </figure>
  );
}

function buildPlanActionPath(
  planId: string,
  userId: string | undefined,
  ownerStoreId: string | undefined,
  dashboardPath: string,
) {
  const selectedSetupPath = `${SETUP_PATH}?plan_id=${encodeURIComponent(planId)}&cycle=monthly`;
  if (!userId) {
    return `/signup?redirect=${encodeURIComponent(selectedSetupPath)}`;
  }
  if (!ownerStoreId) {
    return selectedSetupPath;
  }

  const [pathname, existingQuery = ""] = dashboardPath.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  params.set("tab", "subscriptions");
  params.set("plan_id", planId);
  params.set("cycle", "monthly");
  return `${pathname}?${params.toString()}`;
}

export default function BusinessSoftwarePortalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: ownerStore, isLoading: ownerStoreLoading } = useOwnerStoreProfile();
  const {
    data: pricingPlans,
    isPending: pricingPending,
    isError: pricingError,
  } = useSoftwarePricingCatalog();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const shouldReturnMenuFocus = useRef(false);

  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const mediaDashboardUrl =
    typeof user?.user_metadata?.zivo_media_dashboard_url === "string"
      ? user.user_metadata.zivo_media_dashboard_url
      : null;
  const accountDashboardPath = resolveSoftwarePortalAccountDashboardPath(
    ownerStore,
    currentHostname,
    mediaDashboardUrl,
  );
  const hasWorkspace = Boolean(ownerStore?.id);
  const accountLoading = authLoading || (Boolean(user) && ownerStoreLoading);
  const primaryPath = !user ? SIGNUP_PATH : hasWorkspace ? accountDashboardPath : SETUP_PATH;
  const primaryLabel = !user ? "Start free trial" : hasWorkspace ? "Open dashboard" : "Finish setup";
  const pricingUnavailable =
    pricingError || (!pricingPending && (!pricingPlans || pricingPlans.length === 0));
  const trialDays = pricingPlans
    ? [...new Set(pricingPlans.map((plan) => plan.trialDays))]
    : [];
  const trialNote = pricingPending
    ? "Checking current plan availability…"
    : pricingUnavailable
      ? "Current plan availability is temporarily unavailable. Checkout stays unavailable until pricing can be confirmed."
      : trialDays.length === 1 && trialDays[0] > 0
        ? `${formatTrialLabel(trialDays[0])} available on supported plans. Existing subscriptions are managed from billing.`
        : "Trial availability is shown with each active plan.";

  const closeMenu = useCallback(() => {
    shouldReturnMenuFocus.current = true;
    setMenuOpen(false);
  }, []);

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
      return;
    }
    setMenuOpen(true);
  };

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionTags = Array.from(document.head.querySelectorAll<HTMLMetaElement>('meta[name="description"]'));
    const descriptionTag = descriptionTags[0] ?? document.createElement("meta");
    const descriptionWasCreated = descriptionTags.length === 0;
    const previousDescription = descriptionTag.getAttribute("content");
    if (descriptionWasCreated) {
      descriptionTag.name = "description";
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = SOFTWARE_PAGE_DESCRIPTION;
    descriptionTags.slice(1).forEach((tag) => tag.remove());

    const canonicalTags = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    const canonicalTag = canonicalTags[0] ?? document.createElement("link");
    const canonicalWasCreated = canonicalTags.length === 0;
    const previousCanonical = canonicalTag.getAttribute("href");
    if (canonicalWasCreated) {
      canonicalTag.rel = "canonical";
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = SOFTWARE_PAGE_CANONICAL;
    canonicalTags.slice(1).forEach((tag) => tag.remove());
    document.title = SOFTWARE_PAGE_TITLE;

    return () => {
      if (document.title === SOFTWARE_PAGE_TITLE) document.title = previousTitle;
      if (descriptionWasCreated) {
        descriptionTag.remove();
      } else if (descriptionTag.content === SOFTWARE_PAGE_DESCRIPTION) {
        if (previousDescription === null) descriptionTag.removeAttribute("content");
        else descriptionTag.content = previousDescription;
      }
      if (canonicalWasCreated) {
        canonicalTag.remove();
      } else if (canonicalTag.href === SOFTWARE_PAGE_CANONICAL) {
        if (previousCanonical === null) canonicalTag.removeAttribute("href");
        else canonicalTag.href = previousCanonical;
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      if (shouldReturnMenuFocus.current) {
        shouldReturnMenuFocus.current = false;
        menuButtonRef.current?.focus();
      }
      return;
    }

    const menu = mobileMenuRef.current;
    if (!menu) return;
    const getFocusableElements = () =>
      Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
      );
    getFocusableElements()[0]?.focus();

    const keepFocusInMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInMenu);
    return () => document.removeEventListener("keydown", keepFocusInMenu);
  }, [closeMenu, menuOpen]);

  return (
    <>
      <main className="software-landing">
        <a className="sl-skip-link" href="#software-main">
          Skip to main content
        </a>

        <header className="sl-header">
          <div className="sl-header-inner">
            <Link to="/business" className="sl-brand" aria-label="ZIVO Software home">
              <BrandMark />
              <span>
                <strong>ZIVO</strong>
                <small>Software</small>
              </span>
            </Link>

            <nav className="sl-nav" aria-label="Primary navigation">
              {navigation.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </nav>

            <div className="sl-header-actions">
              {accountLoading ? (
                <span className="sl-action-skeleton" role="status" aria-label="Loading account state" />
              ) : !user ? (
                <>
                  <Link className="sl-text-action" to={LOGIN_PATH}>
                    Log in
                  </Link>
                  <Link className="sl-button sl-button-primary" to={SIGNUP_PATH}>
                    Start free trial
                  </Link>
                </>
              ) : (
                <>
                  {ownerStore?.name ? (
                    <span className="sl-account-name" title={ownerStore.name}>
                      {ownerStore.name}
                    </span>
                  ) : null}
                  <Link className="sl-button sl-button-primary" to={primaryPath}>
                    {primaryLabel}
                    <ArrowRight />
                  </Link>
                </>
              )}
              <button
                ref={menuButtonRef}
                type="button"
                className="sl-menu-button"
                aria-controls="software-mobile-menu"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={toggleMenu}
              >
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          <div
            ref={mobileMenuRef}
            id="software-mobile-menu"
            className="sl-mobile-menu"
            hidden={!menuOpen}
          >
            <nav aria-label="Mobile navigation">
              {navigation.map(([label, href]) => (
                <a key={href} href={href} onClick={closeMenu}>
                  {label}
                  <ChevronRight />
                </a>
              ))}
            </nav>
            <div className="sl-mobile-actions">
              {accountLoading ? (
                <span className="sl-action-skeleton" role="status" aria-label="Loading account state" />
              ) : (
                <>
                  {!user ? (
                    <Link className="sl-text-action" to={LOGIN_PATH} onClick={closeMenu}>
                      Log in
                    </Link>
                  ) : null}
                  <Link className="sl-button sl-button-primary" to={primaryPath} onClick={closeMenu}>
                    {primaryLabel}
                    <ArrowRight />
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <div id="software-main" tabIndex={-1}>
          <section className="sl-hero" id="product">
            <div className="sl-container sl-hero-grid">
              <div className="sl-hero-copy">
                <span className="sl-eyebrow">Business software that fits the workday</span>
                <h1>Run the work. Keep the whole business in view.</h1>
                <p>
                  Bring customers, bookings, work orders, invoices, inventory, staff, and reporting
                  into one focused workspace.
                </p>
                <div className="sl-hero-actions">
                  <Link className="sl-button sl-button-primary" to={primaryPath}>
                    {primaryLabel}
                    <ArrowRight />
                  </Link>
                  <a className="sl-button sl-button-secondary" href="#features">
                    See the product
                  </a>
                </div>
                <p className="sl-trial-note">
                  <Check />
                  {trialNote}
                </p>
              </div>
              <ProductPreview />
            </div>
          </section>

          <section className="sl-section" id="features">
            <div className="sl-container">
              <div className="sl-section-heading">
                <span className="sl-eyebrow">Built for daily operations</span>
                <h2>The core work, connected.</h2>
                <p>
                  Each module shares the context your team needs, so the next action is clear without
                  switching tools.
                </p>
              </div>
              <div className="sl-module-grid">
                {modules.map(({ title, copy, icon: Icon }) => (
                  <article key={title}>
                    <span>
                      <Icon />
                    </span>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="sl-workflow" id="industries">
            <div className="sl-container sl-workflow-grid">
              <div>
                <span className="sl-eyebrow">Available today</span>
                <h2>Built for the auto-repair workday.</h2>
                <p>
                  The current ZIVO Software workspace is for auto repair. Other business verticals are
                  planned and are not presented as available workspaces.
                </p>
                <div className="sl-industry-tags">
                  <span>Auto repair workspace</span>
                  <span>Other verticals planned</span>
                </div>
              </div>
              <ol>
                {workflow.map((step, index) => (
                  <li key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step}</strong>
                    <Check />
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="sl-section sl-pricing-section" id="pricing">
            <div className="sl-container">
              <div className="sl-section-heading">
                <span className="sl-eyebrow">Server-confirmed pricing</span>
                <h2>Choose a plan that matches your operation.</h2>
                <p>
                  Active plan amounts and trial availability come from the billing catalog. All prices
                  shown are in USD; annual billing is billed once each year.
                </p>
              </div>

              {pricingPending ? (
                <div className="sl-pricing-unavailable" aria-live="polite">
                  <p>Checking current plan availability…</p>
                  <button className="sl-button sl-button-secondary" type="button" disabled>
                    Checkout unavailable
                  </button>
                </div>
              ) : null}

              {pricingUnavailable ? (
                <div className="sl-pricing-unavailable" role="alert">
                  <p>
                    Current pricing is temporarily unavailable. Please try again later or contact
                    support before starting checkout.
                  </p>
                  <button className="sl-button sl-button-secondary" type="button" disabled>
                    Checkout unavailable
                  </button>
                </div>
              ) : null}

              {!pricingPending && !pricingUnavailable && pricingPlans ? (
                <div className="sl-pricing-grid">
                  {pricingPlans.map((plan) => {
                    const annualSavings = catalogAnnualSavingsPercent(plan);
                    const actionPath = buildPlanActionPath(
                      plan.monthlyPlanId,
                      user?.id,
                      ownerStore?.id,
                      accountDashboardPath,
                    );
                    return (
                      <article key={plan.id} className={plan.featured ? "is-featured" : ""}>
                        {plan.featured ? <span className="sl-popular">Most popular</span> : null}
                        <h3>{plan.displayName}</h3>
                        <p>{plan.tagline}</p>
                        <div className="sl-price">
                          <strong>{formatUSDCents(catalogMonthlyAmountCents(plan, "monthly"))}</strong>
                          <span>/month</span>
                        </div>
                        <p className="sl-annual">
                          or {formatUSDCents(catalogBillingAmountCents(plan, "annual"))}/year
                          {annualSavings ? ` · save ${annualSavings}%` : ""}
                        </p>
                        <Link
                          className={`sl-button ${plan.featured ? "sl-button-primary" : "sl-button-secondary"}`}
                          to={actionPath}
                        >
                          {plan.trialDays > 0
                            ? `Start ${formatTrialLabel(plan.trialDays)}`
                            : "Select plan"}
                        </Link>
                        <ul>
                          {plan.features.map((feature) => (
                            <li key={feature}>
                              <Check />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {Object.entries(plan.limits).map(([label, value]) => (
                            <li key={label}>
                              <Check />
                              <span>
                                <strong>{label.replaceAll("_", " ")}:</strong> {value}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="sl-plan-terms">
                          {plan.support} {plan.cancellationTerms}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>

          <section className="sl-security" id="security">
            <div className="sl-container sl-security-grid">
              <div>
                <span className="sl-eyebrow">Security that supports the work</span>
                <h2>Give people the access they need—without losing the record.</h2>
                <p>
                  ZIVO Software is designed around role-aware access, server-validated billing
                  selections, and a connected operational history. We only make claims the product can
                  support.
                </p>
                <Link className="sl-button sl-button-secondary" to="/privacy-policy">
                  Read our privacy policy
                </Link>
              </div>
              <div className="sl-trust-grid">
                <article>
                  <LockKeyhole />
                  <h3>Role-aware access</h3>
                  <p>Keep sensitive tools and business context in the right hands.</p>
                </article>
                <article>
                  <CreditCard />
                  <h3>Secure payment entry</h3>
                  <p>Payment details are collected through Stripe's secure payment elements.</p>
                </article>
                <article>
                  <FileText />
                  <h3>Operational history</h3>
                  <p>Keep work, customer, and payment activity connected to the task.</p>
                </article>
                <article>
                  <ShieldCheck />
                  <h3>Privacy and support</h3>
                  <p>Find the policies and support path your team needs.</p>
                </article>
              </div>
            </div>
          </section>
        </div>

        <footer className="sl-footer" id="contact">
          <div className="sl-container sl-footer-grid">
            <div>
              <Link className="sl-brand" to="/business">
                <BrandMark />
                <span>
                  <strong>ZIVO</strong>
                  <small>Software</small>
                </span>
              </Link>
              <p>Business management software for the work that keeps local teams moving.</p>
              <a className="sl-footer-contact" href="mailto:support@zivosoftware.com">
                support@zivosoftware.com
              </a>
            </div>
            <nav aria-label="Product footer links">
              <h2>Product</h2>
              <a href="#product">Product</a>
              <a href="#pricing">Pricing</a>
              <a href="#security">Security</a>
              <Link to={SETUP_PATH}>Start setup</Link>
            </nav>
            <nav aria-label="Support footer links">
              <h2>Support</h2>
              <a href="mailto:support@zivosoftware.com?subject=ZIVO%20Software%20contact">Contact</a>
              <a href="mailto:support@zivosoftware.com?subject=ZIVO%20Software%20support">
                Help &amp; support
              </a>
              <a href="mailto:support@zivosoftware.com?subject=ZIVO%20Software%20status">Status</a>
              <a href="mailto:support@zivosoftware.com?subject=ZIVO%20Software%20accessibility">
                Accessibility
              </a>
            </nav>
            <nav aria-label="Legal footer links">
              <h2>Legal</h2>
              <Link to="/terms-of-service">Terms</Link>
              <Link to="/privacy-policy">Privacy</Link>
              <a href="mailto:support@zivosoftware.com?subject=ZIVO%20Software%20billing">
                Billing &amp; cancellation
              </a>
            </nav>
          </div>
          <div className="sl-container sl-footer-base">
            <span>© {new Date().getFullYear()} ZIVO Software</span>
            <span>Built for focused local business operations.</span>
          </div>
        </footer>
      </main>
    </>
  );
}
