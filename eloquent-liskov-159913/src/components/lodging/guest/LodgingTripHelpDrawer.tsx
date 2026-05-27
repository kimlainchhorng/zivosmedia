import { Bell, CalendarClock, CircleHelp, CreditCard, FileText, MessageCircle, ReceiptText, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";

interface Props {
  reservationNumber: string;
  propertyName: string;
  dates: string;
  paymentStatus: string;
}

const sections = [
  { title: "Stay", items: [
    { href: "#stay-summary", label: "Reservation details", icon: CalendarClock, text: "Property, room, dates, and current stay status." },
    { href: "#manage-stay", label: "Reschedules", icon: RefreshCw, text: "Change dates and review request history." },
    { href: "#cancellation-policy", label: "Cancellation and refunds", icon: XCircle, text: "Cancellation policy, refund state, and request links." },
  ]},
  { title: "Payments", items: [
    { href: "#payment-summary", label: "Payment summary", icon: CreditCard, text: "Saved-card charges, refunds, and balances." },
    { href: "#addon-status", label: "Add-ons and charges", icon: ShoppingBag, text: "Successful or failed extras and saved-card results." },
    { href: "#receipt-history", label: "Receipt downloads", icon: ReceiptText, text: "Download, re-download, share, or email receipt snapshots." },
  ]},
  { title: "Support", items: [
    { href: "#trip-notifications", label: "SMS/email trip updates", icon: Bell, text: "Manage SMS updates and see latest delivery status." },
    { href: "#refund-disputes", label: "Refund/dispute requests", icon: FileText, text: "Submit and track refund review status." },
    { href: "#message-property", label: "Message property", icon: MessageCircle, text: "Contact the host with reservation context attached." },
  ]},
];

function highlightSection(href: string) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(href) as HTMLElement | null;
    if (!target) return;
    target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
    target.classList.add("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    window.setTimeout(() => target.classList.remove("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 1600);
  });
}

export default function LodgingTripHelpDrawer({ reservationNumber, propertyName, dates, paymentStatus }: Props) {
  const [open, setOpen] = useState(false);
  const go = (href: string) => {
    setOpen(false);
    window.setTimeout(() => {
      highlightSection(href);
    }, 120);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CircleHelp className="h-4 w-4" /> Help with this stay
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader>
          <DrawerTitle>Help for reservation {reservationNumber}</DrawerTitle>
          <DrawerDescription>{propertyName} · {dates} · {paymentStatus.replace(/_/g, " ")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{section.title}</p>
              {section.items.map(({ href, label, icon: Icon, text }) => (
                <button type="button" key={href} onClick={() => go(href)} className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent">
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
