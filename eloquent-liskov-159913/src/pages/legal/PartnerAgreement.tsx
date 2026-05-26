import { Link } from "react-router-dom";
import { ArrowLeft, Handshake, Car, UtensilsCrossed, Hotel, Key, DollarSign, Shield, AlertTriangle, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const PartnerAgreement = () => {
  const lastUpdated = "January 26, 2026";
  const companyName = "ZIVO Technologies Inc.";

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
              <Handshake className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Driver & Partner Agreement</h1>
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
              This Agreement governs the relationship between {companyName} ("ZIVO") and independent service 
              providers including drivers, restaurants, hotels, and car rental owners ("Partners" or "You"). 
              By registering as a Partner, you agree to these terms.
            </p>
          </CardContent>
        </Card>

        {/* Partner Type Tabs */}
        <Tabs defaultValue="driver" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="driver" className="text-xs sm:text-sm">
              <Car className="h-4 w-4 mr-1 hidden sm:inline" />
              Driver
            </TabsTrigger>
            <TabsTrigger value="restaurant" className="text-xs sm:text-sm">
              <UtensilsCrossed className="h-4 w-4 mr-1 hidden sm:inline" />
              Restaurant
            </TabsTrigger>
            <TabsTrigger value="hotel" className="text-xs sm:text-sm">
              <Hotel className="h-4 w-4 mr-1 hidden sm:inline" />
              Hotel
            </TabsTrigger>
            <TabsTrigger value="rental" className="text-xs sm:text-sm">
              <Key className="h-4 w-4 mr-1 hidden sm:inline" />
              Car Rental
            </TabsTrigger>
          </TabsList>

          {/* Driver Agreement */}
          <TabsContent value="driver">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-rides" />
                  Driver Partner Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    Eligibility Requirements
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Must be at least 21 years of age</li>
                    <li>Valid driver's license held for minimum 1 year (3 years for certain vehicle types)</li>
                    <li>Clean driving record (no major violations in past 3 years)</li>
                    <li>Pass background check and identity verification</li>
                    <li>Vehicle must meet ZIVO safety and age requirements</li>
                    <li>Maintain active auto insurance meeting minimum coverage requirements</li>
                    <li>Smartphone capable of running the ZIVO Driver app</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Driver Obligations
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Safety First:</strong> Obey all traffic laws and drive safely at all times</li>
                    <li><strong>Vehicle Condition:</strong> Maintain vehicle in safe, clean, and operable condition</li>
                    <li><strong>Professional Conduct:</strong> Treat all riders with respect and professionalism</li>
                    <li><strong>No Discrimination:</strong> Accept rides without discrimination based on protected characteristics</li>
                    <li><strong>Insurance:</strong> Maintain required insurance coverage at all times while online</li>
                    <li><strong>Accurate Information:</strong> Keep profile, vehicle, and documentation current</li>
                    <li><strong>No Impairment:</strong> Never drive under the influence of drugs or alcohol</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Compensation & Payments
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Fare Calculation</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Base fare + per-mile rate + per-minute rate + applicable surge pricing. 
                        ZIVO retains a service fee (typically 20-25%) from each fare.
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Payment Schedule</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Weekly automatic deposits to your linked bank account. Instant cashout available 
                        for a small fee.
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Tips</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        100% of tips go directly to you. ZIVO does not take any portion of tips.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Grounds for Deactivation
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Rating falls below 4.6 after warnings</li>
                    <li>Fraudulent activity or manipulation of the platform</li>
                    <li>Safety violations or customer complaints about safety</li>
                    <li>Discrimination against riders</li>
                    <li>Driving under the influence</li>
                    <li>Criminal activity or arrest</li>
                    <li>Failure to maintain valid documentation</li>
                  </ul>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="font-semibold">Independent Contractor Status</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You are an independent contractor, not an employee of ZIVO. You control when, where, 
                    and how long you work. You are responsible for your own taxes, insurance, and business expenses.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurant Agreement */}
          <TabsContent value="restaurant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-eats" />
                  Restaurant Partner Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Eligibility Requirements</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Valid business license and food service permit</li>
                    <li>Compliance with local health and safety regulations</li>
                    <li>Minimum health inspection rating (where applicable)</li>
                    <li>Ability to receive and fulfill orders via ZIVO tablet or integration</li>
                    <li>Adequate staffing to handle delivery orders</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Partner Obligations</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Menu Accuracy:</strong> Keep menu items, prices, and availability current</li>
                    <li><strong>Food Quality:</strong> Prepare food to the same standard as dine-in orders</li>
                    <li><strong>Packaging:</strong> Use appropriate packaging to maintain food quality during delivery</li>
                    <li><strong>Order Timing:</strong> Accept or reject orders promptly; prepare within stated prep time</li>
                    <li><strong>Allergen Information:</strong> Accurately represent allergens and dietary information</li>
                    <li><strong>Hygiene Standards:</strong> Maintain health code compliance at all times</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Commission & Payments</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Standard Commission</span>
                      <Badge variant="outline">15-30%</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Payment Frequency</span>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Marketing Programs</span>
                      <Badge variant="outline">Optional (additional fees)</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Commission rates are negotiable based on order volume, exclusivity, and promotional 
                    participation. Contact your account manager for details.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Quality Standards</h4>
                  <p className="text-muted-foreground">
                    Restaurants must maintain a minimum rating of 3.5 stars. Consistent low ratings, 
                    customer complaints, or health violations may result in temporary suspension or 
                    permanent removal from the platform.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hotel Agreement */}
          <TabsContent value="hotel">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-amber-500" />
                  Hotel Partner Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Eligibility Requirements</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Valid hotel/accommodation operating license</li>
                    <li>Meeting local safety and fire code requirements</li>
                    <li>Minimum quality standards (cleanliness, amenities)</li>
                    <li>Ability to manage reservations through ZIVO extranet or API</li>
                    <li>24/7 front desk or check-in capability</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Partner Obligations</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Availability:</strong> Keep room inventory and rates current</li>
                    <li><strong>Accuracy:</strong> Ensure property descriptions and photos are accurate</li>
                    <li><strong>Honor Bookings:</strong> Never refuse confirmed reservations (overbooking)</li>
                    <li><strong>Guest Service:</strong> Maintain professional standards for all ZIVO guests</li>
                    <li><strong>Rate Parity:</strong> Offer best available rates on ZIVO platform</li>
                    <li><strong>Complaint Resolution:</strong> Address guest issues promptly and professionally</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Commission Structure</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Standard Commission</span>
                      <Badge variant="outline">12-18%</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Preferred Partner</span>
                      <Badge variant="outline">10-15%</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Payment Terms</span>
                      <Badge variant="outline">Monthly (Net 15)</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Overbooking Policy</h4>
                  <p className="text-muted-foreground">
                    If you cannot honor a confirmed reservation, you must:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-2">
                    <li>Relocate the guest to a comparable or better property at your expense</li>
                    <li>Cover any price difference</li>
                    <li>Notify ZIVO immediately</li>
                    <li>Repeated overbooking may result in account suspension</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Car Rental Agreement */}
          <TabsContent value="rental">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Car Rental Owner Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Vehicle Requirements</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Vehicle must be less than 12 years old</li>
                    <li>Mileage under 130,000 miles (varies by vehicle type)</li>
                    <li>Clean title (no salvage or rebuilt titles)</li>
                    <li>Valid registration and passing safety inspection</li>
                    <li>Comprehensive and collision insurance coverage</li>
                    <li>No cosmetic damage affecting appearance or safety</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Owner Obligations</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Maintenance:</strong> Keep vehicle in safe, reliable operating condition</li>
                    <li><strong>Cleanliness:</strong> Deliver vehicle clean inside and out</li>
                    <li><strong>Availability:</strong> Honor confirmed bookings; update calendar accurately</li>
                    <li><strong>Insurance:</strong> Maintain required insurance coverage</li>
                    <li><strong>Documentation:</strong> Provide registration and insurance proof to renters</li>
                    <li><strong>Responsiveness:</strong> Respond to booking requests within 2 hours</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Revenue & Fees</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Owner Earnings</span>
                      <Badge variant="outline">75-85% of rental price</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>ZIVO Platform Fee</span>
                      <Badge variant="outline">15-25%</Badge>
                    </div>
                    <div className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>Payout Schedule</span>
                      <Badge variant="outline">72 hours after rental ends</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Insurance & Liability</h4>
                  <p className="text-muted-foreground">
                    ZIVO provides secondary liability coverage during active rentals. Your personal auto 
                    insurance remains primary. You are responsible for your deductible and any damage 
                    not covered by renter or ZIVO insurance.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Damage Claims Process</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Document condition with photos before and after each rental</li>
                    <li>Report damage within 24 hours of rental return</li>
                    <li>Submit damage claim through the Owner Portal</li>
                    <li>Provide repair estimates from authorized shops</li>
                    <li>ZIVO investigates and facilitates payment from renter or insurance</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Common Terms */}
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="relationship" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Nature of Relationship</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                <strong>Independent Contractor Status:</strong> All Partners are independent contractors, not 
                employees, agents, or franchisees of ZIVO. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ZIVO does not control the manner of your service provision</li>
                <li>You are free to choose when and whether to accept service requests</li>
                <li>You may provide services on competing platforms</li>
                <li>You are responsible for your own taxes (income, self-employment, etc.)</li>
                <li>You are not entitled to employee benefits from ZIVO</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ip" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Intellectual Property</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                ZIVO grants you a limited, non-exclusive, revocable license to use our trademarks and 
                materials solely for the purpose of providing services on the platform. You may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use ZIVO branding without authorization</li>
                <li>Create derivative works from our materials</li>
                <li>Sublicense or transfer your rights to third parties</li>
                <li>Use our IP after termination of your account</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="confidentiality" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Confidentiality</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                You agree to keep confidential all non-public information about ZIVO, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Customer data and contact information</li>
                <li>Pricing algorithms and business strategies</li>
                <li>Technical systems and processes</li>
                <li>Internal communications and policies</li>
              </ul>
              <p className="mt-4">
                Customer information must only be used to provide services and must not be retained or 
                used for other purposes.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="termination" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Termination</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                <strong>By Partner:</strong> You may terminate this agreement at any time by deactivating 
                your account. Pending earnings will be paid out according to the normal schedule.
              </p>
              <p className="mt-4">
                <strong>By ZIVO:</strong> We may suspend or terminate your account for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of this agreement or policies</li>
                <li>Low quality ratings or excessive complaints</li>
                <li>Fraudulent or illegal activity</li>
                <li>Safety concerns</li>
                <li>Business reasons with reasonable notice</li>
              </ul>
              <p className="mt-4">
                Upon termination, you must cease using ZIVO branding, delete customer data, and return 
                any ZIVO property.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="liability" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Limitation of Liability & Indemnification</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                <strong>Limitation:</strong> ZIVO's liability is limited to the fees earned by you in the 
                3 months preceding any claim. We are not liable for indirect, consequential, or punitive damages.
              </p>
              <p className="mt-4">
                <strong>Indemnification:</strong> You agree to indemnify and hold ZIVO harmless from any 
                claims arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your provision of services</li>
                <li>Your violation of laws or this agreement</li>
                <li>Disputes with customers or third parties</li>
                <li>Personal injury or property damage you cause</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Partner Support</h3>
            <p className="text-muted-foreground mb-4">
              Questions about this agreement or your partner account? Contact our Partner Support team.
            </p>
            <div className="space-y-2 mb-4">
              <p><strong>Email:</strong> partners@zivo.com</p>
              <p><strong>Phone:</strong> 1-800-ZIVO-BIZ (1-800-948-6249)</p>
              <p><strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/terms-of-service">
                <Button variant="outline" size="sm">Terms of Service</Button>
              </Link>
              <Link to="/privacy-policy">
                <Button variant="outline" size="sm">Privacy Policy</Button>
              </Link>
              <Link to="/help">
                <Button variant="outline" size="sm">Help Center</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PartnerAgreement;
