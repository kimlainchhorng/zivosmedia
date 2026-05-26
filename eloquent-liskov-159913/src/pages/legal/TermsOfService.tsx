import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, AlertTriangle, Scale, Users, Car, UtensilsCrossed, Plane, Hotel, Key, Gavel, Lock, Globe, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ADVANCED_LEGAL_CLAUSES, COMPANY_INFO } from "@/config/legalContent";

const TermsOfService = () => {
  const lastUpdated = "March 13, 2026";
  const companyName = "ZIVO LLC";

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
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              Welcome to ZIVO. These Terms of Service ("Terms") govern your access to and use of the ZIVO platform, 
              including our mobile applications, websites, and all services provided by {companyName} ("ZIVO," "we," "us," or "our"). 
              By accessing or using our Services, you agree to be bound by these Terms.
            </p>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Users, label: "User Accounts", href: "#accounts" },
            { icon: Car, label: "Rides", href: "#rides" },
            { icon: UtensilsCrossed, label: "Food Delivery", href: "#eats" },
            { icon: Key, label: "Car Rental", href: "#rental" },
            { icon: Plane, label: "Flights", href: "#flights" },
            { icon: Hotel, label: "Hotels", href: "#hotels" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </a>
          ))}
        </div>

        {/* Terms Sections */}
        <Accordion type="single" collapsible className="space-y-4">
          {/* Section 1: Acceptance */}
          <AccordionItem value="acceptance" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <span className="font-semibold">Acceptance of Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                By creating an account or using any ZIVO service, you confirm that you:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Are at least 18 years of age or the age of legal majority in your jurisdiction</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
                <li>Are not prohibited from using our services under applicable laws</li>
                <li>Will provide accurate, current, and complete information during registration</li>
              </ul>
              <p>
                If you do not agree to these Terms, you may not access or use our Services. We reserve the right to 
                modify these Terms at any time. Continued use of the Services after changes constitutes acceptance.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: User Accounts */}
          <AccordionItem value="accounts" id="accounts" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <span className="font-semibold">User Accounts & Registration</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">2.1 Account Creation</h4>
              <p>
                To access certain features, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide truthful and accurate information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.2 Account Types</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Rider/Customer Account:</strong> For booking rides, ordering food, renting cars, and booking travel</li>
                <li><strong>Driver Account:</strong> For providing ride-hailing and delivery services (subject to additional verification)</li>
                <li><strong>Partner Account:</strong> For restaurants, hotels, car rental owners, and other service providers</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.3 Account Termination</h4>
              <p>
                We may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, 
                or pose a risk to the safety of our community. You may also delete your account at any time through 
                account settings.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Ride Services */}
          <AccordionItem value="rides" id="rides" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rides/20 flex items-center justify-center">
                  <Car className="h-4 w-4 text-rides" />
                </div>
                <span className="font-semibold">ZIVO Rides - Terms of Use</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">3.1 Service Description</h4>
              <p>
                ZIVO Rides connects riders with independent driver-partners. ZIVO does not provide transportation 
                services directly; we act as an intermediary technology platform.
              </p>

              <h4 className="font-semibold text-foreground mt-6">3.2 Rider Responsibilities</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate pickup and drop-off locations</li>
                <li>Be ready at the pickup location when the driver arrives</li>
                <li>Treat drivers with respect and refrain from abusive behavior</li>
                <li>Wear seatbelts where required by law</li>
                <li>Not transport illegal items or engage in illegal activities</li>
                <li>Pay all applicable fees, including cancellation fees</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.3 Fare Calculation</h4>
              <p>
                Fares are calculated based on base fare, distance traveled, time elapsed, and applicable surge pricing. 
                Estimated fares shown before booking may differ from final amounts due to route changes or wait time.
              </p>

              <h4 className="font-semibold text-foreground mt-6">3.4 Cancellations</h4>
              <p>
                You may cancel a ride request before driver acceptance at no charge. Cancellations after driver 
                acceptance or no-shows may incur cancellation fees as displayed in the app.
              </p>

              <h4 className="font-semibold text-foreground mt-6">3.5 Safety</h4>
              <p>
                While we implement safety features including driver verification and trip tracking, you acknowledge 
                that using ride services involves inherent risks. ZIVO is not liable for actions of third-party drivers.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Food Delivery */}
          <AccordionItem value="eats" id="eats" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-eats/20 flex items-center justify-center">
                  <UtensilsCrossed className="h-4 w-4 text-eats" />
                </div>
                <span className="font-semibold">ZIVO Eats - Food Delivery Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">4.1 Service Description</h4>
              <p>
                ZIVO Eats facilitates food ordering and delivery from third-party restaurants. We do not prepare 
                food or guarantee restaurant compliance with dietary requirements or allergen information.
              </p>

              <h4 className="font-semibold text-foreground mt-6">4.2 Order Accuracy</h4>
              <p>
                You are responsible for reviewing your order before submission. Menu items, prices, and availability 
                are determined by restaurants and may change without notice.
              </p>

              <h4 className="font-semibold text-foreground mt-6">4.3 Delivery</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Estimated delivery times are approximate and not guaranteed</li>
                <li>You must provide accurate delivery addresses and contact information</li>
                <li>Orders may be left at the door if contactless delivery is selected</li>
                <li>We are not responsible for food quality issues caused by restaurant preparation</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">4.4 Allergies & Dietary Restrictions</h4>
              <p className="text-destructive">
                <strong>Important:</strong> ZIVO cannot guarantee that menu items are free from allergens. If you have 
                food allergies or dietary restrictions, contact the restaurant directly before ordering. ZIVO disclaims 
                all liability for allergic reactions or adverse effects from consumed food.
              </p>

              <h4 className="font-semibold text-foreground mt-6">4.5 Alcohol Delivery</h4>
              <p>
                Where permitted by law, alcohol may be available for delivery. You must be of legal drinking age and 
                present valid ID upon delivery. We reserve the right to refuse delivery if age cannot be verified.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Car Rental */}
          <AccordionItem value="rental" id="rental" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">ZIVO Car Rental - Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">5.1 Rental Requirements</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Must be at least 21 years old (25 for certain vehicle categories)</li>
                <li>Possess a valid driver's license held for at least 1 year</li>
                <li>Provide valid payment method and security deposit</li>
                <li>Complete identity verification as required</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">5.2 Vehicle Use</h4>
              <p>Rented vehicles may NOT be used for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Commercial ride-hailing or delivery services</li>
                <li>Racing, towing, or off-road driving</li>
                <li>Transport of hazardous materials</li>
                <li>Crossing international borders without prior authorization</li>
                <li>Any illegal purpose</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">5.3 Insurance & Liability</h4>
              <p>
                Basic insurance is included in rental rates. You are responsible for damage not covered by insurance, 
                including deductibles. Optional additional coverage may be purchased at checkout.
              </p>

              <h4 className="font-semibold text-foreground mt-6">5.4 Fuel Policy</h4>
              <p>
                Vehicles must be returned with the same fuel level as at pickup. Failure to do so will result in 
                refueling charges plus a service fee.
              </p>

              <h4 className="font-semibold text-foreground mt-6">5.5 Damage & Accidents</h4>
              <p>
                Any damage or accidents must be reported immediately. You agree to cooperate with investigations 
                and provide accurate information. Failure to report may void insurance coverage.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Flights */}
          <AccordionItem value="flights" id="flights" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Plane className="h-4 w-4 text-foreground" />
                </div>
                <span className="font-semibold">ZIVO Flights - Booking Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">6.1 Booking Agent Role</h4>
              <p>
                ZIVO acts as a booking agent for third-party airlines. Your contract of carriage is with the airline, 
                not ZIVO. Airline terms, conditions, and policies apply to your flight.
              </p>

              <h4 className="font-semibold text-foreground mt-6">6.2 Passenger Responsibilities</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate passenger information matching travel documents</li>
                <li>Ensure valid passports, visas, and travel documentation</li>
                <li>Arrive at the airport with sufficient time for check-in and security</li>
                <li>Comply with airline baggage policies and restrictions</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">6.3 Flight Changes & Cancellations</h4>
              <p>
                Airlines may change schedules, cancel flights, or modify routes. ZIVO is not responsible for 
                airline-initiated changes. Refund eligibility depends on your fare type and airline policies.
              </p>

              <h4 className="font-semibold text-foreground mt-6">6.4 Pricing</h4>
              <p>
                Displayed prices include base fare and applicable taxes. Additional fees (baggage, seat selection, 
                meals) may apply and are charged by airlines. Prices are subject to change until booking is confirmed.
              </p>

              <h4 className="font-semibold text-foreground mt-6">6.5 Travel Insurance</h4>
              <p>
                We strongly recommend purchasing travel insurance. ZIVO is not liable for losses due to flight 
                cancellations, delays, missed connections, or other travel disruptions.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: Hotels */}
          <AccordionItem value="hotels" id="hotels" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Hotel className="h-4 w-4 text-amber-500" />
                </div>
                <span className="font-semibold">ZIVO Hotels - Accommodation Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">7.1 Booking Platform Role</h4>
              <p>
                ZIVO provides a platform for booking accommodations. Your agreement is with the hotel property. 
                Hotel policies regarding check-in, amenities, and conduct apply.
              </p>

              <h4 className="font-semibold text-foreground mt-6">7.2 Guest Responsibilities</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate guest information and number of occupants</li>
                <li>Present valid ID at check-in</li>
                <li>Comply with hotel rules and policies</li>
                <li>Report any damage or issues immediately</li>
                <li>Vacate the room by check-out time</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">7.3 Cancellation Policies</h4>
              <p>
                Cancellation policies vary by property and rate type. Non-refundable rates offer discounts but 
                cannot be cancelled. Review the specific cancellation policy before booking.
              </p>

              <h4 className="font-semibold text-foreground mt-6">7.4 Property Descriptions</h4>
              <p>
                Hotel descriptions, images, and amenity lists are provided by properties. While we strive for accuracy, 
                ZIVO does not guarantee the accuracy of property-provided information.
              </p>

              <h4 className="font-semibold text-foreground mt-6">7.5 Additional Charges</h4>
              <p>
                Hotels may charge for additional services (room service, minibar, parking). Some properties charge 
                resort fees or local taxes not included in the displayed rate.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 8: Payment */}
          <AccordionItem value="payment" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">8</span>
                </div>
                <span className="font-semibold">Payments & Billing</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">8.1 Payment Methods</h4>
              <p>
                We accept major credit cards, debit cards, and digital wallets (Apple Pay, Google Pay). By adding 
                a payment method, you authorize us to charge it for services rendered.
              </p>

              <h4 className="font-semibold text-foreground mt-6">8.2 Pricing</h4>
              <p>
                All prices are shown in the local currency and include applicable taxes unless otherwise stated. 
                Prices may change without notice, but confirmed bookings will be honored at the quoted price.
              </p>

              <h4 className="font-semibold text-foreground mt-6">8.3 Authorization Holds</h4>
              <p>
                We may place temporary authorization holds on your payment method for car rentals, hotel bookings, 
                or other services requiring deposits. Holds are released according to your bank's policies.
              </p>

              <h4 className="font-semibold text-foreground mt-6">8.4 Disputes</h4>
              <p>
                Billing disputes must be submitted within 60 days of the charge. Contact our support team with 
                transaction details for review.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 9: Prohibited Conduct */}
          <AccordionItem value="prohibited" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-semibold">Prohibited Conduct</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use our services for any unlawful purpose</li>
                <li>Harass, threaten, or abuse other users, drivers, or partners</li>
                <li>Impersonate any person or entity</li>
                <li>Submit false information or fraudulent payment methods</li>
                <li>Interfere with the proper functioning of our platform</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated systems to access our services without permission</li>
                <li>Resell or commercially exploit our services</li>
                <li>Violate intellectual property rights of ZIVO or third parties</li>
              </ul>
              <p className="mt-4 text-destructive">
                Violation of these terms may result in immediate account termination and legal action.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 10: Limitation of Liability */}
          <AccordionItem value="liability" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Limitation of Liability</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">10.1 Disclaimer of Warranties</h4>
              <p>
                THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>

              <h4 className="font-semibold text-foreground mt-6">10.2 Limitation of Liability</h4>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ZIVO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, 
                ARISING FROM YOUR USE OF THE SERVICES.
              </p>

              <h4 className="font-semibold text-foreground mt-6">10.3 Maximum Liability</h4>
              <p>
                IN NO EVENT SHALL ZIVO'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO ZIVO IN THE TWELVE (12) 
                MONTHS PRECEDING THE CLAIM, OR $100 USD, WHICHEVER IS GREATER.
              </p>

              <h4 className="font-semibold text-foreground mt-6">10.4 Third-Party Services</h4>
              <p>
                ZIVO is not liable for the acts or omissions of third-party service providers, including drivers, 
                restaurants, hotels, airlines, or car rental providers.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 11: Dispute Resolution */}
          <AccordionItem value="disputes" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">11</span>
                </div>
                <span className="font-semibold">Dispute Resolution & Arbitration</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">11.1 Informal Resolution</h4>
              <p>
                Before initiating formal proceedings, you agree to contact us to attempt informal resolution.
                Most disputes can be resolved through our customer support team.
              </p>

              <h4 className="font-semibold text-foreground mt-6">11.2 Binding Arbitration</h4>
              <p>
                Any dispute not resolved informally shall be resolved by binding arbitration administered by 
                the American Arbitration Association (AAA) under its Consumer Arbitration Rules. Arbitration 
                shall take place in the state of Delaware or remotely via video conference.
              </p>

              <h4 className="font-semibold text-foreground mt-6">11.3 Class Action Waiver</h4>
              <p className="text-destructive">
                <strong>YOU AGREE TO RESOLVE DISPUTES ONLY ON AN INDIVIDUAL BASIS AND WAIVE ANY RIGHT TO 
                PARTICIPATE IN CLASS ACTIONS OR CLASS ARBITRATIONS.</strong>
              </p>

              <h4 className="font-semibold text-foreground mt-6">11.4 Exceptions</h4>
              <p>
                Either party may bring claims in small claims court if eligible. Nothing in this section 
                prevents ZIVO from seeking injunctive relief in court for intellectual property violations.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 12: General */}
          <AccordionItem value="general" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">12</span>
                </div>
                <span className="font-semibold">General Provisions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">12.1 Governing Law</h4>
              <p>
                These Terms are governed by the laws of the State of {COMPANY_INFO.stateOfFormation}, USA, without regard to conflict 
                of law principles.
              </p>

              <h4 className="font-semibold text-foreground mt-6">12.2 Severability</h4>
              <p>
                If any provision of these Terms is found unenforceable, the remaining provisions shall continue 
                in full force and effect.
              </p>

              <h4 className="font-semibold text-foreground mt-6">12.3 Entire Agreement</h4>
              <p>
                These Terms, together with our Privacy Policy and any service-specific terms, constitute the 
                entire agreement between you and ZIVO.
              </p>

              <h4 className="font-semibold text-foreground mt-6">12.4 Assignment</h4>
              <p>
                You may not assign these Terms without our consent. ZIVO may assign these Terms to any affiliate 
                or in connection with a merger, acquisition, or sale of assets.
              </p>

              <h4 className="font-semibold text-foreground mt-6">12.5 Contact Information</h4>
              <p>
                For questions about these Terms, contact us at:
              </p>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <p><strong>{COMPANY_INFO.name}</strong></p>
                <p>Legal Department</p>
                <p>Email: {COMPANY_INFO.email}</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ADVANCED LEGAL PROTECTIONS (Sections 13-30) */}
          <div className="pt-8 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Advanced Legal Protections
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maximum liability shielding and enterprise-grade legal protection
            </p>
          </div>

          {/* Section 13: No Agency */}
          <AccordionItem value="no-agency" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">13</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.noAgencyClause.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.noAgencyClause.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 14: Platform Disclaimer */}
          <AccordionItem value="platform-disclaimer" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-500">14</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.platformDisclaimer.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.platformDisclaimer.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 15: Assumption of Risk */}
          <AccordionItem value="assumption-risk" className="border border-destructive/50 rounded-lg px-4 bg-destructive/5">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <FileWarning className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.assumptionOfRisk.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p className="text-destructive font-medium">{ADVANCED_LEGAL_CLAUSES.assumptionOfRisk.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 16: Release of Liability */}
          <AccordionItem value="release-liability" className="border border-destructive/50 rounded-lg px-4 bg-destructive/5">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-destructive">16</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.releaseOfLiability.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p className="text-destructive font-medium">{ADVANCED_LEGAL_CLAUSES.releaseOfLiability.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 17: Force Majeure Expanded */}
          <AccordionItem value="force-majeure" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-500">17</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.forceMajeureExpanded.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.forceMajeureExpanded.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 18: Third-Party Beneficiary */}
          <AccordionItem value="third-party" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.thirdPartyBeneficiary.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.thirdPartyBeneficiary.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 19: Strong Indemnification */}
          <AccordionItem value="indemnification" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.strongIndemnification.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.strongIndemnification.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 20: Damage Limit Cap */}
          <AccordionItem value="damage-cap" className="border border-destructive/50 rounded-lg px-4 bg-destructive/5">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-destructive">20</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.damageLimitCap.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p className="text-destructive font-medium">{ADVANCED_LEGAL_CLAUSES.damageLimitCap.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 21: Jury Trial Waiver */}
          <AccordionItem value="jury-waiver" className="border border-destructive/50 rounded-lg px-4 bg-destructive/5">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Gavel className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.juryTrialWaiver.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p className="text-destructive font-medium">{ADVANCED_LEGAL_CLAUSES.juryTrialWaiver.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 22: Class Action Opt-Out */}
          <AccordionItem value="class-action-optout" className="border border-amber-500/50 rounded-lg px-4 bg-amber-500/5">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-500">22</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.classActionOptOut.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.classActionOptOut.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 23: Government Requests */}
          <AccordionItem value="gov-requests" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">23</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.governmentRequests.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.governmentRequests.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 24: Content Disclaimer */}
          <AccordionItem value="content-disclaimer" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">24</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.contentDisclaimer.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.contentDisclaimer.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 25: Intellectual Property */}
          <AccordionItem value="ip-protection" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.intellectualProperty.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.intellectualProperty.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 26: Service Modification */}
          <AccordionItem value="service-mod" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">26</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.serviceModification.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.serviceModification.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 27: Termination Without Cause */}
          <AccordionItem value="termination" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">27</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.terminationWithoutCause.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.terminationWithoutCause.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 28: Severability & Survival */}
          <AccordionItem value="severability" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">28</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.severabilitySurvival.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.severabilitySurvival.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 29: International Users */}
          <AccordionItem value="international" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.internationalUsers.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.internationalUsers.content}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 30: Entire Agreement */}
          <AccordionItem value="entire-agreement" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">30</span>
                </div>
                <span className="font-semibold">{ADVANCED_LEGAL_CLAUSES.entireAgreement.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-6">
              <p>{ADVANCED_LEGAL_CLAUSES.entireAgreement.content}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer */}
        <div className="mt-12 p-6 bg-card border border-border rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            By using ZIVO services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/privacy-policy">
              <Button variant="outline" size="sm">Privacy Policy</Button>
            </Link>
            <Link to="/refund-policy">
              <Button variant="outline" size="sm">Refund Policy</Button>
            </Link>
            <Link to="/help">
              <Button variant="outline" size="sm">Help Center</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
