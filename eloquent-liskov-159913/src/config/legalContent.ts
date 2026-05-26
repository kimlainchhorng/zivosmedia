/**
 * ZIVO Legal Content Configuration
 * Locked legal text for compliance - MAXIMUM LIABILITY PROTECTION
 */

export const COMPANY_INFO = {
  name: "ZIVO LLC",
  dba: "ZIVO",
  address: "United States",
  email: "info@hizivo.com",
  supportEmail: "support@hizivo.com",
  billingEmail: "payment@hizivo.com",
  website: "https://hizivo.com",
  stateOfFormation: "Delaware",
  governingLaw: "State of Delaware",
  lastUpdated: "March 13, 2026",
};

export const TERMS_OF_SERVICE = {
  version: "3.0",
  effectiveDate: "2026-03-13",
  sections: [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using ZIVO's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our services.`,
    },
    {
      title: "2. Platform Description",
      content: `ZIVO is a technology platform and marketplace that facilitates connections between users and third-party service providers. ZIVO does not own vehicles, operate airlines, employ drivers, or operate restaurants. All services are provided by independent third parties.`,
    },
    {
      title: "3. Services",
      subsections: [
        {
          title: "3.1 Flights",
          content: `ZIVO acts as a sub-agent of licensed ticketing providers. Airline tickets are issued by authorized partners under airline rules. ZIVO does not issue airline tickets directly.`,
        },
        {
          title: "3.2 Car Rentals",
          content: `Vehicle owners are independent providers responsible for vehicle condition and insurance. ZIVO facilitates booking, payment, and logistics.`,
        },
        {
          title: "3.3 Rides & Move",
          content: `Drivers are independent contractors. ZIVO does not provide transportation services directly. ZIVO facilitates bookings and payments only.`,
        },
        {
          title: "3.4 Eats",
          content: `Restaurants are independent partners responsible for food quality and safety. ZIVO facilitates orders and delivery logistics.`,
        },
      ],
    },
    {
      title: "4. Limitation of Liability",
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ZIVO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.`,
    },
    {
      title: "5. Indemnification",
      content: `You agree to indemnify, defend, and hold harmless ZIVO, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of the services or violation of these terms.`,
    },
    {
      title: "6. Dispute Resolution",
      content: `Any dispute arising from these terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. YOU AGREE TO WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION.`,
    },
    {
      title: "7. Governing Law",
      content: `These terms shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions.`,
    },
    {
      title: "8. Force Majeure",
      content: `ZIVO shall not be liable for any failure or delay in performing obligations due to circumstances beyond its reasonable control, including natural disasters, acts of war, terrorism, pandemics, or government actions.`,
    },
  ],
};

// ============================================
// ADVANCED LEGAL PROTECTION CLAUSES (13-30)
// Maximum liability shielding & enterprise-grade protection
// ============================================

export const ADVANCED_LEGAL_CLAUSES = {
  // Clause 13: No Agency / No Employment
  noAgencyClause: {
    id: "no_agency",
    title: "No Agency or Employment Relationship",
    content: `No user, driver, vehicle owner, fleet operator, restaurant partner, or other service provider is an agent, employee, joint venturer, or partner of ZIVO LLC. No person or entity has any authority to bind ZIVO contractually or to act on behalf of ZIVO. No employment, agency, joint venture, or partnership relationship exists between ZIVO and any user or third party by virtue of these Terms or use of the platform.`,
    version: "1.0",
  },

  // Clause 14: Platform Disclaimer (Tech Only)
  platformDisclaimer: {
    id: "platform_disclaimer",
    title: "Technology Platform Disclaimer",
    content: `ZIVO provides a technology platform only. ZIVO does not provide transportation services, travel agency services, food preparation, food delivery services, vehicle rental services, or any other services directly. All services displayed on or facilitated through the ZIVO platform are provided by independent third-party service providers. ZIVO's role is limited to operating the technology platform that enables connections between users and service providers.`,
    version: "1.0",
  },

  // Clause 15: Assumption of Risk
  assumptionOfRisk: {
    id: "assumption_of_risk",
    title: "Assumption of Risk",
    content: `By using ZIVO services, you acknowledge and agree that you assume all risks associated with: (a) travel, including flight delays, cancellations, diversions, and schedule changes; (b) vehicle rental and operation, including accidents, damage, theft, and mechanical failure; (c) ride services, including accidents, driver conduct, and personal safety; (d) food delivery, including delays, spoilage, and allergen exposure; (e) package delivery, including loss, damage, and delay. You understand that third-party services involve inherent risks that cannot be eliminated. TO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU ASSUME ALL SUCH RISKS.`,
    version: "1.0",
  },

  // Clause 16: Release of Liability
  releaseOfLiability: {
    id: "release_of_liability",
    title: "Release of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU HEREBY RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE ZIVO LLC, its parent companies, subsidiaries, affiliates, officers, directors, employees, agents, successors, and assigns from any and all claims, demands, damages, losses, liabilities, costs, and expenses (including attorneys' fees) arising from or related to your use of the platform or any third-party services. This release includes, but is not limited to, claims for personal injury, property damage, indirect, incidental, special, consequential, or punitive damages.`,
    version: "1.0",
  },

  // Clause 17: Force Majeure Expansion
  forceMajeureExpanded: {
    id: "force_majeure_expanded",
    title: "Force Majeure (Expanded)",
    content: `ZIVO shall not be liable for any failure or delay in performance due to causes beyond its reasonable control, including but not limited to: acts of God; natural disasters; fires, floods, earthquakes, hurricanes, or other catastrophic events; epidemics, pandemics, or public health emergencies; acts of war, terrorism, or civil unrest; government actions, orders, or restrictions; airline system outages or carrier operational issues; labor disputes, strikes, or work stoppages; third-party service provider failures (including Stripe, Duffel, insurers, and other partners); internet or telecommunications failures; power outages; or any other cause beyond ZIVO's reasonable control.`,
    version: "1.0",
  },

  // Clause 18: Third-Party Beneficiary
  thirdPartyBeneficiary: {
    id: "third_party_beneficiary",
    title: "Third-Party Beneficiaries",
    content: `Airlines, vehicle owners, drivers, fleet operators, restaurant partners, insurance providers, payment processors (including Stripe), ticketing partners (including Duffel), and other third-party service providers are intended third-party beneficiaries of these Terms. Such third parties may enforce the protections, limitations, and disclaimers set forth in these Terms as they relate to their services. Except as expressly stated, these Terms do not create any other third-party beneficiary rights.`,
    version: "1.0",
  },

  // Clause 19: Strong Indemnification
  strongIndemnification: {
    id: "strong_indemnification",
    title: "Indemnification (Comprehensive)",
    content: `You agree to defend, indemnify, and hold harmless ZIVO LLC, its parent companies, subsidiaries, affiliates, officers, directors, employees, agents, successors, and assigns from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees and costs) arising out of or related to: (a) your use or misuse of the platform; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) your violation of any third-party rights; (e) any property damage or personal injury caused by you; (f) any content or materials you submit or transmit; (g) any dispute between you and a third-party service provider; (h) any regulatory fines, penalties, or enforcement actions caused by your conduct.`,
    version: "1.0",
  },

  // Clause 20: Damage Limit Cap
  damageLimitCap: {
    id: "damage_limit_cap",
    title: "Limitation of Damages",
    content: `NOTWITHSTANDING ANY OTHER PROVISION OF THESE TERMS, IN NO EVENT SHALL ZIVO'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM EXCEED THE LESSER OF: (A) THE AMOUNTS YOU PAID TO ZIVO IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED U.S. DOLLARS ($100.00). THIS LIMITATION APPLIES TO ALL CAUSES OF ACTION IN THE AGGREGATE, INCLUDING BREACH OF CONTRACT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY.`,
    version: "1.0",
  },

  // Clause 21: Jury Trial Waiver
  juryTrialWaiver: {
    id: "jury_trial_waiver",
    title: "Waiver of Jury Trial",
    content: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, YOU AND ZIVO EACH WAIVE THE RIGHT TO A TRIAL BY JURY IN ANY LEGAL PROCEEDING ARISING OUT OF OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM. This waiver is separate from and in addition to the arbitration agreement set forth in these Terms. If for any reason a claim proceeds in court rather than arbitration, you and ZIVO each waive the right to a jury trial.`,
    version: "1.0",
  },

  // Clause 22: Class Action Opt-Out Procedure
  classActionOptOut: {
    id: "class_action_opt_out",
    title: "Arbitration & Class Action Waiver Opt-Out",
    content: `YOU MAY OPT OUT OF THE ARBITRATION AGREEMENT AND CLASS ACTION WAIVER by sending written notice within thirty (30) days of first accepting these Terms to: ZIVO LLC, Legal Department, [Address]. The notice must include your full legal name, email address, physical address, and a clear statement that you wish to opt out of the arbitration agreement and class action waiver. Opting out will not affect any other provisions of these Terms. If you do not opt out within 30 days, you shall be bound by the arbitration agreement and class action waiver.`,
    version: "1.0",
  },

  // Clause 23: Government & Law Enforcement
  governmentRequests: {
    id: "government_requests",
    title: "Compliance with Legal Requests",
    content: `ZIVO may access, preserve, and disclose your account information and content if required by law or if we believe in good faith that such action is reasonably necessary to: (a) comply with legal process, such as a court order, subpoena, or search warrant; (b) respond to lawful requests from government authorities; (c) enforce these Terms; (d) respond to claims that content violates third-party rights; (e) protect the rights, property, or safety of ZIVO, its users, or the public. ZIVO shall not be liable for any disclosure made in good faith compliance with legal obligations.`,
    version: "1.0",
  },

  // Clause 24: Content & Review Disclaimer
  contentDisclaimer: {
    id: "content_disclaimer",
    title: "User Content Disclaimer",
    content: `ZIVO does not endorse, verify, or take responsibility for any user-generated content, including reviews, ratings, photos, listings, descriptions, or communications. Users are solely responsible for the accuracy and legality of content they submit. ZIVO is not liable for any errors, inaccuracies, or misrepresentations in user content. Vehicle listings, restaurant menus, and service descriptions are provided by third-party partners and may contain errors. You should independently verify important information before making booking decisions.`,
    version: "1.0",
  },

  // Clause 25: Intellectual Property
  intellectualProperty: {
    id: "intellectual_property",
    title: "Intellectual Property Protection",
    content: `The ZIVO name, logo, trademarks, service marks, trade dress, and all related intellectual property are the exclusive property of ZIVO LLC. You may not use, copy, reproduce, modify, or distribute ZIVO's intellectual property without prior written consent. You are prohibited from: (a) scraping, crawling, or automated data collection from the platform; (b) reverse engineering, decompiling, or disassembling any software; (c) creating derivative works based on ZIVO content; (d) accessing the platform through automated means without authorization; (e) circumventing any access controls or security measures. Violation of this section may result in civil and criminal penalties.`,
    version: "1.0",
  },

  // Clause 26: Service Modification Rights
  serviceModification: {
    id: "service_modification",
    title: "Right to Modify Services",
    content: `ZIVO reserves the right, in its sole discretion and without prior notice, to: (a) modify, suspend, or discontinue any part of the platform or services; (b) change pricing, fees, or commission structures; (c) impose limits on certain features or services; (d) restrict access to parts or all of the platform; (e) temporarily or permanently suspend user accounts. ZIVO shall not be liable to you or any third party for any modification, suspension, or discontinuation of services.`,
    version: "1.0",
  },

  // Clause 27: Termination Without Cause
  terminationWithoutCause: {
    id: "termination_without_cause",
    title: "Termination",
    content: `ZIVO may terminate or suspend your account or access to the platform at any time, with or without cause, and with or without notice, subject to applicable law. Reasons for termination may include, but are not limited to: violation of these Terms; fraudulent or illegal activity; conduct harmful to other users or third parties; or extended periods of inactivity. Upon termination, your right to use the platform ceases immediately. ZIVO is not liable to you or any third party for any termination of your access. Provisions of these Terms that by their nature should survive termination shall remain in effect.`,
    version: "1.0",
  },

  // Clause 28: Severability & Survival
  severabilitySurvival: {
    id: "severability_survival",
    title: "Severability & Survival",
    content: `If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent. The following provisions shall survive termination of these Terms: Limitation of Liability, Indemnification, Release of Liability, Arbitration Agreement, Jury Trial Waiver, Class Action Waiver, Intellectual Property, and any other provisions that by their nature should survive.`,
    version: "1.0",
  },

  // Clause 29: International Users
  internationalUsers: {
    id: "international_users",
    title: "International Users",
    content: `The platform is operated from the United States. These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles. Users accessing the platform from outside the United States do so at their own initiative and are responsible for compliance with local laws. By using the platform, you consent to the exclusive jurisdiction of the courts located in Delaware for any disputes not subject to arbitration.`,
    version: "1.0",
  },

  // Clause 30: Entire Agreement
  entireAgreement: {
    id: "entire_agreement",
    title: "Entire Agreement",
    content: `These Terms, together with the Privacy Policy, any service-specific terms, and any other agreements incorporated by reference, constitute the entire agreement between you and ZIVO concerning your use of the platform. These Terms supersede all prior and contemporaneous agreements, proposals, representations, warranties, and communications, whether written or oral. No verbal agreements, representations, or warranties shall modify or supplement these Terms. Any waiver of any provision of these Terms must be in writing and signed by ZIVO.`,
    version: "1.0",
  },
};

// Helper array for all advanced clauses
export const ADVANCED_CLAUSES_LIST = Object.values(ADVANCED_LEGAL_CLAUSES);

export const PRIVACY_POLICY = {
  version: "1.0",
  effectiveDate: "2026-02-03",
  sections: [
    {
      title: "1. Information We Collect",
      subsections: [
        {
          title: "Personal Information",
          content: `Name, email address, phone number, date of birth, government ID (for verification), payment information.`,
        },
        {
          title: "Location Data",
          content: `Real-time location for ride services, pickup/dropoff locations, travel preferences.`,
        },
        {
          title: "Usage Data",
          content: `Browsing history, search queries, booking history, device information, IP address.`,
        },
      ],
    },
    {
      title: "2. How We Use Your Information",
      content: `We use your information to: provide and improve services, process payments, communicate with you, verify identity, prevent fraud, and comply with legal obligations.`,
    },
    {
      title: "3. Third-Party Processors",
      content: `We share data with: Stripe (payment processing), Duffel (flight ticketing), insurance providers (protection plans), and other service partners necessary to fulfill your bookings.`,
    },
    {
      title: "4. Data Retention",
      content: `We retain personal data for as long as necessary to provide services and comply with legal obligations. You may request deletion of your data subject to legal requirements.`,
    },
    {
      title: "5. Your Rights",
      content: `You have the right to: access your data, correct inaccurate data, request deletion, opt out of marketing, and data portability. Contact privacy@hizivo.com to exercise these rights.`,
    },
    {
      title: "6. Security",
      content: `We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your data.`,
    },
  ],
};

export const SELLER_OF_TRAVEL_DISCLOSURE = {
  version: "1.0",
  companyName: COMPANY_INFO.name,
  disclosure: `${COMPANY_INFO.name} sells flight tickets as a sub-agent of licensed ticketing providers. Tickets are issued by authorized partners under airline rules. ZIVO does not issue airline tickets directly.`,
  registrations: {
    california: { status: "pending", number: null },
    florida: { status: "pending", number: null },
  },
};

