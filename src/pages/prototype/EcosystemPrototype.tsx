/**
 * ZIVO Ecosystem — Media prototype (ISOLATED, presentation only).
 *
 * Mock data only. No Supabase, auth, RLS, payments, Stripe, or push infra are
 * touched. Demonstrates the media-side of the shared experience: one ZIVO
 * profile, profile→chat transition, sharing content into ZIVO Chat, safe
 * merchant/travel/driver entity cards, a notification center, and the push→
 * screen transition. Financial-safety rules: a shared payment/booking link is
 * SAFE (opens a review screen, never auto-pays); no QR auto-pay; push payloads
 * carry no card/wallet details; payment status is retrieved from ZIVO Wallet.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, Share2, Store, Plane, Car, Bell, ShieldCheck,
  Wallet, ExternalLink, Link2, Globe, Heart, Send, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

type SectionKey = "profile" | "share" | "entities" | "notifications" | "safety";

const DICT: Record<"en" | "km", Record<string, string>> = {
  en: {
    title: "ZIVO Ecosystem — Media",
    subtitle: "Future prototype. Content subject to review.",
    banner: "Prototype — mock data. Nothing is submitted, charged, or paid. Shared links never auto-pay.",
    profile: "Profile", share: "Share to chat", entities: "Entities", notifications: "Notifications", safety: "Safety",
    message: "Message on ZIVO Chat", shareProfile: "Share profile", presence: "One ZIVO identity across apps",
    shareToChat: "Share to ZIVO Chat", openWallet: "Open in ZIVO Wallet", statusFromWallet: "Status from ZIVO Wallet",
    noAutoPay: "Safe link — opens a review screen. Payment happens in ZIVO Wallet after you confirm.",
    bookingLink: "Booking link", paymentLink: "Payment link", trackRide: "Track ride", tip: "Tip in Wallet",
    pushTitle: "Push → screen", pushBody: "Tapping a notification opens the deep-linked post or chat.",
    pushRedacted: "Push payload contains no card or wallet details.",
    lang: "ភាសាខ្មែរ"
  },
  km: {
    title: "ប្រព័ន្ធ ZIVO — មេឌៀ",
    subtitle: "គំរូនាពេលអនាគត។ ខ្លឹមសារអាចនឹងផ្លាស់ប្ដូរ។",
    banner: "គំរូ — ទិន្នន័យសាកល្បង។ គ្មានការទូទាត់ ឬបង់ប្រាក់ឡើយ។ តំណដែលចែករំលែកមិនបង់ប្រាក់ស្វ័យប្រវត្តិទេ។",
    profile: "ប្រវត្តិរូប", share: "ចែករំលែកទៅជជែក", entities: "អង្គភាព", notifications: "ការជូនដំណឹង", safety: "សុវត្ថិភាព",
    message: "ផ្ញើសារនៅ ZIVO Chat", shareProfile: "ចែករំលែកប្រវត្តិរូប", presence: "អត្តសញ្ញាណ ZIVO តែមួយគ្រប់កម្មវិធី",
    shareToChat: "ចែករំលែកទៅ ZIVO Chat", openWallet: "បើកក្នុង ZIVO Wallet", statusFromWallet: "ស្ថានភាពពី ZIVO Wallet",
    noAutoPay: "តំណសុវត្ថិភាព — បើកទំព័រពិនិត្យ។ ការបង់ប្រាក់កើតឡើងក្នុង ZIVO Wallet បន្ទាប់ពីអ្នកបញ្ជាក់។",
    bookingLink: "តំណកក់", paymentLink: "តំណបង់ប្រាក់", trackRide: "តាមដានដំណើរ", tip: "ឲ្យប្រាក់ទឹកតែក្នុង Wallet",
    pushTitle: "ការជូនដំណឹង → អេក្រង់", pushBody: "ការចុចការជូនដំណឹងបើកការបង្ហោះ ឬការជជែកដែលភ្ជាប់។",
    pushRedacted: "ខ្លឹមសារការជូនដំណឹងគ្មានព័ត៌មានកាត ឬ Wallet ឡើយ។",
    lang: "English"
  }
};

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground p-4", className)}>{children}</div>;
}
function StageNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>;
}

export default function EcosystemPrototype() {
  const navigate = useNavigate();
  const { locale, setLocale } = useI18n();
  const L = locale === "km" ? "km" : "en";
  const t = (k: string) => DICT[L][k] ?? DICT.en[k] ?? k;
  const [section, setSection] = useState<SectionKey>("profile");
  const sections: SectionKey[] = ["profile", "share", "entities", "notifications", "safety"];

  return (
    <div className="min-h-screen bg-background text-foreground" lang={L}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{t("title")}</h1>
          <p className="truncate text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocale(L === "km" ? "en" : "km")}>
          <Globe className="mr-1 h-4 w-4" />{t("lang")}
        </Button>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-24">
        <div className="my-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="note">
          {t("banner")}
        </div>

        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Prototype sections">
          {sections.map((s) => (
            <button key={s} onClick={() => setSection(s)} aria-current={section === s ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1 text-sm",
                section === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>
              {t(s)}
            </button>
          ))}
        </nav>

        {section === "profile" && (
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">SC</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">Sokha Chan</div>
                <div className="text-xs text-muted-foreground">{t("presence")}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {["Media", "Chat", "Travel", "Wallet"].map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => setSection("share")}><MessageCircle className="mr-1 h-4 w-4" />{t("message")}</Button>
              <Button size="sm" variant="outline"><Share2 className="mr-1 h-4 w-4" />{t("shareProfile")}</Button>
            </div>
            <StageNote>Profile → chat transition: the same ZIVO identity opens a conversation in ZIVO Chat.</StageNote>
          </Card>
        )}

        {section === "share" && (
          <div className="space-y-4">
            <Card>
              <div className="overflow-hidden rounded-lg border">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-emerald-200 to-teal-300">
                  <ImageIcon className="h-8 w-8 text-white/80" />
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold">Angkor sunrise reel</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />2.4k</span>
                    <span>@sokha</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm"><Send className="mr-1 h-4 w-4" />{t("shareToChat")}</Button>
                <Button size="sm" variant="outline"><Share2 className="mr-1 h-4 w-4" />{t("shareProfile")}</Button>
              </div>
              <StageNote>Content sharing into chat: this reel becomes a rich card inside a ZIVO Chat thread.</StageNote>
            </Card>
            <Card>
              <div className="text-sm font-semibold">Shared into chat (preview)</div>
              <div className="mt-2 flex justify-start">
                <div className="max-w-[85%] rounded-2xl border bg-card px-3 py-2">
                  <div className="text-sm font-semibold">Angkor sunrise reel</div>
                  <div className="text-xs text-muted-foreground">Shared from ZIVO Media · @sokha</div>
                  <button className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline">
                    <Link2 className="h-4 w-4" /> Open reel →
                  </button>
                </div>
              </div>
              <StageNote>Deep link opens the reel in-app — it never pays or books on its own.</StageNote>
            </Card>
          </div>
        )}

        {section === "entities" && (
          <div className="space-y-4">
            <EntityCard icon={<Store className="h-5 w-5" />} title="Sokha Coffee House" kind="Merchant" primary={t("paymentLink")} note={t("noAutoPay")} statusFromWallet={t("statusFromWallet")} />
            <EntityCard icon={<Plane className="h-5 w-5" />} title="Shinta Mani Angkor" kind="Travel · Hotel" primary={t("bookingLink")} note={t("noAutoPay")} />
            <EntityCard icon={<Car className="h-5 w-5" />} title="Dara N. · Driver" kind="Driver" primary={t("trackRide")} secondary={t("tip")} note={t("noAutoPay")} />
          </div>
        )}

        {section === "notifications" && (
          <div className="space-y-3">
            {[
              { icon: <Heart className="h-4 w-4" />, title: "New like on your reel", body: "Tap to open the post" },
              { icon: <MessageCircle className="h-4 w-4" />, title: "New message from Sokha", body: "Tap to open ZIVO Chat" },
              { icon: <Wallet className="h-4 w-4" />, title: "Payment update", body: "Status is read from ZIVO Wallet" }
            ].map((n, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">{n.icon}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block text-xs text-muted-foreground">{n.body}</span></span>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
            <Card className="mt-2">
              <div className="text-sm font-semibold">{t("pushTitle")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("pushBody")}</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2 text-[11px]">{`{ "type": "like", "postId": "rl_88", "preview": "Someone liked your reel" }`}</pre>
              <StageNote><ShieldCheck className="mr-1 inline h-3 w-3" />{t("pushRedacted")}</StageNote>
            </Card>
          </div>
        )}

        {section === "safety" && (
          <div className="space-y-3">
            {[
              "Messages may contain a safe payment or booking link.",
              "No message auto-pays.",
              "No QR auto-pays.",
              "No card or wallet details in push payloads.",
              "Payment status is retrieved from ZIVO Wallet."
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border bg-card p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <span className="text-sm">{rule}</span>
              </div>
            ))}
            <StageNote>These rules are demonstrated throughout this prototype and are enforced by design in the mock UI.</StageNote>
          </div>
        )}
      </div>
    </div>
  );
}

function EntityCard({ icon, title, kind, primary, secondary, note, statusFromWallet }: {
  icon: React.ReactNode; title: string; kind: string; primary: string; secondary?: string; note: string; statusFromWallet?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{kind}</div>
        </div>
        <Badge variant="secondary"><ShieldCheck className="mr-1 h-3 w-3" />Safe link</Badge>
      </div>
      {statusFromWallet && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          <Wallet className="h-3 w-3" />{statusFromWallet}: Pending
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm"><ExternalLink className="mr-1 h-4 w-4" />{primary}</Button>
        {secondary && <Button size="sm" variant="outline"><Wallet className="mr-1 h-4 w-4" />{secondary}</Button>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
