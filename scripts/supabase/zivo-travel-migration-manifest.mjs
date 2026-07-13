#!/usr/bin/env node
/**
 * Zivo Travel migration manifest
 *
 * Generates a non-destructive, service-by-service manifest for moving the live
 * travel engine from the main Zivo Supabase project into the dedicated travel
 * project. This script reads only local files.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const functionsDir = path.join(root, "supabase", "functions");
const migrationsDir = path.join(root, "supabase", "migrations");
const jsonPath = path.join(docsDir, "zivo-travel-migration-manifest.json");
const mdPath = path.join(docsDir, "zivo-travel-migration-manifest.md");

const services = [
  {
    id: "flights",
    label: "Flights",
    cutoverOrder: 1,
    tables: [
      "flight_admin_alerts",
      "flight_api_limits",
      "flight_api_usage",
      "flight_beta_invites",
      "flight_bookings",
      "flight_email_logs",
      "flight_funnel_events",
      "flight_incident_logs",
      "flight_passengers",
      "flight_payment_audit_log",
      "flight_price_alerts",
      "flight_search_cache",
      "flight_search_logs",
      "flight_ticketing_logs",
      "flights",
      "flights_launch_settings",
    ],
    routines: [
      "clean_expired_flight_cache",
    ],
    edgeFunctions: [
      "duffel-flights",
      "duffel-fare-calendar",
      "duffel-destination-prices",
      "duffel-hot-deals",
      "create-flight-checkout",
      "create-flight-payment-intent",
      "confirm-flight-payment",
      "process-flight-refund",
    ],
    smokeTests: [
      "Search offers without payment.",
      "Create a test checkout/payment intent in sandbox mode.",
      "Confirm booking writes passenger and payment audit rows.",
      "Refund sandbox booking.",
    ],
  },
  {
    id: "hotels",
    label: "Hotels and lodging",
    cutoverOrder: 2,
    tables: [
      "lodge_amenities",
      "lodge_amenity_feedback",
      "lodge_complaints",
      "lodge_gift_vouchers",
      "lodge_group_bookings",
      "lodge_guests",
      "lodge_handover_notes",
      "lodge_housekeeping",
      "lodge_inventory_items",
      "lodge_laundry_orders",
      "lodge_maintenance",
      "lodge_notification_templates",
      "lodge_parking_slots",
      "lodge_payout_ledger",
      "lodge_payout_requests",
      "lodge_property_profile",
      "lodge_receipt_share_tokens",
      "lodge_refund_disputes",
      "lodge_reservation_audit",
      "lodge_reservation_change_requests",
      "lodge_reservation_charges",
      "lodge_reservation_messages_link",
      "lodge_reservation_receipts",
      "lodge_reservations",
      "lodge_room_blocks",
      "lodge_room_service_orders",
      "lodge_rooms",
      "lodge_wakeup_calls",
      "lodge_yield_rules",
      "lodging_channel_connections",
      "lodging_concierge_tasks",
      "lodging_deposit_retry_attempts",
      "lodging_experiences",
      "lodging_lost_found",
      "lodging_meal_plans",
      "lodging_messages",
      "lodging_paypal_webhook_events",
      "lodging_promotions",
      "lodging_reviews",
      "lodging_square_webhook_events",
      "lodging_stripe_webhook_events",
      "lodging_taxes_fees",
      "lodging_transfers",
      "lodging_wellness_services",
      "lodging_wiring_remediation_actions",
      "lodging_wiring_report_runs",
    ],
    routines: [
      "is_lodge_reservation_guest",
      "is_lodge_store_manager",
      "is_lodge_store_owner",
      "lodging_wiring_report",
      "notify_lodging_host_new_paid_booking",
      "notify_lodging_host_refund",
      "tg_lodge_reservation_status_audit",
      "tg_loyalty_award_lodging",
      "tg_trim_lodging_wiring_runs",
    ],
    edgeFunctions: [
      "hotelbeds-hotels",
      "ratehawk-hotels",
      "create-lodging-deposit",
      "create-lodging-paypal-order",
      "capture-lodging-paypal-order",
      "create-lodging-square-checkout",
      "stripe-lodging-webhook",
      "square-lodging-webhook",
      "paypal-lodging-webhook",
    ],
    smokeTests: [
      "Load public hotel search/listing reads.",
      "Create sandbox deposit checkout.",
      "Confirm webhook idempotency rows write.",
      "Submit and read a lodging review.",
    ],
  },
  {
    id: "cars",
    label: "Rental cars",
    cutoverOrder: 3,
    tables: [
      "car_rental_addons",
      "car_rental_customers",
      "car_rental_expenses",
      "car_rental_locations",
      "car_rental_maintenance",
      "car_rental_payment_attempts",
      "car_rental_promo_redemptions",
      "car_rental_promotions",
      "car_rental_reservation_addons",
      "car_rental_reservation_events",
      "car_rental_reservations",
      "car_rental_reviews",
      "car_rental_settings",
      "car_rental_store_settings",
      "car_rental_stripe_webhook_events",
      "car_rental_vehicle_blackouts",
      "car_rental_vehicles",
      "car_rentals",
    ],
    routines: [
      "create_car_rental_app_reservation",
      "get_car_rental_availability",
      "get_car_rental_reservation",
      "get_car_rental_reservation_payment_status",
      "tg_car_rental_addons_rollup",
      "tg_car_rental_block_blocked_customers",
      "tg_car_rental_customers_sync",
      "tg_car_rental_log_reservation_event",
      "tg_car_rental_promo_sync_count",
      "tg_car_rental_set_updated_at",
      "tg_car_rental_vehicle_status_sync",
    ],
    edgeFunctions: [
      "create-car-rental-deposit",
      "capture-car-rental-balance",
      "refund-car-rental-deposit",
      "stripe-car-rental-webhook",
    ],
    smokeTests: [
      "Load public fleet and availability.",
      "Create sandbox deposit.",
      "Capture sandbox balance.",
      "Refund sandbox deposit.",
    ],
  },
  {
    id: "bus",
    label: "Booking bus",
    cutoverOrder: 4,
    tables: [
      "bus_bookings",
      "bus_drivers",
      "bus_promos",
      "bus_reviews",
      "bus_route_stops",
      "bus_routes",
      "bus_trips",
      "bus_vehicles",
    ],
    routines: [
      "create_bus_booking",
      "get_bus_trip_seats",
      "get_my_bus_bookings",
      "get_popular_bus_routes",
      "search_bus_trips",
    ],
    edgeFunctions: [
      "create-bus-payment-intent",
      "capture-bus-payment",
    ],
    smokeTests: [
      "Search bus routes and trips.",
      "Create booking hold.",
      "Create sandbox payment intent.",
      "Capture and refund sandbox bus payment.",
    ],
  },
  {
    id: "payments_payouts",
    label: "Shared payments, wallet, and payouts",
    cutoverOrder: 5,
    tables: [
      "customer_payout_methods",
      "customer_wallet_transactions",
      "customer_wallets",
      "lodge_payout_ledger",
      "lodge_payout_requests",
      "payout_batches",
      "payout_holds",
      "payout_items",
      "payout_notifications",
      "payout_run_items",
      "payout_runs",
      "payout_schedules",
      "payout_settings",
      "payouts",
      "travel_payments",
      "wallet_balances",
      "wallet_ledger",
      "wallet_transactions",
      "wallets",
      "zivo_payment_events",
      "zivo_payment_methods",
      "zivo_payout_items",
      "zivo_payout_schedules",
      "zivo_payouts",
      "zivo_service_payouts",
      "zivo_wallet_credits",
      "zivo_wallet_transactions",
    ],
    routines: [
      "apply_wallet_credit",
      "compute_est_payout",
      "credit_referral_wallet_bonus",
      "credit_user_wallet_topup",
      "refresh_wallet_balance",
      "request_live_earnings_payout",
    ],
    edgeFunctions: [
      "connect-onboard",
      "connect-status",
      "connect-account-session",
      "connect-instant-payout",
      "process-withdrawal",
      "customer-payout-method-record",
      "merchant-payout-request",
      "paypal-payout",
      "square-payout",
    ],
    smokeTests: [
      "Read wallet summary in sandbox user account.",
      "Create Connect onboarding link in sandbox.",
      "Record payout method without exposing secrets.",
      "Request sandbox withdrawal/cashout.",
    ],
  },
];

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function listFunctionDirs() {
  if (!existsSync(functionsDir)) return new Set();
  return new Set(readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name));
}

function scanMigrationsForTables(tables) {
  if (!existsSync(migrationsDir)) return [];
  const found = [];
  const tablePatterns = tables.map((table) => new RegExp(`\\b${table}\\b`, "i"));
  for (const name of readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()) {
    const file = path.join(migrationsDir, name);
    const sql = readText(file);
    if (tablePatterns.some((pattern) => pattern.test(sql))) {
      found.push(rel(file));
    }
  }
  return found;
}

function renderMarkdown(manifest) {
  const lines = [
    "# Zivo Travel migration manifest",
    "",
    `Generated: ${manifest.generated}`,
    "",
    "This manifest is local and non-destructive. It groups the live travel engine into cutover batches for Claude/Codex collaboration.",
    "",
    "## Summary",
    "",
    `- Source project: ${manifest.projects.source}`,
    `- Target project: ${manifest.projects.target}`,
    `- Dedicated backend flag: keep ${manifest.backendFlag.requiredValue} until all service batches are migrated and smoke-tested.`,
    "",
  ];

  for (const service of manifest.services) {
    lines.push(`## ${service.cutoverOrder}. ${service.label}`);
    lines.push("");
    lines.push(`- Tables: ${service.tables.length}`);
    lines.push(`- Routines/triggers/RPC: ${service.routines.length}`);
    lines.push(`- Edge Functions present locally: ${service.edgeFunctions.present.length}/${service.edgeFunctions.required.length}`);
    lines.push(`- Local migration files mentioning these tables: ${service.localMigrationFiles.length}`);
    if (service.edgeFunctions.missing.length) lines.push(`- Missing local Edge Function folders: ${service.edgeFunctions.missing.join(", ")}`);
    lines.push("");
    lines.push("Smoke tests:");
    for (const test of service.smokeTests) lines.push(`- ${test}`);
    lines.push("");
  }

  lines.push("## Cutover rule");
  lines.push("");
  lines.push("Do not enable `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true` until every batch above has schema, RLS, explicit Data API grants for intended roles, Edge Functions, secrets, storage policies, and sandbox smoke tests complete in `xbllvmpomorawkcrtbcq`.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const functionDirs = listFunctionDirs();
const manifest = {
  generated: new Date().toISOString(),
  projects: {
    source: "slirphzzwcogdbkeicff",
    target: "xbllvmpomorawkcrtbcq",
  },
  backendFlag: {
    name: "VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND",
    requiredValue: "false",
  },
  services: services.map((service) => {
    const present = service.edgeFunctions.filter((slug) => functionDirs.has(slug));
    const missing = service.edgeFunctions.filter((slug) => !functionDirs.has(slug));
    return {
      ...service,
      edgeFunctions: {
        required: service.edgeFunctions,
        present,
        missing,
      },
      localMigrationFiles: scanMigrationsForTables(service.tables),
    };
  }),
};

mkdirSync(docsDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(manifest));

console.log("zivo-travel-migration-manifest: wrote reports");
console.log(`- ${rel(jsonPath)}`);
console.log(`- ${rel(mdPath)}`);