export const TRANSPORTATION_DISCLAIMER = {
  version: "1.0",
  content: `ZIVO is a technology platform that connects riders with independent contractor drivers. ZIVO does not provide transportation services and is not a transportation carrier. Drivers are not employees of ZIVO. There is no employer-employee relationship between ZIVO and any driver.`,
};

export const CAR_RENTAL_DISCLAIMER = {
  version: "1.0",
  content: `Vehicle owners listing on ZIVO are independent providers responsible for maintaining their vehicles in safe, roadworthy condition and maintaining adequate insurance coverage. ZIVO facilitates booking, payment, and logistics but does not own or operate rental vehicles. Damage claims are handled through platform dispute resolution.`,
};

export const INSURANCE_DISCLOSURE = {
  version: "1.0",
  content: `ZIVO does not underwrite or provide insurance coverage. Protection plans offered through ZIVO are provided by licensed third-party insurance providers. Coverage is subject to policy terms, conditions, and exclusions. Deductibles may apply. Review the full policy before purchasing.`,
};

export const REFUND_POLICY = {
  version: "1.0",
  sections: [
    {
      title: "Flights",
      content: `Flight refunds follow the fare rules set by the airline. Refund eligibility depends on the ticket type purchased. Non-refundable tickets may only be eligible for credit toward future travel.`,
    },
    {
      title: "Car Rentals",
      content: `Refunds follow the cancellation policy set by the vehicle owner. Free cancellation is typically available up to 24-48 hours before pickup. Late cancellations may incur fees.`,
    },
    {
      title: "Rides & Eats",
      content: `Refunds for ride and food delivery services are discretionary and evaluated on a case-by-case basis. Contact support within 48 hours of the service.`,
    },
    {
      title: "Chargebacks",
      content: `Disputed charges should first be reported to ZIVO support. Filing a chargeback with your bank before contacting ZIVO may result in account suspension.`,
    },
  ],
};

export const LEGAL_FOOTER_LINKS = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Seller of Travel", href: "/legal/seller-of-travel" },
  { label: "Refund Policy", href: "/legal/refunds" },
  { label: "Insurance Disclosure", href: "/legal/insurance-disclosure" },
];

export const CONSENT_REQUIREMENTS = {
  flights: ["terms", "privacy", "seller_of_travel"],
  cars: ["terms", "privacy", "car_rental", "insurance"],
  rides: ["terms", "privacy", "transportation"],
  eats: ["terms", "privacy"],
  move: ["terms", "privacy", "transportation"],
} as const;

// ============================================
// EXTENDED LEGAL POLICIES (Clauses 31-40)
// ============================================

export const EXTENDED_LEGAL_POLICIES = {
  // Clause 31: Acceptable Use Policy
  acceptableUse: {
    id: "acceptable_use",
    title: "Acceptable Use Policy",
    version: "1.0",
    prohibitions: [
      "Attempting to access systems, networks, or data without authorization",
      "Scraping, crawling, or abusing APIs without permission",
      "Performing fraudulent bookings or using stolen payment methods",
      "Using automated bots or scripts to access the platform",
      "Fraudulent activity or misrepresentation",
      "Creating false listings, reviews, or accounts",
      "Abuse, harassment, threats, or intimidation",
      "Circumventing platform fees or payment systems",
      "Illegal goods, services, or activities",
      "Impersonating others or ZIVO representatives",
      "Interfering with platform operations or security",
    ],
    enforcement: `Violations may result in account suspension, booking cancellation, and legal action. ZIVO reserves the right to report violations to law enforcement authorities.`,
  },

  // Clause 32: Community Standards
  communityStandards: {
    id: "community_standards",
    title: "Community Standards",
    version: "1.0",
    standards: [
      "Treat all users, drivers, owners, and partners with respect",
      "Non-discrimination based on race, religion, gender, orientation, or disability",
      "No hate speech, threats of violence, or abusive language",
      "Safety-first approach in all interactions",
      "Honest and accurate communications",
      "Respect for property and personal boundaries",
    ],
    enforcement: `Violations may result in warnings, account suspension, or permanent ban from the platform at ZIVO's sole discretion.`,
  },

  // Clause 33: No Warranty Disclaimer
  noWarranty: {
    id: "no_warranty",
    title: "No Warranty Disclaimer",
    version: "1.0",
    content: `ALL SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. ZIVO EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. ZIVO DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT DEFECTS WILL BE CORRECTED.`,
  },

  // Clause 34: Service Availability Disclaimer
  serviceAvailability: {
    id: "service_availability",
    title: "Service Availability Disclaimer",
    version: "1.0",
    content: `ZIVO does not guarantee: (a) availability of flights, vehicles, drivers, or restaurants at any given time; (b) continuous, uninterrupted access to the platform; (c) availability of specific features or services; (d) accuracy of estimated times, prices, or availability shown on the platform. Service availability is subject to third-party provider capacity and may change without notice.`,
  },

  // Clause 35: Price & Content Accuracy Disclaimer
  priceAccuracy: {
    id: "price_accuracy",
    title: "Price & Content Accuracy Disclaimer",
    version: "1.0",
    content: `Prices, availability, images, descriptions, and other content displayed on the platform are provided by third-party service providers and may change at any time without notice. ZIVO does not guarantee the accuracy, completeness, or timeliness of any information. Prices and availability are not guaranteed until a booking is confirmed by the service provider. Final terms, prices, and availability are determined by the service provider at the time of booking.`,
  },

  // Clause 36: User-Generated Content License
  ugcLicense: {
    id: "ugc_license",
    title: "User-Generated Content License",
    version: "1.0",
    content: `By uploading, posting, or submitting any content to the platform (including photos, reviews, descriptions, and communications), you grant ZIVO a worldwide, royalty-free, perpetual, irrevocable, non-exclusive, transferable, and sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such content in any media for marketing, platform operations, and any other lawful purpose. You represent that you have all necessary rights to grant this license.`,
  },

  // Clause 37: Safety & Emergency Disclaimer
  safetyEmergency: {
    id: "safety_emergency",
    title: "Safety & Emergency Disclaimer",
    version: "1.0",
    content: `ZIVO is not responsible for accidents, injuries, loss of property, medical emergencies, or any other safety incidents arising from the use of third-party services. Users must contact local emergency services (911 in the US) immediately in case of emergency. ZIVO does not provide emergency response services. Users are responsible for their own safety and should exercise appropriate caution when using any services.`,
  },

  // Clause 38: Regulatory Cooperation Policy
  regulatoryCooperation: {
    id: "regulatory_cooperation",
    title: "Regulatory Cooperation Policy",
    version: "1.0",
    content: `ZIVO may: (a) suspend or terminate accounts to comply with applicable laws, regulations, or legal process; (b) share user data with government agencies, regulators, or law enforcement when required by law or legal process; (c) cooperate with investigations without prior notice to affected users when permitted by law. ZIVO shall not be liable for any actions taken in good faith compliance with legal or regulatory requirements.`,
  },

  // Clause 39: Payment Hold & Reserve Policy
  paymentHoldReserve: {
    id: "payment_hold_reserve",
    title: "Payment Hold & Reserve Policy",
    version: "1.0",
    content: `ZIVO may, in its sole discretion: (a) place holds on funds pending verification or dispute resolution; (b) delay payouts to service providers; (c) establish reserves against potential chargebacks, refunds, or claims; (d) withhold funds to satisfy outstanding obligations or damages. These measures may be taken to prevent fraud, mitigate risk, ensure regulatory compliance, or protect the platform and its users.`,
  },

  // Clause 40: Changes to Policies
  policyChanges: {
    id: "policy_changes",
    title: "Changes to Policies",
    version: "1.0",
    content: `ZIVO reserves the right to modify, update, or replace any policies, terms, or conditions at any time. Changes become effective upon posting to the platform unless otherwise specified. Continued use of the platform after changes are posted constitutes acceptance of the updated terms. For material changes, ZIVO may provide additional notice via email or in-app notification, but is not required to do so. Users are responsible for reviewing policies periodically.`,
  },
};

// ============================================
// SERVICE-SPECIFIC DISCLAIMERS (Strong)
// ============================================

export const SERVICE_DISCLAIMERS = {
  flights: {
    id: "flights_disclaimer",
    title: "Flights Disclaimer",
    points: [
      "Flight schedules, routes, and aircraft are controlled exclusively by airlines",
      "ZIVO is not responsible for delays, cancellations, diversions, or overbooking",
      "Airline rules govern baggage, seating, changes, and refunds",
      "Tickets are issued by licensed ticketing providers, not ZIVO",
      "Travel documents, visas, and entry requirements are the passenger's responsibility",
    ],
    summary: `ZIVO acts as a technology platform connecting travelers with licensed ticketing partners. All flight services are subject to airline terms and conditions.`,
  },

  cars: {
    id: "cars_disclaimer",
    title: "Car Rental Disclaimer",
    points: [
      "Vehicle owners control vehicle condition, maintenance, and cleanliness",
      "Insurance coverage is subject to policy terms, conditions, and exclusions",
      "ZIVO is not liable for mechanical failure, accidents, or vehicle defects",
      "Drivers must meet owner requirements and local licensing laws",
      "Damage disputes are resolved through platform arbitration procedures",
    ],
    summary: `ZIVO connects renters with independent vehicle owners. All rental transactions are between the renter and owner.`,
  },

  rides: {
    id: "rides_disclaimer",
    title: "Rides & Move Disclaimer",
    points: [
      "Drivers are independent contractors, not ZIVO employees",
      "ZIVO does not provide transportation services directly",
      "Travel time, route, and arrival times are estimates only and not guaranteed",
      "Driver availability depends on third-party partner capacity",
      "Passengers must follow local laws and safety requirements",
    ],
    summary: `ZIVO operates a technology platform connecting riders with independent driver partners.`,
  },

  eats: {
    id: "eats_disclaimer",
    title: "Eats Disclaimer",
    points: [
      "Restaurants are solely responsible for food preparation and quality",
      "ZIVO is not responsible for allergens, ingredients, or food safety",
      "Delivery times are estimates and may vary based on conditions",
      "Menu items, prices, and availability are controlled by restaurants",
      "Nutritional information is provided by restaurants and not verified by ZIVO",
    ],
    summary: `ZIVO connects customers with independent restaurant partners. All food orders are prepared by the restaurant.`,
  },
};

// ============================================
// LEGAL FAQ (DISPUTE PREVENTION)
// ============================================

export const LEGAL_FAQ = [
  {
    question: "Is ZIVO an airline, rental company, or transportation provider?",
    answer: "No. ZIVO is a technology platform that connects customers with independent service providers. ZIVO does not operate airlines, own rental vehicles, employ drivers, or operate restaurants.",
  },
  {
    question: "Who issues my flight ticket?",
    answer: "Tickets are issued by licensed airline ticketing providers under airline rules. ZIVO acts as a sub-agent facilitating the booking process.",
  },
  {
    question: "Who owns the rental cars?",
    answer: "Vehicles listed on ZIVO are owned by independent car owners or fleets, not ZIVO. Owners are responsible for vehicle condition and insurance.",
  },
  {
    question: "Does ZIVO employ drivers or restaurants?",
    answer: "No. All drivers and restaurants are independent partners or contractors. There is no employment relationship between ZIVO and any service provider.",
  },
  {
    question: "Is insurance provided by ZIVO?",
    answer: "No. Insurance and protection plans are provided by licensed third-party insurance companies. Coverage is subject to policy terms and conditions.",
  },
  {
    question: "Are prices guaranteed?",
    answer: "Prices displayed are estimates and may change. Prices are final only after booking confirmation by the service provider.",
  },
  {
    question: "Can ZIVO suspend my account?",
    answer: "Yes. ZIVO may suspend or terminate accounts at its discretion to protect the platform, other users, or comply with legal requirements.",
  },
  {
    question: "How are disputes handled?",
    answer: "Disputes are resolved through binding arbitration as outlined in the Terms of Service. Users agree to waive class action rights.",
  },
  {
    question: "Can I sue ZIVO?",
    answer: "Users agree to binding arbitration and waive the right to participate in class actions to the maximum extent permitted by law.",
  },
  {
    question: "What happens if a service is unavailable?",
    answer: "ZIVO is not liable for service interruptions, unavailability, or capacity limitations. Availability depends on third-party providers.",
  },
  {
    question: "What if I have a safety emergency?",
    answer: "Contact local emergency services (911 in the US) immediately. ZIVO does not provide emergency response services.",
  },
  {
    question: "Can ZIVO share my data with authorities?",
    answer: "Yes. ZIVO may share data with government agencies or law enforcement when required by law or legal process.",
  },
  // Advanced Lawsuit Prevention Q&A (Section G)
  {
    question: "Is ZIVO responsible if something goes wrong?",
    answer: "No. ZIVO is a technology platform and does not provide the underlying services. Responsibility lies with independent service providers.",
  },
  {
    question: "Can I hold ZIVO liable for accidents or injuries?",
    answer: "No. Responsibility lies with independent service providers to the maximum extent allowed by law. Users assume all risks.",
  },
  {
    question: "Does ZIVO guarantee safety, quality, or availability?",
    answer: "No. All services are provided by third parties 'as is' without warranties of any kind.",
  },
  {
    question: "Can ZIVO delay or hold my payout?",
    answer: "Yes. ZIVO may hold funds to prevent fraud, chargebacks, regulatory compliance, or legal risk.",
  },
  {
    question: "Can ZIVO remove my listing or account?",
    answer: "Yes. ZIVO may suspend or terminate accounts at its sole discretion without prior notice.",
  },
  {
    question: "What law applies to disputes?",
    answer: "Disputes are governed by Delaware law and resolved through binding arbitration as defined in ZIVO's Terms of Service.",
  },
  {
    question: "Can I join a class action against ZIVO?",
    answer: "No. Users waive class action rights and agree to individual arbitration where permitted by law.",
  },
  {
    question: "Is ZIVO responsible for third-party system failures?",
    answer: "No. ZIVO relies on third parties (Stripe, Duffel, insurers, maps) and is not liable for their failures or outages.",
  },
  {
    question: "Can ZIVO monitor my communications?",
    answer: "Yes. ZIVO may monitor messages to prevent fraud, abuse, and harassment. Users consent to monitoring for safety.",
  },
  {
    question: "What happens if I provide false information?",
    answer: "Providing false identity or information may result in immediate permanent ban and potential legal action.",
  },
];

// ============================================
// EXTREME LEGAL POLICIES (Clauses 43-57)
// ============================================

