import {
  ArrowRight,
  Banknote,
  Car,
  CheckCircle2,
  Clock,
  FileCheck2,
  Headphones,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Clock,
    title: "Flexible work blocks",
    copy: "Go online for airport transfers, rides, local delivery, and travel-driver requests when your day allows.",
  },
  {
    icon: Wallet,
    title: "Clear payout tracking",
    copy: "See completed jobs, estimated earnings, tips, and payout status from the driver workspace.",
  },
  {
    icon: Navigation,
    title: "Trips from Zivo Travel",
    copy: "Travel bookings can become driver jobs with pickup details, route context, and customer status updates.",
  },
  {
    icon: Headphones,
    title: "Support when jobs move",
    copy: "Use ZivoChat support for trip issues, payment questions, documents, and account help.",
  },
];

const steps = [
  ["Apply", "Create your profile and choose the driver work you want."],
  ["Verify", "Upload license, vehicle, insurance, and required documents."],
  ["Accept", "Review ride, transfer, delivery, or travel-driver jobs."],
  ["Complete", "Finish the trip and keep the customer updated."],
  ["Get paid", "Track earnings, tips, adjustments, and payout status."],
];

const requirements = [
  "Valid driver's license and local authorization",
  "Vehicle, motorcycle, or tuk tuk that meets service requirements",
  "Proof of insurance or required operating documents",
  "Smartphone with GPS and reliable data connection",
  "Background, safety, and document verification",
  "Agreement to ZIVO driver and marketplace policies",
];

const payoutItems = [
  ["Job earnings", "Base pay is shown before accepting eligible jobs."],
  ["Tips", "Customer tips are tracked separately and paid to the driver."],
  ["Adjustments", "Cancellations, wait time, and support-reviewed adjustments stay visible."],
  ["Payout status", "Drivers can review pending, processing, and completed payout states."],
];

