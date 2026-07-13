import { Link } from "react-router-dom";
import { ArrowLeft, Accessibility, Eye, Ear, Hand, Brain, Monitor, Smartphone, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AccessibilityStatement = () => {
  const lastUpdated = "January 26, 2026";

  const features = [
    {
      icon: Eye,
      title: "Vision",
      items: [
        "Screen reader compatibility (NVDA, JAWS, VoiceOver)",
        "High contrast mode support",
        "Resizable text up to 200% without loss of content",
        "Alt text for all meaningful images",
        "Color not used as sole means of conveying information",
      ],
    },
    {
      icon: Ear,
      title: "Hearing",
      items: [
        "Visual indicators for all audio alerts",
        "Captions for video content",
        "Text-based alternatives for audio information",
        "Visual notification settings",
      ],
    },
    {
      icon: Hand,
      title: "Motor",
      items: [
        "Full keyboard navigation support",
        "Large touch targets (minimum 44x44px)",
        "No time limits on form submissions",
        "Skip navigation links",
        "Focus indicators on interactive elements",
      ],
    },
    {
      icon: Brain,
      title: "Cognitive",
      items: [
        "Clear, simple language (reading level consideration)",
        "Consistent navigation patterns",
        "Error messages with clear instructions",
        "Progress indicators for multi-step processes",
        "Option to disable animations",
      ],
    },
  ];

  const platformFeatures = [
    {
      platform: "ZIVO Rides",
      features: [
        "Wheelchair-accessible vehicle (WAV) option",
        "Option to indicate use of service animals",
        "Driver notification of accessibility needs",
        "Estimated arrival time announcements",
        "Ability to request driver assistance",
      ],
    },
    {
      platform: "ZIVO Eats",
      features: [
        "Dietary restriction filters",
        "Clear allergen information display",
        "Contactless delivery options",
        "Detailed delivery instructions",
      ],
    },
    {
      platform: "Flights & Hotels",
      features: [
        "Wheelchair assistance request option",
        "Accessible room filters for hotels",
        "Clear accessibility amenity information",
        "Special assistance during booking",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-rides flex items-center justify-center">
              <Accessibility className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Accessibility Statement</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Commitment Statement */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-eats/10 border-0">
          <CardContent className="p-6">
            <h2 className="font-display font-bold text-2xl mb-3">Our Commitment to Accessibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              ZIVO is committed to ensuring digital accessibility for people with disabilities. We continually 
              improve the user experience for everyone and apply the relevant accessibility standards. Our goal 
              is to permit all users to successfully navigate, understand, and interact with our services.
            </p>
          </CardContent>
        </Card>

        {/* Standards Compliance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Standards & Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="outline" className="border-primary text-primary">WCAG 2.1 AA</Badge>
              <Badge variant="outline" className="border-primary text-primary">Section 508</Badge>
              <Badge variant="outline" className="border-primary text-primary">ADA Title III</Badge>
              <Badge variant="outline" className="border-primary text-primary">EN 301 549</Badge>
            </div>
            <p className="text-muted-foreground">
              We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA success criteria. 
              Our services are designed to comply with Section 508 of the Rehabilitation Act and the Americans with 
              Disabilities Act (ADA). We also consider international standards including EN 301 549 for European users.
            </p>
          </CardContent>
        </Card>

        {/* Accessibility Features by Disability Type */}
        <div className="space-y-6 mb-8">
          <h2 className="font-display font-bold text-xl">Accessibility Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <feature.icon className="h-5 w-5 text-primary" />
                    {feature.title} Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Platform-Specific Features */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Service-Specific Accessibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {platformFeatures.map((platform) => (
              <div key={platform.platform}>
                <h4 className="font-semibold mb-3">{platform.platform}</h4>
                <ul className="grid md:grid-cols-2 gap-2">
                  {platform.features.map((feature, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Technical Specifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Technical Compatibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Browsers</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Chrome (latest 2 versions)</li>
                  <li>• Firefox (latest 2 versions)</li>
                  <li>• Safari (latest 2 versions)</li>
                  <li>• Edge (latest 2 versions)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Assistive Technologies</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• JAWS (Windows)</li>
                  <li>• NVDA (Windows)</li>
                  <li>• VoiceOver (macOS, iOS)</li>
                  <li>• Dragon NaturallySpeaking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Apps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile App Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">iOS</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• VoiceOver support</li>
                  <li>• Dynamic Type scaling</li>
                  <li>• Switch Control compatible</li>
                  <li>• Reduce Motion option</li>
                  <li>• Bold Text support</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Web</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Screen reader support</li>
                  <li>• Keyboard navigation</li>
                  <li>• Zoom and text scaling support</li>
                  <li>• High contrast compatibility</li>
                  <li>• Focus indicators for interactive elements</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Known Limitations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Known Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              While we strive for full accessibility, some limitations may exist:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Third-party content (restaurant menus, hotel descriptions) may not meet our accessibility standards</li>
              <li>• Some legacy PDF documents may not be fully accessible</li>
              <li>• Live map features may have limited screen reader support</li>
              <li>• Some promotional graphics may lack full alternative text</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              We are actively working to address these limitations. Please contact us if you encounter any barriers.
            </p>
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card className="mb-8 border-primary/50">
          <CardContent className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Accessibility Feedback</h3>
            <p className="text-muted-foreground mb-4">
              We welcome your feedback on the accessibility of ZIVO. Please let us know if you encounter 
              accessibility barriers:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <Mail className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-sm">Email</p>
                <p className="text-sm text-muted-foreground">accessibility@zivo.com</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Phone className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-sm">Phone</p>
                <p className="text-sm text-muted-foreground">1-800-ZIVO-ADA</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <Accessibility className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-sm">TTY/TDD</p>
                <p className="text-sm text-muted-foreground">711 (Relay Service)</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              We try to respond to accessibility feedback within 5 business days.
            </p>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/help">
            <Button variant="outline">Help Center</Button>
          </Link>
          <Link to="/terms-of-service">
            <Button variant="outline">Terms of Service</Button>
          </Link>
          <Link to="/community-guidelines">
            <Button variant="outline">Community Guidelines</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AccessibilityStatement;