export const EXTREME_LEGAL_POLICIES = {
  // Clause 43: User Verification Policy
  userVerification: {
    id: "user_verification",
    title: "User Verification Policy",
    version: "1.0",
    content: `ZIVO may require identity verification at any time for security, fraud prevention, or regulatory compliance. Failure to complete verification within the specified timeframe may result in account suspension or termination. ZIVO is not liable for delays, loss of access, or missed bookings caused by pending verification. Providing false identity information constitutes fraud and will result in immediate permanent ban from the platform and potential referral to law enforcement.`,
    requirements: [
      "Government-issued photo ID may be required",
      "Verification must be completed within specified timeframe",
      "False identity results in permanent ban",
      "ZIVO not liable for verification delays",
    ],
  },

  // Clause 44: Account Security Policy
  accountSecurity: {
    id: "account_security",
    title: "Account Security Policy",
    version: "1.0",
    content: `Users are solely responsible for maintaining the confidentiality and security of their account credentials, including passwords and authentication tokens. ZIVO is not liable for unauthorized access, transactions, or losses caused by user negligence, shared credentials, or compromised devices. ZIVO may reset, lock, or terminate accounts at any time for security reasons without prior notice.`,
    userResponsibilities: [
      "Keep passwords confidential and secure",
      "Use strong, unique passwords",
      "Enable two-factor authentication when available",
      "Report suspicious activity immediately",
      "Do not share account access with others",
    ],
  },

  // Clause 45: Location & Geo-Tracking Disclosure
  locationDisclosure: {
    id: "location_disclosure",
    title: "Location & Geo-Tracking Disclosure",
    version: "1.0",
    content: `ZIVO collects, processes, and stores location data for service delivery, safety monitoring, fraud prevention, and platform improvement. Location data may be shared with service providers (drivers, owners, restaurants) involved in active bookings and with law enforcement when required. ZIVO is not liable for inaccuracies in GPS, mapping, or location data provided by devices or third-party systems.`,
    dataUsage: [
      "Real-time location for active services",
      "Historical location for safety and support",
      "Sharing with service providers during bookings",
      "Fraud prevention and risk assessment",
      "Compliance with law enforcement requests",
    ],
  },

  // Clause 46: Communication Monitoring Policy
  communicationMonitoring: {
    id: "communication_monitoring",
    title: "Communication Monitoring Policy",
    version: "1.0",
    content: `By using the ZIVO platform, users consent to monitoring, recording, and analysis of in-app communications (messages, calls, photos) for fraud prevention, safety enforcement, and platform compliance. ZIVO is not responsible for the content of user-generated communications. Violations of communication policies may result in immediate account termination.`,
    scope: [
      "In-app messages between users and providers",
      "Support communications",
      "Reviews and ratings",
      "Uploaded photos and documents",
      "Audio communications where applicable",
    ],
  },

  // Clause 47: Platform Availability & Maintenance Policy
  platformAvailability: {
    id: "platform_availability",
    title: "Platform Availability & Maintenance Policy",
    version: "1.0",
    content: `The ZIVO platform may be unavailable due to scheduled maintenance, emergency repairs, security incidents, or system failures. ZIVO does not guarantee any specific uptime, availability, or service level. ZIVO is not liable for losses, missed bookings, or damages caused by platform downtime. No Service Level Agreement (SLA) is provided to users or partners.`,
    notice: "ZIVO may perform maintenance at any time without prior notice.",
  },

  // Clause 48: Third-Party Service Dependency Policy
  thirdPartyDependency: {
    id: "third_party_dependency",
    title: "Third-Party Service Dependency Policy",
    version: "1.0",
    content: `ZIVO relies on third-party services including payment processors (Stripe), ticketing providers (Duffel), insurance partners, mapping services, cloud infrastructure, and communication providers. ZIVO is not responsible for failures, outages, errors, or service degradation caused by third-party systems. Users accept all risks associated with third-party service dependencies.`,
    thirdParties: [
      "Payment processing (Stripe)",
      "Flight ticketing (Duffel and partners)",
      "Insurance providers",
      "Mapping and navigation services",
      "Cloud infrastructure providers",
      "Communication services",
    ],
  },

  // Clause 49: Government Sanctions & Export Control
  sanctionsCompliance: {
    id: "sanctions_compliance",
    title: "Government Sanctions & Export Control Policy",
    version: "1.0",
    content: `Users must comply with all applicable U.S. sanctions laws, export controls, and trade restrictions. ZIVO may block access from sanctioned countries, regions, or individuals identified on government watchlists. ZIVO may terminate accounts without notice to comply with sanctions requirements. Users represent that they are not located in, under the control of, or a national of any sanctioned jurisdiction.`,
    restrictions: [
      "No access from OFAC-sanctioned countries",
      "No transactions with sanctioned individuals or entities",
      "Account termination without notice for violations",
      "Cooperation with government enforcement",
    ],
  },

  // Clause 50: Minimum Age & Legal Capacity
  agePolicy: {
    id: "age_policy",
    title: "Minimum Age & Legal Capacity Policy",
    version: "1.0",
    content: `Users must be at least 18 years of age and have full legal capacity to enter binding contracts in their jurisdiction. By using ZIVO, users represent and warrant that they meet these requirements. ZIVO is not responsible for use by minors or individuals lacking legal capacity. Accounts discovered to be operated by minors will be terminated immediately.`,
  },

  // Clause 51-53: High-Risk Disclaimers
  highRiskDisclaimers: {
    id: "high_risk_disclaimers",
    title: "High-Risk Disclaimers",
    version: "1.0",
    noProfessionalAdvice: `ZIVO does not provide legal advice, financial advice, travel advice, insurance advice, or any other professional guidance. All decisions made by users are at their own risk. Users should consult qualified professionals before making important decisions.`,
    safetyEquipment: `ZIVO does not guarantee vehicle safety equipment, driver training standards, food handling procedures, or any other safety measures. Responsibility for safety lies solely with independent service providers.`,
    weatherEnvironment: `ZIVO is not responsible for weather delays, road conditions, natural disasters, environmental hazards, or any other external factors affecting services.`,
  },

  // Clause 54: Partner Terms Acceptance
  partnerTerms: {
    id: "partner_terms",
    title: "Partner Terms & Acknowledgments",
    version: "1.0",
    content: `All partners (drivers, car owners, fleet owners, restaurants) must accept role-specific terms acknowledging independent contractor status, tax responsibilities, insurance requirements, and liability limitations. Partners are not employees, agents, or representatives of ZIVO.`,
    acknowledgments: [
      "Independent contractor status (not employment)",
      "Sole responsibility for tax reporting and payment",
      "Requirement to maintain adequate insurance",
      "Compliance with all applicable laws and regulations",
      "No authority to bind or represent ZIVO",
    ],
  },

  // Clause 55: Tax Responsibility Disclaimer
  taxResponsibility: {
    id: "tax_responsibility",
    title: "Tax Responsibility Disclaimer",
    version: "1.0",
    content: `ZIVO does not withhold taxes from partner payouts except where required by law. Partners are solely responsible for reporting all income to tax authorities and paying all applicable taxes. ZIVO does not provide tax advice. ZIVO may issue tax forms (1099s) as required by law.`,
  },

  // Clause 56: Automatic Risk Flags
  automaticRiskFlags: {
    id: "automatic_risk_flags",
    title: "Automatic Risk Detection & Response",
    version: "1.0",
    content: `ZIVO employs automated systems to detect fraud, abuse, and risk. When risk is detected, ZIVO may automatically: freeze accounts, delay or hold payouts, require additional verification, limit platform access, or terminate accounts. These actions may occur without prior notice and ZIVO is not liable for any resulting losses or inconvenience.`,
    automaticActions: [
      "Account freezing or suspension",
      "Payout delays or holds",
      "Mandatory re-verification",
      "Transaction limits or restrictions",
      "Immediate account termination",
    ],
  },

  // Clause 57: Survival of Protections
  survivalClause: {
    id: "survival_clause",
    title: "Survival of Legal Protections",
    version: "1.0",
    content: `All liability limitations, indemnification obligations, warranty disclaimers, arbitration agreements, and other legal protections in these terms shall survive: account termination, service discontinuation, platform closure, and resolution of any disputes. These protections remain in effect indefinitely.`,
  },
};

// ============================================
// ULTRA-LEVEL LEGAL POLICIES (Clauses 58-74)
// ============================================

export const ULTRA_LEGAL_POLICIES = {
  // Clause 58: Consumer Disclosure Policy
  consumerDisclosures: {
    id: "consumer_disclosures",
    title: "Consumer Disclosure Policy",
    version: "1.0",
    content: `ZIVO provides transparent disclosures of all prices, fees, taxes, and service terms prior to checkout. Users are responsible for reviewing all details before completing any purchase. ZIVO is not liable for user misunderstanding after acceptance of terms.`,
    disclosures: [
      "Total prices shown before payment",
      "All applicable fees and taxes disclosed",
      "Cancellation and refund policies displayed",
      "Service terms provided before booking",
      "Partner information available at checkout",
    ],
  },

  // Clause 59: Unfair Practices Disclaimer
  unfairPracticesDisclaimer: {
    id: "unfair_practices",
    title: "Unfair Practices Disclaimer",
    version: "1.0",
    content: `ZIVO disclaims liability for pricing errors, inventory errors, or service descriptions provided by third-party partners. Corrections may be made at any time without obligation to honor erroneous prices or terms.`,
    disclaimers: [
      "Pricing errors caused by third parties",
      "Inventory or availability errors",
      "Service descriptions provided by partners",
      "Technical glitches affecting displayed information",
    ],
  },

  // Clause 60: Cooling-Off Rights Disclaimer
  coolingOffDisclaimer: {
    id: "cooling_off",
    title: "Cooling-Off Rights Disclaimer",
    version: "1.0",
    content: `Where permitted by law, there is no automatic right to cancel digital services. Flights, rentals, rides, and deliveries may be non-refundable once booked. All refunds are governed strictly by posted policies and partner terms.`,
  },

  // Clause 61: Advertising & Marketing Disclaimer
  advertisingDisclaimer: {
    id: "advertising",
    title: "Advertising & Marketing Disclaimer",
    version: "1.0",
    content: `All marketing content is informational only and does not constitute a binding offer. Prices, availability, and promotions are subject to change without notice. Actual terms are confirmed only at checkout.`,
  },

  // Clause 62: Payment Processor Reliance Policy
  paymentProcessors: {
    id: "payment_processors",
    title: "Payment Processor Reliance Policy",
    version: "1.0",
    content: `All payments are processed by third-party payment processors (Stripe, banks, and card networks). ZIVO is not liable for processor outages, payment holds, or delays caused by payment systems. Chargebacks are governed by processor and card network rules.`,
    processors: [
      "Stripe payment processing",
      "Bank and card network processing",
      "Third-party fraud detection systems",
      "Currency conversion services",
    ],
  },

  // Clause 63: Funds Hold & Reserve Rights
  fundsHoldRights: {
    id: "funds_hold",
    title: "Funds Hold & Reserve Rights",
    version: "1.0",
    content: `ZIVO may place rolling reserves, delay payouts, or withhold funds to manage fraud risk, chargeback exposure, regulatory compliance, or legal obligations. Funds may be held for extended periods as necessary.`,
    actions: [
      "Place rolling reserves on partner payouts",
      "Delay payouts pending verification",
      "Withhold funds during disputes or investigations",
      "Offset funds for chargebacks or fees owed",
    ],
  },

  // Clause 64: Currency & Exchange Disclaimer
  currencyDisclaimer: {
    id: "currency",
    title: "Currency & Exchange Disclaimer",
    version: "1.0",
    content: `Exchange rates shown are estimates only. Final amounts may vary based on bank conversion rates, processing fees, and timing. ZIVO is not responsible for foreign exchange fluctuations or conversion fees charged by banks.`,
  },

  // Clause 65: AI & Recommendation Disclaimer
  aiDisclosure: {
    id: "ai_disclosure",
    title: "AI & Recommendation Disclaimer",
    version: "1.0",
    content: `ZIVO uses artificial intelligence and machine learning to provide recommendations, rankings, pricing suggestions, and other features. AI features provide suggestions only with no guarantees of outcomes. AI decisions may be incorrect, incomplete, or not suited to user needs. Users remain solely responsible for all final decisions.`,
    aiFeatures: [
      "Search rankings and recommendations",
      "Dynamic pricing suggestions",
      "Fraud detection and risk scoring",
      "Personalized content and offers",
      "Trip planning and itinerary suggestions",
    ],
  },

  // Clause 66: No Automated Decision Liability
  automatedDecisionDisclaimer: {
    id: "automated_decisions",
    title: "No Automated Decision Liability",
    version: "1.0",
    content: `ZIVO is not liable for outcomes resulting from automated systems, including search rankings, dynamic pricing, fraud flags, account restrictions, or personalization. Users may request human review of significant automated decisions where required by law.`,
  },

  // Clause 67: Cross-Border Service Disclaimer
  crossBorderDisclaimer: {
    id: "cross_border",
    title: "Cross-Border Service Disclaimer",
    version: "1.0",
    content: `Services may differ by country and jurisdiction. ZIVO is not responsible for local regulatory conflicts, service availability differences, or legal requirements that vary by location. Users are responsible for understanding applicable laws in their jurisdiction.`,
    considerations: [
      "Service availability varies by region",
      "Local laws may affect terms",
      "Regulatory requirements differ by jurisdiction",
      "Consumer protection laws vary by country",
    ],
  },

  // Clause 68: Customs, Immigration & Travel Law Disclaimer
  travelLawDisclaimer: {
    id: "travel_law",
    title: "Customs, Immigration & Travel Law Disclaimer",
    version: "1.0",
    content: `ZIVO is not responsible for visa requirements, immigration denial, customs issues, border restrictions, or any travel-related legal requirements. Users are solely responsible for ensuring they have proper documentation and authorization to travel.`,
    notResponsibleFor: [
      "Visa application or approval",
      "Immigration or border denial",
      "Customs duties or seizures",
      "Passport validity requirements",
      "Health documentation requirements",
      "Travel advisories or restrictions",
    ],
  },

  // Clause 69: Anti-Circumvention Policy
  antiCircumvention: {
    id: "anti_circumvention",
    title: "Anti-Circumvention Policy",
    version: "1.0",
    content: `Users may not bypass ZIVO payment systems, contact partners off-platform to avoid fees, or circumvent any platform mechanisms. Violations result in immediate account termination and potential legal action.`,
    prohibitions: [
      "Bypassing ZIVO payment processing",
      "Contacting partners off-platform for direct deals",
      "Avoiding service or transaction fees",
      "Manipulating pricing or availability displays",
      "Using automation to gain unfair advantages",
    ],
  },

  // Clause 70: Fraud Zero-Tolerance Policy
  fraudPolicy: {
    id: "fraud_policy",
    title: "Fraud Zero-Tolerance Policy",
    version: "1.0",
    content: `ZIVO maintains a zero-tolerance policy for fraud. Fraudulent activity results in immediate permanent ban, seizure of any pending funds, and referral to law enforcement. ZIVO may share fraud data with partners and authorities.`,
    consequences: [
      "Immediate permanent account termination",
      "Seizure of pending payouts and funds",
      "Referral to law enforcement agencies",
      "Civil liability for damages",
      "Sharing of fraud data with partners and networks",
    ],
  },

  // Clause 71: Blacklisting & Watchlist Rights
  blacklistingRights: {
    id: "blacklisting",
    title: "Blacklisting & Watchlist Rights",
    version: "1.0",
    content: `ZIVO may maintain internal risk lists, block repeat offenders, share data with fraud prevention networks, and cooperate with industry watchlists as legally permitted.`,
  },

  // Clause 72: Service Suspension Rights
  serviceSuspensionRights: {
    id: "service_suspension",
    title: "Service Suspension Rights",
    version: "1.0",
    content: `ZIVO may suspend individual services, entire regions, or specific accounts at any time without liability. Suspensions may be temporary or permanent based on risk assessment, regulatory requirements, or business decisions.`,
  },

  // Clause 73: Platform Evolution Clause
  platformEvolution: {
    id: "platform_evolution",
    title: "Platform Evolution Clause",
    version: "1.0",
    content: `ZIVO may add, modify, or remove features, change business models, rebrand services, or fundamentally alter the platform at any time. Users accept all future changes by continuing to use the platform.`,
  },

  // Clause 74: Survival of Disclaimers
  disclaimerSurvival: {
    id: "disclaimer_survival",
    title: "Survival of All Disclaimers",
    version: "1.0",
    content: `All disclaimers, liability limitations, waivers, indemnification obligations, and legal protections in these policies survive: account termination, service discontinuation, platform shutdown, and resolution of any disputes. These protections remain in effect indefinitely.`,
  },
};

