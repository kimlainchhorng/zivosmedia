/**
 * AdminAppStoreAssets — Generate App Store & Play Store metadata for submission
 */
import { useState } from "react";
import { ArrowLeft, Apple, Smartphone, Copy, Check, Globe, Shield, FileText, Tags } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const APP_META = {
  name: "ZIVO — Travel, Shop & Explore",
  subtitle: "Flights, Local Shops & Food Delivery",
  bundleId: "com.myzivo.app",
  packageName: "com.myzivo.app",
  category: "Travel",
  secondaryCategory: "Shopping",
  contentRating: "4+",
  website: "https://hizovo.com",
  supportEmail: "support@hizovo.com",
  privacyUrl: "https://hizovo.com/privacy",
  termsUrl: "https://hizovo.com/terms",
};

const IOS_DESCRIPTION = `ZIVO is your all-in-one travel and local commerce app. Search flights, discover nearby shops on an interactive map, order food delivery, and explore real local experiences — all in one place.

✈️ FLIGHTS
Search and compare flights from hundreds of airlines. Get real-time prices and book with confidence through our licensed travel partners.

🛒 LOCAL SHOPS & MAP
Discover stores, markets, and food trucks near you on a live map. Browse products, chat with merchants, and buy directly from your phone.

🎥 REELS & DISCOVERY
Watch short videos from local businesses. See what's trending nearby, find hidden gems, and shop directly from Reels.

🚗 RIDES & DELIVERY
Book rides, order food delivery, and get groceries delivered to your door.

💳 SECURE PAYMENTS
Pay with card or digital wallet. Every transaction is verified and secure.

🏆 REWARDS
Earn ZIVO Points on every purchase. Redeem for discounts and exclusive deals.

ZIVO — Where Travel Meets Local.`;

const ANDROID_DESCRIPTION = `ZIVO brings together flights, local shopping, food delivery, and social discovery in one powerful app.

★ Search & compare flights from hundreds of airlines
★ Discover nearby shops, markets & food trucks on a live map
★ Watch Reels from local businesses and shop directly
★ Order food delivery and groceries
★ Book rides with real-time tracking
★ Earn rewards on every purchase
★ Secure card & wallet payments
★ Chat with merchants about your orders
★ Multi-language support (English, Khmer, Chinese)

Whether you're traveling abroad or exploring your own city, ZIVO connects you to the best local experiences.

Download ZIVO — Travel, Shop & Explore.`;

const KEYWORDS = [
  "flights", "travel", "local shops", "food delivery", "grocery delivery",
  "ride hailing", "shopping", "reels", "short videos", "marketplace",
  "rewards", "loyalty points", "Cambodia", "Phnom Penh", "Southeast Asia",
  "flight search", "hotel booking", "food truck", "map", "nearby stores",
  "explore", "discover", "deals", "discounts", "cashback",
];

const PRIVACY_NUTRITION = [
  { category: "Contact Info", types: ["Email Address", "Name", "Phone Number"], purpose: "App Functionality, Account Registration", linked: true },
  { category: "Identifiers", types: ["User ID", "Device ID"], purpose: "Analytics, App Functionality", linked: true },
  { category: "Location", types: ["Precise Location", "Coarse Location"], purpose: "App Functionality (nearby shops, delivery)", linked: true },
  { category: "Purchases", types: ["Purchase History"], purpose: "App Functionality, Analytics, Third-Party Advertising (Meta CAPI)", linked: true },
  { category: "Usage Data", types: ["Product Interaction", "Advertising Data"], purpose: "Analytics, Advertising (Meta Conversions API)", linked: false },
  { category: "Diagnostics", types: ["Crash Data", "Performance Data"], purpose: "App Functionality", linked: false },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 h-8 text-xs">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function MetaField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <CopyButton text={value} label={label} />
      </div>
      {multiline ? (
        <pre className="text-sm bg-muted/50 rounded-xl p-3 whitespace-pre-wrap font-sans border border-border/30 max-h-60 overflow-y-auto">{value}</pre>
      ) : (
        <p className="text-sm bg-muted/50 rounded-xl px-3 py-2 border border-border/30">{value}</p>
      )}
    </div>
  );
}

export default function AdminAppStoreAssets() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">App Store Assets</h1>
            <p className="text-xs text-muted-foreground">Metadata for Apple & Google submissions</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Info */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              App Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetaField label="App Name" value={APP_META.name} />
            <MetaField label="Subtitle (iOS)" value={APP_META.subtitle} />
            <MetaField label="Bundle ID (iOS)" value={APP_META.bundleId} />
            <MetaField label="Package Name (Android)" value={APP_META.packageName} />
            <MetaField label="Category" value={APP_META.category} />
            <MetaField label="Secondary Category" value={APP_META.secondaryCategory} />
            <MetaField label="Content Rating" value={APP_META.contentRating} />
            <MetaField label="Support URL" value={APP_META.website} />
            <MetaField label="Support Email" value={APP_META.supportEmail} />
            <MetaField label="Privacy Policy URL" value={APP_META.privacyUrl} />
            <MetaField label="Terms of Use URL" value={APP_META.termsUrl} />
          </CardContent>
        </Card>

        {/* Descriptions */}
        <Tabs defaultValue="ios">
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="ios" className="flex-1 gap-1.5 rounded-lg">
              <Apple className="h-3.5 w-3.5" /> App Store
            </TabsTrigger>
            <TabsTrigger value="android" className="flex-1 gap-1.5 rounded-lg">
              <Smartphone className="h-3.5 w-3.5" /> Play Store
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-4">
            <Card className="rounded-2xl border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  iOS Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MetaField label="Full Description (4000 chars max)" value={IOS_DESCRIPTION} multiline />
                <p className="text-[10px] text-muted-foreground mt-2">{IOS_DESCRIPTION.length} / 4000 characters</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="android" className="mt-4">
            <Card className="rounded-2xl border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Play Store Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MetaField label="Full Description (4000 chars max)" value={ANDROID_DESCRIPTION} multiline />
                <p className="text-[10px] text-muted-foreground mt-2">{ANDROID_DESCRIPTION.length} / 4000 characters</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Keywords */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                Keywords (iOS — 100 char limit)
              </CardTitle>
              <CopyButton text={KEYWORDS.join(",")} label="Keywords" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {KEYWORDS.map(kw => (
                <span key={kw} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{kw}</span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Comma-separated: {KEYWORDS.join(",").length} / 100 characters
            </p>
          </CardContent>
        </Card>

        {/* Privacy Nutrition Labels */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Privacy Nutrition Labels (iOS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PRIVACY_NUTRITION.map((item, i) => (
              <div key={i} className="rounded-xl border border-border/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{item.category}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.linked ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {item.linked ? "Linked to Identity" : "Not Linked"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.types.join(", ")}</p>
                <p className="text-[10px] text-muted-foreground/70">Purpose: {item.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Safety (Android) */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Data Safety (Google Play)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-muted/50 p-3 border border-border/30 space-y-2 text-sm">
              <p><strong>Data shared with third parties:</strong> Purchase History (Meta Conversions API for advertising measurement)</p>
              <p><strong>Data collected:</strong> Location (precise, for nearby shops and delivery), Name, Email, Phone (account), Purchase History, Device ID, Crash Logs</p>
              <p><strong>Security:</strong> Data is encrypted in transit. Users can request data deletion.</p>
              <p><strong>Compliance:</strong> GDPR, CCPA, Cambodia Data Protection</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
