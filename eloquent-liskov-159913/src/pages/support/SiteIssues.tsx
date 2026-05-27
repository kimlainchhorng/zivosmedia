/**
 * Site Issues Support Page
 * Troubleshooting checklist for technical problems
 */

import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Monitor, 
  RefreshCw, 
  Trash2, 
  Globe, 
  Shield, 
  Wifi,
  Smartphone,
  Mail,
  CheckCircle,
  AlertTriangle,
  HelpCircle
} from "lucide-react";
import { useState } from "react";

const troubleshootingSteps = [
  {
    id: "refresh",
    icon: RefreshCw,
    title: "Refresh the page",
    description: "Press Ctrl+R (Windows) or Cmd+R (Mac) to reload the page.",
    tip: "This clears temporary errors and loads the latest version.",
  },
  {
    id: "cache",
    icon: Trash2,
    title: "Clear browser cache",
    description: "Go to your browser settings and clear cached images and files.",
    tip: "Outdated cached data can cause display issues.",
  },
  {
    id: "cookies",
    icon: Shield,
    title: "Check cookies are enabled",
    description: "Ensure your browser allows cookies for hizivo.com.",
    tip: "We use cookies for essential site functionality.",
  },
  {
    id: "browser",
    icon: Globe,
    title: "Try a different browser",
    description: "Test with Chrome, Firefox, Safari, or Edge.",
    tip: "Some extensions or browser settings can interfere.",
  },
  {
    id: "extensions",
    icon: Shield,
    title: "Disable browser extensions",
    description: "Ad blockers or privacy extensions may block functionality.",
    tip: "Try incognito/private mode to test without extensions.",
  },
  {
    id: "connection",
    icon: Wifi,
    title: "Check your internet connection",
    description: "Ensure you have a stable internet connection.",
    tip: "Try loading other websites to confirm connectivity.",
  },
  {
    id: "mobile",
    icon: Smartphone,
    title: "Try a different device",
    description: "Test on your phone or another computer.",
    tip: "This helps identify if the issue is device-specific.",
  },
];

const commonIssues = [
  {
    issue: "Search results not loading",
    solutions: [
      "Refresh the page",
      "Clear browser cache",
      "Disable ad blockers",
      "Try a different browser",
    ],
  },
  {
    issue: "Unable to click buttons",
    solutions: [
      "Disable browser extensions",
      "Enable JavaScript",
      "Clear cache and cookies",
      "Try incognito mode",
    ],
  },
  {
    issue: "Page layout looks broken",
    solutions: [
      "Clear browser cache",
      "Disable zoom (reset to 100%)",
      "Try a different browser",
      "Update your browser",
    ],
  },
  {
    issue: "Redirect not working",
    solutions: [
      "Disable popup blockers for hizivo.com",
      "Check if popups are blocked",
      "Try clicking the link again",
      "Clear browser data",
    ],
  },
];

export default function SiteIssuesSupport() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const allCompleted = completedSteps.size === troubleshootingSteps.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Site Issues & Troubleshooting – ZIVO"
        description="Having trouble with the Hizovo website? Follow our troubleshooting guide to resolve common issues."
        canonical="https://hizivo.com/support/site-issues"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/20 text-amber-500 border-amber-500/30">
              <Monitor className="w-3 h-3 mr-1" />
              Technical Support
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Site Issues & Troubleshooting
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Having trouble with the Hizovo website? Try these steps to resolve common issues.
            </p>
          </div>

          {/* Troubleshooting Checklist */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Troubleshooting Checklist
              </CardTitle>
              <CardDescription>
                Work through these steps before contacting support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {troubleshootingSteps.map((step) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.has(step.id);
                  
                  return (
                    <div 
                      key={step.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        isCompleted 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-muted/30 border-border/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          id={step.id}
                          checked={isCompleted}
                          onCheckedChange={() => toggleStep(step.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={step.id}
                            className="flex items-center gap-2 font-semibold cursor-pointer"
                          >
                            <Icon className={`w-4 h-4 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`} />
                            {step.title}
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1 italic">
                            Tip: {step.tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Indicator */}
              <div className="mt-6 p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedSteps.size} / {troubleshootingSteps.length} steps
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${(completedSteps.size / troubleshootingSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Issues */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Common Issues & Solutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {commonIssues.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <p className="font-semibold mb-3">{item.issue}</p>
                    <ul className="space-y-2">
                      {item.solutions.map((solution, sIdx) => (
                        <li key={sIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Browser Requirements */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-foreground" />
                Browser Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                For the best experience, we recommend using a modern browser:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['Chrome 90+', 'Firefox 88+', 'Safari 14+', 'Edge 90+'].map((browser) => (
                  <div key={browser} className="p-3 rounded-xl bg-muted/50 text-center">
                    <p className="text-sm font-medium">{browser}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                JavaScript and cookies must be enabled. Disable ad blockers if experiencing issues.
              </p>
            </CardContent>
          </Card>

          {/* Still Need Help */}
          <div className="text-center p-8 rounded-2xl bg-primary/5 border border-primary/20">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Still experiencing issues?</h2>
            <p className="text-muted-foreground mb-6">
              {allCompleted 
                ? "You've tried all troubleshooting steps. Contact us for further assistance."
                : "Complete the troubleshooting checklist above, then contact us if the issue persists."}
            </p>
            <Button asChild disabled={!allCompleted}>
              <Link to="/contact" className="gap-2">
                <Mail className="w-4 h-4" />
                Contact Support
              </Link>
            </Button>
            {!allCompleted && (
              <p className="text-xs text-muted-foreground mt-3">
                Complete all troubleshooting steps first
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