// Ultra-level FAQ additions
export const ULTRA_LEGAL_FAQ = [
  {
    question: "Is ZIVO legally responsible for service failures?",
    answer: "No. Services are provided by independent third parties. ZIVO provides a technology platform only.",
  },
  {
    question: "Can ZIVO hold or delay my money?",
    answer: "Yes. ZIVO may hold, delay, or withhold funds to manage risk, fraud, chargebacks, or legal obligations.",
  },
  {
    question: "Does ZIVO guarantee prices, availability, or safety?",
    answer: "No. All services are provided 'as is' without warranties. Prices and availability are subject to change.",
  },
  {
    question: "Can ZIVO cooperate with governments or police?",
    answer: "Yes. ZIVO may share data and cooperate with law enforcement, regulators, and government agencies when required by law.",
  },
  {
    question: "Can ZIVO change or shut down services?",
    answer: "Yes. ZIVO may modify, suspend, or discontinue any service at any time without liability.",
  },
  {
    question: "Is ZIVO responsible for AI recommendations?",
    answer: "No. AI features provide suggestions only. Users are responsible for all final decisions.",
  },
  {
    question: "Can ZIVO ban me permanently?",
    answer: "Yes. ZIVO may terminate accounts permanently for fraud, policy violations, or at its discretion.",
  },
  {
    question: "Is ZIVO responsible for visa or immigration issues?",
    answer: "No. Users are solely responsible for travel documentation, visas, and immigration requirements.",
  },
];

// ============================================
// ADVANCED LEGAL POLICIES (Clauses 75-92)
// Labor, Antitrust, Accessibility, AI Law, Platform Governance
// ============================================

export const ADVANCED_PLATFORM_POLICIES = {
  // Clause 75: Independent Contractor Acknowledgment
  contractorStatus: {
    id: "contractor_status",
    title: "Independent Contractor Status",
    version: "1.0",
    content: `All partners (drivers, car owners, fleets, restaurants) acknowledge and agree that they are independent contractors, not employees. Partners control their own schedules, provide their own tools and assets, bear their own business expenses, may work with competitors, and have no exclusivity arrangement with ZIVO.`,
    acknowledgments: [
      "Control over own schedule and working hours",
      "Provision of own tools, equipment, and assets",
      "Responsibility for own business expenses",
      "Freedom to work with competing platforms",
      "No exclusivity or minimum commitment required",
      "Independent business operation",
    ],
  },

  // Clause 76: No Benefits / No Wages Clause
  noBenefits: {
    id: "no_benefits",
    title: "No Benefits or Wages",
    version: "1.0",
    content: `ZIVO does not provide wages, overtime, benefits, insurance, workers' compensation, or any employment benefits to partners. All partners acknowledge their self-employment status and sole responsibility for their own taxes, insurance, and benefits.`,
    excludedBenefits: [
      "Wages or salary",
      "Overtime compensation",
      "Health insurance",
      "Retirement benefits",
      "Workers' compensation",
      "Paid time off",
      "Employment protections",
    ],
  },

  // Clause 77: No Supervision / No Control Clause
  noSupervision: {
    id: "no_supervision",
    title: "No Supervision or Control",
    version: "1.0",
    content: `ZIVO does not supervise how services are performed, does not train partners on service delivery, and does not control routes, methods, timing, or performance standards. Partners retain full autonomy over service execution.`,
  },

  // Clause 78: Platform Neutrality Policy
  platformNeutrality: {
    id: "platform_neutrality",
    title: "Platform Neutrality Policy",
    version: "1.0",
    content: `ZIVO operates as a neutral technology platform. We do not favor or discriminate unfairly among partners. Rankings are algorithmic and based on objective factors. Visibility is not guaranteed to any partner. No promise of minimum earnings, bookings, or revenue is made.`,
    principles: [
      "Neutral platform operation",
      "Algorithmic ranking based on objective factors",
      "No guaranteed visibility or placement",
      "No promise of minimum earnings",
      "No favoritism or unfair discrimination",
    ],
  },

  // Clause 79: No Price Fixing Disclaimer
  noPriceFixing: {
    id: "no_price_fixing",
    title: "No Price Fixing Disclaimer",
    version: "1.0",
    content: `ZIVO does not set partner prices (except for platform fees), does not coordinate pricing between partners, and does not guarantee demand, income, or revenue. Partners set their own prices independently where applicable.`,
  },

  // Clause 80: Competitor Participation Clause
  competitorParticipation: {
    id: "competitor_participation",
    title: "Competitor Participation Rights",
    version: "1.0",
    content: `Partners are free to use competing platforms, advertise their services elsewhere, and operate their businesses independently. ZIVO does not require exclusivity and does not restrict partners from competitive activities.`,
  },

  // Clause 81: Accessibility Statement
  accessibilityStatement: {
    id: "accessibility",
    title: "Accessibility Statement",
    version: "1.0",
    content: `ZIVO strives to make its platform accessible to users with disabilities. However, we do not guarantee error-free accessibility compliance at all times. Users may report accessibility issues for review. ZIVO is not liable for temporary non-compliance or third-party content accessibility.`,
    commitments: [
      "Ongoing accessibility improvements",
      "User feedback consideration",
      "Regular accessibility reviews",
      "Third-party audit consideration",
    ],
  },

  // Clause 82: Assistive Technology Disclaimer
  assistiveTechDisclaimer: {
    id: "assistive_tech",
    title: "Assistive Technology Disclaimer",
    version: "1.0",
    content: `ZIVO does not guarantee full compatibility with all screen readers, voice assistants, or third-party accessibility tools. Functionality may vary based on device, browser, and assistive technology configurations.`,
  },

  // Clause 83: Data Minimization Policy
  dataMinimization: {
    id: "data_minimization",
    title: "Data Minimization Policy",
    version: "1.0",
    content: `ZIVO collects only data necessary for providing services. We are not liable for inaccuracies in data provided by users. Users are responsible for ensuring their information is accurate and up-to-date.`,
  },

  // Clause 84: Data Portability Disclaimer
  dataPortability: {
    id: "data_portability",
    title: "Data Portability Disclaimer",
    version: "1.0",
    content: `Data export is available where legally required. ZIVO may refuse excessive, repetitive, or abusive data requests. Standard processing times apply to all data requests.`,
  },

  // Clause 85: Data Deletion Limitations
  dataDeletionLimits: {
    id: "data_deletion_limits",
    title: "Data Deletion Limitations",
    version: "1.0",
    content: `Some data cannot be deleted due to legal obligations, fraud prevention requirements, accounting rules, and regulatory compliance. ZIVO will inform users of any limitations on deletion requests.`,
    retentionReasons: [
      "Legal and regulatory obligations",
      "Fraud prevention and security",
      "Accounting and tax requirements",
      "Dispute resolution records",
      "Safety and compliance records",
    ],
  },

  // Clause 86: No Solely Automated Decisions
  noSolelyAutomated: {
    id: "no_solely_automated",
    title: "No Solely Automated Decisions",
    version: "1.0",
    content: `ZIVO does not make decisions solely by AI or automation that produce significant legal effects on users without opportunity for human review. Users may request human review of significant automated decisions where required by law.`,
  },

  // Clause 87: AI Bias Disclaimer
  aiBiasDisclaimer: {
    id: "ai_bias",
    title: "AI Bias Disclaimer",
    version: "1.0",
    content: `Algorithms may reflect user behavior, market conditions, and historical patterns. ZIVO does not guarantee neutrality, fairness, or absence of bias in AI outcomes. AI systems are continuously improved but may contain inherent limitations.`,
  },

  // Clause 88: Mass Arbitration Rules
  massArbitrationRules: {
    id: "mass_arbitration",
    title: "Mass Arbitration Rules",
    version: "1.0",
    content: `If multiple similar claims arise, each claim must be resolved individually. Filing fees are allocated per claimant. No consolidated or class-wide arbitration is permitted. Sequential batching may apply to mass filings.`,
    rules: [
      "Individual claim resolution required",
      "Per-claimant filing fee allocation",
      "No consolidated arbitration",
      "Sequential batch processing for mass filings",
    ],
  },

  // Clause 89: Pre-Dispute Resolution Requirement
  preDisputeRequirement: {
    id: "pre_dispute",
    title: "Pre-Dispute Resolution Requirement",
    version: "1.0",
    content: `Before filing any formal dispute or arbitration, users must first contact ZIVO support and allow a reasonable period for informal resolution. Failure to follow this process may result in dismissal of claims.`,
    steps: [
      "Contact ZIVO support with detailed complaint",
      "Allow 30 days for informal resolution",
      "Participate in good-faith negotiation",
      "Proceed to formal dispute only if unresolved",
    ],
  },

  // Clause 90: Platform Rule Enforcement
  ruleEnforcement: {
    id: "rule_enforcement",
    title: "Platform Rule Enforcement",
    version: "1.0",
    content: `ZIVO may enforce platform rules automatically, manually, or retroactively. Enforcement decisions are at ZIVO's discretion and may include warnings, restrictions, suspensions, or permanent removal.`,
  },

  // Clause 91: Emergency Action Clause
  emergencyAction: {
    id: "emergency_action",
    title: "Emergency Action Rights",
    version: "1.0",
    content: `ZIVO may take immediate action without prior notice to suspend accounts, freeze funds, remove listings, or restrict access when safety, legal, or fraud risks are detected. Emergency actions may be taken to protect users, partners, or the platform.`,
    emergencyActions: [
      "Immediate account suspension",
      "Funds freeze pending investigation",
      "Listing removal without notice",
      "Access restriction for safety",
      "Cooperation with authorities",
    ],
  },

  // Clause 92: Survival of Advanced Protections
  advancedProtectionSurvival: {
    id: "advanced_survival",
    title: "Survival of Advanced Protections",
    version: "1.0",
    content: `All labor, antitrust, AI, neutrality, and governance protections in these policies survive: account termination, partner offboarding, service discontinuation, and resolution of any legal disputes. These protections remain in effect indefinitely.`,
  },
};

// Advanced FAQ for edge cases
export const ADVANCED_LEGAL_FAQ = [
  {
    question: "Is ZIVO my employer?",
    answer: "No. All partners are independent businesses. ZIVO is a technology platform only.",
  },
  {
    question: "Does ZIVO control how services are performed?",
    answer: "No. ZIVO provides software only. Partners control their own methods, schedules, and service delivery.",
  },
  {
    question: "Can ZIVO guarantee earnings or bookings?",
    answer: "No. ZIVO does not guarantee any minimum earnings, bookings, or revenue to partners.",
  },
  {
    question: "Does ZIVO manipulate prices?",
    answer: "No. Prices are set by partners or third parties. ZIVO does not engage in price fixing.",
  },
  {
    question: "Can ZIVO block access to the platform?",
    answer: "Yes. ZIVO may suspend or terminate access at its discretion for safety, compliance, or policy reasons.",
  },
  {
    question: "Is ZIVO responsible for accessibility issues?",
    answer: "ZIVO strives for accessibility but does not guarantee full compliance in all cases. Users may report issues for review.",
  },
  {
    question: "Can I request my data be deleted?",
    answer: "Some data may be retained for legal, fraud prevention, or accounting reasons even after deletion requests.",
  },
  {
    question: "Are AI decisions final?",
    answer: "Users may request human review of significant automated decisions where legally required.",
  },
];

// Helper arrays
export const ADVANCED_POLICIES_LIST = Object.values(ADVANCED_PLATFORM_POLICIES);
export const ULTRA_POLICIES_LIST = Object.values(ULTRA_LEGAL_POLICIES);
export const EXTREME_POLICIES_LIST = Object.values(EXTREME_LEGAL_POLICIES);
export const EXTENDED_POLICIES_LIST = Object.values(EXTENDED_LEGAL_POLICIES);

// Summary of all legal protections for display
export const LEGAL_PROTECTION_SUMMARY = {
  liabilityShield: [
    "Platform disclaimer (technology only)",
    "No agency/employment relationship",
    "Assumption of risk by users",
    "Release of liability",
    "Damage cap ($100 or 12-month payment, whichever is lower)",
    "No warranty disclaimer",
    "Service availability disclaimer",
  ],
  disputeResolution: [
    "Binding arbitration required",
    "Class action waiver",
    "Jury trial waiver",
    "30-day opt-out procedure for transparency",
    "Delaware governing law",
    "Pre-dispute resolution requirement",
    "Mass arbitration rules",
  ],
  operationalProtection: [
    "Force majeure (expanded coverage)",
    "Third-party beneficiary rights for partners",
    "Service modification rights",
    "Termination without cause",
    "Government compliance clause",
    "Payment hold & reserve rights",
    "Policy change rights",
    "Emergency action rights",
  ],
  contentProtection: [
    "User content disclaimer",
    "Intellectual property protection",
    "Anti-scraping provisions",
    "Severability and survival clauses",
    "Entire agreement clause",
    "UGC license for marketing",
    "Price & content accuracy disclaimer",
  ],
  communityCompliance: [
    "Acceptable use policy",
    "Community standards",
    "Safety & emergency disclaimer",
    "Regulatory cooperation policy",
  ],
  extremeProtection: [
    "User verification enforcement",
    "Account security responsibility",
    "Location tracking disclosure",
    "Communication monitoring consent",
    "Third-party dependency acceptance",
    "Sanctions compliance",
    "Automatic risk response",
    "Survival of protections",
  ],
  ultraProtection: [
    "Consumer disclosure transparency",
    "AI & automation disclaimer",
    "Cross-border risk insulation",
    "Payment processor reliance",
    "Fraud zero-tolerance enforcement",
    "Service suspension rights",
    "Platform evolution rights",
    "Disclaimer survival clause",
  ],
  advancedProtection: [
    "Independent contractor acknowledgment",
    "No employment benefits clause",
    "Platform neutrality policy",
    "No price fixing disclaimer",
    "Accessibility statement",
    "Data minimization & portability",
    "AI bias disclaimer",
    "Platform governance authority",
  ],
  governmentProtection: [
    "Government order compliance",
    "Regulatory interpretation disclaimer",
    "Emergency shutdown authority",
    "Content removal rights",
    "Safety incident disclaimer",
    "No endorsement disclaimer",
    "Marketplace volatility warning",
    "Corporate event survival",
  ],
};

// ============================================
// GOVERNMENT & SHUTDOWN POLICIES (Clauses 93-108)
// Government Enforcement, Shutdown Defense, Content Law, Safety
// ============================================

