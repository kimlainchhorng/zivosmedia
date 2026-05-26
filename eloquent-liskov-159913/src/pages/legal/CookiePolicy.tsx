import { useState, useEffect } from "react";
import { ArrowLeft, Cookie, Mail, Shield, Settings, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

// Cookie categories with descriptions
const cookieCategories = [
  {
    id: "essential",
    title: "Essential Cookies",
    description: "Required for core site functionality, authentication, and security. Cannot be disabled.",
    required: true,
    examples: ["Session management", "Security tokens", "Load balancing"],
  },
  {
    id: "functional",
    title: "Functional Cookies",
    description: "Remember your preferences like language, currency, and display settings.",
    required: false,
    examples: ["Language preferences", "Currency selection", "Theme settings"],
  },
  {
    id: "analytics",
    title: "Analytics Cookies",
    description: "Help us understand how visitors use our site so we can improve it.",
    required: false,
    examples: ["Page views", "Navigation patterns", "Performance metrics"],
  },
];

const CookiePolicy = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  // On native apps, redirect to home — cookies are not used for tracking
  useEffect(() => {
    if (isNative) {
      navigate("/", { replace: true });
    }
  }, [isNative, navigate]);

  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    essential: true,
    functional: true,
    analytics: true,
  });

  const handlePreferenceChange = (category: string, enabled: boolean) => {
    if (category === "essential") return; // Cannot disable essential
    setPreferences(prev => ({ ...prev, [category]: enabled }));
  };

  const savePreferences = () => {
    // In production, this would save to localStorage and update tracking scripts
    localStorage.setItem("cookie_preferences", JSON.stringify(preferences));
    toast.success("Cookie preferences saved");
  };

  const acceptAll = () => {
    const allEnabled = { essential: true, functional: true, analytics: true };
    setPreferences(allEnabled);
    localStorage.setItem("cookie_preferences", JSON.stringify(allEnabled));
    toast.success("All cookies accepted");
  };

  const rejectOptional = () => {
    const minimalCookies = { essential: true, functional: false, analytics: false };
    setPreferences(minimalCookies);
    localStorage.setItem("cookie_preferences", JSON.stringify(minimalCookies));
    toast.success("Optional cookies rejected");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cookie Policy - ZIVO | Travel Search Platform"
        description="Learn how ZIVO uses cookies and similar technologies. Manage your cookie preferences and opt-in/out of non-essential tracking."
        canonical="https://hizivo.com/cookies"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Cookie className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-lg text-muted-foreground">
            Last updated: February 3, 2026
          </p>
        </div>

        {/* Cookie Preferences Card */}
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Cookie Preferences
            </CardTitle>
            <CardDescription>
              Manage which cookies you allow. Essential cookies cannot be disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {cookieCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-start justify-between p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              >
                <div className="space-y-1 flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={category.id} className="font-medium cursor-pointer">
                      {category.title}
                    </Label>
                    {category.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {category.examples.map((example) => (
                      <Badge key={example} variant="outline" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Switch
                  id={category.id}
                  checked={preferences[category.id]}
                  onCheckedChange={(checked) => handlePreferenceChange(category.id, checked)}
                  disabled={category.required}
                />
              </div>
            ))}

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button onClick={savePreferences}>Save Preferences</Button>
              <Button variant="outline" onClick={acceptAll}>Accept All</Button>
              <Button variant="outline" onClick={rejectOptional}>Essential Only</Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <Cookie className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">How We Use Cookies</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed mb-4">
                ZIVO uses cookies and similar technologies to:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  Enable core site functionality (authentication, security)
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  Remember your preferences (language, currency, theme)
                </li>
                <li className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  Analyze traffic and performance to improve our services
                </li>
              </ul>
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <strong>No tracking or advertising cookies:</strong> ZIVO does not use cookies to track users 
                    across other apps or websites, and does not use cookies for advertising or ad targeting purposes.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* EU/GDPR Notice */}
          <section className="bg-amber-500/10 rounded-2xl p-6 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-600 mb-2">EU Users Notice</h3>
                <p className="text-foreground leading-relaxed">
                  For users in the European Union: We do not set non-essential cookies until you 
                  provide explicit consent. You can manage your preferences at any time using the 
                  controls above or through your browser settings.
                </p>
              </div>
            </div>
          </section>

          {/* What Are Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">What Are Cookies?</h2>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed">
                Cookies are small text files stored on your device when you visit websites. 
                They help websites remember your preferences and provide a better experience. 
                Similar technologies include local storage, session storage, and pixel tags.
              </p>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Cookies</h2>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed mb-4">
                We may use third-party services that set their own cookies:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { name: "Google Analytics", purpose: "Usage analytics" },
                  { name: "Stripe", purpose: "Payment processing" },
                  { name: "Supabase", purpose: "Authentication" },
                ].map((item) => (
                  <div key={item.name} className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">{item.purpose}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                None of these third-party services are used for cross-app or cross-site tracking.
              </p>
            </div>
          </section>

          {/* Managing Cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Managing Cookies</h2>
            </div>
            <div className="bg-muted/30 rounded-2xl p-6 border border-border">
              <p className="text-foreground leading-relaxed mb-4">
                You can manage cookies through:
              </p>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Our cookie preference controls above
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Your browser's cookie settings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Device privacy settings (mobile)
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Note: Blocking essential cookies may prevent the site from functioning properly.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Contact</h2>
            </div>
            <div className="bg-card/50 rounded-2xl p-6 border border-border">
              <p className="text-foreground mb-4">
                Questions about our cookie policy?
              </p>
              <a 
                href="mailto:privacy@hizivo.com" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                privacy@hizivo.com
              </a>
            </div>
          </section>

          {/* Related Links */}
          <div className="text-center pt-8">
            <p className="text-sm text-muted-foreground mb-4">Related policies:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/account/privacy">Privacy Controls</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/terms">Terms of Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;