export default function ZivoDriverLandingPage() {
  return (
    <main id="top" className="min-h-screen bg-[#f7fbfa] text-[#111816]">
      <SEOHead
        title="Zivo Driver | Drive with Zivo"
        description="Become a Zivo Driver. Accept rides, airport transfers, delivery jobs, and Zivo Travel driver requests with clear earnings and support."
        canonical="https://zivodriver.com/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Zivo Driver",
          description: "Driver landing page for ZIVO ride, delivery, and travel-driver jobs.",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-[#dce7e4] bg-[#f7fbfa]/92 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-base font-black tracking-tight text-[#111816]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0bbf9a] text-white shadow-sm shadow-[#0bbf9a]/30">
              <Car className="h-5 w-5" aria-hidden="true" />
            </span>
            Zivo Driver
          </Link>

          <nav aria-label="Driver landing navigation" className="hidden items-center gap-6 text-sm font-bold text-[#53635f] md:flex">
            <a href="#benefits" className="transition hover:text-[#111816]">Benefits</a>
            <a href="#how-it-works" className="transition hover:text-[#111816]">How it works</a>
            <a href="#payouts" className="transition hover:text-[#111816]">Payouts</a>
            <a href="#support" className="transition hover:text-[#111816]">Support</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden h-10 rounded-lg border-[#bfd3ce] bg-white px-4 text-sm font-black text-[#111816] hover:bg-[#e9f6f3] sm:inline-flex">
              <Link to="/login?next=%2Fdriver%2Fhome">Continue with Zivosmedia</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden h-10 rounded-lg px-3 text-sm font-black text-[#53635f] hover:bg-[#e9f6f3] md:inline-flex">
              <Link to="/login?next=%2Fdriver%2Fhome">Sign in</Link>
            </Button>
            <Button asChild className="h-10 rounded-lg bg-[#111816] px-4 text-sm font-black text-white hover:bg-[#25322f]">
              <Link to="/signup?intent=driver&next=%2Fdriver%2Fonboarding%2Fdocuments">Become a Driver</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="overflow-hidden border-b border-[#dce7e4] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.95] tracking-normal text-[#111816] sm:text-6xl lg:text-7xl">
              Drive with Zivo. Earn on your schedule.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#53635f]">
              Accept trips, airport transfers, delivery jobs, and travel-driver requests from Zivo Travel with clear job details, support, and payout visibility.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-lg bg-[#0bbf9a] px-6 text-base font-black text-[#062b24] hover:bg-[#08aa88]">
                <Link to="/signup?intent=driver&next=%2Fdriver%2Fonboarding%2Fdocuments">
                  Apply to Drive
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-lg border-[#bfd3ce] bg-white px-6 text-base font-black text-[#111816] hover:bg-[#e9f6f3]">
                <Link to="/login?next=%2Fdriver%2Fhome">Sign in with Zivosmedia</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-bold text-[#53635f] sm:grid-cols-3">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0bbf9a]" /> Ride and transfer jobs</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0bbf9a]" /> Delivery work</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#0bbf9a]" /> Travel-driver requests</div>
            </div>
          </div>

          <div className="relative min-h-[460px]">
            <div className="absolute inset-x-4 top-4 h-[360px] rounded-lg border border-[#c9ded9] bg-[#e9f6f3] shadow-2xl shadow-[#0c332a]/10">
              <div className="absolute left-8 top-8 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg shadow-[#0c332a]/10">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#ffbd59] text-[#33220b]">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xs font-black uppercase tracking-wider text-[#81918d]">Next pickup</span>
                  <span className="block text-sm font-black text-[#111816]">Airport transfer</span>
                </span>
              </div>
              <div className="absolute bottom-8 right-8 w-64 rounded-lg bg-[#111816] p-4 text-white shadow-xl shadow-[#0c332a]/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white/55">Offer</span>
                  <span className="rounded-md bg-[#0bbf9a] px-2 py-1 text-xs font-black text-[#062b24]">$18.40</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-2 rounded-full bg-white/15" />
                  <div className="h-2 w-10/12 rounded-full bg-white/15" />
                  <div className="h-2 w-7/12 rounded-full bg-white/15" />
                </div>
                <div className="mt-5 flex gap-2">
                  <div className="h-9 flex-1 rounded-lg bg-white text-center text-xs font-black leading-9 text-[#111816]">Accept</div>
                  <div className="h-9 w-20 rounded-lg border border-white/20 text-center text-xs font-black leading-9 text-white/80">Details</div>
                </div>
              </div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 360" role="img" aria-label="Map route from Zivo Travel booking to Driver job">
                <path d="M84 286 C 150 218, 210 242, 270 176 S 408 92, 526 142" fill="none" stroke="#0bbf9a" strokeWidth="10" strokeLinecap="round" strokeDasharray="18 20" />
                <circle cx="84" cy="286" r="13" fill="#111816" />
                <circle cx="526" cy="142" r="13" fill="#ffbd59" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-full rounded-lg border border-[#dce7e4] bg-white p-4 shadow-xl shadow-[#0c332a]/10 sm:left-8 sm:w-[78%]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#81918d]">Travel to Driver</p>
                  <p className="mt-1 text-lg font-black text-[#111816]">Booking creates a driver job</p>
                </div>
                <div className="flex gap-2">
                  {["Booked", "Offered", "Accepted"].map((item) => (
                    <span key={item} className="rounded-md bg-[#e9f6f3] px-3 py-2 text-xs font-black text-[#0a7561]">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        {benefits.map((benefit) => (
          <article key={benefit.title} className="rounded-lg border border-[#dce7e4] bg-white p-6 shadow-sm">
            <benefit.icon className="h-7 w-7 text-[#0bbf9a]" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-black text-[#111816]">{benefit.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#53635f]">{benefit.copy}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="border-y border-[#dce7e4] bg-[#111816] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-4xl font-black tracking-normal">How it works</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-white/65">
                Driver onboarding stays simple: verify once, then accept work across ZIVO ride, delivery, and travel flows.
              </p>
            </div>
            <div className="grid gap-3">
              {steps.map(([title, copy], index) => (
                <article key={title} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.06] p-4 sm:grid-cols-[80px_1fr]">
                  <div className="text-sm font-black text-[#ffbd59]">0{index + 1}</div>
                  <div>
                    <h3 className="text-lg font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/65">{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="rounded-lg border border-[#dce7e4] bg-white p-6 sm:p-8">
          <FileCheck2 className="h-8 w-8 text-[#0bbf9a]" aria-hidden="true" />
          <h2 className="mt-5 text-3xl font-black">Requirements</h2>
          <p className="mt-3 text-sm leading-6 text-[#53635f]">
            Requirements can vary by country, city, vehicle type, and job category. ZIVO will ask for the documents needed for your selected driver work.
          </p>
          <ul className="mt-6 grid gap-3">
            {requirements.map((requirement) => (
              <li key={requirement} className="flex gap-3 text-sm font-bold text-[#25322f]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0bbf9a]" aria-hidden="true" />
                {requirement}
              </li>
            ))}
          </ul>
        </div>

        <div id="payouts" className="rounded-lg border border-[#dce7e4] bg-white p-6 sm:p-8">
          <Banknote className="h-8 w-8 text-[#0bbf9a]" aria-hidden="true" />
          <h2 className="mt-5 text-3xl font-black">Earnings and payouts</h2>
          <p className="mt-3 text-sm leading-6 text-[#53635f]">
            Drivers should never have to guess why a job paid what it paid. The future driver workspace should show the payout trail from job offer to completion.
          </p>
          <div className="mt-6 grid gap-3">
            {payoutItems.map(([title, copy]) => (
              <article key={title} className="rounded-lg bg-[#f2f7f6] p-4">
                <h3 className="text-sm font-black text-[#111816]">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#53635f]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <h2 className="text-4xl font-black tracking-normal">Zivo Travel connects demand to drivers.</h2>
            <p className="mt-4 text-base leading-7 text-[#53635f]">
              A customer booking through Travel can create a driver job. The driver sees pickup details, accepts or rejects, updates status, completes the trip, and then follows payout status.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["Travel booking", "Customer books a transfer, ride, delivery, or local driver request."],
              ["Driver offer", "Eligible drivers receive job details before accepting."],
              ["Customer status", "Customer sees accepted, en route, arrived, and completed states."],
              ["Payout trail", "Completed jobs feed earnings and payout review."],
            ].map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-[#dce7e4] bg-[#f7fbfa] p-4">
                <h3 className="text-sm font-black text-[#111816]">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#53635f]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="border-y border-[#dce7e4] bg-[#e9f6f3]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#0a7561]">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-black">Need help? Open ZivoChat support.</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#53635f]">
              Drivers should have a direct support path for trip issues, customer questions, documents, safety, and payment/payout review.
            </p>
          </div>
          <Button asChild className="h-12 rounded-lg bg-[#111816] px-6 text-base font-black text-white hover:bg-[#25322f]">
            <Link to="/support/new?topic=driver">
              Contact ZivoChat support
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="bg-[#111816] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-base font-black">
              <ShieldCheck className="h-5 w-5 text-[#0bbf9a]" aria-hidden="true" />
              Zivo Driver
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Drivers are independent contractors. Availability, requirements, payout timing, and eligible job types may vary by market and verification status.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-white/70">
            <Link to="/legal/privacy" className="transition hover:text-white">Privacy Policy</Link>
            <Link to="/legal/terms" className="transition hover:text-white">Terms of Service</Link>
            <Link to="/login?next=%2Fdriver%2Fhome" className="transition hover:text-white">Continue with Zivosmedia</Link>
            <a href="#top" className="transition hover:text-white">Back to top</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