export const GOVERNMENT_SHUTDOWN_POLICIES = {
  // Clause 93: Government Order Compliance
  governmentOrders: {
    id: "government_orders",
    title: "Government Order Compliance",
    version: "1.0",
    content: `ZIVO may comply immediately with government orders, subpoenas, court orders, or regulatory directives. ZIVO is not required to notify users before compliance. ZIVO is not liable for any losses caused by compliance with legal requirements. Services may be restricted, modified, or suspended by region to comply with local laws.`,
    complianceActions: [
      "Immediate compliance with court orders",
      "Response to regulatory subpoenas",
      "Regional service restrictions",
      "Data disclosure as required by law",
      "Account actions per government directive",
    ],
  },

  // Clause 94: Regulatory Interpretation Disclaimer
  regulatoryInterpretation: {
    id: "regulatory_interpretation",
    title: "Regulatory Interpretation Disclaimer",
    version: "1.0",
    content: `ZIVO interprets applicable laws and regulations in good faith based on available guidance. ZIVO is not liable for changes in regulatory interpretation, enforcement priorities, or future legal developments. Users accept that legal requirements may evolve and ZIVO's policies will adapt accordingly.`,
  },

  // Clause 95: No Regulatory Guarantee
  noRegulatoryGuarantee: {
    id: "no_regulatory_guarantee",
    title: "No Regulatory Guarantee",
    version: "1.0",
    content: `ZIVO does not guarantee regulatory approval, continued legality in all jurisdictions, or availability of services under future laws. Legal status may vary by location and may change without notice. Users are responsible for ensuring their use of ZIVO complies with local laws.`,
    noGuarantees: [
      "Regulatory approval in any jurisdiction",
      "Continued legality of services",
      "Availability under future laws",
      "Licensing in all regions",
      "Compliance with evolving regulations",
    ],
  },

  // Clause 96: Emergency Shutdown Authority
  emergencyShutdown: {
    id: "emergency_shutdown",
    title: "Emergency Shutdown Authority",
    version: "1.0",
    content: `ZIVO may disable all or part of the platform, freeze transactions, suspend payouts, and remove listings immediately if legal, safety, financial, or reputational risk is detected. This authority exists to protect users, partners, and the platform.`,
    shutdownActions: [
      "Disable platform services (partial or full)",
      "Freeze all transactions",
      "Suspend partner payouts",
      "Remove listings without notice",
      "Restrict access by region or user type",
    ],
  },

  // Clause 97: No Liability for Shutdown
  noShutdownLiability: {
    id: "no_shutdown_liability",
    title: "No Liability for Shutdown",
    version: "1.0",
    content: `ZIVO is not liable for lost profits, missed bookings, business interruption, consequential damages, or any losses caused by platform shutdowns, suspensions, or service restrictions. Users and partners assume all risks associated with platform availability.`,
  },

  // Clause 98: Platform Communication Disclaimer
  communicationDisclaimer: {
    id: "communication_disclaimer",
    title: "Platform Communication Disclaimer",
    version: "1.0",
    content: `ZIVO is not responsible for messages between users, miscommunication, misunderstandings, language translation errors, or any disputes arising from communications on the platform. Users are solely responsible for their communications.`,
  },

  // Clause 99: Content Removal Rights
  contentRemoval: {
    id: "content_removal",
    title: "Content Removal Rights",
    version: "1.0",
    content: `ZIVO may remove listings, reviews, messages, profiles, or any user-generated content at its sole discretion, without prior notice or explanation. Content decisions are final and not subject to appeal except where required by law.`,
    removalScope: [
      "Listings and service offerings",
      "Reviews and ratings",
      "Messages and communications",
      "Profile information",
      "Photos and media",
    ],
  },

  // Clause 100: Defamation & Review Disclaimer
  defamationDisclaimer: {
    id: "defamation_disclaimer",
    title: "Defamation & Review Disclaimer",
    version: "1.0",
    content: `ZIVO is not liable for reviews, ratings, opinions, allegations, or statements made by users. ZIVO does not verify the accuracy of user-generated content and provides a neutral platform for communication. Disputes about reviews are between the parties involved.`,
  },

  // Clause 101: Safety Incident Disclaimer
  safetyIncidentDisclaimer: {
    id: "safety_incident",
    title: "Safety Incident Disclaimer",
    version: "1.0",
    content: `ZIVO is not liable for crimes, assaults, theft, injuries, accidents, property damage, or any other incidents occurring during use of the platform or services arranged through the platform. ZIVO is a technology platform only and does not provide the underlying services.`,
    excludedLiability: [
      "Criminal acts by any party",
      "Physical assaults or injuries",
      "Theft of property or valuables",
      "Accidents during service delivery",
      "Property damage",
      "Personal injury claims",
    ],
  },

  // Clause 102: No Background Check Guarantee
  noBackgroundGuarantee: {
    id: "no_background_guarantee",
    title: "No Background Check Guarantee",
    version: "1.0",
    content: `ZIVO may perform background checks, identity verification, or screening but does not guarantee the accuracy of criminal history information, identity verification results, or the safety of any individual. Background checks have inherent limitations and may not reveal all relevant information.`,
  },

  // Clause 103: No Endorsement Disclaimer
  noEndorsement: {
    id: "no_endorsement",
    title: "No Endorsement Disclaimer",
    version: "1.0",
    content: `ZIVO does not endorse, recommend, or vouch for any driver, car owner, restaurant, hotel, airline, or service provider. Presence on the platform does not constitute endorsement. Users must exercise their own judgment when selecting services.`,
    noEndorsementFor: [
      "Drivers or delivery partners",
      "Car owners or fleet operators",
      "Restaurants or food vendors",
      "Hotels or accommodations",
      "Airlines or travel providers",
      "Any third-party service provider",
    ],
  },

  // Clause 104: Public Statement Limitation
  publicStatementLimit: {
    id: "public_statement",
    title: "Public Statement Limitation",
    version: "1.0",
    content: `Only official ZIVO channels represent the company. ZIVO is not liable for statements, claims, or representations made by users, partners, drivers, or any third parties. Official statements come only from @hizivo.com email addresses or official social media accounts.`,
  },

  // Clause 105: Marketplace Volatility Disclaimer
  marketplaceVolatility: {
    id: "marketplace_volatility",
    title: "Marketplace Volatility Disclaimer",
    version: "1.0",
    content: `Users and partners acknowledge that demand may fluctuate, income is not guaranteed, listings may receive no bookings, and market conditions can change rapidly. ZIVO does not guarantee any level of business, revenue, or customer traffic.`,
    acknowledgments: [
      "Demand fluctuates based on market conditions",
      "Income and earnings are not guaranteed",
      "Listings may receive no bookings",
      "Market conditions change without notice",
      "Competition affects visibility and revenue",
    ],
  },

  // Clause 106: Unilateral Rule Enforcement
  unilateralEnforcement: {
    id: "unilateral_enforcement",
    title: "Unilateral Rule Enforcement",
    version: "1.0",
    content: `ZIVO may enforce rules without warning, apply penalties retroactively, remove access permanently, and take any action necessary to protect the platform. Enforcement decisions are at ZIVO's sole discretion and are not subject to external review.`,
  },

  // Clause 107: No Duty to Warn
  noDutyToWarn: {
    id: "no_duty_to_warn",
    title: "No Duty to Warn",
    version: "1.0",
    content: `ZIVO has no duty to warn users about risks, behavior of other users or partners, market conditions, regulatory changes, or any other matters. Users are responsible for their own due diligence and risk assessment.`,
  },

  // Clause 108: Survival After Company Events
  companyEventSurvival: {
    id: "company_event_survival",
    title: "Survival After Company Events",
    version: "1.0",
    content: `All liability protections, disclaimers, arbitration agreements, and user obligations survive: merger, acquisition, sale, bankruptcy, reorganization, dissolution, or any other corporate event. These terms bind successors and assigns.`,
    survivingEvents: [
      "Merger or consolidation",
      "Acquisition by another company",
      "Sale of assets or business",
      "Bankruptcy proceedings",
      "Corporate reorganization",
      "Dissolution of the company",
    ],
  },
};

// Extreme FAQ for government/shutdown scenarios
export const EXTREME_LEGAL_FAQ_EXTENDED = [
  {
    question: "Can ZIVO shut down services suddenly?",
    answer: "Yes. ZIVO may disable services immediately to comply with law, protect safety, or manage platform risk. No prior notice is required.",
  },
  {
    question: "Is ZIVO responsible for crimes or accidents?",
    answer: "No. ZIVO is a technology platform only. Responsibility for incidents lies with the individuals involved and relevant authorities.",
  },
  {
    question: "Can ZIVO remove my content or account?",
    answer: "Yes. ZIVO may remove any content or terminate any account at its sole discretion, without explanation.",
  },
  {
    question: "Does ZIVO guarantee legality in my country?",
    answer: "No. Laws vary by jurisdiction and may change. Users are responsible for ensuring their use complies with local laws.",
  },
  {
    question: "Can ZIVO comply with government requests without telling me?",
    answer: "Yes. ZIVO may comply with legal orders without prior notice to affected users.",
  },
  {
    question: "Is ZIVO responsible for what other users say or do?",
    answer: "No. ZIVO is not liable for user communications, reviews, or behavior.",
  },
  {
    question: "What happens to my rights if ZIVO is sold?",
    answer: "All terms and protections survive corporate events like mergers, acquisitions, or bankruptcy.",
  },
];

// Helper arrays
export const GOVERNMENT_POLICIES_LIST = Object.values(GOVERNMENT_SHUTDOWN_POLICIES);

// ============================================
// CORPORATE & IP PROTECTION POLICIES (Clauses 109-122)
// IP, Subpoena, Whistleblower, Corporate Protection
// ============================================

export const CORPORATE_IP_POLICIES = {
  // Clause 109: Trademark & Brand Usage
  trademarkPolicy: {
    id: "trademark_brand",
    title: "Trademark & Brand Usage Policy",
    version: "1.0",
    content: `The ZIVO name, logo, user interface, design elements, and all associated trademarks are protected intellectual property. No unauthorized use, imitation, or confusingly similar marks are permitted. Use in advertisements, domain names, or social media without written permission is prohibited. Violations may result in takedown requests, legal action, and damages.`,
    prohibitedUses: [
      "Unauthorized use of ZIVO name or logo",
      "Imitation or confusingly similar branding",
      "Use in advertisements without permission",
      "Domain names containing ZIVO marks",
      "Social media impersonation",
      "Third-party app store listings",
    ],
  },

  // Clause 110: Domain & Impersonation Protection
  impersonationProtection: {
    id: "impersonation_protection",
    title: "Domain & Impersonation Protection",
    version: "1.0",
    content: `ZIVO may take legal and technical action against impersonation websites, fake apps, fraudulent listings, and any attempts to misrepresent affiliation with ZIVO. ZIVO may report impersonators to platforms, hosting providers, domain registrars, and law enforcement. ZIVO is not liable for harm caused by third-party impersonation.`,
    actions: [
      "Domain takedown requests",
      "App store removal requests",
      "Platform reporting",
      "Law enforcement referrals",
      "Civil legal action",
    ],
  },

  // Clause 111: Copyright & DMCA
  dmcaPolicy: {
    id: "dmca_policy",
    title: "Copyright & DMCA Policy",
    version: "1.0",
    content: `ZIVO respects intellectual property rights and responds to valid DMCA takedown notices. Repeat infringers will have their accounts terminated. ZIVO is not liable for user-uploaded content that infringes third-party copyrights. Counter-notices may be submitted according to DMCA procedures.`,
    process: [
      "Submit DMCA notice to designated agent",
      "Include identification of copyrighted work",
      "Identify infringing material location",
      "Provide contact information and signature",
      "ZIVO reviews and acts on valid notices",
    ],
    dmcaAgent: "DMCA Agent, ZIVO LLC, legal@hizivo.com",
  },

  // Clause 112: Subpoena Response Policy
  subpoenaPolicy: {
    id: "subpoena_response",
    title: "Subpoena Response Policy",
    version: "1.0",
    content: `ZIVO responds only to valid, properly served legal process including subpoenas, court orders, and warrants. ZIVO may notify affected users unless legally prohibited. ZIVO may charge reasonable costs for compliance with legal process. ZIVO is not liable for disclosures made in good-faith compliance with legal obligations.`,
    requirements: [
      "Valid legal process required",
      "Proper service to designated agent",
      "Reasonable cost recovery permitted",
      "User notification when legally allowed",
      "Good-faith compliance protections",
    ],
  },

  // Clause 113: No Voluntary Discovery
  noVoluntaryDiscovery: {
    id: "no_voluntary_discovery",
    title: "No Voluntary Discovery",
    version: "1.0",
    content: `ZIVO does not voluntarily provide data, records, communications, logs, or any other information without valid legal obligation. Informal requests, attorney letters, or demands without proper legal process will not be honored. All discovery must follow applicable legal procedures.`,
  },

  // Clause 114: Record Retention Policy
  recordRetention: {
    id: "record_retention",
    title: "Record Retention Policy",
    version: "1.0",
    content: `Data is retained only as required by law, business necessity, or contractual obligation. Records may be deleted, anonymized, or archived according to ZIVO's retention schedule. ZIVO is not liable for records deleted in accordance with its retention policy.`,
    retentionPrinciples: [
      "Legal compliance periods observed",
      "Business necessity determines retention",
      "Anonymization after retention period",
      "Secure deletion procedures",
      "No indefinite storage guarantee",
    ],
  },

  // Clause 115: No Guarantee of Record Preservation
  noRecordGuarantee: {
    id: "no_record_guarantee",
    title: "No Guarantee of Record Preservation",
    version: "1.0",
    content: `ZIVO does not guarantee indefinite storage or preservation of messages, logs, files, media, or any user-generated content. Users are responsible for maintaining their own copies of important data. ZIVO may delete or archive data according to its policies without notice.`,
    noGuaranteeFor: [
      "Chat messages and communications",
      "Activity logs and history",
      "Uploaded files and documents",
      "Photos and media content",
      "Transaction records beyond legal requirements",
    ],
  },

  // Clause 116: Whistleblower Policy
  whistleblowerPolicy: {
    id: "whistleblower",
    title: "Whistleblower Policy",
    version: "1.0",
    content: `ZIVO encourages good-faith reporting of illegal activity, policy violations, safety concerns, and ethical issues. ZIVO maintains a strict no-retaliation policy for good-faith reporters. False or malicious reports made in bad faith are prohibited and may result in action against the reporter.`,
    protections: [
      "Good-faith reporting encouraged",
      "No retaliation for legitimate reports",
      "Confidential reporting channels",
      "Protection from adverse action",
      "False reports prohibited",
    ],
    reportingChannel: "ethics@hizivo.com",
  },

  // Clause 117: Internal Misuse Disclaimer
  internalMisuse: {
    id: "internal_misuse",
    title: "Internal Misuse Disclaimer",
    version: "1.0",
    content: `ZIVO is not liable for unauthorized internal access, misuse by employees, contractors, or bad actors when reasonable safeguards exist. ZIVO maintains security controls but cannot guarantee against all internal threats. Users accept this inherent risk.`,
  },

  // Clause 118: No Personal Liability
  noPersonalLiability: {
    id: "no_personal_liability",
    title: "No Personal Liability Clause",
    version: "1.0",
    content: `Founders, officers, directors, employees, and agents of ZIVO are not personally liable for company actions or decisions. All individuals act on behalf of ZIVO LLC and are protected to the maximum extent allowed by law. Users waive any claims against individuals personally.`,
    protectedParties: [
      "Founders and co-founders",
      "Officers and executives",
      "Board of directors",
      "Employees and staff",
      "Contractors and agents",
      "Advisors and consultants",
    ],
  },

  // Clause 119: Corporate Veil Preservation
  corporateVeil: {
    id: "corporate_veil",
    title: "Corporate Veil Preservation",
    version: "1.0",
    content: `All actions, decisions, and obligations are taken by ZIVO LLC as a corporate entity, not by individuals. The corporate form is maintained at all times. Users expressly waive any claims that would pierce the corporate veil or seek to hold individuals personally liable.`,
  },

  // Clause 120: Change of Control
  changeOfControl: {
    id: "change_of_control",
    title: "Change of Control Clause",
    version: "1.0",
    content: `In case of merger, acquisition, sale, investment, or other change of control, all user agreements, policies, and protections remain fully enforceable. Terms transfer to successors and assigns. Users consent to assignment of agreements in such events.`,
    survivingEvents: [
      "Merger or consolidation",
      "Acquisition by third party",
      "Sale of assets or equity",
      "Investment or financing",
      "Management buyout",
      "Corporate restructuring",
    ],
  },

  // Clause 121: Platform Data Ownership
  platformDataOwnership: {
    id: "platform_data",
    title: "Platform Data Ownership",
    version: "1.0",
    content: `ZIVO owns all rights to aggregated data, analytics, performance metrics, platform insights, and derived data. Users waive any claims to platform-level data or aggregate statistics. Individual user data rights are governed by the Privacy Policy.`,
    zivoOwns: [
      "Aggregated usage data",
      "Platform analytics and metrics",
      "Performance statistics",
      "Market insights and trends",
      "Derived and computed data",
      "Machine learning models",
    ],
  },

  // Clause 122: Survival of Corporate Protections
  corporateSurvival: {
    id: "corporate_survival",
    title: "Survival of Corporate Protections",
    version: "1.0",
    content: `All intellectual property protections, liability limitations, arbitration agreements, and corporate protections survive termination, litigation, company restructuring, and ownership changes. These protections are perpetual and binding on all successors.`,
    survivingProtections: [
      "Intellectual property rights",
      "Liability limitations",
      "Arbitration agreements",
      "Indemnification obligations",
      "Corporate veil protections",
      "Confidentiality provisions",
    ],
  },
};

