/**
 * How to Rent Page
 * Marketing page explaining the rental process for renters
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, FileCheck, Car, Shield, CreditCard, Star,
  CheckCircle, ArrowRight, Clock, Zap, Lock, Users, Phone
} from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Search,
    title: "Find Your Car",
    description: "Browse hundreds of cars from local owners. Filter by type, price, location, and features to find your perfect ride.",
  },
  {
    icon: FileCheck,
    title: "Verify Your Identity",
    description: "Complete a quick verification with your driver's license. This keeps our community safe and builds trust.",
  },
  {
    icon: CreditCard,
    title: "Book & Pay Securely",
    description: "Reserve your car with secure payment processing. Your payment is protected until your trip is complete.",
  },
  {
    icon: Car,
    title: "Pick Up & Drive",
    description: "Meet the owner, inspect the car together, and hit the road. It's that simple.",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Insurance Included",
    description: "Every trip includes liability insurance coverage. Drive with peace of mind.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Your payment is held safely and only released to the owner after your trip.",
  },
  {
    icon: Star,
    title: "Verified Owners",
    description: "All car owners are verified. Check reviews from previous renters.",
  },
  {
    icon: Phone,
    title: "24/7 Support",
    description: "Our support team is available around the clock for any issues.",
  },
];

const faqs = [
  {
    question: "What do I need to rent a car?",
    answer: "You'll need a valid driver's license, be at least 21 years old, and complete our identity verification process.",
  },
  {
    question: "Is insurance included?",
    answer: "Yes, every rental includes liability insurance. You can also add additional coverage options at checkout.",
  },
  {
    question: "How do I pick up the car?",
    answer: "You'll coordinate with the owner for pickup. Most owners offer flexible pickup locations and times.",
  },
  {
    question: "What if I need to cancel?",
    answer: "Our cancellation policy varies by listing. Many offer free cancellation up to 24 hours before pickup.",
  },
  {
    question: "What happens if there's an issue during my trip?",
    answer: "Contact our 24/7 support team. We'll help resolve any issues and can arrange alternative transportation if needed.",
  },
];

export default function HowToRent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate("/renter/dashboard");
    } else {
      navigate("/signup?redirect=/renter/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="How to Rent a Car | ZIVO Peer-to-Peer Car Sharing"
        description="Learn how easy it is to rent a car from local owners on ZIVO. Verified owners, insurance included, and 24/7 support."
      />
      <Header />

      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Renting Made <span className="text-primary">Simple</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Skip the rental counter. Book cars directly from local owners with better prices, 
                unique vehicles, and a personal touch.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/cars")} className="gap-2">
                  <Search className="w-5 h-5" />
                  Browse Cars
                </Button>
                <Button size="lg" variant="outline" onClick={handleCTA} className="gap-2">
                  {user ? "Go to Dashboard" : "Sign Up Free"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              4 Easy Steps to Get on the Road
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              Why Rent with ZIVO?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              We've built a platform that puts you first with protection, transparency, and support at every step.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Verification Info */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge variant="secondary" className="mb-4">Verification</Badge>
                  <h2 className="text-3xl font-bold mb-4">
                    Quick & Secure Verification
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Our verification process is designed to be fast while keeping everyone safe. 
                    Most verifications are approved within minutes.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Upload your driver's license",
                      "Quick identity verification",
                      "Background check for safety",
                      "Start booking immediately after approval",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Card className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">5 Minutes</h3>
                  <p className="text-muted-foreground">Average verification time</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <Card key={faq.question}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Find Your Perfect Ride?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of happy renters who have discovered the better way to rent cars.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/cars")} className="gap-2">
                <Search className="w-5 h-5" />
                Browse Cars Now
              </Button>
              <Button size="lg" variant="outline" onClick={handleCTA} className="gap-2">
                {user ? "View My Dashboard" : "Create Free Account"}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
