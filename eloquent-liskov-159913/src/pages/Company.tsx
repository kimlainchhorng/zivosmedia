/**
 * Company Page
 * About ZIVO LLC - company information
 */
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Shield, 
  Globe,
  Users,
  CheckCircle2,
  Mail,
  MapPin
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Company = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Company | ZIVO LLC"
        description="Learn about ZIVO LLC, a travel search and comparison platform based in the United States."
        canonical="https://hizivo.com/company"
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Building2 className="w-3 h-3 mr-1" />
              Company
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              ZIVO LLC
            </h1>
            <p className="text-lg text-muted-foreground">
              Travel Search & Comparison Platform
            </p>
          </div>

          {/* Company Overview */}
          <Card className="mb-8 border-border/50">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">About ZIVO</h2>
                  <p className="text-muted-foreground">
                    ZIVO is a travel search and comparison platform that helps travelers 
                    find and compare flights, hotels, and car rentals from trusted partners.
                  </p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Headquarters</p>
                    <p className="text-sm text-muted-foreground">United States</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <p className="text-sm text-muted-foreground">hizivo.com</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What We Do */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">What We Do</h2>
            
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-2">Search & Compare</h3>
                      <p className="text-muted-foreground text-sm">
                        We aggregate travel options from multiple trusted partners, 
                        making it easy to compare prices and find the best deals.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-2">Partner Connections</h3>
                      <p className="text-muted-foreground text-sm">
                        We connect travelers with licensed travel partners who handle 
                        bookings, payments, and fulfillment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-2">Transparent Information</h3>
                      <p className="text-muted-foreground text-sm">
                        We provide clear information about pricing, partners, 
                        and booking processes so you can make informed decisions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Compliance */}
          <Card className="mb-8 bg-muted/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Seller of Travel Registration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    ZIVO is registered as a Seller of Travel where required by law.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    California SOT: pending · Florida SOT: pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Mail className="w-5 h-5 text-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">General</p>
                  <a href="mailto:info@hizivo.com" className="text-sm font-medium text-foreground hover:underline">
                    info@hizivo.com
                  </a>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Mail className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Payments</p>
                  <a href="mailto:payment@hizivo.com" className="text-sm font-medium text-emerald-500 hover:underline">
                    payment@hizivo.com
                  </a>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Mail className="w-5 h-5 text-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Business</p>
                  <a href="mailto:kimlain@hizivo.com" className="text-sm font-medium text-foreground hover:underline">
                    kimlain@hizivo.com
                  </a>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link to="/contact">
              <Button size="lg" className="gap-2">
                <Users className="w-4 h-4" />
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Company;