// Corporate FAQ
export const CORPORATE_LEGAL_FAQ = [
  {
    question: "Can I sue ZIVO founders personally?",
    answer: "No. All actions are taken by ZIVO LLC as a corporate entity. Founders, officers, and directors are protected from personal liability.",
  },
  {
    question: "Does ZIVO protect its brand and platform?",
    answer: "Yes. Unauthorized use of ZIVO trademarks, impersonation, and infringement are prohibited and may result in legal action.",
  },
  {
    question: "Will ZIVO share my data without a subpoena?",
    answer: "No. ZIVO does not voluntarily provide data without valid legal process such as subpoenas or court orders.",
  },
  {
    question: "Can ZIVO delete my records?",
    answer: "Yes. ZIVO may delete or anonymize records according to its retention policy after legal and business requirements are satisfied.",
  },
  {
    question: "Does a merger change my agreement?",
    answer: "No. All terms, protections, and user agreements remain in full force after any change of control.",
  },
  {
    question: "Who handles DMCA takedown requests?",
    answer: "DMCA notices should be sent to ZIVO's designated agent at legal@hizivo.com with required information.",
  },
  {
    question: "Can I report ethical concerns confidentially?",
    answer: "Yes. ZIVO's whistleblower policy protects good-faith reporters from retaliation.",
  },
];

// Helper arrays
export const CORPORATE_POLICIES_LIST = Object.values(CORPORATE_IP_POLICIES);

// ============================================
// FINAL LEGAL PROTECTIONS (Clauses 123-135)
// Payments, Travel, Rental, Platform Neutrality
// ============================================

export const FINAL_LEGAL_POLICIES = {
  // Clause 123: Payment Finality
  paymentFinality: {
    id: "payment_finality",
    title: "Payment Finality Policy",
    version: "1.0",
    content: `Payments are final once confirmed by the payment processor. Refunds are exceptions governed by posted policies and are not guaranteed. ZIVO is not liable for bank processing delays, currency conversion issues, or payment network failures. Users agree that payment processor rules and terms apply to all transactions.`,
    keyPoints: [
      "Payments final upon confirmation",
      "Refunds subject to posted policies",
      "Not liable for bank delays",
      "Processor rules apply",
    ],
  },

  // Clause 124: Chargeback Abuse
  chargebackPolicy: {
    id: "chargeback_abuse",
    title: "Chargeback Abuse Policy",
    version: "1.0",
    content: `Abusive, fraudulent, or excessive chargebacks are prohibited. Accounts associated with chargeback abuse may be suspended, terminated, or subject to collections. ZIVO reserves the right to dispute chargebacks using platform records, transaction data, and service evidence.`,
    consequences: [
      "Account suspension or termination",
      "Collections referral",
      "Dispute with evidence",
      "Platform access revocation",
    ],
  },

  // Clause 125: Escrow & Hold Disclosure
  escrowDisclosure: {
    id: "escrow_disclosure",
    title: "Escrow & Hold Disclosure",
    version: "1.0",
    content: `ZIVO is not a bank, money transmitter, or escrow agent. Funds may be held temporarily for risk management, fraud prevention, or dispute resolution. ZIVO does not guarantee fund availability and is not liable for delays in fund release.`,
  },

  // Clause 126: Airline Rules Precedence
  airlineRules: {
    id: "airline_rules",
    title: "Airline Rules Precedence",
    version: "1.0",
    content: `Airline rules, policies, and contracts of carriage always take precedence over any ZIVO policies or representations. This includes baggage, seating, check-in, refund eligibility, and all operational matters. ZIVO is not responsible for airline enforcement of their rules.`,
    airlineControlled: [
      "Baggage allowances and fees",
      "Seating assignments",
      "Check-in procedures",
      "Refund and change policies",
      "Boarding requirements",
      "In-flight services",
    ],
  },

  // Clause 127: IRROPS & Force Events
  irropsPolicy: {
    id: "irrops_force",
    title: "IRROPS & Force Events",
    version: "1.0",
    content: `ZIVO is not liable for irregular operations (IRROPS), weather disruptions, air traffic control actions, airline labor actions, mechanical failures, security incidents, or any other force majeure events affecting travel. Airlines control all rebooking and compensation decisions.`,
    notLiableFor: [
      "Weather delays and cancellations",
      "Air traffic control delays",
      "Airline labor disputes",
      "Mechanical or safety delays",
      "Security incidents",
      "Airport closures",
    ],
  },

  // Clause 128: Mechanical Failure Disclaimer
  mechanicalDisclaimer: {
    id: "mechanical_failure",
    title: "Mechanical Failure Disclaimer",
    version: "1.0",
    content: `ZIVO is not responsible for vehicle breakdowns, wear and tear, mechanical defects, or equipment failures. All vehicle-related issues are the responsibility of the vehicle owner. Renters should inspect vehicles before use and report issues immediately.`,
    ownerResponsible: [
      "Mechanical breakdowns",
      "Tire issues and flats",
      "Battery and electrical problems",
      "Engine and transmission issues",
      "Wear and tear items",
    ],
  },

  // Clause 129: Traffic Law Compliance
  trafficCompliance: {
    id: "traffic_compliance",
    title: "Traffic Law Compliance",
    version: "1.0",
    content: `Renters are fully responsible for all traffic tickets, toll charges, parking fines, moving violations, and legal infractions incurred during the rental period. ZIVO and vehicle owners may pass through penalties, administrative fees, and processing costs to the renter.`,
    renterResponsible: [
      "Traffic tickets and violations",
      "Toll charges and fees",
      "Parking citations",
      "Camera-enforced violations",
      "Administrative processing fees",
    ],
  },

  // Clause 130: Visibility & Demand Disclaimer
  visibilityDisclaimer: {
    id: "visibility_demand",
    title: "Visibility & Demand Disclaimer",
    version: "1.0",
    content: `ZIVO does not guarantee listing visibility, search placement, booking volume, customer traffic, or income of any amount. Algorithms and ranking factors may change at any time without notice. Platform performance depends on market conditions beyond ZIVO's control.`,
  },

  // Clause 131: No Reliance Clause
  noReliance: {
    id: "no_reliance",
    title: "No Reliance Clause",
    version: "1.0",
    content: `Users agree they do not rely on future earnings, continued platform access, specific platform behavior, or any representations about business performance. ZIVO makes no promises about income, demand, or platform continuity. Users assume all business risk.`,
    noRelianceOn: [
      "Future earnings or income",
      "Continued platform access",
      "Specific algorithm behavior",
      "Booking or demand levels",
      "Platform feature availability",
    ],
  },

  // Clause 132: Education Before Checkout
  checkoutEducation: {
    id: "checkout_education",
    title: "Education Before Checkout",
    version: "1.0",
    content: `ZIVO displays key disclosures before checkout completion. By proceeding, users confirm they have reviewed and understood prices, rules, refund terms, and all applicable disclaimers. Users are responsible for reading all information presented.`,
    userConfirms: [
      "Final price and fees",
      "Cancellation and refund terms",
      "Service-specific rules",
      "Legal disclaimers",
      "Partner terms and conditions",
    ],
  },

  // Clause 133: Acknowledgment of Understanding
  acknowledgment: {
    id: "acknowledgment",
    title: "Acknowledgment of Understanding",
    version: "1.0",
    content: `Users acknowledge and understand: the platform nature of ZIVO as a technology provider; that services are provided by independent third parties; and that users assume all risks associated with transactions. This acknowledgment is binding.`,
    userAcknowledges: [
      "ZIVO is a technology platform",
      "Services by independent providers",
      "Assumption of transaction risk",
      "Platform liability limitations",
      "Terms binding upon use",
    ],
  },

  // Clause 134: Order of Precedence
  orderPrecedence: {
    id: "order_precedence",
    title: "Order of Precedence",
    version: "1.0",
    content: `If conflicts arise between documents: (1) Terms of Service control over all other documents; (2) Service-specific policies apply next; (3) Marketing content, FAQs, and informal communications never control legal terms. In case of ambiguity, terms are interpreted in ZIVO's favor.`,
    precedenceOrder: [
      "Terms of Service (highest)",
      "Privacy Policy",
      "Service-specific policies",
      "Partner agreements",
      "Marketing content (never controls)",
    ],
  },

  // Clause 135: Maximum Enforceability
  maxEnforceability: {
    id: "max_enforceability",
    title: "Maximum Enforceability",
    version: "1.0",
    content: `All clauses, terms, and protections are enforced to the maximum extent permitted by applicable law. If any provision is found unenforceable, it shall be modified to the minimum extent necessary to become enforceable while preserving ZIVO's protections.`,
  },
};

// Final Legal FAQ
export const FINAL_LEGAL_FAQ = [
  {
    question: "Are payments final?",
    answer: "Yes. Payments are final upon confirmation. Refunds are exceptions governed by posted policies.",
  },
  {
    question: "What happens if I dispute a charge?",
    answer: "Abusive chargebacks may result in account suspension. ZIVO may dispute using platform records.",
  },
  {
    question: "Does ZIVO guarantee bookings or income?",
    answer: "No. ZIVO makes no guarantees about visibility, demand, bookings, or income.",
  },
  {
    question: "Who is responsible for traffic tickets?",
    answer: "Renters are fully responsible for all traffic violations, tolls, and fines during rentals.",
  },
  {
    question: "What if my flight is canceled?",
    answer: "Airline rules control. ZIVO is not liable for IRROPS, weather, or force majeure events.",
  },
  {
    question: "Which terms control if there's a conflict?",
    answer: "Terms of Service control, then service-specific policies. Marketing content never controls.",
  },
];

// Helper arrays
export const FINAL_POLICIES_LIST = Object.values(FINAL_LEGAL_POLICIES);

// ============================================
// COMMUNICATIONS & COMPLIANCE POLICIES (Clauses 136-146)
// Messaging, Data Breach, Children's Privacy, Insurance
// ============================================

export const COMMUNICATIONS_COMPLIANCE_POLICIES = {
  // Clause 136: Electronic Communication Consent
  electronicConsent: {
    id: "electronic_consent",
    title: "Electronic Communication Consent",
    version: "1.0",
    content: `By using ZIVO, users consent to receive electronic communications including emails, SMS, push notifications, and in-app messages for transactional purposes, account notices, legal notices, and marketing (where permitted by law). Users may opt out of marketing communications but not transactional or legal notices required for service delivery.`,
    communicationTypes: [
      "Emails (transactional, account, marketing)",
      "SMS/Text messages",
      "Push notifications",
      "In-app messages and alerts",
    ],
    purposes: [
      "Transaction confirmations and receipts",
      "Account security alerts",
      "Service updates and changes",
      "Legal notices and policy updates",
      "Marketing offers (opt-out available)",
    ],
  },

  // Clause 137: TCPA & SMS Disclaimer
  tcpaDisclaimer: {
    id: "tcpa_disclaimer",
    title: "TCPA & SMS Disclaimer",
    version: "1.0",
    content: `ZIVO is not liable for carrier delays, message delivery failures, phone number reuse, or any issues outside ZIVO's control. Message frequency varies based on account activity and is not guaranteed. Standard message and data rates may apply. ZIVO uses automated systems to send messages and notifications.`,
    notLiableFor: [
      "Carrier network delays or outages",
      "Message delivery failures",
      "Phone number reuse or porting issues",
      "Third-party SMS gateway failures",
      "International message routing issues",
    ],
  },

  // Clause 138: CAN-SPAM Compliance
  canSpamCompliance: {
    id: "canspam_compliance",
    title: "CAN-SPAM Compliance",
    version: "1.0",
    content: `All marketing emails from ZIVO include: clear business identification, a functional unsubscribe mechanism, and a valid physical business address. Unsubscribe requests are processed within 10 business days. ZIVO does not use deceptive subject lines or misleading header information.`,
    includes: [
      "Clear business identity and sender information",
      "Functional one-click unsubscribe option",
      "Valid physical business address",
      "Accurate subject lines and headers",
      "Processing within 10 business days",
    ],
  },

  // Clause 139: Data Breach Response Policy
  dataBreachResponse: {
    id: "data_breach_response",
    title: "Data Breach Response Policy",
    version: "1.0",
    content: `ZIVO maintains incident response procedures and will notify affected users of data breaches as required by applicable law. Notification timing is governed by legal requirements and investigation needs. ZIVO is not liable for breaches caused by third-party systems, user negligence, or unauthorized access outside ZIVO's control.`,
    responseSteps: [
      "Incident detection and containment",
      "Investigation and impact assessment",
      "Notification to affected users as required by law",
      "Regulatory reporting where required",
      "Remediation and prevention measures",
    ],
  },

  // Clause 140: Security Limitation Disclaimer
  securityLimitation: {
    id: "security_limitation",
    title: "Security Limitation Disclaimer",
    version: "1.0",
    content: `No system is 100% secure. Despite reasonable security measures, ZIVO cannot guarantee absolute protection against all threats. Users acknowledge the residual risk of data exposure inherent in any online service and agree to use strong passwords and protect their credentials.`,
  },

  // Clause 141: Children's Privacy (COPPA)
  childrenPrivacy: {
    id: "children_privacy",
    title: "Children's Privacy Policy (COPPA)",
    version: "1.0",
    content: `ZIVO services are not intended for users under 18 years of age. ZIVO does not knowingly collect personal information from children under 13 (or applicable age in other jurisdictions). If underage use is discovered, accounts will be terminated and associated data deleted. Parents or guardians may contact ZIVO to request deletion of any inadvertently collected child data.`,
    ageRequirements: [
      "Minimum age: 18 years old",
      "No knowing collection of data from users under 13",
      "Immediate termination if underage use discovered",
      "Parental/guardian contact for data deletion requests",
    ],
  },

  // Clause 142: No Insurance Certificate Guarantee
  insuranceDisclaimer: {
    id: "insurance_disclaimer",
    title: "No Insurance Certificate Guarantee",
    version: "1.0",
    content: `ZIVO does not guarantee the validity, accuracy, or scope of any partner or third-party insurance. Insurance verification displayed on the platform is informational only and does not constitute a guarantee of coverage or claims approval. Users should independently verify insurance coverage.`,
    noGuaranteeFor: [
      "Validity of partner insurance certificates",
      "Accuracy of coverage information",
      "Claims approval or payment",
      "Coverage scope or limits",
      "Policy renewals or continuity",
    ],
  },

  // Clause 143: No Claims Handling Obligation
  noClaimsHandling: {
    id: "no_claims_handling",
    title: "No Claims Handling Obligation",
    version: "1.0",
    content: `ZIVO is not obligated to process, manage, or guarantee outcomes of any insurance claims. Insurance claims must be submitted directly to the relevant insurance provider. ZIVO may provide documentation to support claims but makes no representations about claim outcomes.`,
  },

  // Clause 144: Electronic Legal Notice Delivery
  electronicNotices: {
    id: "electronic_notices",
    title: "Electronic Legal Notice Delivery",
    version: "1.0",
    content: `Users agree that legal notices, including notices of changes to terms, privacy policy updates, and other legal communications, may be delivered electronically via email, in-app notification, or posting on the platform. Physical mail is not required unless mandated by applicable law.`,
  },

  // Clause 145: Language & Translation Precedence
  languagePrecedence: {
    id: "language_precedence",
    title: "Language & Translation Precedence",
    version: "1.0",
    content: `All ZIVO terms, policies, and legal documents are provided in English as the controlling language. In case of any conflict or discrepancy between the English version and any translation, the English version shall prevail and control.`,
  },

  // Clause 146: Survival of Communication & Privacy Policies
  communicationSurvival: {
    id: "communication_survival",
    title: "Survival of Communication & Privacy Policies",
    version: "1.0",
    content: `All communication preferences, privacy settings, data protection obligations, and related policies survive account termination, service shutdown, and legal disputes. ZIVO retains the right to contact former users regarding legal matters or outstanding obligations.`,
  },
};

