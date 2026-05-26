import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, DollarSign, AlertTriangle, Ban, Scale, FileText, Clock, Gavel, CreditCard, Globe, Users, Plane, Car, UtensilsCrossed, Hotel, Smartphone, MapPin, Heart, Zap, Lock, Eye, MessageSquare, RefreshCw, Landmark, BadgeAlert, ShieldOff, Wallet, Receipt, TrendingDown, UserX, Handshake, BookOpen, Database, Mail, CircleAlert, Timer, Megaphone, Construction, Umbrella, Flame, Server, Wifi, CloudOff, PackageX, Truck, Navigation, Star, ThumbsDown, Bomb, Siren, Activity, Boxes, BadgeDollarSign, ShieldCheck, FileLock, Fingerprint, ScaleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: Shield,
    title: "1. General Limitation of Liability",
    content: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZIVO LLC, ITS PARENT COMPANIES, SUBSIDIARIES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, ASSIGNS, AND PARTNERS (COLLECTIVELY, 'ZIVO PARTIES') SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, REVENUE, BUSINESS OPPORTUNITIES, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (a) YOUR ACCESS TO OR USE OF, OR INABILITY TO ACCESS OR USE, THE SERVICES; (b) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES; (c) ANY CONTENT OBTAINED FROM THE SERVICES; (d) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT; (e) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE THAT MAY BE TRANSMITTED TO OR THROUGH THE SERVICES BY ANY THIRD PARTY; (f) ANY ERRORS OR OMISSIONS IN ANY CONTENT; AND (g) ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF YOUR USE OF ANY CONTENT POSTED, EMAILED, TRANSMITTED, OR OTHERWISE MADE AVAILABLE VIA THE SERVICES."
  },
  {
    icon: DollarSign,
    title: "2. Maximum Aggregate Liability Cap",
    content: "IN NO EVENT SHALL ZIVO'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICES EXCEED THE GREATER OF: (a) THE AMOUNT YOU HAVE ACTUALLY PAID TO ZIVO (NOT TO THIRD-PARTY SERVICE PROVIDERS) IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (b) ONE HUNDRED U.S. DOLLARS ($100.00). THIS LIMITATION APPLIES REGARDLESS OF THE THEORY OF LIABILITY (WHETHER CONTRACT, TORT INCLUDING NEGLIGENCE, STRICT LIABILITY, BREACH OF WARRANTY, MISREPRESENTATION, OR OTHERWISE) AND EVEN IF ZIVO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THIS CAP APPLIES TO ALL CLAIMS IN THE AGGREGATE, NOT PER INCIDENT."
  },
  {
    icon: AlertTriangle,
    title: "3. No Liability for User Spending Decisions",
    content: "ZIVO IS NOT RESPONSIBLE OR LIABLE FOR ANY FINANCIAL DECISIONS YOU MAKE BASED ON INFORMATION DISPLAYED ON OUR PLATFORM. This includes but is not limited to: travel bookings, hotel reservations, car rentals, food orders, ride fares, membership subscriptions, tips, service fees, taxes, surcharges, and any other transactions or spending. You acknowledge that all spending decisions are made at your own discretion and risk. ZIVO does not guarantee savings, discounts, the best available price, or any particular financial outcome. You agree not to hold ZIVO liable for any amount you spend on or through the platform, regardless of whether the outcome meets your expectations. YOU EXPRESSLY WAIVE ANY CLAIM THAT ZIVO CAUSED YOU TO SPEND MORE THAN YOU INTENDED OR THAT ZIVO'S PLATFORM ENCOURAGED EXCESSIVE SPENDING."
  },
  {
    icon: Wallet,
    title: "4. Spending Addiction & Compulsive Use Disclaimer",
    content: "ZIVO EXPRESSLY DISCLAIMS ALL LIABILITY FOR COMPULSIVE, HABITUAL, OR ADDICTIVE USE OF THE PLATFORM. If you believe you are spending more than you can afford or using the platform excessively, it is YOUR sole responsibility to stop using the Services, set personal spending limits, or seek professional financial or psychological counseling. ZIVO is not a financial advisor and does not monitor your spending patterns for your benefit. You acknowledge that: (a) ZIVO has no duty to warn you about your spending; (b) ZIVO has no obligation to impose spending limits on your account; (c) any loyalty programs, rewards, deals, or promotional offers are not designed to induce harmful spending; (d) you are solely responsible for managing your finances; and (e) YOU FOREVER RELEASE AND DISCHARGE ZIVO FROM ANY CLAIMS RELATED TO EXCESSIVE SPENDING, FINANCIAL HARDSHIP, DEBT, OR ECONOMIC LOSS resulting from your voluntary use of the platform."
  },
  {
    icon: TrendingDown,
    title: "5. No Recovery for Buyer's Remorse",
    content: "YOU ACKNOWLEDGE AND AGREE THAT DISSATISFACTION WITH A PURCHASE, BOOKING, OR SERVICE OBTAINED THROUGH ZIVO DOES NOT CONSTITUTE A VALID LEGAL CLAIM AGAINST ZIVO. 'Buyer's remorse' — including but not limited to regretting a purchase price, finding a better deal elsewhere after booking, being unsatisfied with service quality, or feeling that a purchase was unnecessary — is not grounds for any claim, lawsuit, chargeback demand, or refund request against ZIVO. All such disputes must be directed to the third-party service provider. You waive any right to seek damages from ZIVO based on subjective dissatisfaction."
  },
  {
    icon: Ban,
    title: "6. Comprehensive Exclusion of Damages",
    content: "ZIVO shall not be liable for: (a) service interruptions, delays, outages, or errors; (b) loss of data or unauthorized access to your account; (c) personal injury or property damage arising from your use of third-party services accessed via the platform; (d) disputes between you and third-party service providers including drivers, restaurants, airlines, hotels, car rental companies, and tour operators; (e) price fluctuations, fare changes, or availability changes; (f) acts or omissions of third-party payment processors; (g) any loss exceeding the liability cap stated in Section 2; (h) loss of revenue, anticipated profits, business, or goodwill; (i) cost of procurement of substitute goods or services; (j) any loss arising from reliance on information provided on the platform; (k) emotional distress, mental anguish, or psychological harm; (l) loss of enjoyment or vacation value; (m) consequential damages of any nature; (n) punitive or exemplary damages."
  },
  {
    icon: Scale,
    title: "7. Platform Role Disclaimer — ZIVO Is Not a Service Provider",
    content: "ZIVO operates as a technology platform that connects users with independent third-party service providers. ZIVO IS NOT a transportation company, airline, travel agent, tour operator, hotel operator, restaurant, food service company, car rental company, or any other type of direct service provider. We do not own, operate, manage, or control vehicles, aircraft, hotel properties, restaurants, rental fleets, or any physical assets used in service delivery. All services are provided by independent third parties, and ZIVO disclaims all liability for the acts, omissions, negligence, quality, safety, legality, or suitability of those services. For flights specifically, ZIVO acts solely as a search and referral service; ticketing, payment, fare rules, baggage policies, and customer service are handled entirely by the licensed travel partner who is the merchant of record."
  },
  {
    icon: Plane,
    title: "8. Flight-Specific Liability Exclusions",
    content: "WITH RESPECT TO AIR TRAVEL, ZIVO EXPRESSLY DISCLAIMS ALL LIABILITY FOR: (a) flight delays, cancellations, diversions, or schedule changes by airlines; (b) denied boarding, overbooking, or involuntary downgrades; (c) lost, damaged, or delayed baggage; (d) airline bankruptcies or cessation of operations; (e) errors in flight information including departure times, arrival times, layovers, or aircraft type; (f) fare changes between the time of search and actual booking; (g) visa, passport, or travel document requirements; (h) health requirements including vaccinations; (i) travel advisories or restrictions imposed by governments; (j) airline mergers, code-share arrangements, or operational changes; (k) in-flight injuries, illness, or death; (l) any losses arising from connecting flight misses due to delays. All such matters are governed by the airline's contract of carriage and applicable international conventions including the Montreal Convention."
  },
  {
    icon: Car,
    title: "9. Ground Transportation Liability Exclusions",
    content: "ZIVO DISCLAIMS ALL LIABILITY RELATED TO RIDE-HAILING, CAR RENTALS, AND GROUND TRANSPORTATION SERVICES, including but not limited to: (a) accidents, injuries, or fatalities during rides; (b) vehicle condition, cleanliness, or safety; (c) driver behavior, qualifications, or criminal background; (d) route selection, detours, or traffic delays; (e) surge pricing or dynamic fare adjustments; (f) lost items left in vehicles; (g) car rental damage disputes, insurance claims, or fuel charges; (h) toll charges, parking fees, or traffic violations; (i) vehicle breakdowns or mechanical failures; (j) disputes with drivers or rental agencies. All ground transportation services are provided by independent third parties and subject to their own terms and conditions."
  },
  {
    icon: UtensilsCrossed,
    title: "10. Food & Delivery Liability Exclusions",
    content: "ZIVO DISCLAIMS ALL LIABILITY FOR FOOD ORDERING AND DELIVERY SERVICES, including: (a) food quality, taste, temperature, or freshness; (b) food safety, contamination, allergens, or foodborne illness; (c) incorrect orders, missing items, or substitutions; (d) delivery delays, failed deliveries, or wrong delivery addresses; (e) restaurant closures, menu changes, or price discrepancies; (f) nutritional information accuracy or dietary claims; (g) packaging damage or spills during delivery; (h) allergic reactions even if allergen information was provided; (i) any health consequences from consuming food ordered through the platform. YOU ACKNOWLEDGE THAT ZIVO DOES NOT PREPARE, COOK, HANDLE, OR DELIVER FOOD AND HAS NO CONTROL OVER FOOD SAFETY PRACTICES."
  },
  {
    icon: Hotel,
    title: "11. Accommodation Liability Exclusions",
    content: "ZIVO DISCLAIMS ALL LIABILITY RELATED TO HOTEL, LODGING, AND ACCOMMODATION SERVICES, including: (a) room conditions, cleanliness, amenities, or descriptions; (b) overbookings or reservation errors by the property; (c) property safety, security incidents, or theft; (d) resort fees, parking fees, or hidden charges; (e) pest infestations, mold, or environmental hazards; (f) noise complaints, construction, or facility closures; (g) pool, spa, gym, or recreational facility injuries; (h) property cancellation policies and penalties; (i) discrepancies between photos/descriptions and actual conditions; (j) acts or omissions of hotel staff; (k) accessibility issues or ADA non-compliance at properties."
  },
  {
    icon: FileText,
    title: "12. 'As Is' and 'As Available' Warranty Disclaimer",
    content: "THE SERVICES ARE PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING, USAGE, OR TRADE PRACTICE. ZIVO DOES NOT WARRANT THAT: (a) THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (b) DEFECTS WILL BE CORRECTED; (c) THE SERVICES ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; (d) THE RESULTS OBTAINED FROM USE OF THE SERVICES WILL BE ACCURATE OR RELIABLE; (e) THE QUALITY OF ANY PRODUCTS, SERVICES, INFORMATION, OR OTHER MATERIAL OBTAINED THROUGH THE SERVICES WILL MEET YOUR EXPECTATIONS; (f) ANY ERRORS IN THE SERVICES WILL BE CORRECTED; OR (g) THE SERVICES WILL BE COMPATIBLE WITH YOUR DEVICE OR OPERATING SYSTEM."
  },
  {
    icon: Clock,
    title: "13. Statute of Limitations — One Year",
    content: "YOU AGREE THAT ANY CAUSE OF ACTION, CLAIM, OR DISPUTE ARISING OUT OF OR RELATED TO THE SERVICES MUST BE COMMENCED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES. OTHERWISE, SUCH CAUSE OF ACTION IS PERMANENTLY AND IRREVOCABLY BARRED. This limitation applies to all claims regardless of the legal theory under which they are brought, including but not limited to contract, tort, strict liability, negligence, statutory claims, or equity. This provision supersedes any longer statute of limitations that may be provided by law. If any jurisdiction does not allow this shortened limitations period, the shortest period allowed by that jurisdiction's law shall apply."
  },
  {
    icon: Gavel,
    title: "14. Basis of the Bargain",
    content: "YOU ACKNOWLEDGE AND AGREE THAT ZIVO HAS OFFERED ITS SERVICES, SET ITS PRICES, AND ENTERED INTO THESE TERMS IN RELIANCE UPON THE WARRANTY DISCLAIMERS AND LIMITATIONS OF LIABILITY SET FORTH HEREIN. These disclaimers and limitations reflect a reasonable and fair allocation of risk between you and ZIVO, and form an essential basis of the bargain between us. ZIVO would not be able to provide the Services to you on an economically reasonable basis without these limitations. You have had the opportunity to review these terms, consult with legal counsel, and negotiate. Your continued use of the Services constitutes acceptance of these terms as fair and reasonable."
  },
  {
    icon: CreditCard,
    title: "15. No Liability for Third-Party Charges & Fees",
    content: "ZIVO is not liable for any charges, fees, penalties, assessments, or costs imposed by third parties, including but not limited to: airline change fees, cancellation fees, baggage fees, seat selection fees, priority boarding fees, resort fees, parking fees, minibar charges, room service fees, tolls, traffic violations, speeding tickets, damage charges from car rentals, insurance deductibles, restaurant surcharges, delivery fees, service charges, gratuities, currency conversion fees, international transaction fees, foreign ATM fees, or any taxes, duties, or levies imposed by governmental authorities at any level. Any such charges are your sole responsibility, and you agree to hold ZIVO harmless from all third-party imposed costs."
  },
  {
    icon: Globe,
    title: "16. International Use & Jurisdictional Limitation",
    content: "ZIVO makes no representations that the Services are appropriate or available for use in locations outside the United States. Users accessing the Services from other jurisdictions do so at their own risk and are responsible for compliance with local laws, including but not limited to consumer protection laws, data privacy regulations, export controls, and sanctions. ZIVO's liability in any jurisdiction shall not exceed the maximum amount permitted by that jurisdiction's laws. Where certain limitations are not permitted by local law, only those specific limitations shall not apply, and all other limitations shall remain in full force and effect. THIS SECTION DOES NOT CREATE ANY ADDITIONAL RIGHTS FOR USERS OUTSIDE THE UNITED STATES."
  },
  {
    icon: Users,
    title: "17. Multiple Claims & Cumulative Liability Cap",
    content: "The liability caps set forth in this section apply to the AGGREGATE of all claims you may have against ZIVO, not on a per-claim or per-incident basis. Multiple claims shall not expand ZIVO's total liability beyond the limits stated in Section 2. If you bring multiple claims, the total recovery across all claims combined may not exceed the maximum liability cap of $100. Any amounts already paid, credited, refunded, or otherwise compensated to you for prior claims shall reduce the remaining available liability cap. This includes amounts paid by ZIVO voluntarily, pursuant to settlement, or by court order."
  },
  {
    icon: ShieldOff,
    title: "18. Essential Purpose & Severability of Limitations",
    content: "If any limitation or exclusion of liability in this section is found to be unenforceable by a court of competent jurisdiction, the remaining limitations shall continue in full force and effect. The parties agree that the limitations of liability are ESSENTIAL to these Terms and that in the absence of such limitations, the terms of the agreement between the parties would be substantially different and ZIVO would not have entered into this agreement. If a court determines that any limitation is unconscionable, void, or unenforceable, the court shall reform the limitation to the MAXIMUM EXTENT PERMISSIBLE rather than invalidating it entirely. The invalidity of one provision shall not affect any other provision."
  },
  {
    icon: Heart,
    title: "19. Comprehensive Risk Acknowledgment",
    content: "YOU EXPRESSLY ACKNOWLEDGE AND VOLUNTARILY ASSUME ALL RISKS associated with use of the Services, including but not limited to: physical harm, bodily injury, death, property damage, dealing with strangers and third parties, financial loss, data breaches, identity theft, fraud, dissatisfaction with services, inconvenience, emotional distress, travel disruption, medical emergencies, natural disasters, political instability, terrorism, civil unrest, pandemic illness, and any other foreseeable or unforeseeable risk. You further acknowledge that ZIVO has no duty to take any action regarding which users gain access to the Services, what content you access, or how you interpret or use the content. You release ZIVO from all liability for your having acquired or not acquired content through the Services."
  },
  {
    icon: Smartphone,
    title: "20. Technology & Platform Disclaimers",
    content: "ZIVO is not liable for: (a) mobile app crashes, freezes, or data loss; (b) push notification failures or delays; (c) GPS or location service inaccuracies; (d) compatibility issues with your device, operating system, or browser; (e) data consumption or charges from your mobile carrier; (f) battery drain caused by the application; (g) storage space consumed by the application; (h) unauthorized access due to your failure to secure your device; (i) data loss from app updates or reinstallation; (j) third-party SDK or API failures integrated into our platform."
  },
  {
    icon: Lock,
    title: "21. Security Breach & Data Loss Limitation",
    content: "WHILE ZIVO IMPLEMENTS COMMERCIALLY REASONABLE SECURITY MEASURES, ZIVO SHALL NOT BE LIABLE FOR: (a) unauthorized access to your account due to weak passwords, shared credentials, or phishing attacks; (b) data breaches resulting from sophisticated cyberattacks beyond industry-standard defenses; (c) loss of personal information due to your own actions or negligence; (d) identity theft or fraud resulting from information shared on the platform; (e) financial losses from unauthorized transactions if you failed to secure your account; (f) damages from security incidents at third-party service providers. ZIVO'S TOTAL LIABILITY FOR ANY DATA BREACH SHALL NOT EXCEED THE CAP STATED IN SECTION 2."
  },
  {
    icon: Eye,
    title: "22. Content & Information Accuracy Disclaimer",
    content: "ZIVO does not guarantee the accuracy, completeness, timeliness, or reliability of any information displayed on the platform, including but not limited to: prices, availability, ratings, reviews, photos, descriptions, maps, directions, estimated times, service provider qualifications, business hours, contact information, or promotional offers. All such information is provided 'as is' and may be outdated, incorrect, or incomplete. You agree that any reliance on such information is at your sole risk. ZIVO SHALL NOT BE LIABLE FOR ANY DECISIONS MADE OR ACTIONS TAKEN BASED ON INFORMATION AVAILABLE THROUGH THE SERVICES."
  },
  {
    icon: MessageSquare,
    title: "23. User-Generated Content & Reviews",
    content: "ZIVO is not liable for any user-generated content including reviews, ratings, comments, photos, or feedback posted by other users. Such content represents the opinions of individual users and not ZIVO. ZIVO does not verify, endorse, or guarantee the accuracy of user reviews. You acknowledge that: (a) reviews may be biased, false, or misleading; (b) ratings may not reflect actual service quality; (c) photos may not represent current conditions; (d) ZIVO has no obligation to remove negative or allegedly defamatory reviews; (e) you may not sue ZIVO based on reliance on user reviews."
  },
  {
    icon: Receipt,
    title: "24. Pricing, Promotions & Discount Disclaimers",
    content: "ZIVO MAKES NO GUARANTEES REGARDING PRICES, DISCOUNTS, PROMOTIONS, LOYALTY REWARDS, CASHBACK, COUPONS, OR ANY OTHER FINANCIAL INCENTIVES. All prices displayed are estimates and subject to change. Promotional offers may be withdrawn, modified, or expire without notice. ZIVO is not liable for: (a) price differences between displayed and final checkout prices; (b) expired or invalid promotional codes; (c) loyalty points that expire, are devalued, or are revoked; (d) cashback or reward program changes; (e) price matching failures; (f) dynamic pricing fluctuations; (g) currency conversion discrepancies. YOU HAVE NO LEGAL RIGHT TO ANY SPECIFIC PRICE, DISCOUNT, OR PROMOTIONAL OFFER."
  },
  {
    icon: RefreshCw,
    title: "25. Service Modification & Discontinuation",
    content: "ZIVO RESERVES THE ABSOLUTE RIGHT TO MODIFY, SUSPEND, OR DISCONTINUE ANY PART OF THE SERVICES AT ANY TIME WITHOUT NOTICE OR LIABILITY. This includes the right to: (a) change features, functionality, or user interface; (b) discontinue entire service categories; (c) modify pricing structures or fee schedules; (d) change third-party service providers; (e) restrict geographic availability; (f) impose new usage limits or requirements; (g) terminate promotional programs. ZIVO SHALL HAVE NO LIABILITY TO YOU FOR ANY MODIFICATION, SUSPENSION, OR DISCONTINUATION OF THE SERVICES."
  },
  {
    icon: Landmark,
    title: "26. Government Actions & Regulatory Changes",
    content: "ZIVO shall not be liable for any losses, disruptions, or damages resulting from: (a) changes in laws, regulations, or government policies; (b) government shutdowns, sanctions, or embargoes; (c) regulatory actions against third-party service providers; (d) changes in tax laws affecting service costs; (e) travel bans, border closures, or visa restrictions; (f) public health mandates including quarantine requirements; (g) airport or airspace closures; (h) any government action that affects the availability, pricing, or delivery of services accessible through ZIVO."
  },
  {
    icon: BadgeAlert,
    title: "27. Third-Party Platform & Integration Disclaimers",
    content: "ZIVO integrates with various third-party platforms, APIs, and services. ZIVO is not liable for: (a) third-party API outages, errors, or deprecations; (b) changes to third-party terms of service; (c) data handling by third-party service providers; (d) payment processing errors by third-party processors; (e) authentication failures from third-party login providers (Google, Apple, etc.); (f) map or navigation errors from third-party mapping services; (g) any content, products, or services offered by linked third-party websites. Your use of third-party services is governed by those parties' own terms and privacy policies."
  },
  {
    icon: MapPin,
    title: "28. Location & Navigation Disclaimers",
    content: "ZIVO is not liable for any damages arising from location-based services, including: (a) GPS inaccuracies or location errors; (b) incorrect addresses or directions; (c) estimated arrival times that prove inaccurate; (d) navigation errors leading to wrong destinations; (e) distance or duration miscalculations; (f) geofencing errors; (g) location-based pricing discrepancies; (h) accidents or incidents occurring while following directions or navigating to a destination shown on the platform."
  },
  {
    icon: Zap,
    title: "29. Force Majeure & Extraordinary Circumstances",
    content: "WITHOUT LIMITING THE SEPARATE FORCE MAJEURE POLICY, ZIVO SHALL NOT BE LIABLE FOR ANY FAILURE TO PERFORM OR DELAY IN PERFORMANCE CAUSED BY: acts of God, natural disasters, earthquakes, floods, hurricanes, tornadoes, wildfires, pandemics, epidemics, quarantine, war, terrorism, civil unrest, riots, strikes, labor disputes, government actions, sanctions, embargoes, power failures, internet outages, telecommunications failures, cyberattacks, DDoS attacks, ransomware, supply chain disruptions, or any other event beyond ZIVO's reasonable control."
  },
  {
    icon: Activity,
    title: "30. Health, Safety & Medical Disclaimers",
    content: "ZIVO IS NOT A HEALTHCARE PROVIDER AND PROVIDES NO MEDICAL ADVICE. ZIVO is not liable for: (a) illness contracted during travel, at accommodations, or from food ordered through the platform; (b) allergic reactions to food, including undisclosed allergens; (c) injuries sustained during transportation, at hotels, or at restaurants; (d) exposure to communicable diseases including COVID-19 or other pandemics; (e) failure to comply with health advisories or vaccination requirements; (f) medical emergencies during travel; (g) inadequate medical facilities at travel destinations; (h) pre-existing health conditions exacerbated by travel or services."
  },
  {
    icon: Umbrella,
    title: "31. Insurance & Indemnity Limitation",
    content: "ZIVO DOES NOT PROVIDE ANY INSURANCE COVERAGE for travel, health, property, liability, trip cancellation, or any other risk. It is YOUR sole responsibility to obtain appropriate insurance coverage for all activities, travel, and transactions conducted through the platform. ZIVO is not liable for: (a) uninsured losses of any kind; (b) insurance claim denials; (c) gaps in insurance coverage; (d) inadequate coverage amounts; (e) failure to purchase travel insurance; (f) insurance policy exclusions that apply to your situation. YOU AGREE THAT ZIVO'S SUGGESTION OR DISPLAY OF INSURANCE OPTIONS DOES NOT CREATE AN INSURANCE RELATIONSHIP OR ADVISORY DUTY."
  },
  {
    icon: Flame,
    title: "32. Consequential & Special Damages Waiver",
    content: "IN ADDITION TO THE GENERAL EXCLUSIONS ABOVE, YOU SPECIFICALLY AND IRREVOCABLY WAIVE ANY RIGHT TO RECOVER THE FOLLOWING FROM ZIVO: (a) loss of anticipated travel enjoyment or vacation value; (b) cost of alternative arrangements when original bookings fail; (c) loss of business opportunities due to travel disruptions; (d) emotional distress, mental anguish, anxiety, or PTSD from negative experiences; (e) loss of consortium or companionship; (f) diminished quality of life claims; (g) reputational harm; (h) loss of future earning capacity; (i) punitive, treble, or multiplied damages of any kind; (j) attorney's fees except as expressly required by applicable law."
  },
  {
    icon: Server,
    title: "33. System Availability & Uptime Disclaimer",
    content: "ZIVO DOES NOT GUARANTEE ANY SPECIFIC UPTIME, AVAILABILITY, OR PERFORMANCE OF THE SERVICES. The platform may be unavailable due to: scheduled maintenance, unscheduled maintenance, server failures, cloud provider outages, CDN issues, database failures, DNS problems, software updates, security patches, or capacity limitations. ZIVO shall not be liable for any losses, missed bookings, expired deals, price changes, or other damages resulting from service unavailability, regardless of duration or cause."
  },
  {
    icon: CloudOff,
    title: "34. Internet & Connectivity Disclaimers",
    content: "ZIVO is not responsible for: (a) your internet connection quality or reliability; (b) data charges from your ISP or mobile carrier; (c) incomplete transactions due to connection drops; (d) cached or outdated information displayed due to connectivity issues; (e) booking errors caused by network timeouts; (f) payment failures due to connectivity problems; (g) inability to access the platform in regions with restricted internet access."
  },
  {
    icon: PackageX,
    title: "35. Delivery & Fulfillment Disclaimers",
    content: "FOR ANY DELIVERY SERVICES ACCESSED THROUGH ZIVO, WE DISCLAIM ALL LIABILITY FOR: (a) late deliveries regardless of guaranteed delivery windows; (b) damaged items during transit; (c) stolen packages or deliveries; (d) incorrect delivery addresses provided by you; (e) delivery to wrong recipients; (f) items that do not match their description; (g) refund disputes with delivery providers; (h) delivery driver conduct or behavior."
  },
  {
    icon: Navigation,
    title: "36. Travel Advisory & Destination Disclaimers",
    content: "ZIVO DOES NOT PROVIDE TRAVEL ADVISORIES AND IS NOT LIABLE FOR: (a) travel to dangerous or unstable destinations; (b) failure to check government travel advisories; (c) political instability, civil unrest, or conflict at destinations; (d) natural disaster risks at destinations; (e) health risks including endemic diseases at destinations; (f) crime, theft, or assault at destinations; (g) cultural or legal differences in foreign jurisdictions; (h) loss of travel documents abroad; (i) deportation, detention, or legal issues in foreign countries."
  },
  {
    icon: Star,
    title: "37. Loyalty Program & Rewards Disclaimers",
    content: "ANY LOYALTY PROGRAMS, REWARDS, POINTS, CASHBACK, OR SIMILAR INCENTIVE PROGRAMS OFFERED BY ZIVO: (a) may be modified, devalued, or terminated at any time without notice; (b) have no cash value unless explicitly stated; (c) are not transferable unless explicitly permitted; (d) expire according to program rules; (e) may be forfeited upon account termination; (f) do not constitute a contractual obligation; (g) are provided as a gratuitous benefit that ZIVO may revoke. ZIVO IS NOT LIABLE FOR ANY LOSS OF POINTS, REWARDS, OR PROGRAM BENEFITS."
  },
  {
    icon: ThumbsDown,
    title: "38. Negative Experience & Service Quality Disclaimer",
    content: "ZIVO DOES NOT GUARANTEE THE QUALITY, SAFETY, LEGALITY, OR SUITABILITY OF ANY SERVICE OBTAINED THROUGH THE PLATFORM. Negative experiences including poor service, rude staff, uncomfortable accommodations, bad food, unsafe vehicles, delayed flights, or any other unsatisfactory outcome are NOT the responsibility of ZIVO. Your sole remedy for poor service is to pursue your complaint directly with the third-party service provider. ZIVO IS NOT AN OMBUDSMAN, MEDIATOR, OR GUARANTOR OF SERVICE QUALITY."
  },
  {
    icon: Siren,
    title: "39. Emergency Services Disclaimer",
    content: "ZIVO IS NOT AN EMERGENCY SERVICE AND SHOULD NOT BE RELIED UPON IN EMERGENCIES. In case of emergency, contact local emergency services (911 in the United States). ZIVO is not liable for: (a) delays in reaching emergency services; (b) inability to use the platform during emergencies; (c) incorrect location data provided to emergency responders; (d) failure of the platform during crisis situations; (e) any harm resulting from reliance on ZIVO instead of contacting emergency services directly."
  },
  {
    icon: Boxes,
    title: "40. Aggregate Class Action & Mass Arbitration Waiver",
    content: "IN ADDITION TO THE DISPUTE RESOLUTION PROVISIONS, YOU AGREE THAT ANY CLAIMS AGAINST ZIVO MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY ONLY. You waive any right to: (a) participate in a class action lawsuit against ZIVO; (b) participate in a class-wide arbitration; (c) participate in a representative action; (d) participate in a private attorney general action; (e) consolidate claims with other users; (f) participate in mass arbitration proceedings. This waiver applies to all claims whether in contract, tort, statute, or any other legal theory. IF THIS WAIVER IS FOUND UNENFORCEABLE, THE ENTIRE DISPUTE RESOLUTION SECTION SHALL BE NULL AND VOID AND DISPUTES SHALL BE RESOLVED IN COURT."
  },
  {
    icon: BadgeDollarSign,
    title: "41. Financial Services & Tax Disclaimers",
    content: "ZIVO IS NOT A FINANCIAL INSTITUTION, BANK, MONEY TRANSMITTER, OR TAX ADVISOR. ZIVO is not liable for: (a) tax consequences of transactions made through the platform; (b) failure to report taxable income from rewards or cashback; (c) currency exchange losses; (d) payment processing fees charged by banks or card networks; (e) overdraft fees triggered by platform charges; (f) credit score impacts from transactions; (g) chargebacks or payment disputes with your bank; (h) delayed refunds from third-party service providers."
  },
  {
    icon: ShieldCheck,
    title: "42. Consumer Protection Law Savings Clause",
    content: "SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR LIABILITY. In such jurisdictions, ZIVO's liability shall be limited to the maximum extent permitted by applicable law. Nothing in these terms shall affect any non-waivable statutory rights that apply to you. However, to the extent permitted by law, all limitations set forth in this document shall apply. Where a specific limitation is prohibited, only that limitation shall be modified to the minimum extent necessary to comply with applicable law, and all other limitations shall remain in full effect."
  },
  {
    icon: FileLock,
    title: "43. Confidential Information & Trade Secrets",
    content: "Any information you obtain about ZIVO's algorithms, pricing models, partner relationships, business strategies, or internal operations through use of the Services is confidential. You agree not to use such information as a basis for any claim against ZIVO, and ZIVO shall not be liable for any perceived unfairness or bias in its algorithms, search rankings, pricing displays, or partner selection processes."
  },
  {
    icon: Fingerprint,
    title: "44. Biometric & Authentication Disclaimers",
    content: "IF YOU USE BIOMETRIC AUTHENTICATION (FINGERPRINT, FACE ID, ETC.) TO ACCESS ZIVO, YOU ACKNOWLEDGE THAT: (a) ZIVO is not responsible for unauthorized access resulting from biometric authentication failures; (b) biometric data is processed by your device, not by ZIVO; (c) ZIVO is not liable for transactions authorized through your biometric credentials; (d) you are solely responsible for managing who has biometric access to your device."
  },
  {
    icon: Handshake,
    title: "45. Entire Agreement & No Oral Modifications",
    content: "This Limitation of Liability, together with the full Terms of Service, constitutes the entire agreement between you and ZIVO regarding liability. No employee, agent, representative, or affiliate of ZIVO is authorized to make any oral promises, representations, or modifications to these limitations. Any representation contradicting these terms, whether made by ZIVO employees, customer support, social media, marketing materials, or otherwise, SHALL NOT MODIFY OR OVERRIDE THESE LIMITATIONS unless made in a formal written amendment signed by an authorized officer of ZIVO LLC."
  },
  {
    icon: BookOpen,
    title: "46. Duty to Read & Informed Consent",
    content: "BY USING ZIVO, YOU REPRESENT AND WARRANT THAT: (a) you have read and understood these Limitation of Liability provisions in their entirety; (b) you have had the opportunity to consult with legal counsel before accepting these terms; (c) you are entering into these terms voluntarily and without duress; (d) you understand that these limitations significantly restrict your legal remedies against ZIVO; (e) you accept these limitations as fair and reasonable consideration for access to the Services; (f) you will not later claim that these terms were hidden, unclear, or unconscionable."
  },
  {
    icon: Database,
    title: "47. Survival Clause",
    content: "ALL LIMITATIONS OF LIABILITY SET FORTH IN THIS SECTION SHALL SURVIVE: (a) termination or expiration of your account; (b) termination of the Services; (c) any breach of these Terms by either party; (d) bankruptcy or dissolution of ZIVO; (e) assignment or transfer of these Terms. These limitations are intended to be perpetual and shall apply to any claims arising from your past, present, or future use of the Services."
  },
  {
    icon: Mail,
    title: "48. Notice of Claims Requirement",
    content: "AS A PREREQUISITE TO BRINGING ANY CLAIM AGAINST ZIVO, YOU MUST: (a) provide written notice to legal@hizivo.com describing the claim in detail within thirty (30) days of the event giving rise to the claim; (b) allow ZIVO sixty (60) days to investigate and attempt to resolve the issue; (c) cooperate fully with ZIVO's investigation; (d) provide all supporting documentation. FAILURE TO COMPLY WITH THESE REQUIREMENTS SHALL CONSTITUTE A WAIVER OF YOUR CLAIM. This notice requirement applies to all claims regardless of legal theory."
  },
  {
    icon: CircleAlert,
    title: "49. Exclusive Remedies",
    content: "YOUR SOLE AND EXCLUSIVE REMEDY FOR ANY DISPUTE WITH ZIVO IS TO STOP USING THE SERVICES AND CLOSE YOUR ACCOUNT. In no event shall you be entitled to injunctive or other equitable relief against ZIVO, and you agree that monetary damages (subject to the cap in Section 2) are adequate. You waive any right to seek: (a) specific performance; (b) injunctive relief; (c) declaratory relief; (d) reformation of contract (except as provided in Section 18); (e) rescission (your remedy is to stop using the Services)."
  },
  {
    icon: Timer,
    title: "50. Cooling-Off Period Acknowledgment",
    content: "You acknowledge that you have had sufficient time to review these terms before using the Services. If you do not agree with any provision of this Limitation of Liability, you must immediately cease using the Services. Continued use of the Services after any modification to these terms constitutes acceptance. ZIVO recommends that you review this page periodically. The 'Last Updated' date at the top indicates when changes were last made."
  },
];

