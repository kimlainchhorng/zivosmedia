/**
 * Car Rental Traveler Info Page
 * Collect traveler details with partner consent
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Shield, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RampGlobalDisclaimer } from "@/components/results";

export default function CarTravelerInfoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!consent) {
      newErrors.consent = "You must agree to share your information";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Navigate to checkout with traveler info
    const params = new URLSearchParams(searchParams);
    params.set("name", formData.fullName);
    params.set("email", formData.email);
    params.set("phone", formData.phone);
    
    navigate(`/rent-car/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Traveler Information | Car Rental | ZIVO"
        description="Enter your details to complete your car rental booking."
      />
      <Header />

      <main className="pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="container mx-auto px-4 max-w-2xl"
        >
          {/* Back Link */}
          <Link 
            to={`/rent-car/detail?${searchParams.toString()}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to details
          </Link>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Details</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm font-medium">Traveler Info</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm text-muted-foreground">Payment</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Traveler Information</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your details to proceed with the booking
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="John Doe"
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (234) 567-8900"
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              {/* Consent Checkbox */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                    className={errors.consent ? "border-destructive" : ""}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent" className="text-sm font-medium cursor-pointer leading-relaxed">
                      I agree to share my information with the licensed booking partner to complete my reservation.
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Your information will only be used to process this booking.
                    </p>
                  </div>
                </div>
                {errors.consent && (
                  <p className="text-xs text-destructive">{errors.consent}</p>
                )}
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Secure Partner Checkout</p>
                  <p className="text-xs text-muted-foreground">
                    Payment is processed by our licensed travel partner. Your data is encrypted and secure.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" size="lg" className="w-full font-medium">
                Proceed to secure payment
              </Button>
            </form>
          </div>

          <RampGlobalDisclaimer className="mt-6" />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