// Communications Compliance FAQ
export const COMMUNICATIONS_COMPLIANCE_FAQ = [
  {
    question: "Can ZIVO send me messages?",
    answer: "Yes. Transactional and legal messages are required for service use. You may opt out of marketing only.",
  },
  {
    question: "What if there is a data breach?",
    answer: "ZIVO will respond according to applicable law and notify affected users as required.",
  },
  {
    question: "Can minors use ZIVO?",
    answer: "No. Users must be 18 or older. Accounts of underage users will be terminated.",
  },
  {
    question: "Does ZIVO guarantee insurance coverage?",
    answer: "No. Insurance verification is informational only. Coverage is provided by third parties.",
  },
  {
    question: "Will ZIVO process my insurance claim?",
    answer: "No. Claims must be submitted directly to the insurance provider. ZIVO may provide supporting documentation.",
  },
  {
    question: "How will I receive legal notices?",
    answer: "Legal notices are delivered electronically via email or in-app notification.",
  },
];

// Helper arrays
export const COMMUNICATIONS_POLICIES_LIST = Object.values(COMMUNICATIONS_COMPLIANCE_POLICIES);

// ============================================
// ONGOING COMPLIANCE & OPERATIONS POLICIES (Clauses 147-157)
// Monitoring, Enforcement, Documentation
// ============================================

export const ONGOING_COMPLIANCE_POLICIES = {
  // Clause 147: Compliance Calendar
  complianceCalendar: {
    id: "compliance_calendar",
    title: "Compliance Calendar & Review Schedule",
    version: "1.0",
    content: `ZIVO maintains an internal compliance schedule including annual Terms & Policy review, Privacy Policy review, Seller of Travel renewals (where applicable), payment processor review, and insurance partner review. Failure to update policies on schedule does not waive any protections or create liability.`,
    reviewItems: [
      "Annual Terms of Service review",
      "Annual Privacy Policy review",
      "Seller of Travel renewal (if applicable)",
      "Payment processor compliance review",
      "Insurance partner coverage review",
      "Security and data protection audit",
    ],
  },

  // Clause 148: Law Change Disclaimer
  lawChangeDisclaimer: {
    id: "law_change_disclaimer",
    title: "Law Change Disclaimer",
    version: "1.0",
    content: `ZIVO may update services, policies, and procedures to comply with new or changing laws, regulations, or industry standards without user consent beyond providing notice as required by law. Continued use of services after such changes constitutes acceptance.`,
  },

  // Clause 149: Continuous Risk Monitoring
  riskMonitoring: {
    id: "risk_monitoring",
    title: "Continuous Risk Monitoring",
    version: "1.0",
    content: `ZIVO may continuously monitor platform activity for fraud, abuse, regulatory risk, and safety incidents. This monitoring is conducted to protect the platform and users, but does not create any duty of care, fiduciary relationship, or additional liability beyond platform obligations.`,
    monitoringAreas: [
      "Fraud detection and prevention",
      "Platform abuse and Terms violations",
      "Regulatory compliance risk",
      "Safety incidents and threats",
      "Financial irregularities",
      "Identity verification compliance",
    ],
  },

  // Clause 150: Partner Compliance Attestation
  partnerAttestation: {
    id: "partner_attestation",
    title: "Partner Compliance Attestation",
    version: "1.0",
    content: `ZIVO may require periodic partner confirmation of valid insurance, legal eligibility to provide services, and tax responsibility compliance. ZIVO is not liable for false attestations made by partners. Partners bear sole responsibility for maintaining their legal compliance.`,
    attestationRequirements: [
      "Valid and current insurance coverage",
      "Legal eligibility to provide services",
      "Tax registration and compliance",
      "Background check currency (where applicable)",
      "License and permit validity",
    ],
  },

  // Clause 151: Regulatory Complaint Process
  regulatoryProcess: {
    id: "regulatory_process",
    title: "Regulatory Complaint Process",
    version: "1.0",
    content: `ZIVO may respond directly to regulators, suspend services during investigations, and restrict accounts during compliance review. Users waive claims related to good-faith compliance actions taken by ZIVO in response to regulatory inquiries or investigations.`,
    mayTakeActions: [
      "Respond directly to regulatory inquiries",
      "Suspend services during active investigations",
      "Restrict account access during compliance review",
      "Provide data to regulators as legally required",
      "Implement immediate safety measures",
    ],
  },

  // Clause 152: No Private Right of Action
  noPrivateAction: {
    id: "no_private_action",
    title: "No Private Right of Action",
    version: "1.0",
    content: `Policies, compliance measures, internal guidelines, and operational procedures do not create any rights enforceable by users or third parties. Only the Terms of Service and applicable law govern the legal relationship between ZIVO and users.`,
  },

  // Clause 153: Compliance Record Keeping
  recordKeeping: {
    id: "record_keeping",
    title: "Compliance Record Keeping",
    version: "1.0",
    content: `ZIVO maintains records of policy acceptance, disclosures shown, user acknowledgments, and compliance activities. These records may be used for legal defense, regulatory response, arbitration evidence, and platform protection purposes.`,
    recordTypes: [
      "Policy acceptance timestamps and versions",
      "Disclosure presentation logs",
      "User acknowledgment records",
      "Transaction and audit trails",
      "Communication logs",
      "Compliance verification records",
    ],
  },

  // Clause 154: Screenshot & Log Evidence
  logEvidence: {
    id: "log_evidence",
    title: "Screenshot & Log Evidence",
    version: "1.0",
    content: `ZIVO may rely on system logs, screenshots, automated records, database entries, and timestamped data as conclusive evidence in disputes, legal proceedings, and regulatory matters. Users agree that such records are admissible and authoritative.`,
  },

  // Clause 155: Internal Legal Escalation
  legalEscalation: {
    id: "legal_escalation",
    title: "Internal Legal Escalation",
    version: "1.0",
    content: `Only authorized officers and designated legal representatives may respond to lawsuits, regulatory inquiries, or issue official legal statements on behalf of ZIVO. No user communication with support staff or other employees creates any legal obligation or admission.`,
  },

  // Clause 156: No Waiver by Silence
  noWaiverSilence: {
    id: "no_waiver_silence",
    title: "No Waiver by Silence",
    version: "1.0",
    content: `Failure to enforce any provision, policy, or right does not waive ZIVO's right to enforce it later. Delayed enforcement does not constitute acceptance of violations. ZIVO reserves all rights to enforce all terms at any time.`,
  },

  // Clause 157: Survival of Operational Protections
  operationalSurvival: {
    id: "operational_survival",
    title: "Survival of Operational Protections",
    version: "1.0",
    content: `All compliance, monitoring, enforcement, and operational protections survive platform launch, business growth, litigation, regulatory review, corporate changes, and any termination of services. These protections are perpetual and irrevocable.`,
  },
};

// Ongoing Compliance FAQ
export const ONGOING_COMPLIANCE_FAQ = [
  {
    question: "Does ZIVO continuously monitor compliance?",
    answer: "Yes, to protect the platform and comply with applicable law. Monitoring does not create additional liability.",
  },
  {
    question: "Can ZIVO change rules after launch?",
    answer: "Yes, to comply with legal and business requirements. Users will be notified of material changes.",
  },
  {
    question: "Does compliance monitoring create liability?",
    answer: "No. Monitoring is a protective measure and does not create a duty of care or fiduciary relationship.",
  },
  {
    question: "Can ZIVO suspend services during investigations?",
    answer: "Yes, without liability. ZIVO may suspend services during regulatory or internal investigations.",
  },
  {
    question: "What records does ZIVO keep for compliance?",
    answer: "Policy acceptance, disclosures shown, acknowledgments, transaction logs, and compliance verification records.",
  },
  {
    question: "Can ZIVO enforce rules it didn't enforce before?",
    answer: "Yes. Failure to enforce any provision does not waive the right to enforce it later.",
  },
];

// Helper arrays
export const ONGOING_COMPLIANCE_POLICIES_LIST = Object.values(ONGOING_COMPLIANCE_POLICIES);

// ============================================
// FINANCIAL CRIME & KYC/AML POLICIES (Clauses 158-169)
// KYC, AML, Sanctions, Complaints, Recordkeeping
// ============================================

export const FINANCIAL_COMPLIANCE_POLICIES = {
  // Clause 158: Know Your Customer (KYC) Policy
  kycPolicy: {
    id: "kyc_policy",
    title: "Know Your Customer (KYC) Policy",
    version: "1.0",
    content: `ZIVO may require identity verification at any time to comply with financial regulations and prevent fraud. Verification may include government-issued ID, proof of address, selfie verification, or business documents. Failure to complete verification may result in account suspension or termination. ZIVO is not liable for delays or service limitations caused by KYC checks.`,
    verificationTypes: [
      "Government-issued photo ID (passport, driver's license)",
      "Proof of address (utility bill, bank statement)",
      "Selfie verification with liveness detection",
      "Business registration documents",
      "Tax identification documents",
      "Beneficial ownership declarations",
    ],
  },

  // Clause 159: Enhanced Due Diligence (EDD)
  enhancedDueDiligence: {
    id: "enhanced_due_diligence",
    title: "Enhanced Due Diligence (EDD)",
    version: "1.0",
    content: `ZIVO may apply enhanced verification and monitoring for high-risk users or transactions. Enhanced due diligence does not create additional rights or guarantees for users.`,
    eddTriggers: [
      "High-value transactions exceeding thresholds",
      "Fleet owners and business accounts",
      "International users from high-risk jurisdictions",
      "Unusual transaction patterns",
      "Politically exposed persons (PEPs)",
      "Cash-intensive businesses",
    ],
  },

  // Clause 160: Anti-Money Laundering (AML) Policy
  amlPolicy: {
    id: "aml_policy",
    title: "Anti-Money Laundering (AML) Policy",
    version: "1.0",
    content: `ZIVO prohibits use of the platform for money laundering, terrorist financing, fraud, or other financial crimes. Transactions may be monitored and flagged for suspicious activity. Suspicious activity may be reported to law enforcement and financial intelligence units (FinCEN) without user notice. Funds may be frozen pending review or investigation.`,
    prohibitedActivities: [
      "Money laundering or structuring transactions",
      "Terrorist financing or sanctions evasion",
      "Fraud, identity theft, or account takeover",
      "Using stolen or unauthorized payment methods",
      "Facilitating payments for illegal activities",
      "Creating multiple accounts to circumvent limits",
    ],
  },

  // Clause 161: No Duty to Complete Transactions
  noTransactionDuty: {
    id: "no_transaction_duty",
    title: "No Duty to Complete Transactions",
    version: "1.0",
    content: `ZIVO may refuse, delay, or cancel any transaction if financial crime risk is suspected or for any other compliance reason. ZIVO has no duty to complete any transaction and is not liable for losses resulting from transaction refusal or cancellation for risk management purposes.`,
  },

  // Clause 162: Sanctions Compliance Policy
  sanctionsCompliance: {
    id: "sanctions_compliance",
    title: "Sanctions Compliance Policy",
    version: "1.0",
    content: `Users must comply with all applicable U.S. sanctions laws administered by OFAC, export controls, and trade restrictions. ZIVO may block countries, users, or entities subject to sanctions without prior notice. ZIVO may terminate access immediately upon detection of sanctions violations. ZIVO bears no liability for sanctions enforcement actions.`,
    sanctionsPrograms: [
      "OFAC Specially Designated Nationals (SDN) List",
      "Consolidated Sanctions List",
      "Sectoral Sanctions Identifications (SSI) List",
      "Foreign Sanctions Evaders (FSE) List",
      "Country-based embargoes (Cuba, Iran, North Korea, etc.)",
      "Russian Harmful Foreign Activities Sanctions",
    ],
  },

  // Clause 163: Customer Complaint Handling
  complaintHandling: {
    id: "complaint_handling",
    title: "Customer Complaint Handling Policy",
    version: "1.0",
    content: `ZIVO provides a complaints process for users to raise concerns about services. Resolution timelines depend on complaint complexity and are not guaranteed. Complaints do not create legal obligations beyond good-faith review. Regulatory complaints may override platform decisions when required by law.`,
    complaintProcess: [
      "Submit complaint via support@hizivo.com or in-app support",
      "Receive acknowledgment within 48 hours",
      "Investigation and review of relevant records",
      "Response with findings and resolution (if applicable)",
      "Escalation path for unresolved complaints",
      "Regulatory referral information if needed",
    ],
  },

  // Clause 164: No Admission of Liability
  noAdmission: {
    id: "no_admission",
    title: "No Admission of Liability",
    version: "1.0",
    content: `Responses to complaints, customer service communications, and resolution offers are provided in good faith and do not constitute admissions of fault, liability, or wrongdoing. Acceptance of refunds, credits, or other resolutions does not establish precedent or liability.`,
  },

  // Clause 165: Insurance Verification Disclaimer
  insuranceVerification: {
    id: "insurance_verification",
    title: "Insurance Verification Disclaimer",
    version: "1.0",
    content: `ZIVO may request proof of insurance from partners and service providers. Verification is informational only and does not guarantee coverage validity, coverage scope, claim approval, or continuous coverage. Users must independently verify insurance adequacy for their needs.`,
  },

  // Clause 166: No Insurer Relationship
  noInsurerRelationship: {
    id: "no_insurer_relationship",
    title: "No Insurer Relationship",
    version: "1.0",
    content: `ZIVO is not an insurance agent, broker, underwriter, or insurer. ZIVO does not provide insurance advice or recommendations. Any insurance products or coverage are provided by third-party insurers with their own terms and conditions.`,
  },

  // Clause 167: Financial Record Retention
  recordRetention: {
    id: "record_retention",
    title: "Financial Record Retention Policy",
    version: "1.0",
    content: `ZIVO retains financial records as required by law and for legitimate business purposes. Records include payments, refunds, payouts, disputes, chargebacks, and related communications. Retention periods comply with applicable financial regulations and may extend beyond account termination.`,
    recordsRetained: [
      "Payment transactions and receipts",
      "Refund requests and processing records",
      "Payout records to partners and providers",
      "Dispute and chargeback documentation",
      "KYC/AML verification records",
      "Suspicious activity reports (SARs)",
    ],
  },

  // Clause 168: Audit Cooperation Clause
  auditCooperation: {
    id: "audit_cooperation",
    title: "Audit Cooperation Clause",
    version: "1.0",
    content: `ZIVO may cooperate with and provide records to auditors, banks, payment processors, and regulators as required by law or contractual obligations. Such cooperation does not create user notification rights except where required by law.`,
    mayCooperateWith: [
      "Independent auditors and accountants",
      "Banking partners and acquiring banks",
      "Payment processors (Stripe, etc.)",
      "Financial regulators (FinCEN, state regulators)",
      "Law enforcement agencies",
      "Tax authorities (IRS, state tax agencies)",
    ],
  },

  // Clause 169: Survival of Financial Protections
  financialSurvival: {
    id: "financial_survival",
    title: "Survival of Financial & AML Protections",
    version: "1.0",
    content: `All KYC, AML, sanctions, financial crime, and recordkeeping protections survive account termination, service shutdown, legal disputes, and corporate changes. These protections are perpetual and irrevocable to ensure ongoing compliance with financial regulations.`,
  },
};