export default function LimitationOfLiability() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Limitation of Liability</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-3">
            <Shield className="h-3 w-3" /> Critical Legal Protection — 50 Sections
          </span>
          <h2 className="text-2xl font-bold">Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground mt-1">Last updated: March 31, 2026</p>
        </div>
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4">
          <p className="text-sm leading-relaxed font-medium">PLEASE READ THIS SECTION CAREFULLY. IT CONTAINS 50 COMPREHENSIVE PROVISIONS THAT LIMIT ZIVO'S LIABILITY TO YOU AND SIGNIFICANTLY AFFECT YOUR LEGAL RIGHTS. BY USING ZIVO, YOU AGREE TO ALL OF THESE LIMITATIONS. IF YOU DO NOT AGREE, DO NOT USE THE SERVICES. ZIVO RECOMMENDS CONSULTING WITH AN ATTORNEY BEFORE ACCEPTING THESE TERMS.</p>
        </div>
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Icon className="h-4 w-4 text-primary" />{s.title}</h3>
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 text-center space-y-1">
          <p className="text-sm font-semibold">Questions about liability limitations?</p>
          <p className="text-xs text-muted-foreground">Contact <span className="text-primary font-semibold">legal@hizivo.com</span></p>
        </div>
      </div>
    </div>
  );
}
