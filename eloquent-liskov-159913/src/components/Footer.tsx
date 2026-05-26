/**
 * Footer - Premium dark navy footer with refined layout & motion
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Heart,
  ChevronUp,
  CheckCircle2,
  Plane,
  Building2,
  Car,
  MapPin,
} from "lucide-react";
import ZivoLogo from "./ZivoLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

const footerSections = [
  {
    title: "Flights",
    icon: Plane,
    links: [
      { name: "Search Flights", href: "/flights" },
      { name: "Popular Destinations", href: "/flights" },
      { name: "Price Alerts", href: "/flights" },
      { name: "Deals", href: "/deals" },
    ],
  },
  {
    title: "Hotels",
    icon: Building2,
    links: [
      { name: "Find Hotels", href: "/hotels" },
      { name: "Top Cities", href: "/hotels" },
      { name: "Hotel Deals", href: "/hotels" },
    ],
  },
  {
    title: "Cars & More",
    icon: Car,
    links: [
      { name: "Car Rentals", href: "/rent-car" },
      { name: "P2P Rentals", href: "/rent-car" },
      { name: "ZIVO Rides", href: "/rides/hub" },
      { name: "ZIVO Eats", href: "/eats" },
      { name: "Become a Driver", href: "/drive" },
    ],
  },
  {
    title: "Company",
    icon: MapPin,
    links: [
      { name: "About ZIVO", href: "/about" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" },
      { name: "FAQ", href: "/faq" },
      { name: "Help Center", href: "/help" },
      { name: "Support Tickets", href: "/support/tickets" },
      { name: "System Status", href: "/status" },
    ],
  },
];

const legalLinks = [
  { name: "Terms", href: "/terms" },
  { name: "Privacy", href: "/privacy" },
  { name: "Cookies", href: "/cookies" },
  { name: "Partner Disclosure", href: "/partner-disclosure" },
  { name: "Refund Policy", href: "/refunds" },
  { name: "Seller of Travel", href: "/legal/seller-of-travel" },
  { name: "Accessibility", href: "/accessibility" },
  { name: "Do Not Sell My Info", href: "/do-not-sell" },
];

const socialLinks = [
  { label: "X", href: "https://x.com/hizovo", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { label: "Instagram", href: "https://instagram.com/hizovo", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  { label: "Facebook", href: "https://facebook.com/hizovo", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { label: "LinkedIn", href: "https://linkedin.com/company/hizovo", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
];

const Footer = ({ className }: { className?: string }) => {
  // The marketing footer (App Store CTA, social links, sitemap columns) is
  // built for the web. On native iOS/Android the bottom tab bar already
  // handles navigation, and "App Store" links from inside an installed app
  // are nonsensical — so render nothing on native.
  if (Capacitor.isNativePlatform()) return null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleAppStore = (store: string) => {
    toast("Coming soon!", { description: `The ZIVO ${store} app is launching soon.`, duration: 3000 });
  };

  return (
    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden", className)}>
      {/* Decorative orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top accent line — IG gradient */}
      <div aria-hidden className="bg-ig-gradient h-[2px] w-full opacity-90" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main grid */}
        <div className="py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-4 space-y-5">
            <Link to="/" className="inline-flex min-h-[40px] items-center touch-manipulation">
              <ZivoLogo size="md" />
            </Link>
            <p className="text-sm text-primary-foreground/40 max-w-xs leading-relaxed">
              Book flights, hotels, and car rentals with transparent pricing and secure checkout. Your next adventure starts here.
            </p>

            {/* App Store */}
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => handleAppStore("App Store")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/15 active:scale-[0.97] transition-all text-xs font-medium text-primary-foreground/80 touch-manipulation min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                App Store
              </button>
            </div>

            {/* Social */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => {
                const isInstagram = social.label === "Instagram";
                return (
                  <button type="button"
                    key={social.label}
                    onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(social.href))}
                    className={cn(
                      "w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center active:scale-90 transition-all touch-manipulation",
                      isInstagram
                        ? "bg-ig-gradient text-white hover:opacity-90 shadow-[0_0_12px_rgba(220,39,67,0.35)]"
                        : "bg-primary-foreground/10 text-primary-foreground/50 hover:text-primary-foreground hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                    )}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-sm mb-4 text-primary-foreground/80 flex items-center gap-2">
                  <section.icon className="w-3.5 h-3.5 text-primary/70" />
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="inline-flex min-h-[40px] items-center text-sm text-primary-foreground/40 hover:text-primary-foreground hover:translate-x-0.5 transition-all touch-manipulation"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Legal links bar */}
        <div className="py-5 border-t border-primary-foreground/10">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="inline-flex min-h-[40px] items-center text-xs text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors touch-manipulation"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/40 flex items-center gap-1.5">
              © {new Date().getFullYear()} ZIVO LLC. Made with{" "}
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" /> for travelers.
            </p>

            <button type="button"
              onClick={scrollToTop}
              className="group/top inline-flex items-center gap-1.5 text-xs text-primary-foreground/40 hover:text-primary px-3 py-2 rounded-full border border-primary-foreground/10 hover:border-primary/30 active:scale-95 transition-all touch-manipulation min-h-[40px]"
            >
              <ChevronUp className="w-4 h-4 group-hover/top:-translate-y-0.5 transition-transform" />{" "}
              Back to Top
            </button>
          </div>

          {/* OTA Disclosure */}
          <div className="mt-6 pt-6 border-t border-primary-foreground/5 text-center space-y-2">
            <p className="text-xs text-primary-foreground/25 max-w-2xl mx-auto">
              ZIVO is an online travel agency. ZIVO processes payments and issues travel services using authorized suppliers.
            </p>
            <p className="text-xs text-primary-foreground/20 max-w-2xl mx-auto flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-primary/60" /> Registered Seller of Travel where required. CA SOT: pending · FL SOT: pending
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