// Financial Compliance FAQ
export const FINANCIAL_COMPLIANCE_FAQ = [
  {
    question: "Can ZIVO freeze or block payments?",
    answer: "Yes, to comply with financial crime prevention, sanctions laws, or risk management requirements.",
  },
  {
    question: "Does ZIVO guarantee transaction completion?",
    answer: "No. Transactions may be reviewed, delayed, or refused for compliance or risk reasons.",
  },
  {
    question: "Does a complaint mean ZIVO is liable?",
    answer: "No. Complaints are handled in good faith without admission of liability.",
  },
  {
    question: "Why might ZIVO require identity verification?",
    answer: "To comply with KYC/AML regulations, prevent fraud, and maintain payment processor relationships.",
  },
  {
    question: "How long does ZIVO keep financial records?",
    answer: "Records are retained as required by law, which may extend beyond account termination.",
  },
  {
    question: "Can ZIVO share my information with regulators?",
    answer: "Yes, when required by law or for compliance with financial regulations.",
  },
];

// Helper arrays
export const FINANCIAL_COMPLIANCE_POLICIES_LIST = Object.values(FINANCIAL_COMPLIANCE_POLICIES);

// ============================================
// CORPORATE GOVERNANCE & ETHICS POLICIES (Clauses 170-179)
// Governance, Ethics, Regulator Communications
// ============================================

export const GOVERNANCE_POLICIES = {
  // Clause 170: Corporate Governance Statement
  governanceStatement: {
    id: "governance_statement",
    title: "Corporate Governance Statement",
    version: "1.0",
    content: `ZIVO operates with good-faith compliance efforts and maintains internal controls appropriate for its operations. ZIVO documents decisions impacting users and partners and reviews policies regularly to ensure continued compliance with applicable laws and industry standards.`,
    governancePrinciples: [
      "Good-faith compliance efforts in all operations",
      "Internal controls appropriate for platform scale",
      "Documentation of decisions impacting users and partners",
      "Regular policy review and updates",
      "Transparent communication of material changes",
      "Accountability for compliance outcomes",
    ],
  },

  // Clause 171: No Fiduciary Duty Disclaimer
  noFiduciaryDuty: {
    id: "no_fiduciary_duty",
    title: "No Fiduciary Duty Disclaimer",
    version: "1.0",
    content: `ZIVO does not owe fiduciary duties to users, partners, drivers, owners, restaurants, or any other parties using the platform. ZIVO operates as a neutral platform provider and does not act as an agent, trustee, or fiduciary for any party. Platform participants are independent parties responsible for their own decisions and outcomes.`,
    partiesExcluded: [
      "Individual users and customers",
      "Partner businesses and merchants",
      "Drivers and delivery providers",
      "Vehicle owners and hosts",
      "Restaurant partners",
      "Third-party service providers",
    ],
  },

  // Clause 172: Ethics & Responsible Use Policy
  ethicsPolicy: {
    id: "ethics_policy",
    title: "Ethics & Responsible Use Policy",
    version: "1.0",
    content: `ZIVO promotes lawful, ethical use of the platform and discourages misuse, fraud, or conduct that may cause harm to others. ZIVO may intervene to prevent or remediate harmful activity. This ethics policy reflects ZIVO's values but does not create a duty of care or legal obligation to users or third parties.`,
    ethicsPrinciples: [
      "Promote lawful use of platform services",
      "Discourage fraud, deception, and misrepresentation",
      "Prevent harm to users, partners, and third parties",
      "Respect user privacy within legal requirements",
      "Maintain fair and consistent enforcement",
      "Support accessibility and inclusion",
    ],
  },

  // Clause 173: Good-Faith Operation Clause
  goodFaithOperation: {
    id: "good_faith_operation",
    title: "Good-Faith Operation Clause",
    version: "1.0",
    content: `ZIVO operates in good faith and strives for reliable platform performance. However, ZIVO does not guarantee error-free operation, continuous availability, or freedom from bugs, outages, or service interruptions. Users acknowledge that technology platforms inherently involve operational risks.`,
  },

  // Clause 174: Regulator Communication Policy
  regulatorCommunication: {
    id: "regulator_communication",
    title: "Regulator Communication Policy",
    version: "1.0",
    content: `Only authorized officers and designated representatives may communicate with regulators, government agencies, or law enforcement on behalf of ZIVO. ZIVO may cooperate with regulatory inquiries without admitting liability. Cooperation does not waive legal defenses or create user notification rights. ZIVO may suspend services during regulatory reviews.`,
    communicationProtocols: [
      "Authorized officers handle all regulatory communications",
      "Legal counsel reviews significant communications",
      "Cooperation does not admit liability or wrongdoing",
      "Defenses and privileges are preserved",
      "User notification as required by law only",
      "Services may be suspended pending review",
    ],
  },

  // Clause 175: Safe-Harbor Cooperation Clause
  safeHarborCooperation: {
    id: "safe_harbor_cooperation",
    title: "Safe-Harbor Cooperation Clause",
    version: "1.0",
    content: `ZIVO's cooperation with government authorities, regulators, and law enforcement is either voluntary in good faith or legally compelled. Cooperation does not imply wrongdoing, fault, or liability. Cooperation does not create enforceable user rights or establish precedent for future matters.`,
  },

  // Clause 176: Public Safety Disclaimer
  publicSafetyDisclaimer: {
    id: "public_safety_disclaimer",
    title: "Public Safety Disclaimer",
    version: "1.0",
    content: `ZIVO balances user safety considerations with platform neutrality. Safety-related actions (such as account suspensions or service restrictions) do not imply responsibility for user outcomes. ZIVO is not responsible for the safety or conduct of users, partners, or third parties.`,
  },

  // Clause 177: No Duty to Monitor
  noDutyToMonitor: {
    id: "no_duty_to_monitor",
    title: "No Duty to Monitor",
    version: "1.0",
    content: `ZIVO has no general duty to monitor users, content, transactions, or activity beyond legal requirements. Voluntary monitoring for fraud prevention, safety, or compliance purposes does not create a duty to monitor all activity or prevent all harm.`,
  },

  // Clause 178: Good-Faith Record Creation
  goodFaithRecords: {
    id: "good_faith_records",
    title: "Good-Faith Record Creation",
    version: "1.0",
    content: `ZIVO maintains records to demonstrate compliance intent, policy enforcement, and risk mitigation efforts. Record creation is for ZIVO's benefit and legal defense purposes. Records do not create additional liability or user rights beyond applicable law.`,
    recordPurposes: [
      "Demonstrate compliance intent and good faith",
      "Document policy enforcement decisions",
      "Support risk mitigation efforts",
      "Provide evidence for legal defense",
      "Enable regulatory response",
      "Facilitate audit cooperation",
    ],
  },

  // Clause 179: Survival of Governance Protections
  governanceSurvival: {
    id: "governance_survival",
    title: "Survival of Governance Protections",
    version: "1.0",
    content: `All governance, ethics, and regulator-related protections survive investigations, litigation, platform changes, and ownership changes. These protections are perpetual and continue regardless of business structure modifications or corporate transactions.`,
  },
};

// Governance FAQ
export const GOVERNANCE_FAQ = [
  {
    question: "Does ZIVO cooperate with regulators?",
    answer: "Yes, in good faith and as required by law.",
  },
  {
    question: "Does cooperation mean ZIVO is at fault?",
    answer: "No. Cooperation is standard practice and does not imply wrongdoing.",
  },
  {
    question: "Does ZIVO owe duties to partners?",
    answer: "No. ZIVO is a neutral platform and does not owe fiduciary duties to any party.",
  },
  {
    question: "Does ZIVO guarantee safety or legality?",
    answer: "No. Users assume risk and are responsible for their own decisions.",
  },
  {
    question: "Does ZIVO monitor all platform activity?",
    answer: "No. ZIVO has no general duty to monitor beyond legal requirements.",
  },
  {
    question: "Can ZIVO suspend services during investigations?",
    answer: "Yes. ZIVO may suspend services during regulatory reviews without liability.",
  },
];

// Helper arrays
export const GOVERNANCE_POLICIES_LIST = Object.values(GOVERNANCE_POLICIES);

// ============================================
// LEGAL DOCUMENTATION & EVIDENCE SYSTEMS (Clauses 180-187)
// Evidence, Case Files, Response Protocols
// ============================================

export const LEGAL_EVIDENCE_POLICIES = {
  // Clause 180: Legal Document Center
  legalDocCenter: {
    id: "legal_doc_center",
    title: "Legal Document Center",
    version: "1.0",
    content: `ZIVO maintains a centralized legal document center storing all terms versions, policy versions, disclosure text, and historical changes. Administrators can view, export, timestamp, and lock versions to ensure document integrity and provide evidence of policy history.`,
    capabilities: [
      "Store and version all legal terms",
      "Archive policy versions with timestamps",
      "Export documents for legal proceedings",
      "Lock versions to prevent modification",
      "Track historical changes with audit trail",
      "Generate compliance reports",
    ],
  },

  // Clause 181: User Action Logging
  userActionLogging: {
    id: "user_action_logging",
    title: "User Action Logging",
    version: "1.0",
    content: `ZIVO logs user actions relevant to legal compliance, including pages viewed, disclosures shown, checkboxes accepted, and checkout confirmations. All logs are immutable, timestamped, and may be used as legal evidence in disputes or regulatory proceedings.`,
    loggedActions: [
      "Pages and disclosures viewed",
      "Legal checkboxes accepted",
      "Checkout confirmations",
      "Terms acceptance timestamps",
      "Consent acknowledgments",
      "Policy version at time of action",
    ],
  },

  // Clause 182: Partner Acknowledgment Logs
  partnerAcknowledgmentLogs: {
    id: "partner_acknowledgment_logs",
    title: "Partner Acknowledgment Logs",
    version: "1.0",
    content: `ZIVO maintains acknowledgment logs for all partner types including drivers, car owners, fleet owners, and restaurants. Logs include role type, policy accepted, date, and IP address for legal defense purposes.`,
    partnerTypes: [
      "Drivers and delivery providers",
      "Individual car owners",
      "Fleet owners and managers",
      "Restaurant partners",
      "Business account administrators",
      "Third-party service providers",
    ],
    loggedFields: [
      "Partner role and type",
      "Policy type and version accepted",
      "Acceptance timestamp",
      "IP address",
      "User agent / device info",
      "Geographic location (if available)",
    ],
  },

  // Clause 183: Case File System
  caseFileSystem: {
    id: "case_file_system",
    title: "Case File System",
    version: "1.0",
    content: `ZIVO maintains internal case files for complaints, refund disputes, chargebacks, damage claims, and legal threats. Each case file includes a timeline, evidence, screenshots, logs, and resolution notes for comprehensive legal defense.`,
    caseTypes: [
      "Customer complaints",
      "Refund disputes",
      "Payment chargebacks",
      "Damage claims (P2P rentals)",
      "Legal threats and notices",
      "Regulatory inquiries",
    ],
    caseFileContents: [
      "Chronological timeline",
      "User and partner evidence",
      "Screenshots and documentation",
      "System logs and audit trails",
      "Communications history",
      "Resolution notes and outcomes",
    ],
  },

  // Clause 184: Regulator Response Templates
  regulatorResponseTemplates: {
    id: "regulator_response_templates",
    title: "Regulator Response Templates",
    version: "1.0",
    content: `ZIVO maintains prepared response templates for regulatory and banking inquiries including consumer complaints, Attorney General inquiries, banking partner inquiries, and payment processor reviews. All templates use neutral tone without admission of liability.`,
    templateTypes: [
      "Consumer complaint response",
      "Attorney General inquiry",
      "Banking partner inquiry",
      "Payment processor review",
      "State regulatory inquiry",
      "Federal agency inquiry",
    ],
    templatePrinciples: [
      "Professional, neutral tone",
      "No admission of liability",
      "Reference to applicable policies",
      "Factual, documented responses",
      "Legal counsel review required",
      "Preservation of all defenses",
    ],
  },

  // Clause 185: Legal Threat Protocol
  legalThreatProtocol: {
    id: "legal_threat_protocol",
    title: "Legal Threat Protocol",
    version: "1.0",
    content: `When a legal threat is received, ZIVO immediately freezes relevant accounts, preserves all logs and evidence, stops direct user communication, and escalates to legal counsel only. No employee or administrator admits fault or liability.`,
    protocolSteps: [
      "Freeze relevant user/partner accounts",
      "Preserve all logs and evidence",
      "Stop direct user communication",
      "Document threat receipt and details",
      "Escalate to legal counsel immediately",
      "No admission of fault or liability",
    ],
  },

  // Clause 186: No Off-The-Record Statements
  noOffRecordStatements: {
    id: "no_off_record_statements",
    title: "No Off-The-Record Statements",
    version: "1.0",
    content: `All ZIVO administrators and staff are prohibited from making off-the-record statements about disputes, legal matters, or platform issues. Staff do not comment on disputes, speculate on outcomes, apologize legally, and use only approved responses.`,
    prohibitedActions: [
      "Commenting on active disputes",
      "Speculating on legal outcomes",
      "Making legal apologies or admissions",
      "Discussing pending investigations",
      "Providing unofficial legal advice",
      "Making statements without approval",
    ],
  },

  // Clause 187: Survival of Evidence & Documentation
  evidenceSurvival: {
    id: "evidence_survival",
    title: "Survival of Evidence & Documentation",
    version: "1.0",
    content: `All logs, records, and evidence survive account deletion, service shutdown, and legal disputes. ZIVO retains documentation as required by law and for legal defense purposes regardless of user or platform status.`,
  },
};

// Legal Evidence FAQ (Internal Playbook)
export const LEGAL_EVIDENCE_FAQ = [
  {
    question: "User threatens lawsuit — what do we do?",
    answer: "Acknowledge receipt, preserve all evidence, freeze relevant accounts, and escalate to legal counsel immediately. Do not admit fault.",
  },
  {
    question: "Regulator contacts us?",
    answer: "Respond via authorized officer only. Use approved templates. Do not admit liability.",
  },
  {
    question: "Media contacts us?",
    answer: "No comment. Refer to official statement or press contact only.",
  },
  {
    question: "How long do we retain evidence?",
    answer: "Evidence survives account deletion and is retained as required by law and for legal defense.",
  },
  {
    question: "Can staff discuss disputes with users?",
    answer: "No. Use approved responses only. Do not speculate or admit fault.",
  },
];

// Helper arrays
export const LEGAL_EVIDENCE_POLICIES_LIST = Object.values(LEGAL_EVIDENCE_POLICIES);
