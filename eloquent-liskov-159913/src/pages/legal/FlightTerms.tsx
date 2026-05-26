/**
 * Flight Terms Page
 * Legal terms for ZIVO flight bookings (MoR model)
 * Covers DOT regulations, SOT, refunds, liability, disputes, data sharing
 */

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Shield, CreditCard, RefreshCw, AlertCircle, FileText, Scale, Clock, Globe, Database, Ban, Gavel } from 'lucide-react';
import { Link } from "react-router-dom";

const FlightTerms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Flight Booking Terms – ZIVO"
        description="Terms and conditions for booking flights through ZIVO. Learn about our policies, refunds, DOT regulations, and airline rules."
      />
      <Header />

      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">Flight Booking Terms</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              These terms apply to all flight bookings made through ZIVO. Please read carefully before booking.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: March 21, 2026
            </p>
          </div>

          <div className="space-y-8">
            {/* ZIVO as Seller */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  ZIVO as Seller of Travel
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  ZIVO LLC operates as a seller of travel and processes payments for flight bookings. When you book a flight through ZIVO:
                </p>
                <ul>
                  <li>ZIVO is the merchant of record and will appear on your credit card statement</li>
                  <li>ZIVO issues booking confirmations and manages customer communications</li>
                  <li>Flight tickets (e-tickets) are issued by our licensed ticketing partners under a sub-agent arrangement</li>
                  <li>Your contract for carriage is with the operating airline(s)</li>
                </ul>
                
                <h4>Registration Status</h4>
                <p>
                  <strong>ZIVO LLC is registered as a Seller of Travel where required by law.</strong>
                </p>
                <ul>
                  <li>California Seller of Travel Registration: <em>pending</em></li>
                  <li>Florida Seller of Travel Registration: <em>pending</em></li>
                </ul>
                <p className="text-sm">
                  Additional state registrations will be added as obtained. ZIVO sells air travel as a sub-agent of licensed 
                  ticketing providers. Airline tickets are issued by authorized partners and subject to airline rules.
                </p>
              </CardContent>
            </Card>

            {/* DOT 24-Hour Cancellation Rule */}
            <Card id="dot-24hr">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  24-Hour Free Cancellation (DOT Rule)
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  In compliance with the U.S. Department of Transportation regulation <strong>14 CFR §259.5(b)(4)</strong>, ZIVO provides 
                  the following cancellation rights for flights departing from or arriving in the United States:
                </p>
                <ul>
                  <li><strong>24-hour free cancellation:</strong> You may cancel your booking within 24 hours of purchase for a full refund, 
                  provided the booking was made at least 7 days before the scheduled departure</li>
                  <li><strong>Full refund:</strong> The refund includes the full ticket price, all taxes, fees, and any ZIVO service charges</li>
                  <li><strong>No cancellation fee:</strong> No penalty or fee of any kind is charged for cancellations within this 24-hour window</li>
                  <li><strong>Original payment method:</strong> Refunds are credited to the original form of payment</li>
                  <li><strong>Processing time:</strong> Refunds are processed within 7 business days for credit card payments, 20 business days for cash/check purchases</li>
                </ul>
                <p className="text-sm">
                  This right applies regardless of the fare type (refundable or non-refundable). To cancel within the 24-hour window, 
                  contact ZIVO Support at <a href="mailto:support@hizivo.com">support@hizivo.com</a> or use your booking dashboard.
                </p>
              </CardContent>
            </Card>

            {/* Ticketing Partners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" />
                  Ticketing Partners
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  ZIVO works with licensed and accredited ticketing partners to issue airline tickets. These partners:
                </p>
                <ul>
                  <li>Hold IATA (International Air Transport Association) accreditation or equivalent</li>
                  <li>Are authorized to issue tickets on behalf of airlines</li>
                  <li>Comply with airline regulations and ticketing standards</li>
                </ul>
                <p>
                  Your e-ticket is a valid electronic travel document that can be used for check-in and boarding.
                </p>
              </CardContent>
            </Card>

            {/* Airline Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Airline Rules Apply
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  All flights are subject to the conditions of carriage of the operating airline(s). This includes:
                </p>
                <ul>
                  <li><strong>Baggage policies:</strong> Checked baggage allowance, carry-on limits, and excess baggage fees are set by the airline</li>
                  <li><strong>Schedule changes:</strong> Airlines may change flight times, routes, or cancel flights. ZIVO will notify you of any changes</li>
                  <li><strong>Seat selection:</strong> Available seats and seat selection fees are determined by the airline</li>
                  <li><strong>In-flight services:</strong> Meals, entertainment, and other services vary by airline and fare class</li>
                  <li><strong>Overbooking:</strong> Airlines may overbook flights. In the event of denied boarding, airline rules and DOT regulations on compensation apply</li>
                </ul>
                <p>
                  Please review the airline's conditions of carriage before traveling. Links are provided in your booking confirmation.
                </p>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Payment is processed securely through Stripe. By completing a booking, you agree that:
                </p>
                <ul>
                  <li>The total price shown at checkout is the final price, including all taxes and fees</li>
                  <li>Payment is due in full at the time of booking</li>
                  <li>ZIVO will authorize your payment method upon booking; capture occurs after ticket issuance</li>
                  <li>All prices are displayed in U.S. Dollars (USD) unless otherwise stated</li>
                  <li>ZIVO's service fee and payment processing fee are included in the displayed total</li>
                </ul>
                <p>
                  Your payment information is encrypted and never stored on ZIVO's servers. All transactions are processed by Stripe, a PCI-DSS Level 1 compliant payment processor.
                </p>
              </CardContent>
            </Card>

            {/* Pricing & Currency */}
            <Card id="pricing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Pricing, Currency & Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  ZIVO is committed to transparent pricing:
                </p>
                <ul>
                  <li><strong>All-inclusive pricing:</strong> The total price displayed at checkout includes the base fare, airline taxes, government fees, ZIVO service fee, and payment processing fee</li>
                  <li><strong>No hidden fees:</strong> No additional charges are added after checkout</li>
                  <li><strong>Currency:</strong> All prices are displayed in U.S. Dollars (USD). Your bank may apply its own currency conversion fees for non-USD payment methods</li>
                  <li><strong>Price guarantee:</strong> Once you complete payment, your price is locked. ZIVO will not charge additional amounts for the same booking</li>
                  <li><strong>Price changes:</strong> Airfares may change between search results and checkout due to airline inventory updates. If the price changes, you will be notified before payment</li>
                </ul>
                <h4>Fee Breakdown</h4>
                <ul>
                  <li><strong>Base fare:</strong> The airline's ticket price including airline-imposed taxes</li>
                  <li><strong>Taxes, fees & charges:</strong> Includes government taxes, airport fees, ZIVO booking fee, and card processing fee</li>
                </ul>
              </CardContent>
            </Card>

            {/* Refund Policy */}
            <Card id="refunds">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Cancellations and Refunds
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Refund eligibility depends on the fare type purchased and applicable regulations:
                </p>
                <h4>DOT 24-Hour Rule (US Flights)</h4>
                <ul>
                  <li>Full refund available within 24 hours of booking if booked 7+ days before departure</li>
                  <li>Applies to all fare types including non-refundable fares</li>
                  <li>See <a href="#dot-24hr">24-Hour Free Cancellation</a> section above</li>
                </ul>
                <h4>Refundable Fares</h4>
                <ul>
                  <li>Eligible for refund minus applicable airline cancellation fees</li>
                  <li>Refunds are processed within 7-14 business days</li>
                  <li>Refund will be credited to the original payment method</li>
                </ul>
                <h4>Non-Refundable Fares</h4>
                <ul>
                  <li>Generally not eligible for refund after the 24-hour DOT window</li>
                  <li>Some airlines offer credit for future travel (subject to change fees)</li>
                  <li>Exceptions may apply for airline-initiated cancellations or significant schedule changes</li>
                </ul>
                <h4>Airline-Initiated Cancellations</h4>
                <ul>
                  <li>If an airline cancels your flight, you are entitled to a full refund regardless of fare type</li>
                  <li>ZIVO will process the refund automatically or upon request</li>
                  <li>Significant schedule changes (2+ hours) may also qualify for a full refund</li>
                </ul>
                <h4>ZIVO Processing</h4>
                <ul>
                  <li>ZIVO does not charge a fee for processing refund requests</li>
                  <li>Airline cancellation/change fees are passed through as charged</li>
                  <li>Contact ZIVO Support to request a refund or change</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card id="liability">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-primary" />
                  Limitation of Liability
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  To the maximum extent permitted by applicable law:
                </p>
                <ul>
                  <li><strong>ZIVO's total liability</strong> for any claim arising from a flight booking shall not exceed the total amount paid by you for that booking</li>
                  <li><strong>ZIVO is not liable</strong> for airline operational issues including delays, cancellations, diversions, missed connections, overbooking, baggage loss or damage, or denial of boarding</li>
                  <li><strong>ZIVO is not liable</strong> for indirect, incidental, special, consequential, or punitive damages, including lost profits, lost travel arrangements, or additional travel expenses</li>
                  <li><strong>Airline liability:</strong> The airline's conditions of carriage and applicable international conventions (e.g., Montreal Convention) govern airline liability for personal injury, death, delay, and baggage issues</li>
                  <li><strong>Third-party services:</strong> ZIVO is not liable for services provided by airlines, airports, ground handlers, or other third parties</li>
                </ul>
                <p className="text-sm">
                  Nothing in these terms excludes or limits liability that cannot be excluded or limited under applicable law, including liability for fraud or personal injury caused by negligence.
                </p>
              </CardContent>
            </Card>

            {/* Force Majeure */}
            <Card id="force-majeure">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Force Majeure
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  ZIVO shall not be liable for any failure or delay in performing its obligations where such failure or delay results from circumstances beyond ZIVO's reasonable control, including but not limited to:
                </p>
                <ul>
                  <li>Natural disasters, severe weather, or acts of God</li>
                  <li>Pandemics, epidemics, or public health emergencies</li>
                  <li>Government actions, travel bans, sanctions, or border closures</li>
                  <li>War, terrorism, civil unrest, or political instability</li>
                  <li>Airline strikes, labor disputes, or air traffic control disruptions</li>
                  <li>System failures, cyberattacks, or technology disruptions beyond ZIVO's control</li>
                </ul>
                <p>
                  In force majeure situations, ZIVO will make commercially reasonable efforts to assist affected travelers and process eligible refunds in accordance with airline policies.
                </p>
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card id="data-sharing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Passenger Data & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  To complete your booking, ZIVO collects and shares certain personal information:
                </p>
                <h4>Data Collected</h4>
                <ul>
                  <li>Full legal name (as on travel documents)</li>
                  <li>Date of birth</li>
                  <li>Gender (as required by airlines)</li>
                  <li>Contact information (email, phone)</li>
                  <li>Payment information (processed by Stripe; not stored by ZIVO)</li>
                </ul>
                <h4>Data Shared With</h4>
                <ul>
                  <li><strong>Airlines:</strong> Passenger name, date of birth, gender, and contact details as required for ticketing and Advance Passenger Information (API/APIS)</li>
                  <li><strong>Ticketing partners:</strong> Information necessary to issue your e-ticket</li>
                  <li><strong>Stripe:</strong> Payment information for secure transaction processing</li>
                  <li><strong>Government agencies:</strong> As required by law (e.g., TSA, CBP for US flights)</li>
                </ul>
                <h4>Your Rights</h4>
                <p>
                  Under the California Consumer Privacy Act (CCPA) and similar state privacy laws, you have the right to:
                </p>
                <ul>
                  <li>Know what personal information is collected and how it is used</li>
                  <li>Request deletion of your personal information (subject to legal obligations)</li>
                  <li>Opt out of the sale of personal information (ZIVO does not sell personal data)</li>
                  <li>Non-discrimination for exercising your privacy rights</li>
                </ul>
                <p className="text-sm">
                  For full details, see our <Link to="/privacy">Privacy Policy</Link>. To exercise your rights, contact <a href="mailto:support@hizivo.com">support@hizivo.com</a>.
                </p>
              </CardContent>
            </Card>

            {/* Dispute Resolution */}
            <Card id="disputes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-primary" />
                  Governing Law & Dispute Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  These Flight Booking Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.
                </p>
                <h4>Dispute Resolution Process</h4>
                <ol>
                  <li><strong>Customer Support:</strong> Contact ZIVO Support at <a href="mailto:support@hizivo.com">support@hizivo.com</a> to resolve issues informally. Most issues can be resolved within 48 hours.</li>
                  <li><strong>Formal Complaint:</strong> If unresolved, submit a formal written complaint. ZIVO will respond within 30 days.</li>
                  <li><strong>Arbitration:</strong> Any dispute not resolved through the above steps shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules.</li>
                </ol>
                <h4>Important Arbitration Terms</h4>
                <ul>
                  <li>Arbitration is individual only — class actions and class arbitrations are waived</li>
                  <li>The arbitrator's decision is final and binding</li>
                  <li>Small claims court actions are exempt from this arbitration agreement</li>
                  <li>You may opt out of arbitration within 30 days of your first booking by emailing <a href="mailto:support@hizivo.com">support@hizivo.com</a></li>
                </ul>
                <h4>DOT Complaints</h4>
                <p>
                  You may also file complaints with the U.S. Department of Transportation regarding airline service issues at{" "}
                  <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://www.transportation.gov/airconsumer"))} className="text-primary hover:underline inline">
                    transportation.gov/airconsumer
                  </button>.
                </p>
              </CardContent>
            </Card>

            {/* Passenger Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Passenger Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  When booking, you are responsible for:
                </p>
                <ul>
                  <li><strong>Accurate information:</strong> Names must match travel documents exactly. Name corrections after ticketing may incur fees or may not be possible</li>
                  <li><strong>Travel documents:</strong> Valid passport, visa, and any required documentation for your destination</li>
                  <li><strong>Check-in:</strong> Completing online check-in or arriving at the airport with sufficient time</li>
                  <li><strong>Contact information:</strong> Providing a valid email and phone number for booking updates</li>
                  <li><strong>Health requirements:</strong> Complying with any health or vaccination requirements for your destination</li>
                  <li><strong>Travel insurance:</strong> ZIVO recommends purchasing travel insurance. ZIVO is not an insurer and does not provide travel insurance</li>
                </ul>
                <p>
                  ZIVO is not responsible for denied boarding due to incorrect documentation or failure to meet entry requirements.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  For questions about your booking or these terms:
                </p>
                <ul>
                  <li><strong>Email:</strong> <a href="mailto:support@hizivo.com">support@hizivo.com</a></li>
                  <li><strong>Support Center:</strong> <Link to="/support">ZIVO Support Center</Link></li>
                </ul>
                <p>
                  For urgent matters related to imminent travel, please contact us as soon as possible. ZIVO aims to respond to all inquiries within 24 hours.
                </p>
                <p className="text-sm">
                  <strong>ZIVO LLC</strong> · Registered Seller of Travel · United States
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer Links */}
          <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
            <p>
              By booking a flight through ZIVO, you agree to these Flight Booking Terms, our{' '}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
              <Link to="/legal/partner-disclosure" className="text-primary hover:underline">Partner Disclosure</Link>.
            </p>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} ZIVO LLC. All rights reserved.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FlightTerms;