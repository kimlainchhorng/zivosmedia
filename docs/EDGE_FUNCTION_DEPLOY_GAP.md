# Edge Function Deployment Gap — main Supabase project

**Date:** 2026-06-08 · **Project:** `zivosmedia` (`slirphzzwcogdbkeicff`) · **Scope:** audit only — no functions were deployed.

**Method:** listed deployed Edge Functions on the main project (492, all `ACTIVE`), extracted every `supabase.functions.invoke("…")` call in the app (all use the **main** client — `@/integrations/supabase/client`), and cross-referenced. The functions below are **invoked by the app but not deployed on main**, so the actions that trigger them fail in production. Pages still render because these are **action** functions (submit/manage), not page-load functions — the "looks fine until you click" failure mode.

> **Caveat:** matched by exact slug. A few may be naming-inversions of a deployed function (e.g. app calls `refund-request-submit`; `submit-refund-request` is deployed). Verify each before assuming breakage. The gap is nonetheless large and mostly real (spot-checked).

## Summary

- Deployed on main: **492** (all ACTIVE).
- Invoked-by-app but **NOT deployed on main: 126**.
- Notable affected areas: **payments** (bus intent/capture, wallet deduct, refund-request, store-payment settings), **salon / car-rental / store owner ops**, **support / moderation / privacy** actions, notifications, reviews, tracking.

## Undeployed functions invoked by the app

