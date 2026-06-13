import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  Layers3,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  PackageCheck,
  Plus,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { STORE_CATEGORY_OPTIONS, type StoreCategory } from "@/config/groceryStores";
import { useAuth } from "@/contexts/AuthContext";
import AppSwitcher from "@/components/cross-app/AppSwitcher";
import CrossAppReturnBar from "@/components/cross-app/CrossAppReturnBar";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";
import { resolveSoftwarePortalAccountDashboardPath } from "@/lib/business/softwarePortal";
import bgOffice from "@/assets/bg-office.jpg";
import hotelBusiness from "@/assets/hotel-business.jpg";
import serviceCars from "@/assets/service-cars.jpg";
import serviceShopping from "@/assets/service-shopping.png";
import serviceTire from "@/assets/service-tire.jpg";
import svcEatsPremium from "@/assets/svc-eats-premium.jpg";

const ALLOWED_GROUPS = ["Software"];

const GROUP_ICONS: Record<string, typeof Building2> = {
  Software: LayoutDashboard,
};

const GROUP_IMAGES: Record<string, string> = {
  Software: bgOffice,
};

const softwareCategories = STORE_CATEGORY_OPTIONS.filter(
  (option) => option.group && ALLOWED_GROUPS.includes(option.group),
);

const groupedCategories = ALLOWED_GROUPS.map((group) => ({
  group,
  categories: softwareCategories.filter((option) => option.group === group),
})).filter((entry) => entry.categories.length > 0);

const startPath = (category?: StoreCategory) =>
  `/business/new${category ? `?category=${encodeURIComponent(category)}` : ""}`;

const authPath = (path: "/login" | "/signup") => {
  const redirect = path === "/login" ? "/business" : "/business/new";
  return `${path}?redirect=${encodeURIComponent(redirect)}`;
};

const forceNavigate = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.currentTarget.target === "_blank"
  ) {
    return;
  }
  event.preventDefault();
  window.location.assign(path);
};

const workflowSteps = [
  {
    title: "Configure software",
    description: "Start with the ZIVO Software workspace and business profile.",
    icon: ClipboardList,
  },
  {
    title: "Activate workspace",
    description: "Create the software hub, roles, services, and customer flow.",
    icon: Sparkles,
  },
  {
    title: "Run operations",
    description: "Manage bookings, invoices, inventory, jobs, and payments.",
    icon: PackageCheck,
  },
  {
    title: "Grow with reports",
    description: "Track revenue, staff activity, demand, and performance.",
    icon: BarChart3,
  },
];

const operatingModules = [
  { label: "Bookings", value: "Live calendar", icon: CalendarCheck },
  { label: "Customers", value: "Customer history", icon: Users },
  { label: "Invoices", value: "Payments ready", icon: CreditCard },
  { label: "Work orders", value: "Auto + service flows", icon: Wrench },
  { label: "Inventory", value: "Stock and parts", icon: PackageCheck },
  { label: "Security", value: "Login protected", icon: LockKeyhole },
];

const pictureRail = [
  { src: hotelBusiness, label: "Workspace dashboard" },
  { src: svcEatsPremium, label: "Customer intake" },
  { src: serviceShopping, label: "Invoice command" },
  { src: serviceTire, label: "Service workflow" },
];

const suiteModules = [
  {
    title: "Service desk",
    copy: "Appointments, customer intake, approvals, and service timing stay organized in one queue.",
    icon: CalendarCheck,
    image: hotelBusiness,
  },
  {
    title: "Sales counter",
    copy: "Orders, invoices, payments, product movement, and customer receipts are ready for daily use.",
    icon: CircleDollarSign,
    image: serviceShopping,
  },
  {
    title: "Service bay",
    copy: "Jobs, parts, technicians, status changes, and work history support auto and service operators.",
    icon: Wrench,
    image: serviceCars,
  },
];

const commandRows = [
  { label: "Customer intake", status: "Captured", icon: ClipboardList },
  { label: "Invoice workflow", status: "Ready", icon: FileText },
  { label: "Team access", status: "Assigned", icon: Users },
  { label: "Payment record", status: "Synced", icon: CreditCard },
  { label: "Daily report", status: "Live", icon: Gauge },
];

function ZivoSoftwareMark() {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#101412] shadow-[0_16px_34px_rgba(17,20,18,0.24)]">
      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-md bg-[#48e7af] shadow-[0_8px_18px_rgba(72,231,175,0.42)]" />
      <span className="absolute bottom-2 left-2 h-2 w-2 rounded-sm bg-[#35a8ff]/80" />
      <svg viewBox="0 0 44 44" aria-hidden="true" className="relative h-8 w-8">
        <defs>
          <linearGradient id="zivoSoftwareMark" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#48e7af" />
            <stop offset="1" stopColor="#35a8ff" />
          </linearGradient>
        </defs>
        <path
          d="M10 8h26v7.2H22.4L36 15.3 16.1 36H8l20-20.8H10V8Z"
          fill="url(#zivoSoftwareMark)"
        />
        <path
          d="M13.2 28.8h20.9V36H6.8l6.4-7.2Z"
          fill="#f8fffc"
        />
      </svg>
    </span>
  );
}

export default function BusinessSoftwarePortalPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: ownerStore, isLoading: ownerStoreLoading } = useOwnerStoreProfile();
  const accountLoading = authLoading || (!!user && ownerStoreLoading);
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isSoftwareRuntimeHost = isAutoRepairSoftwareHost(currentHostname);
  const mediaDashboardUrl =
    typeof user?.user_metadata?.zivo_media_dashboard_url === "string"
      ? user.user_metadata.zivo_media_dashboard_url
      : null;
  const accountDashboardPath = resolveSoftwarePortalAccountDashboardPath(
    ownerStore,
    currentHostname,
    mediaDashboardUrl,
  );
  const hasAccountDashboard = Boolean(ownerStore?.id) || isSoftwareRuntimeHost;
  const primaryActionPath = user ? accountDashboardPath : startPath();
  const primaryActionLabel = user
    ? hasAccountDashboard
      ? "Open Dashboard"
      : "Create Business Software"
    : "Create Business Software";
  const footerLoginPath = user ? accountDashboardPath : authPath("/login");

  return (
    <>
      <Helmet>
        <title>ZIVO Software | Business Management Software</title>
        <meta
          name="description"
          content="Create a software-only ZIVO Business Page with setup, dashboard access, customer records, invoices, reports, and secure team workflows."
        />
      </Helmet>

      <main className="min-h-screen overflow-hidden bg-[#f7f8f6] text-[#111412]">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-5 pt-3 sm:px-6 lg:px-8">
          <CrossAppReturnBar adminHref="#software-businesses" returnPath="/business" />
        </div>
        <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f8f6]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
            <Link to="/business" className="flex items-center gap-3" aria-label="ZIVO Software">
              <ZivoSoftwareMark />
              <span className="leading-none">
                <span className="block text-base font-black uppercase tracking-[0.2em] text-[#101412]">ZIVO</span>
                <span className="mt-1 block text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#138f68]">Software</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-[#3f4742] md:flex" aria-label="ZIVO Software sections">
              <a href="#software" className="transition-colors hover:text-[#111412]">Software</a>
              <a href="#workflow" className="transition-colors hover:text-[#111412]">Workflow</a>
              <a href="#industries" className="transition-colors hover:text-[#111412]">Business Page</a>
              <a href="#security" className="transition-colors hover:text-[#111412]">Security</a>
            </nav>

            <div className="flex items-center gap-2">
              <AppSwitcher className="h-11 w-11" />
              {user ? (
                <>
                  {ownerStore?.name ? (
                    <span className="hidden max-w-44 truncate rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black text-[#3f4742] shadow-sm lg:inline-flex">
                      {ownerStore.name}
                    </span>
                  ) : null}
                  <Button asChild variant="ghost" className="hidden rounded-lg text-[#111412] hover:bg-black/5 sm:inline-flex">
                    <a href={startPath()} onClick={forceNavigate(startPath())}>
                      <Plus className="mr-2 h-4 w-4" />
                      Setup
                    </a>
                  </Button>
                  {accountLoading ? (
                    <Button disabled className="rounded-lg bg-[#111412] text-white shadow-[0_14px_30px_rgba(17,20,18,0.2)]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dashboard
                    </Button>
                  ) : (
                    <Button asChild className="rounded-lg bg-[#111412] text-white shadow-[0_14px_30px_rgba(17,20,18,0.2)] hover:bg-black">
                      <a href={accountDashboardPath} onClick={forceNavigate(accountDashboardPath)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="hidden rounded-lg text-[#111412] hover:bg-black/5 sm:inline-flex">
                    <a href={authPath("/login")} onClick={forceNavigate(authPath("/login"))}>Log in</a>
                  </Button>
                  <Button asChild className="rounded-lg bg-[#111412] text-white shadow-[0_14px_30px_rgba(17,20,18,0.2)] hover:bg-black">
                    <a href={authPath("/signup")} onClick={forceNavigate(authPath("/signup"))}>Sign up</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <section id="software" className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(28,216,155,0.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(36,167,255,0.18),transparent_30%),linear-gradient(180deg,#f7f8f6_0%,#ffffff_72%)]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 px-5 py-10 sm:px-6 md:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <h1 className="max-w-4xl text-4xl font-black leading-[0.96] tracking-normal text-[#111412] sm:text-5xl lg:text-7xl">
                ZIVO Software for local businesses
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#58625d]">
                Launch one software-only business workspace for setup, customers, invoices, operations, reports, and secure team access.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-lg bg-[#111412] px-6 text-white hover:bg-black">
                  <a href={primaryActionPath} onClick={forceNavigate(primaryActionPath)}>
                    {primaryActionLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-black/15 bg-white/80 px-6 text-[#111412] hover:bg-white">
                  <a href="#industries">View Software Page</a>
                </Button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["14 days", "free trial"],
                  ["Minutes", "guided setup"],
                  ["Anytime", "change or cancel"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-black/10 bg-white/70 p-3 shadow-sm backdrop-blur lg:p-4">
                    <div className="text-xl font-black text-[#111412] lg:text-2xl">{value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#67706b]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-[#33e6ae]/30 blur-3xl" />
              <div className="absolute -right-8 bottom-10 h-36 w-36 rounded-full bg-[#44a7ff]/20 blur-3xl" />
              <div className="relative min-h-[380px] [perspective:1200px] lg:min-h-[480px]">
                <div className="absolute left-[7%] top-8 w-[86%] rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_40px_90px_rgba(18,28,24,0.18)] backdrop-blur-xl [transform:rotateX(58deg)_rotateZ(-28deg)] [transform-style:preserve-3d]">
                  <div className="grid grid-cols-[1fr_0.7fr] gap-4">
                    <div className="rounded-2xl bg-[#111412] p-5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Workspace</span>
                        <BadgeCheck className="h-5 w-5 text-[#48e7af]" />
                      </div>
                      <div className="mt-8 text-4xl font-black">$18.4k</div>
                      <div className="mt-1 text-sm text-white/60">weekly revenue</div>
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-2xl bg-[#48e7af] p-4 text-[#102018] shadow-[0_18px_35px_rgba(72,231,175,0.24)]">
                        <CalendarCheck className="h-5 w-5" />
                        <div className="mt-6 text-2xl font-black">42</div>
                        <div className="text-xs font-semibold">bookings</div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <Users className="h-5 w-5 text-[#1f8cff]" />
                        <div className="mt-6 text-2xl font-black">318</div>
                        <div className="text-xs font-semibold text-[#69736e]">customers</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {operatingModules.slice(0, 6).map((module) => {
                      const Icon = module.icon;
                      return (
                        <div key={module.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                          <Icon className="h-5 w-5 text-[#111412]" />
                          <div className="mt-5 text-sm font-black">{module.label}</div>
                          <div className="mt-1 text-xs text-[#69736e]">{module.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute left-2 top-24 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_24px_50px_rgba(18,28,24,0.16)] backdrop-blur [transform:translateZ(70px)_rotate(-8deg)]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111412] text-white">
                      <LockKeyhole className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-black">Secure sign-in</div>
                      <div className="text-xs text-[#69736e]">team access ready</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 right-2 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_24px_50px_rgba(18,28,24,0.18)] [transform:translateZ(90px)_rotate(7deg)] lg:bottom-10">
                  <img src={serviceCars} alt="Auto repair software workspace" className="h-28 w-44 object-cover lg:h-36 lg:w-52" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-[#111412] px-5 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[0.55fr_1fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-normal sm:text-4xl">Build the whole workflow</h2>
                <p className="mt-4 max-w-lg text-base leading-7 text-white/62">
                  ZIVO Software turns one Business Page into a working operating system: setup, daily work, payments, and reports.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5 text-[#48e7af]" />
                        <span className="text-xs font-black text-white/35">0{index + 1}</span>
                      </div>
                      <h3 className="mt-6 text-base font-black">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/58">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8 grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-normal sm:text-4xl">One software suite for the workday</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-[#58625d]">
                  ZIVO Software gives each business page the right daily tools, then keeps customer, payment, and reporting data connected.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-[#f7f8f6] p-2">
                {["Setup", "Operate", "Measure"].map((label) => (
                  <div key={label} className="rounded-md bg-white px-3 py-2 text-center text-xs font-black uppercase tracking-[0.1em] text-[#51605a] shadow-sm">
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
              {suiteModules.map((module) => {
                const Icon = module.icon;
                return (
                  <article key={module.title} className="overflow-hidden rounded-lg border border-black/10 bg-[#fbfcfb] shadow-[0_18px_50px_rgba(18,28,24,0.06)]">
                    <div className="relative h-28 overflow-hidden sm:h-32 lg:h-44">
                      <img src={module.image} alt={`${module.title} software view`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#111412] shadow-[0_14px_28px_rgba(17,20,18,0.2)] lg:h-11 lg:w-11">
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                      </span>
                    </div>
                    <div className="p-3 lg:p-5">
                      <h3 className="text-base font-black text-[#111412] lg:text-xl">{module.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-[#65706a] lg:mt-3 lg:text-sm lg:leading-6">{module.copy}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#e8f0ec] px-5 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-normal text-[#111412] sm:text-4xl">A launch board for your software workspace</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#58625d]">
                The setup flow creates one software business record, then opens the command center for services, team roles, customer records, and finance tracking.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Software setup", "Team roles", "Payments", "Reports"].map((item) => (
                  <span key={item} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-[#51605a]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative min-h-[430px]">
              <div className="absolute inset-x-0 top-6 mx-auto h-[340px] max-w-[620px] rounded-[1.7rem] bg-[#111412] shadow-[0_36px_86px_rgba(17,20,18,0.22)] [transform:rotateX(52deg)_rotateZ(-18deg)] [transform-style:preserve-3d]" />
              <div className="relative mx-auto max-w-[620px] rounded-2xl border border-white/80 bg-white/88 p-5 shadow-[0_34px_80px_rgba(17,20,18,0.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-[#6b746f]">Launch board</div>
                    <div className="mt-1 text-2xl font-black text-[#111412]">Software page</div>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#48e7af] text-[#102018]">
                    <Layers3 className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {commandRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-black/10 bg-[#fbfcfb] p-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#111412] text-white">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-sm font-black text-[#111412]">{row.label}</div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/8">
                            <div className="h-full w-4/5 rounded-full bg-[#48e7af]" />
                          </div>
                        </div>
                        <span className="rounded-md bg-[#eefdf7] px-2.5 py-1 text-xs font-black text-[#138f68]">{row.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pictureRail.map((picture) => (
              <div key={picture.label} className="group relative min-h-52 overflow-hidden rounded-lg bg-[#111412]">
                <img src={picture.src} alt={picture.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-sm font-black">{picture.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="industries" className="bg-white px-5 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-normal sm:text-4xl">ZIVO Software workspace ready to launch</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#58625d]">
                  Start with the software-only workspace category and keep the dashboard focused on business operations.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-lg border-black/15 bg-white text-[#111412] hover:bg-black/5">
                <a href={startPath()} onClick={forceNavigate(startPath())}>Start setup</a>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupedCategories.map(({ group, categories }) => {
              const Icon = GROUP_ICONS[group] || Building2;
              const image = GROUP_IMAGES[group] || bgOffice;
              return (
                <section key={group} className="overflow-hidden rounded-lg border border-black/10 bg-[#fbfcfb] shadow-[0_18px_50px_rgba(18,28,24,0.06)]">
                  <div className="relative h-40 overflow-hidden bg-[#111412]">
                    <img src={image} alt={`${group} business page software`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/16 backdrop-blur">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-black uppercase tracking-[0.12em]">{group}</h3>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4">
                    {categories.map((category) => (
                      <Link
                        key={category.value}
                        to={startPath(category.value)}
                        className="group flex items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-[#111412] transition-colors hover:border-[#48e7af] hover:bg-[#eefdf7]"
                      >
                        <span>{category.label}</span>
                        <span className="flex items-center gap-1 text-xs font-black text-[#6a756f] group-hover:text-[#138f68]">
                          Start
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
            </div>
          </div>
        </section>

        <section id="security" className="bg-[#eef3f0] px-5 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-normal sm:text-4xl">Operations, payments, and teams in one secure workspace</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#58625d]">
                ZIVO Software keeps teams focused on business work: staff access, customer records, revenue, work orders, and daily activity.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-lg bg-[#111412] px-6 text-white hover:bg-black">
                  <a href={user ? accountDashboardPath : authPath("/signup")} onClick={forceNavigate(user ? accountDashboardPath : authPath("/signup"))}>
                    {user ? "Open Dashboard" : "Sign up"}
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-black/15 bg-white px-6 text-[#111412] hover:bg-white/80">
                  <a href={footerLoginPath} onClick={forceNavigate(footerLoginPath)}>
                    {user ? "Account setup" : "Log in"}
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {operatingModules.map((module) => {
                const Icon = module.icon;
                return (
                  <div key={module.label} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#111412] text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CheckCircle2 className="h-5 w-5 text-[#19b77f]" />
                    </div>
                    <h3 className="mt-5 text-lg font-black">{module.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#65706a]">{module.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#111412] px-5 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="max-w-3xl text-3xl font-black tracking-normal sm:text-4xl">Start with the right business software today</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">
                Create the software workspace, then sign in from the software domain whenever the team comes back.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Button asChild size="lg" className="h-12 rounded-lg bg-[#48e7af] px-6 text-[#102018] hover:bg-[#67f0bf]">
                <a href={primaryActionPath} onClick={forceNavigate(primaryActionPath)}>
                  {user ? "Open Dashboard" : "Create Software"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-white/18 bg-white/8 px-6 text-white hover:bg-white/14">
                <a href={footerLoginPath} onClick={forceNavigate(footerLoginPath)}>
                  {user ? "Account setup" : "Log in"}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
