/**
 * B2B Travel Config - Stub
 */
export const BUSINESS_FEATURES = [
  { id: "1", icon: "Building2", name: "Centralized booking", title: "Centralized booking", description: "One platform for all travel" },
  { id: "2", icon: "Users", name: "Team management", title: "Team management", description: "Add and manage travelers" },
  { id: "3", icon: "LayoutDashboard", name: "Travel analytics", title: "Travel analytics", description: "Track spend and trends" },
  { id: "4", icon: "History", name: "Policy compliance", title: "Policy compliance", description: "Enforce travel policies" },
];

export const HIGH_VALUE_ROUTES = [
  { origin: "JFK", destination: "LHR", from: "JFK", to: "LHR", savings: "Up to 25%", category: "international" },
  { origin: "SFO", destination: "NRT", from: "SFO", to: "NRT", savings: "Up to 20%", category: "international" },
  { origin: "ORD", destination: "FRA", from: "ORD", to: "FRA", savings: "Up to 22%", category: "international" },
  { origin: "LAX", destination: "SYD", from: "LAX", to: "SYD", savings: "Up to 18%", category: "international" },
  { origin: "JFK", destination: "LAX", from: "JFK", to: "LAX", savings: "Up to 15%", category: "domestic" },
];

export const B2B_REVENUE_ADVANTAGES = [
  { icon: "TrendingUp", title: "Volume discounts", description: "Save 10-25% on bookings", stat: "25%", statLabel: "Average savings" },
  { icon: "DollarSign", title: "Flexible payments", description: "NET 30/60 terms available", stat: "NET 60", statLabel: "Payment terms" },
  { icon: "PieChart", title: "Expense tracking", description: "Real-time spend visibility", stat: "100%", statLabel: "Visibility" },
  { icon: "Shield", title: "Duty of care", description: "Traveler safety features", stat: "24/7", statLabel: "Support" },
];

export const CORPORATE_COMPLIANCE = {
  dataRetention: "5 years",
  gdprCompliant: true,
  soc2: "In progress",
  invoiceDisclaimer: "Invoices are generated for informational purposes. Final billing is handled by the travel partner.",
  mainDisclaimer: "ZIVO Business connects companies with licensed travel partners. All bookings are fulfilled by our verified partners.",
};

export const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201+", label: "201+ employees" },
];

export const INDUSTRY_OPTIONS = ["Technology", "Finance", "Consulting", "Healthcare", "Manufacturing", "Other"];