| Edge Function | Invoked from (sample) |
|---|---|
| `account-security-settings` | hooks/usePasscode.ts hooks/useTwoStep.ts pages/TwoStepAuthPage.tsx |
| `admin-broadcast-notification` | lib/notifications/adminBroadcastNotification.ts test/workflows/edge-function-deploy-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `admin-content-report-status` | pages/AdminContentReportsPage.tsx test/adminModerationRoleAccess.test.ts test/workflows/security-anti-abuse.test.ts |
| `admin-feedback-queue-write` | pages/admin/AdminGoogleAdsPage.tsx pages/admin/AdminMetaAdsPage.tsx test/workflows/ads-monetization-tracking.test.ts |
| `admin-moderation-review` | pages/AdminModerationPage.tsx test/adminModerationRoleAccess.test.ts test/workflows/security-anti-abuse.test.ts |
| `affiliate-click-log` | lib/affiliateTracking.ts lib/outboundTracking.ts test/workflows/ads-monetization-tracking.test.ts |
| `affiliate-link-redirect` | pages/AffiliateRedirectPage.tsx test/workflows/ads-monetization-tracking.test.ts |
| `analytics-event-track` | lib/analytics.ts lib/analytics/__tests__/track.test.ts test/workflows/ads-monetization-tracking.test.ts |
| `ar-payout-record` | components/admin/store/autorepair/finance/FinanceTaxPayoutsSection.tsx test/workflows/payouts-earnings-workflow.test.ts |
| `block-user-manage` | components/chat/ChatContactInfo.tsx components/chat/ChatHeaderProfileSheet.tsx components/chat/ChatSecurity.tsx |
| `bug-report-submit` | components/support/BugReportSheet.tsx pages/BugReportsPage.tsx pages/MarketplacePage.tsx |
| `cafe-promotion-manage` | hooks/cafe/useCafePromotions.ts test/workflows/shop-owner-workflow.test.ts |
| `cafe-review-manage` | hooks/cafe/useCafeReviews.ts test/workflows/shop-owner-workflow.test.ts |
| `cafe-tip-payout-record` | hooks/cafe/useCafeTips.ts test/workflows/payouts-earnings-workflow.test.ts |
| `capture-bus-payment` | pages/app/BusOperatorConsole.tsx |
| `car-dealership-expense-manage` | hooks/car-dealership/useDealershipExpenses.ts test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-financing-manage` | hooks/car-dealership/useDealershipFinancing.ts test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-lead-activity-manage` | hooks/car-dealership/useDealershipLeadActivities.ts test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-promotion-manage` | hooks/car-dealership/useDealershipPromotions.ts test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-review-manage` | hooks/car-dealership/useDealershipReviews.ts test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-review-submit` | pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx test/workflows/shop-owner-workflow.test.ts |
| `car-dealership-trade-in-manage` | hooks/car-dealership/useDealershipTradeIns.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-addon-manage` | components/admin/store/car-rental/CarRentalSeedDemoButton.tsx hooks/car-rental/useCarRentalAddons.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-blackout-manage` | hooks/car-rental/useCarRentalBlackouts.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-booking-extras-submit` | pages/car-rental/PublicCarRentalBookingPage.tsx test/workflows/customer-booking-order.test.ts |
| `car-rental-customer-manage` | hooks/car-rental/useCarRentalCustomers.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-expense-manage` | hooks/car-rental/useCarRentalExpenses.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-location-manage` | components/admin/store/car-rental/CarRentalSeedDemoButton.tsx hooks/car-rental/useCarRentalLocations.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-maintenance-manage` | hooks/car-rental/useCarRentalMaintenance.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-promotion-manage` | hooks/car-rental/useCarRentalPromotions.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-reservation-manage` | hooks/car-rental/useCarRentalReservations.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-review-manage` | hooks/car-rental/useCarRentalReviews.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-review-submit` | pages/car-rental/PublicCarRentalReviewSubmitPage.tsx test/workflows/shop-owner-workflow.test.ts |
| `car-rental-settings-update` | components/admin/store/car-rental/CarRentalSeedDemoButton.tsx hooks/car-rental/useCarRentalSettings.ts test/workflows/shop-owner-workflow.test.ts |
| `car-rental-vehicle-manage` | components/admin/store/car-rental/CarRentalSeedDemoButton.tsx hooks/car-rental/useCarRentalVehicles.ts test/workflows/shop-owner-workflow.test.ts |
| `chat-consume-view-once` | lib/chat/viewOnce.ts test/workflows/security-anti-abuse.test.ts |
| `chat-thread-settings-update` | hooks/useThreadSettings.ts test/workflows/security-anti-abuse.test.ts |
| `close-friend-manage` | pages/CloseFriendsPage.tsx test/workflows/security-anti-abuse.test.ts |
| `concierge-message-submit` | components/profile/AIConciergeTrigger.tsx test/workflows/api-operations-readiness.test.ts |
| `contact-manage` | hooks/useContactRequests.ts hooks/useContacts.ts test/workflows/security-anti-abuse.test.ts |
| `contact-request-manage` | hooks/useContactRequests.ts test/workflows/security-anti-abuse.test.ts |
| `create-bus-payment-intent` | pages/app/BusBookingPage.tsx |
| `creator-milestone-celebrate` | pages/CreatorMilestonesPage.tsx test/workflows/ads-monetization-tracking.test.ts |
| `creator-payout-method-record` | hooks/usePayPalPayout.ts test/workflows/payouts-earnings-workflow.test.ts |
| `customer-payout-method-record` | components/admin/store/lodging/LodgingPayoutAccountCard.tsx pages/account/WalletPage.tsx pages/driver/DriverPayoutsPage.tsx |
| `device-key-manage` | hooks/useSecretChat.ts test/workflows/security-anti-abuse.test.ts |
| `eats-order-state-update` | pages/EatsDriverDeliveryPage.tsx pages/EatsOrdersPage.tsx pages/EatsTrackingPage.tsx |
| `eats-payment-status-update` | hooks/useEatsOrder.ts test/workflows/payments-refunds-webhooks.test.ts |
| `employee-rule-manage` | hooks/store/useStoreEmployeeRules.ts pages/app/shop/ShopEmployeeRulesPage.tsx test/workflows/client-staff-workflow.test.ts |
| `employee-shift-manage` | pages/app/shop/ShopEmployeeSchedulePage.tsx test/workflows/client-staff-workflow.test.ts test/workflows/shop-owner-workflow.test.ts |
| `exchange-auth-token` | hooks/useCrossAppAuth.ts |
| `feedback-submit` | pages/Feedback.tsx pages/FeedbackPage.tsx test/workflows/api-operations-readiness.test.ts |
| `legal-acceptance-record` | hooks/useLegalCompliance.ts test/legalAcceptanceEdgeAllowlists.test.ts test/policyAcceptanceVersioning.test.ts |
| `legal-dispute-file` | hooks/useLegalCompliance.ts test/legalTrustIntakeContracts.test.ts test/policyAcceptanceVersioning.test.ts |
| `linked-device-manage` | hooks/useLinkedDevices.ts test/workflows/api-operations-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `lodging-review-manage` | components/admin/store/lodging/LodgingReviewsSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `lodging-review-submit` | components/reviews/LodgingReviewSheet.tsx test/workflows/shop-owner-workflow.test.ts |
| `loyalty-points-manage` | hooks/useLoyaltyPoints.ts test/workflows/payouts-earnings-workflow.test.ts |
| `marketing-event-track` | pages/admin/AdminAdsAnalyticsPage.tsx services/marketingTracking.ts test/workflows/ads-monetization-tracking.test.ts |
| `marketing-interest-submit` | pages/Deals.tsx pages/Vision.tsx pages/business/APIPartners.tsx |
| `marketplace-review-submit` | components/marketplace/MarketplaceReviewSheet.tsx test/workflows/customer-booking-order.test.ts test/workflows/shop-owner-workflow.test.ts |
| `merchant-payout-request` | pages/app/shop/MerchantWalletPage.tsx test/merchantPayoutOwnerOpsAccess.test.ts test/workflows/payouts-earnings-workflow.test.ts |
| `moderation-appeal-submit` | pages/ModerationAppealsPage.tsx test/aiAutomatedDecisionDisclosure.test.ts test/workflows/security-anti-abuse.test.ts |
| `muted-conversation-manage` | pages/MutedChatsPage.tsx test/workflows/security-anti-abuse.test.ts |
| `notification-manage` | lib/notifications/notificationManage.ts test/workflows/edge-function-deploy-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `notification-preferences-update` | hooks/useNotificationPreferences.ts test/workflows/push-notifications-workflow.test.ts |
| `privacy-request-submit` | pages/account/AccountSecurity.tsx pages/account/PrivacyControls.tsx test/dataRightsLegalPolicyHub.test.ts |
| `privacy-settings-update` | hooks/useAllowMessageRequests.ts hooks/useSensitiveMediaPreference.ts pages/account/PrivacySettingsPage.tsx |
| `promotion-manage` | components/admin/StoreMarketingSection.tsx pages/app/shop/ShopPromotionsPage.tsx test/workflows/shop-owner-workflow.test.ts |
| `push-device-manage` | lib/notifications/pushDeviceManage.ts test/workflows/edge-function-deploy-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `refund-request-submit` | pages/account/WalletPage.tsx test/refundSupportTrustIntake.test.ts test/workflows/payouts-earnings-workflow.test.ts |
| `review-manage` | components/reviews/ReviewSubmissionSheet.tsx hooks/useReviews.ts test/workflows/customer-booking-order.test.ts |
| `ride-support-submit` | components/shared/AirportTransferBridge.tsx pages/app/RideHubPage.tsx test/workflows/customer-booking-order.test.ts |
| `salon-blockout-manage` | components/admin/store/salon/SalonBlockoutDialog.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-booking-addon-manage` | components/admin/store/salon/SalonBookingsSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-booking-manage` | components/admin/store/salon/SalonBookingsSection.tsx components/admin/store/salon/SalonServiceHistorySection.tsx components/admin/store/salon/SalonWalkinsSection.tsx |
| `salon-booking-retail-manage` | components/admin/store/salon/SalonBookingRetailDialog.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-client-manage` | hooks/salon/useSalonClients.ts pages/salon/SalonMyAreaPage.tsx test/workflows/client-staff-workflow.test.ts |
| `salon-commission-payout-record` | components/admin/store/salon/SalonCommissionsSection.tsx test/workflows/payouts-earnings-workflow.test.ts |
| `salon-expense-manage` | components/admin/store/salon/SalonExpensesSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-gift-card-manage` | hooks/salon/useSalonGiftCards.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-loyalty-manage` | components/admin/store/salon/SalonLoyaltySection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-membership-tier-manage` | components/admin/store/salon/SalonMembershipsSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-package-manage` | components/admin/store/salon/SalonPackagesSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-reminder-settings-update` | hooks/salon/useSalonReminderSettings.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-reminder-template-manage` | hooks/salon/useSalonReminderTemplates.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-retail-product-manage` | components/admin/store/salon/SalonRetailProductsSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-review-manage` | components/admin/store/salon/SalonReviewsSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-service-manage` | hooks/salon/useSalonServices.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-store-closure-manage` | hooks/salon/useSalonStoreClosures.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-stylist-manage` | hooks/salon/useSalonStylists.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-stylist-schedule-manage` | components/admin/store/salon/SalonStylistSchedulesSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `salon-time-entry-manage` | hooks/salon/useSalonTimeEntries.ts test/workflows/shop-owner-workflow.test.ts |
| `salon-waitlist-manage` | components/admin/store/salon/SalonBookingsSection.tsx components/admin/store/salon/SalonWaitlistSection.tsx test/workflows/shop-owner-workflow.test.ts |
| `security-report-submit` | pages/security/SecurityReport.tsx test/legalTrustIntakeContracts.test.ts test/workflows/security-anti-abuse.test.ts |
| `service-booking-manage` | components/admin/store/AdminBookingsTab.tsx test/workflows/customer-booking-order.test.ts |
| `service-booking-submit` | pages/store/ServiceBookingPage.tsx test/workflows/customer-booking-order.test.ts |
| `service-waitlist-submit` | pages/app/ServicesPage.tsx test/workflows/api-operations-readiness.test.ts |
| `share-to-earn-manage` | hooks/useShareToEarn.ts test/workflows/payouts-earnings-workflow.test.ts |
| `shop-ops-record-manage` | pages/app/shop/ShopDocumentsPage.tsx test/workflows/shop-owner-workflow.test.ts |
| `shop-ops-record-submit` | pages/DigitalProductsPage.tsx pages/app/shop/ShopDocumentsPage.tsx pages/app/shop/ShopTrainingPage.tsx |
| `shopping-order-state-update` | hooks/useDriverShoppingOrders.ts pages/GroceryOrderHistory.tsx test/workflows/customer-booking-order.test.ts |
| `social-notification-manage` | lib/notifications/socialNotificationManage.ts test/workflows/edge-function-deploy-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `social-safety-report` | lib/social/safetyReport.ts test/workflows/security-anti-abuse.test.ts |
| `store-document-manage` | hooks/store/useStoreDocuments.ts test/storageBucketPolicies.test.ts test/workflows/storage-media-workflow.test.ts |
| `store-employee-manage` | components/admin/store/StoreEmployeesSection.tsx components/admin/store/StorePayrollSection.tsx components/admin/store/lodging/LodgingStaffSection.tsx |
| `store-order-state-update` | components/admin/StoreOrdersSection.tsx pages/app/shop/ShopOrdersPage.tsx test/workflows/shop-owner-workflow.test.ts |
| `store-payment-methods-update` | components/admin/StorePaymentSection.tsx pages/store/StoreSetup.tsx test/merchantPayoutOwnerOpsAccess.test.ts |
| `store-payment-settings-update` | hooks/salon/useSalonPaymentSettings.ts test/workflows/payments-refunds-webhooks.test.ts test/workflows/shop-owner-workflow.test.ts |
| `store-payroll-config-update` | pages/app/shop/ShopPayrollPage.tsx test/workflows/client-staff-workflow.test.ts |
| `store-product-manage` | pages/admin/AdminStoreEditPage.tsx pages/app/shop/ShopProductsPage.tsx test/shopOwnerDashboardPermissions.test.ts |
| `store-profile-manage` | pages/admin/AdminStoreEditPage.tsx pages/admin/AdminStoresPage.tsx pages/store/StoreSetup.tsx |
| `store-promotion-manage` | components/admin/store/autorepair/AutoRepairPromosSection.tsx components/shop/MerchantViewerHeatmap.tsx test/workflows/shop-owner-workflow.test.ts |
| `store-training-assignment-manage` | hooks/store/useStoreTrainingAssignments.ts test/workflows/client-staff-workflow.test.ts |
| `store-training-program-manage` | hooks/store/useStoreTrainingPrograms.ts test/workflows/client-staff-workflow.test.ts |
| `subscribe-salon-membership` | pages/salon/PublicSalonMembershipPage.tsx test/workflows/api-operations-readiness.test.ts test/workflows/payments-refunds-webhooks.test.ts |
| `support-ticket-manage` | pages/ChatHubPage.tsx test/refundSupportTrustIntake.test.ts test/workflows/api-operations-readiness.test.ts |
| `support-ticket-submit` | components/shared/LiveChatWidget.tsx pages/app/personal/PersonalHelpPage.tsx pages/support/CreateSupportTicketPage.tsx |
| `sync-salon-membership-tier` | components/admin/store/salon/SalonMembershipsSection.tsx test/workflows/api-operations-readiness.test.ts test/workflows/payments-refunds-webhooks.test.ts |
| `talent-invite-notification` | lib/notifications/talentInviteNotification.ts test/workflows/edge-function-deploy-readiness.test.ts test/workflows/security-anti-abuse.test.ts |
| `travel-support-submit` | components/flight/TravelCompanionFinder.tsx pages/app/personal/PersonalSchedulePage.tsx test/workflows/client-staff-workflow.test.ts |
| `travel-tracking-log` | lib/partnerRedirectLog.ts lib/recordSearchAttempt.ts test/workflows/customer-booking-order.test.ts |
| `user-safety-action-manage` | pages/MutedBlockedUsersPage.tsx test/workflows/security-anti-abuse.test.ts |
| `user-session-presence` | hooks/useSessions.ts test/workflows/security-anti-abuse.test.ts |
| `wallet-payment-deduct` | hooks/useWalletPayment.ts test/workflows/payouts-earnings-workflow.test.ts |
| `zivo-payment-method-manage` | hooks/useLocalPaymentMethods.ts hooks/useZivoWallet.ts test/workflows/payments-refunds-webhooks.test.ts |

## Fix

Deploy the missing functions to the main project. Per-function:

```sh
supabase functions deploy <name> --project-ref slirphzzwcogdbkeicff
```

Recommended order: validate the path with the **bus payment** pair first (`create-bus-payment-intent`, `capture-bus-payment`), then the rest. Confirm each function's required secrets (e.g. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BAKONG_TOKEN`) are set on the project before deploying payment functions.

## Re-verify

After deploying, re-run the audit: `list_edge_functions(slirphzzwcogdbkeicff)` and confirm each name above now returns a `"slug"` match.
