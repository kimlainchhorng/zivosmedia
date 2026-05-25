import { Suspense, lazy, useEffect, useState, forwardRef } from "react";
// Admin nav configs are resolved inside AdminShellRoute (a lazy chunk) so
// their lucide icons aren't pulled into the root bundle.
import { usePageViewTracker } from "@/hooks/usePageViewTracker";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
const P2PTransferSheet = lazy(() => import("@/components/chat/P2PTransferSheet"));
const PartnerSignupSheet = lazy(() => import("@/components/partner/PartnerSignupSheet"));
const AffiliateRedirectPage = lazy(() => import("@/pages/AffiliateRedirectPage"));
const EventsHubPage = lazy(() => import("@/pages/hubs/EventsHubPage"));
const MarketplaceHubPage = lazy(() => import("@/pages/hubs/MarketplaceHubPage"));
const JobsHubPage = lazy(() => import("@/pages/hubs/JobsHubPage"));
const VoiceRoomsHubPage = lazy(() => import("@/pages/hubs/VoiceRoomsHubPage"));
const FitnessHubPage = lazy(() => import("@/pages/hubs/FitnessHubPage"));
const CreateEventPage = lazy(() => import("@/pages/hubs/CreateEventPage"));
const CreateListingPage = lazy(() => import("@/pages/hubs/CreateListingPage"));
const CreateJobPage = lazy(() => import("@/pages/hubs/CreateJobPage"));
const StartVoiceRoomPage = lazy(() => import("@/pages/hubs/StartVoiceRoomPage"));
const CreateSupportTicketPage = lazy(() => import("@/pages/support/CreateSupportTicketPage"));
const TwoFactorSetupSheet = lazy(() => import("@/components/security/TwoFactorSetupSheet"));
const OnboardingTour = lazy(() => import("@/components/onboarding/OnboardingTour"));
const BugReportSheet = lazy(() => import("@/components/support/BugReportSheet"));
const AffiliateLinkSheet = lazy(() => import("@/components/affiliate/AffiliateLinkSheet"));
const CurrencyPickerSheet = lazy(() => import("@/components/currency/CurrencyPickerSheet"));
const CreatorSubscribeSheet = lazy(() => import("@/components/creator/CreatorSubscribeSheet"));
import { TooltipProvider } from "@/components/ui/tooltip";
import { useVerificationRealtime } from "@/hooks/useVerificationRealtime";
import { useOTAUpdate } from "@/hooks/useOTAUpdate";
// OTA banner pulls framer-motion — keep it out of the root chunk; it only
// renders on native when an update is queued.
const OTAUpdateBanner = lazy(() => import("@/components/shared/OTAUpdateBanner"));
const NavigationProgressBar = lazy(() => import("@/components/app/NavigationProgressBar"));
const ScrollRestoration = lazy(() => import("@/components/app/ScrollRestoration"));

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RemoteConfigProvider } from "@/contexts/RemoteConfigContext";
import { ZivoPlusProvider } from "@/contexts/ZivoPlusContext";
import { UTMProvider } from "@/contexts/UTMContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CustomerCityProvider } from "@/contexts/CustomerCityContext";
import { BrandProvider } from "@/contexts/BrandContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import GuestOrUser from "@/components/auth/GuestOrUser";
import PhoneRequiredGate from "@/components/auth/PhoneRequiredGate";
import CambodiaOnlyGate from "@/components/auth/CambodiaOnlyGate";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { RouteErrorBoundary } from "./components/shared/RouteErrorBoundary";
import PreserveQueryRedirect from "./components/routing/PreserveQueryRedirect";

// Defer non-critical overlays — these don't need to block FCP/LCP
import { lazyWithRetry } from "@/lib/lazyWithRetry";
const CookieConsent = lazyWithRetry(() => import("./components/common/CookieConsent"));
const PWAUpdatePrompt = lazyWithRetry(() => import("./components/shared/PWAUpdatePrompt").then(m => ({ default: m.PWAUpdatePrompt })));
const PWAInstallBanner = lazyWithRetry(() => import("./components/shared/PWAInstallBanner").then(m => ({ default: m.PWAInstallBanner })));
const InAppBrowserInterstitial = lazyWithRetry(() => import("./components/shared/InAppBrowserInterstitial"));
const PaymentReturnHandler = lazyWithRetry(() => import("@/components/lodging/PaymentReturnHandler").then(m => ({ default: m.PaymentReturnHandler })));
const IncomingCallListener = lazyWithRetry(() => import("@/components/chat/IncomingCallListener"));
const ChatNotificationListener = lazyWithRetry(() => import("@/components/chat/ChatNotificationListener"));
const RuntimeSecurityGuard = lazyWithRetry(() => import("@/components/security/RuntimeSecurityGuard"));
const GlobalAutoTranslator = lazyWithRetry(() => import("@/components/common/GlobalAutoTranslator"));
const StoryDebugPanel = lazyWithRetry(() => import("@/components/stories/StoryDebugPanel"));
const PostShareSheet = lazyWithRetry(() => import("@/components/social/PostShareSheet"));
const ShareToChatSheet = lazyWithRetry(() => import("@/components/chat/ShareToChatSheet"));
// Chrome / passive overlays — deferred so they don't block first paint.
const OfflineBanner = lazyWithRetry(() => import("@/components/chat/OfflineBanner"));
const OutboxFlusher = lazyWithRetry(() => import("@/components/chat/OutboxFlusher"));
const FloatingReactionsOverlay = lazyWithRetry(() => import("@/components/chat/FloatingReactionsOverlay"));
const ReactedByHost = lazyWithRetry(() => import("@/components/chat/ReactedByHost"));
const GlobalDesktopNav = lazyWithRetry(() => import("@/components/app/GlobalDesktopNav"));
const AdminShellRoute = lazyWithRetry(() => import("@/components/admin/shell/AdminShellRoute").then(m => ({ default: m.AdminShellRoute })));
const PushNotificationsBootstrap = lazyWithRetry(() => import("@/hooks/usePushNotifications").then((m) => {
  function PushNotificationsBootstrap() {
    m.usePushNotifications();
    return null;
  }
  return { default: PushNotificationsBootstrap };
}));
const ENABLE_DEV_ROUTES = import.meta.env.DEV;
const SHOW_REQUEST_HEALTH_BADGE =
  import.meta.env.DEV && import.meta.env.VITE_SHOW_REQUEST_HEALTH === "true";
let PostMenuRegressionPage: ReturnType<typeof lazy> | null = null;
let SafeAreaQAPage: ReturnType<typeof lazy> | null = null;
let ChatCallPreviewPage: ReturnType<typeof lazy> | null = null;
let SecurityTestPage: ReturnType<typeof lazy> | null = null;

if (ENABLE_DEV_ROUTES) {
  PostMenuRegressionPage = lazy(() => import("./pages/dev/PostMenuRegressionPage"));
  SafeAreaQAPage = lazy(() => import("./pages/dev/SafeAreaQAPage"));
  ChatCallPreviewPage = lazy(() => import("./pages/dev/ChatCallPreviewPage"));
  SecurityTestPage = lazy(() => import("./pages/SecurityTestPage"));
}

import { SkipToContent } from "./components/shared/SkipToContent";
const RoutePrefetcher = lazy(() => import("./components/shared/RoutePrefetcher"));
import { GlobalViewportMeta } from "@/components/shared/GlobalViewportMeta";
import { categorizeError } from "@/lib/supabaseErrors";
import { useBrand } from "@/hooks/useBrand";
import { applyBrandTheme, resetBrandTheme } from "@/lib/brandTheme";
import { lazyRetry } from "@/lib/lazyRetry";
import { perfLog } from "@/lib/perfTrace";
import { pathFromNativeOpenUrl } from "@/lib/nativeDeepLinks";
import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";
import { P2P_TRANSFER_EVENT, hasPendingP2PTransfer, subscribeP2PTransferMount } from "@/lib/p2pTransfer";
import { recordRequestIssue } from "@/lib/requestHealth";
import RequestHealthBadge from "@/components/dev/RequestHealthBadge";

// Auth pages — lazy loaded (not always the entry point)
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ConnectCallback = lazy(() => import("./pages/ConnectCallback"));
const PublicDocumentView = lazy(() => import("./pages/PublicDocumentView"));
const PairPage = lazy(() => lazyRetry(() => import("./pages/PairPage")));
const EstimateApprovalPage = lazy(() => lazyRetry(() => import("./pages/EstimateApprovalPage")));
const RepairStatusPage = lazy(() => lazyRetry(() => import("./pages/RepairStatusPage")));

const Index = lazy(() => lazyRetry(() => import("./pages/Index")));
const AdminDriverModerationPage = lazy(() => import("./pages/admin/AdminDriverModerationPage"));
const AdminTripHeatmapPage = lazy(() => import("./pages/admin/AdminTripHeatmapPage"));
const AdminRefundsPage = lazy(() => import("./pages/admin/AdminRefundsPage"));
const AdminMessageModerationPage = lazy(() => import("./pages/admin/AdminMessageModerationPage"));
const AdminCallClosuresPage = lazy(() => import("./pages/admin/AdminCallClosuresPage"));
const AdminModerationQAPage = lazy(() => import("./pages/admin/AdminModerationQAPage"));
const AdminMarketingResponsiveQA = lazy(() => import("./pages/admin/AdminMarketingResponsiveQA"));

// App (mobile-first) pages
const AppHome = lazy(() => lazyRetry(() => import("./pages/app/AppHome")));
const AppTravel = lazy(() => import("./pages/app/AppTravel"));
const AppMore = lazy(() => import("./pages/app/AppMore"));
const PersonalDashboard = lazy(() => import("./pages/app/PersonalDashboard"));
const ShopDashboard = lazy(() => import("./pages/app/ShopDashboard"));
const ShopEmployeesPage = lazy(() => import("./pages/app/shop/ShopEmployeesPage"));
const ShopEmployeeDetailPage = lazy(() => import("./pages/app/shop/ShopEmployeeDetailPage"));
const ShopPayrollPage = lazy(() => import("./pages/app/shop/ShopPayrollPage"));
const ShopEmployeeSchedulePage = lazy(() => import("./pages/app/shop/ShopEmployeeSchedulePage"));
const ShopTimeClockPage = lazy(() => import("./pages/app/shop/ShopTimeClockPage"));
const ShopEmployeeRulesPage = lazy(() => import("./pages/app/shop/ShopEmployeeRulesPage"));
const ShopAttendancePage = lazy(() => import("./pages/app/shop/ShopAttendancePage"));
const ShopTrainingPage = lazy(() => import("./pages/app/shop/ShopTrainingPage"));
const ShopPerformancePage = lazy(() => import("./pages/app/shop/ShopPerformancePage"));
const ShopDocumentsPage = lazy(() => import("./pages/app/shop/ShopDocumentsPage"));
const TruckDashboardPage = lazy(() => import("./pages/app/shop/TruckDashboardPage"));
const SalesAttributionPage = lazy(() => import("./pages/app/shop/SalesAttributionPage"));
const SandboxModePage = lazy(() => import("./pages/app/shop/SandboxModePage"));
const MerchantROIDashboard = lazy(() => import("./pages/app/shop/MerchantROIDashboard"));
const ReferAShopPage = lazy(() => import("./pages/app/shop/ReferAShopPage"));
const ShopProductsPage = lazy(() => import("./pages/app/shop/ShopProductsPage"));
const ShopOrdersPage = lazy(() => import("./pages/app/shop/ShopOrdersPage"));
const ShopSettingsPage = lazy(() => import("./pages/app/shop/ShopSettingsPage"));
const ShopPromotionsPage = lazy(() => import("./pages/app/shop/ShopPromotionsPage"));
const ShopAnalyticsPage = lazy(() => import("./pages/app/shop/ShopAnalyticsPage"));
const ShopDeliveryPage = lazy(() => import("./pages/app/shop/ShopDeliveryPage"));
const ReferAFriendPage = lazy(() => import("./pages/app/ReferAFriendPage"));
const MetaPrivacyDisclosure = lazy(() => import("./pages/legal/MetaPrivacyDisclosure"));
const InsuranceDisclosure = lazy(() => import("./pages/legal/InsuranceDisclosure"));
const InsurancePolicy = lazy(() => import("./pages/legal/InsurancePolicy"));
const AirportTransfersPage = lazy(() => import("./pages/seo/AirportTransfersPage"));
const CarRentalCityPage = lazy(() => import("./pages/seo/CarRentalCityPage"));
const DestinationActivitiesPage = lazy(() => import("./pages/seo/DestinationActivitiesPage"));
const DestinationHotelsPage = lazy(() => import("./pages/seo/DestinationHotelsPage"));
const GroceryPage = lazy(() => import("./pages/GroceryPage"));
const NewServiceOrderPage = lazy(() => import("./pages/NewServiceOrderPage"));
const RequestRidePage = lazy(() => import("./pages/app/RequestRidePage"));
const CreateCVPage = lazy(() => import("./pages/app/CreateCVPage"));
const ConnectWebsitePage = lazy(() => import("./pages/app/ConnectWebsitePage"));
const ApplyJobHubPage = lazy(() => import("./pages/app/personal/ApplyJobHubPage"));
const FindEmployeePage = lazy(() => import("./pages/app/personal/FindEmployeePage"));
const CompanyDetailPage = lazy(() => import("./pages/app/personal/CompanyDetailPage"));
const JobDetailPage = lazy(() => import("./pages/app/personal/JobDetailPage"));
const MyApplicationsPage = lazy(() => import("./pages/app/personal/MyApplicationsPage"));
const EmployerDashboardPage = lazy(() => import("./pages/app/personal/EmployerDashboardPage"));
const JobApplicantsPage = lazy(() => import("./pages/app/personal/JobApplicantsPage"));
const PersonalEmployeesPage = lazy(() => import("./pages/app/personal/PersonalEmployeesPage"));
const AcceptInvitePage = lazy(() => import("./pages/auth/AcceptInvitePage"));
const PersonalSchedulePage = lazy(() => import("./pages/app/personal/PersonalSchedulePage"));
const PersonalTimesheetPage = lazy(() => import("./pages/app/personal/PersonalTimesheetPage"));
const PersonalPayStubsPage = lazy(() => import("./pages/app/personal/PersonalPayStubsPage"));
const PersonalNotificationsPage = lazy(() => import("./pages/app/personal/PersonalNotificationsPage"));
const PersonalHelpPage = lazy(() => import("./pages/app/personal/PersonalHelpPage"));
const PersonalSettingsPage = lazy(() => import("./pages/app/personal/PersonalSettingsPage"));
const ServicesPage = lazy(() => import("./pages/app/ServicesPage"));
const UnifiedDashboard = lazy(() => import("./pages/app/UnifiedDashboard"));
const MyTripsPage = lazy(() => import("./pages/app/MyTripsPage"));
const MyLodgingTripPage = lazy(() => import("./pages/MyLodgingTripPage"));
const MyCarTripPage = lazy(() => import("./pages/MyCarTripPage"));
const MyFlightTripPage = lazy(() => import("./pages/MyFlightTripPage"));
const MyHotelTripPage = lazy(() => import("./pages/MyHotelTripPage"));
const MyRestaurantTripPage = lazy(() => import("./pages/MyRestaurantTripPage"));
const MyActivityTripPage = lazy(() => import("./pages/MyActivityTripPage"));
const MyReviewsPage = lazy(() => import("./pages/MyReviewsPage"));
const ReviewModerationDashboard = lazy(() => import("./pages/admin/ReviewModerationDashboard"));

const SupportCenterPage = lazy(() => import("./pages/app/SupportCenterPage"));
const RideTrackingPage = lazy(() => import("./pages/app/RideTrackingPage"));
const TripStatusPage = lazy(() => import("./pages/TripStatusPage"));
const RideHubPage = lazy(() => import("./pages/app/RideHubPage"));
const EatsLanding = lazy(() => import("./pages/EatsLanding"));
const EatsTrackingPage = lazy(() => import("./pages/EatsTrackingPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const BecomePartnerPage = lazy(() => import("./pages/BecomePartnerPage"));
const NetworkPlacesPage = lazy(() => import("./pages/NetworkPlacesPage"));
const SavedFavoritesPage = lazy(() => import("./pages/SavedFavoritesPage"));
const ConciergePage = lazy(() => import("./pages/ConciergePage"));
const PublicTripSharePage = lazy(() => import("./pages/PublicTripSharePage"));
const MultiStopRideBuilder = lazy(() => import("./pages/MultiStopRideBuilder"));
const PublicOrderSharePage = lazy(() => import("./pages/PublicOrderSharePage"));
const ShareWatchlistPage = lazy(() => import("./pages/ShareWatchlistPage"));
const EatsOrdersPage = lazy(() => import("./pages/EatsOrdersPage"));
const EatsRestaurantDashboard = lazy(() => import("./pages/EatsRestaurantDashboard"));
const EatsDriverDeliveryPage = lazy(() => import("./pages/EatsDriverDeliveryPage"));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage"));
const DeliveryTrackingPage = lazy(() => import("./pages/DeliveryTrackingPage"));
const DeliveryChatPage = lazy(() => import("./pages/DeliveryChatPage"));
const GroceryMarketplace = lazy(() => import("./pages/GroceryMarketplace"));
// Historical names are inverted: ReelsFeedPage renders the main social feed,
// while FeedPage renders the fullscreen reels experience on /reels.
const FeedPage = lazyWithRetry(() => import("./pages/FeedPage"));
const ReelsFeedPage = lazyWithRetry(() => import("./pages/ReelsFeedPage"));
const SocialFeedPage = lazyWithRetry(() => import("./pages/SocialFeedPage"));
const SoundPage = lazy(() => import("./pages/SoundPage"));
const ChatHubPage = lazyWithRetry(() => import("./pages/ChatHubPage"));
const ContactsPage = lazyWithRetry(() => import("./pages/chat/ContactsPage"));
const ContactRequestsPage = lazyWithRetry(() => import("./pages/chat/ContactRequestsPage"));
const MessageRequestsPage = lazyWithRetry(() => import("./pages/chat/MessageRequestsPage"));
const NearbyChatPage = lazyWithRetry(() => import("./pages/chat/NearbyChatPage"));
const FindContactsPage = lazyWithRetry(() => import("./pages/chat/FindContactsPage"));
const FindByUsernamePage = lazyWithRetry(() => import("./pages/chat/FindByUsernamePage"));
const BlockedUsersPage = lazyWithRetry(() => import("./pages/chat/BlockedUsersPage"));
const JoinGroupPage = lazyWithRetry(() => import("./pages/chat/JoinGroupPage"));
const PrivacySecurityPage = lazyWithRetry(() => import("./pages/chat/settings/PrivacySecurityPage"));
const ActiveSessionsPage = lazyWithRetry(() => import("./pages/chat/settings/ActiveSessionsPage"));
const TwoStepSetupPage = lazyWithRetry(() => import("./pages/chat/settings/TwoStepSetupPage"));
const PasscodeSetupPage = lazyWithRetry(() => import("./pages/chat/settings/PasscodeSetupPage"));
const LoginAlertsPage = lazyWithRetry(() => import("./pages/chat/settings/LoginAlertsPage"));
const ChatPrivacyHubPage = lazyWithRetry(() => import("./pages/chat/settings/ChatPrivacyHubPage"));
const ChatSearchAllPage = lazyWithRetry(() => import("./pages/chat/ChatSearchAllPage"));
const CustomFoldersPage = lazyWithRetry(() => import("./pages/chat/CustomFoldersPage"));
const BroadcastListsPage = lazyWithRetry(() => import("./pages/chat/BroadcastListsPage"));
const NewBroadcastPage = lazyWithRetry(() => import("./pages/chat/NewBroadcastPage"));
const BotFatherPage = lazyWithRetry(() => import("./pages/chat/BotFatherPage"));
const BotDetailPage = lazyWithRetry(() => import("./pages/chat/BotDetailPage"));
const BotDiscoverPage = lazyWithRetry(() => import("./pages/chat/BotDiscoverPage"));
const BotAdminPage = lazyWithRetry(() => import("./pages/chat/BotAdminPage"));
const BotPublicProfilePage = lazyWithRetry(() => import("./pages/BotPublicProfilePage"));
const BotCollectionPage = lazyWithRetry(() => import("./pages/chat/BotCollectionPage"));
const BotInboxPage = lazyWithRetry(() => import("./pages/chat/BotInboxPage"));
const StorageManagerPage = lazyWithRetry(() => import("./pages/chat/settings/StorageManagerPage"));
const AppLockGate = lazyWithRetry(() => import("./components/chat/settings/AppLockGate"));
const MfaChallengeDialog = lazy(() => import("./components/auth/MfaChallengeDialog"));
const GroupCallEntryPage = lazyWithRetry(() => import("./pages/chat/GroupCallEntryPage"));
const RecordingsPage = lazyWithRetry(() => import("./pages/chat/RecordingsPage"));
const ChatSearchPage = lazyWithRetry(() => import("./pages/chat/ChatSearchPage"));
const ChannelsDirectoryPage = lazy(() => import("./pages/channels/ChannelsDirectoryPage"));
const NewChannelPage = lazy(() => import("./pages/channels/NewChannelPage"));
const ChannelPage = lazy(() => import("./pages/channels/ChannelPage"));
const ManageChannelPage = lazy(() => import("./pages/channels/ManageChannelPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));
const PrivacySettingsPage = lazy(() => import("./pages/account/PrivacySettingsPage"));
const CreatorDashboardPage = lazy(() => import("./pages/CreatorDashboardPage"));
const CreatorAnalyticsPage = lazy(() => import("./pages/CreatorAnalyticsPage"));
const CreatorSetupPage = lazy(() => import("./pages/CreatorSetupPage"));
const CreatorLiveEarningsPage = lazy(() => import("./pages/CreatorLiveEarningsPage"));
const CreatorSubscribersPage = lazy(() => import("./pages/CreatorSubscribersPage"));
const CreatorTipsPage = lazy(() => import("./pages/CreatorTipsPage"));
const AffiliateHubPage = lazy(() => import("./pages/AffiliateHubPage"));
const DigitalProductsPage = lazy(() => import("./pages/DigitalProductsPage"));
const MonetizationPage = lazy(() => import("./pages/MonetizationPage"));
const MonetizationArticlesPage = lazy(() => import("./pages/MonetizationArticlesPage"));
const MonetizationArticleDetailPage = lazy(() => import("./pages/MonetizationArticleDetailPage"));
const ProgramDetailPage = lazy(() => import("./pages/ProgramDetailPage"));
const LiveStreamPage = lazy(() => import("./pages/LiveStreamPage"));
const GoLivePage = lazy(() => import("./pages/GoLivePage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const CommunitiesPage = lazy(() => import("./pages/CommunitiesPage"));
const CommunityDetailPage = lazy(() => import("./pages/CommunityDetailPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const ContentAnalyticsPage = lazy(() => import("./pages/ContentAnalyticsPage"));
const MarketplaceOrdersPage = lazy(() => import("./pages/MarketplaceOrdersPage"));
const ImportShopPage = lazy(() => import("./pages/shop/ImportShopPage"));
const ImportProductPage = lazy(() => import("./pages/shop/ImportProductPage"));
const ImportCartPage = lazy(() => import("./pages/shop/ImportCartPage"));
const ImportOrdersPage = lazy(() => import("./pages/shop/ImportOrdersPage"));
const AdminImportShopPage = lazy(() => import("./pages/admin/AdminImportShopPage"));
const DatingPage = lazy(() => import("./pages/DatingPage"));
const DraftsPage = lazy(() => import("./pages/DraftsPage"));
const AudioSpacesPage = lazy(() => import("./pages/AudioSpacesPage"));
const SmartSearchPage = lazy(() => import("./pages/SmartSearchPage"));
const NotificationCenterPage = lazy(() => import("./pages/NotificationCenterPage"));
const ActivityFeedPage = lazy(() => import("./pages/ActivityFeedPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const AdminModerationPage = lazy(() => import("./pages/AdminModerationPage"));
const AdminLaunchDashboard = lazy(() => import("./pages/admin/AdminLaunchDashboard"));
const AdminWalletPage = lazy(() => import("./pages/admin/AdminWalletPage"));
const ContentSchedulerPage = lazy(() => import("./pages/ContentSchedulerPage"));
const StoryPollsPage = lazy(() => import("./pages/StoryPollsPage"));

const BadgesPage = lazy(() => import("./pages/BadgesPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const WellnessPage = lazy(() => import("./pages/WellnessPage"));
const AppSettingsPage = lazy(() => import("./pages/AppSettingsPage"));
const WatchPartyPage = lazy(() => import("./pages/WatchPartyPage"));
const WhiteboardPage = lazy(() => import("./pages/WhiteboardPage"));
const QRProfilePage = lazy(() => import("./pages/QRProfilePage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const AutoRepairPage = lazy(() => import("./pages/AutoRepairPage"));
const LinkHubPage = lazy(() => import("./pages/LinkHubPage"));
const NearbyPage = lazy(() => import("./pages/NearbyPage"));
const CheckInPage = lazy(() => import("./pages/CheckInPage"));
const SafetyCenterPage = lazy(() => import("./pages/SafetyCenterPage"));
const AccountAnalyticsPage = lazy(() => import("./pages/account/AccountAnalyticsPage"));
const VerificationRequestPage = lazy(() => import("./pages/account/VerificationRequestPage"));
const ActivityLogPage = lazy(() => import("./pages/account/ActivityLogPage"));
const AccountExportPage = lazy(() => import("./pages/account/AccountExportPage"));
const GroceryStorePage = lazy(() => import("./pages/GroceryStorePage"));
const StoreProfilePage = lazy(() => import("./pages/StoreProfilePage"));
const StoreMapPage = lazy(() => import("./pages/StoreMapPage"));
const StoresListPage = lazy(() => import("./pages/StoresListPage"));
const GroceryOrderPlaced = lazy(() => import("./pages/grocery/GroceryOrderPlaced"));
const GroceryOrderConfirmed = lazy(() => import("./pages/grocery/GroceryOrderConfirmed"));
const GroceryOrderHistory = lazy(() => import("./pages/GroceryOrderHistory"));
const GroceryOrderTracking = lazy(() => import("./pages/grocery/GroceryOrderTracking"));
const GroceryTerms = lazy(() => import("./pages/grocery/GroceryTerms"));
const GroceryReturns = lazy(() => import("./pages/grocery/GroceryReturns"));
const GroceryFees = lazy(() => import("./pages/grocery/GroceryFees"));
const ZivoPlusPage = lazy(() => import("./pages/ZivoPlusPage"));
const DrivePage = lazy(() => import("./pages/DrivePage"));
const DriverShoppingList = lazy(() => import("./pages/DriverShoppingList"));
const DriverOrdersPage = lazy(() => import("./pages/DriverOrdersPage"));
const AdminShoppingOrders = lazy(() => import("./pages/admin/AdminShoppingOrders"));
const AdminAnalyticsDashboard = lazy(() => import("./pages/admin/AdminAnalyticsDashboard"));
const AdminFeedDiagnosticsPage = lazy(() => import("./pages/admin/AdminFeedDiagnosticsPage"));
const AdminNotificationAnalyticsPage = lazy(() => import("./pages/admin/AdminNotificationAnalyticsPage"));
const AdminStoriesFunnelPage = lazy(() => import("./pages/admin/AdminStoriesFunnelPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminPricingPage = lazy(() => import("./pages/admin/AdminPricingPage"));
const AdminRemoteConfigPage = lazy(() => import("./pages/admin/AdminRemoteConfigPage"));
const AdminFlightOrders = lazy(() => import("./pages/admin/AdminFlightOrders"));
const AdminFlightSearchAnalytics = lazy(() => import("./pages/admin/AdminFlightSearchAnalytics"));
const AdminFlightApiMonitoring = lazy(() => import("./pages/admin/AdminFlightApiMonitoring"));
const AdminFlightPriceAlerts = lazy(() => import("./pages/admin/AdminFlightPriceAlerts"));
const AdminStoresPage = lazy(() => import("./pages/admin/AdminStoresPage"));
const AdminStoreEditPage = lazy(() => import("./pages/admin/AdminStoreEditPage"));
const HotelAdminLaunchPage = lazy(() => import("./pages/admin/HotelAdminLaunchPage"));
const AdminLodgingQAChecklistPage = lazy(() => import("./pages/admin/AdminLodgingQAChecklistPage"));
const AdminLodgingCompletionVerificationPage = lazy(() => import("./pages/admin/AdminLodgingCompletionVerificationPage"));
const AdminBlockedLinksPage = lazy(() => import("./pages/admin/AdminBlockedLinksPage"));
const AdminThreatHistoryPage = lazy(() => import("./pages/admin/AdminThreatHistoryPage"));
const AdminCspViolationsPage = lazy(() => import("./pages/admin/AdminCspViolationsPage"));
const AdminSecurityAuditPage = lazy(() => import("./pages/admin/AdminSecurityAuditPage"));
const AdminSecurityNotificationsPage = lazy(() => import("./pages/admin/AdminSecurityNotificationsPage"));
const AdminSecurityOverviewPage = lazy(() => import("./pages/admin/AdminSecurityOverviewPage"));
const AdminLodgingReservationDetailPage = lazy(() => import("./pages/admin/lodging/AdminLodgingReservationDetailPage"));
const AdminLodgingWiringCheckPage = lazy(() => import("./pages/admin/AdminLodgingWiringCheckPage"));
const AdminLodgingWebhookEventsPage = lazy(() => import("./pages/admin/AdminLodgingWebhookEventsPage"));
const StoreAssetsUploadCheck = lazy(() => import("./pages/admin/StoreAssetsUploadCheck"));
const StoreSetup = lazy(() => import("./pages/store/StoreSetup"));
const BusinessPageWizard = lazy(() => import("./pages/business/BusinessPageWizard"));
const BusinessSoftwareDownloadPage = lazy(() => import("./pages/store/BusinessSoftwareDownloadPage"));
const AutoRepairDesktopAppPage = lazy(() => import("./pages/store/AutoRepairDesktopAppPage"));
const ServiceBookingPage = lazy(() => import("./pages/store/ServiceBookingPage"));
const PublicSalonBookingPage = lazy(() => import("./pages/salon/PublicSalonBookingPage"));
const PublicCarRentalBookingPage = lazy(() => import("./pages/car-rental/PublicCarRentalBookingPage"));
const PublicCarRentalBookingDetailPage = lazy(() => import("./pages/car-rental/PublicCarRentalBookingDetailPage"));
const CarRentalDailySheetPage = lazy(() => import("./pages/admin/CarRentalDailySheetPage"));
const CarRentalReceiptPage = lazy(() => import("./pages/admin/CarRentalReceiptPage"));
const PublicCarRentalReviewSubmitPage = lazy(() => import("./pages/car-rental/PublicCarRentalReviewSubmitPage"));
const MyCarRentalsPage = lazy(() => import("./pages/car-rental/MyCarRentalsPage"));
const PublicCafeOrderPage = lazy(() => import("./pages/cafe/PublicCafeOrderPage"));
const CafeReceiptPage = lazy(() => import("./pages/cafe/CafeReceiptPage"));
const CafeKitchenTicketPage = lazy(() => import("./pages/cafe/CafeKitchenTicketPage"));
const CafeOrderStatusPage = lazy(() => import("./pages/cafe/CafeOrderStatusPage"));
const CafeReviewSubmitPage = lazy(() => import("./pages/cafe/CafeReviewSubmitPage"));
const CafeGiftCardCheckPage = lazy(() => import("./pages/cafe/CafeGiftCardCheckPage"));
const CafeReservePage = lazy(() => import("./pages/cafe/CafeReservePage"));
const CafeStorefrontPage = lazy(() => import("./pages/cafe/CafeStorefrontPage"));
const CafeDailySummaryPage = lazy(() => import("./pages/admin/CafeDailySummaryPage"));
const CafeQrSheetPage = lazy(() => import("./pages/admin/CafeQrSheetPage"));
const PublicSalonBookingDetailPage = lazy(() => import("./pages/salon/PublicSalonBookingDetailPage"));
const SalonReceiptPage = lazy(() => import("./pages/admin/SalonReceiptPage"));
const SalonDailySchedulePage = lazy(() => import("./pages/admin/SalonDailySchedulePage"));
const SalonDailySummaryPage = lazy(() => import("./pages/admin/SalonDailySummaryPage"));
const SalonQueueDisplayPage = lazy(() => import("./pages/admin/SalonQueueDisplayPage"));
const SalonGiftCardCheckPage = lazy(() => import("./pages/salon/SalonGiftCardCheckPage"));
const PublicStylistDayPage = lazy(() => import("./pages/salon/PublicStylistDayPage"));
const PublicReviewSubmitPage = lazy(() => import("./pages/salon/PublicReviewSubmitPage"));


const AdminEmployeesPage = lazy(() => import("./pages/admin/AdminEmployeesPage"));
const AdminSystemHealth = lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminAppStoreAssets = lazy(() => import("./pages/admin/AdminAppStoreAssets"));
const AdminAndroidVerification = lazy(() => import("./pages/admin/AdminAndroidVerification"));
const AdminSupportDashboard = lazy(() => import("./pages/admin/AdminSupportDashboard"));
const AdminUserAccounts = lazy(() => import("./pages/admin/AdminUserAccounts"));
const AdminGodView = lazy(() => import("./pages/admin/AdminGodView"));
const AdBoostBidding = lazy(() => import("./pages/app/shop/AdBoostBidding"));
const MerchantBoostEngine = lazy(() => import("./pages/app/shop/MerchantBoostEngine"));
const AiCreativeSuite = lazy(() => import("./pages/app/shop/AiCreativeSuite"));
const AiContentSuite = lazy(() => import("./pages/app/shop/AiContentSuite"));
const MerchantWalletPage = lazy(() => import("./pages/app/shop/MerchantWalletPage"));
const MerchantTaxReportPage = lazy(() => import("./pages/app/shop/MerchantTaxReportPage"));
const AdminChatSecurityPage = lazy(() => import("./pages/admin/AdminChatSecurityPage"));
const AdminSecuritySentinelPage = lazy(() => import("./pages/admin/AdminSecuritySentinelPage"));
const AdminAuthShieldPage = lazy(() => import("./pages/admin/AdminAuthShieldPage"));
const DriverHomePage = lazy(() => import("./pages/driver/DriverHomePage"));
const DriverEarningsPage = lazy(() => import("./pages/driver/DriverEarningsPage"));
const DriverPayoutsPage = lazy(() => import("./pages/driver/DriverPayoutsPage"));
const AdminGoogleAdsPage = lazy(() => import("./pages/admin/AdminGoogleAdsPage"));
const AdminMetaAdsPage = lazy(() => import("./pages/admin/AdminMetaAdsPage"));
const AdminAdsAnalyticsPage = lazy(() => import("./pages/admin/AdminAdsAnalyticsPage"));
const AdminMarketingCampaignsPage = lazy(() => import("./pages/admin/AdminMarketingCampaignsPage"));
const AdminPromoCodesPage = lazy(() => import("./pages/admin/AdminPromoCodesPage"));
const AdminBroadcastPage = lazy(() => import("./pages/admin/AdminBroadcastPage"));
const AdminFeedbackReplyPage = lazy(() => import("./pages/admin/AdminFeedbackReplyPage"));
const AdminStoreVerificationPage = lazy(() => import("./pages/admin/AdminStoreVerificationPage"));
const AdminPartnerApplicationsPage = lazy(() => import("./pages/admin/AdminPartnerApplicationsPage"));
const AdminFinanceSummaryPage = lazy(() => import("./pages/admin/AdminFinanceSummaryPage"));
const AdminWebhookStatusPage = lazy(() => import("./pages/admin/AdminWebhookStatusPage"));
const AdminDriverVerificationPage = lazy(() => import("./pages/admin/AdminDriverVerificationPage"));
const DriverOnboardingDocumentsPage = lazy(() => import("./pages/driver/DriverOnboardingDocumentsPage"));
const SharedTripPage = lazy(() => import("./pages/public/SharedTripPage"));
const DriverPerformancePage = lazy(() => import("./pages/driver/DriverPerformancePage"));
const DriverMapPage = lazy(() => import("./pages/driver/DriverMapPage"));
const DriverShopPage = lazy(() => import("./pages/driver/DriverShopPage"));
const TripsListPage = lazy(() => import("./pages/trips/TripsListPage"));
const TripDetailPage = lazy(() => import("./pages/trips/TripDetailPage"));

// Auth & Account
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const PaymentMethodsPage = lazy(() => import("./pages/PaymentMethodsPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const VerifyOTP = lazy(() => lazyRetry(() => import("./pages/VerifyOTP")));
const Setup = lazy(() => lazyRetry(() => import("./pages/Setup")));
const VerifyNewDevice = lazy(() => lazyRetry(() => import("./pages/VerifyNewDevice")));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Profile = lazy(() => lazyRetry(() => import("./pages/Profile")));
const MorePage = lazy(() => import("./pages/MorePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const UsernameRedirectPage = lazy(() => import("./pages/UsernameRedirectPage"));
const DeleteAccountPage = lazy(() => import("./pages/profile/DeleteAccountPage"));
const ShareProfileRedirect = lazy(() => import("./pages/ShareProfileRedirect"));
const DeepLinkLandingPage = lazy(() => import("./pages/DeepLinkLandingPage"));
const StoryDeepLinkPage = lazy(() => import("./pages/StoryDeepLinkPage"));

// Customer Loyalty
const LoyaltyPage = lazy(() => import("./pages/account/LoyaltyPage"));

// Flights
const FlightBooking = lazy(() => import("./pages/FlightBooking"));
const FlightLanding = lazy(() => import("./pages/FlightLanding"));
const FlightResults = lazy(() => import("./pages/FlightResults"));
const FlightDetails = lazy(() => import("./pages/FlightDetails"));
const FlightLive = lazy(() => import("./pages/FlightLive"));
const FlightTravelerInfo = lazy(() => import("./pages/FlightTravelerInfo"));
const FlightCheckout = lazy(() => import("./pages/FlightCheckout"));
const FlightConfirmation = lazy(() => import("./pages/FlightConfirmation"));
const FlightTerms = lazy(() => import("./pages/legal/FlightTerms"));
const AirportPage = lazy(() => import("./pages/AirportPage"));
const FlightCityPage = lazy(() => import("./pages/FlightCityPage"));
const DuffelCheckout = lazy(() => import("./pages/DuffelCheckout"));
const FlightBookingsPage = lazy(() => import("./pages/FlightBookingsPage"));
const FlightReview = lazy(() => import("./pages/FlightReview"));
// EmbeddedCheckout removed — partners block iframe embedding; use redirect model
// FlightDashboard removed

// Hotels
const HotelBooking = lazy(() => import("./pages/HotelBooking"));
const HotelLanding = lazy(() => import("./pages/HotelLanding"));
// HotelsPage removed
// HotelDashboard removed
const HotelResultsPage = lazy(() => import("./pages/HotelResultsPage"));
const HotelResortDetailPage = lazy(() => import("./pages/lodging/HotelResortDetailPage"));
const HotelRoomCheckoutPage = lazy(() => import("./pages/lodging/HotelRoomCheckoutPage"));
const HotelBookingConfirmedPage = lazy(() => import("./pages/lodging/HotelBookingConfirmedPage"));
const HotelsResortsDirectoryPage = lazy(() => import("./pages/lodging/HotelsResortsDirectoryPage"));
const HotelsLandingPage = lazy(() => import("./pages/lodging/HotelsLandingPage"));

// Car Rental
const CarRentalBooking = lazy(() => import("./pages/CarRentalBooking"));
const CarResultsPage = lazy(() => import("./pages/CarResultsPage"));
const CarRentalLanding = lazy(() => import("./pages/CarRentalLanding"));
const CarDetailPage = lazy(() => import("./pages/CarDetailPage"));
const CarTravelerInfoPage = lazy(() => import("./pages/CarTravelerInfoPage"));
const CarCheckoutPage = lazy(() => import("./pages/CarCheckoutPage"));
const CarConfirmationPage = lazy(() => import("./pages/CarConfirmationPage"));
// CarSearch removed
const Cars = lazy(() => import("./pages/Cars"));
const CarsSearchPage = lazy(() => import("./pages/cars/CarsSearchPage"));
const CarsDetailPage = lazy(() => import("./pages/cars/CarDetailPage"));
const CarRentalCheckoutPage = lazy(() => import("./pages/cars/CarRentalCheckoutPage"));
const CarRentalConfirmedPage = lazy(() => import("./pages/cars/CarRentalConfirmedPage"));
const HowToRent = lazy(() => import("./pages/HowToRent"));

// Travel Extras & Checkout
const ThingsToDo = lazy(() => import("./pages/ThingsToDo"));
const TravelInsurance = lazy(() => import("./pages/TravelInsurance"));
const TravelExtras = lazy(() => import("./pages/TravelExtras"));
const TravelCheckoutPage = lazy(() => import("./pages/TravelCheckoutPage"));
const TravelConfirmationPage = lazy(() => import("./pages/TravelConfirmationPage"));
const TravelTripsPage = lazy(() => import("./pages/TravelTripsPage"));
const TravelOrderDetailPage = lazy(() => import("./pages/TravelOrderDetailPage"));
const TravelerDashboard = lazy(() => import("./pages/TravelerDashboard"));
const SavedSearchesPage = lazy(() => import("./pages/SavedSearchesPage"));

// Legal pages
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const PartnerAgreement = lazy(() => import("./pages/legal/PartnerAgreement"));
const AccessibilityStatement = lazy(() => import("./pages/legal/AccessibilityStatement"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const CancellationPolicy = lazy(() => import("./pages/legal/CancellationPolicy"));
const PartnerDisclosure = lazy(() => import("./pages/legal/PartnerDisclosure"));
const DoNotSell = lazy(() => import("./pages/legal/DoNotSell"));
const SecurityIncident = lazy(() => import("./pages/legal/SecurityIncident"));
const SecurityPolicy = lazy(() => import("./pages/legal/SecurityPolicy"));
const VulnerabilityDisclosureLegal = lazy(() => import("./pages/legal/VulnerabilityDisclosure"));
const SellerOfTravel = lazy(() => import("./pages/legal/SellerOfTravel"));
const SocialMediaPolicy = lazy(() => import("./pages/legal/SocialMediaPolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const DataRetentionPolicy = lazy(() => import("./pages/legal/DataRetentionPolicy"));
const DMCACopyrightPolicy = lazy(() => import("./pages/legal/DMCACopyrightPolicy"));
const DisputeResolution = lazy(() => import("./pages/legal/DisputeResolution"));
const LimitationOfLiability = lazy(() => import("./pages/legal/LimitationOfLiability"));
const IndemnificationPolicy = lazy(() => import("./pages/legal/IndemnificationPolicy"));
const AgeRestrictionPolicy = lazy(() => import("./pages/legal/AgeRestrictionPolicy"));
const AssumptionOfRisk = lazy(() => import("./pages/legal/AssumptionOfRisk"));
const ElectronicConsent = lazy(() => import("./pages/legal/ElectronicConsent"));
const ForceMajeure = lazy(() => import("./pages/legal/ForceMajeure"));
const NoGuaranteeDisclaimer = lazy(() => import("./pages/legal/NoGuaranteeDisclaimer"));
const GoverningLaw = lazy(() => import("./pages/legal/GoverningLaw"));
const IntellectualProperty = lazy(() => import("./pages/legal/IntellectualProperty"));
const AccountTermination = lazy(() => import("./pages/legal/AccountTermination"));
const ThirdPartyLinks = lazy(() => import("./pages/legal/ThirdPartyLinks"));
const CommunicationConsent = lazy(() => import("./pages/legal/CommunicationConsent"));
const ModificationOfTerms = lazy(() => import("./pages/legal/ModificationOfTerms"));
const ClassActionWaiver = lazy(() => import("./pages/legal/ClassActionWaiver"));
const AntiMoneyLaundering = lazy(() => import("./pages/legal/AntiMoneyLaundering"));
const UserConduct = lazy(() => import("./pages/legal/UserConduct"));
const CaliforniaPrivacy = lazy(() => import("./pages/legal/CaliforniaPrivacy"));
const FraudPrevention = lazy(() => import("./pages/legal/FraudPrevention"));
const WarrantyDisclaimer = lazy(() => import("./pages/legal/WarrantyDisclaimer"));
const GDPRCompliance = lazy(() => import("./pages/legal/GDPRCompliance"));
const NonDiscrimination = lazy(() => import("./pages/legal/NonDiscrimination"));
const TransportationDisclaimer = lazy(() => import("./pages/legal/TransportationDisclaimer"));
const CarRentalDisclaimer = lazy(() => import("./pages/legal/CarRentalDisclaimer"));
const InsuranceDisclaimer = lazy(() => import("./pages/legal/InsuranceDisclaimer"));
const DamagePolicy = lazy(() => import("./pages/legal/DamagePolicy"));
const OwnerTerms = lazy(() => import("./pages/legal/OwnerTerms"));
const RenterTerms = lazy(() => import("./pages/legal/RenterTerms"));
const GenericLegalPage = lazy(() => import("./pages/legal/GenericLegalPage"));

const AffiliateDisclosure = lazy(() => import("./pages/AffiliateDisclosure"));
const About = lazy(() => import("./pages/About"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refunds = lazy(() => import("./pages/Refunds"));
const Company = lazy(() => import("./pages/Company"));
const Security = lazy(() => import("./pages/Security"));
const PrivacySecurity = lazy(() => import("./pages/PrivacySecurity"));
const Install = lazy(() => import("./pages/Install"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Promotions = lazy(() => import("./pages/Promotions"));
const ForCustomers = lazy(() => import("./pages/ForCustomers"));
const Reliability = lazy(() => import("./pages/Reliability"));
const TrustStatement = lazy(() => import("./pages/TrustStatement"));
const SecurityStatus = lazy(() => import("./pages/SecurityStatus"));
const SavedPostsPage = lazy(() => import("./pages/SavedPostsPage"));
const HashtagPage = lazy(() => import("./pages/HashtagPage"));
const Status = lazy(() => import("./pages/Status"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const BookingReturn = lazy(() => import("./pages/BookingReturnPage"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const AITripPlanner = lazy(() => import("./pages/AITripPlanner"));
const MultiCityBuilder = lazy(() => import("./pages/MultiCityBuilder"));
const ZivoPlus = lazy(() => import("./pages/ZivoPlus"));
const MembershipPage = lazy(() => import("./pages/MembershipPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const MediaLibraryPage = lazy(() => import("./pages/MediaLibraryPage"));
const CreatorGoalsPage = lazy(() => import("./pages/CreatorGoalsPage"));
const PodcastsPage = lazy(() => import("./pages/PodcastsPage"));
const BrandDealsPage = lazy(() => import("./pages/BrandDealsPage"));
const PromotePage = lazy(() => import("./pages/PromotePage"));
const SoundsPage = lazy(() => import("./pages/SoundsPage"));
const TrackPackagePage = lazy(() => import("./pages/TrackPackagePage"));
const ReceiptsPage = lazy(() => import("./pages/ReceiptsPage"));
const MindfulnessPage = lazy(() => import("./pages/MindfulnessPage"));
const MedicationsPage = lazy(() => import("./pages/MedicationsPage"));
const NutritionPage = lazy(() => import("./pages/NutritionPage"));
const ARFiltersPage = lazy(() => import("./pages/ARFiltersPage"));
const TaxInfoPage = lazy(() => import("./pages/TaxInfoPage"));
const StoryArchivePage = lazy(() => import("./pages/StoryArchivePage"));
const HighlightsPage = lazy(() => import("./pages/HighlightsPage"));
const CloseFriendsPage = lazy(() => import("./pages/CloseFriendsPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const PollsPage = lazy(() => import("./pages/PollsPage"));
const CreatorMilestonesPage = lazy(() => import("./pages/CreatorMilestonesPage"));
const MentionsPage = lazy(() => import("./pages/MentionsPage"));
const PostAlbumsPage = lazy(() => import("./pages/PostAlbumsPage"));
const CollabsPage = lazy(() => import("./pages/CollabsPage"));
const StickerStorePage = lazy(() => import("./pages/StickerStorePage"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const ChatThemesPage = lazy(() => import("./pages/ChatThemesPage"));
const RewardsCenterPage = lazy(() => import("./pages/RewardsCenterPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const CreatorEarningsPage = lazy(() => import("./pages/CreatorEarningsPage"));
const NotificationPrefsPage = lazy(() => import("./pages/NotificationPrefsPage"));
const StoryInsightsPage = lazy(() => import("./pages/StoryInsightsPage"));
const DevicesPage = lazy(() => import("./pages/DevicesPage"));
const InterestsPage = lazy(() => import("./pages/InterestsPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));
const GameScoresPage = lazy(() => import("./pages/GameScoresPage"));
const ClubsPage = lazy(() => import("./pages/ClubsPage"));
const ForumsPage = lazy(() => import("./pages/ForumsPage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const TrendingTopicsPage = lazy(() => import("./pages/TrendingTopicsPage"));
const ReelEffectsPage = lazy(() => import("./pages/ReelEffectsPage"));
const PlacesPage = lazy(() => import("./pages/PlacesPage"));
const ReactionPacksPage = lazy(() => import("./pages/ReactionPacksPage"));
const TravelJournalsPage = lazy(() => import("./pages/TravelJournalsPage"));
const SurveysPage = lazy(() => import("./pages/SurveysPage"));
const ExchangeRatesPage = lazy(() => import("./pages/ExchangeRatesPage"));
const HashtagsDirectoryPage = lazy(() => import("./pages/HashtagsDirectoryPage"));
const CoinWalletPage = lazy(() => import("./pages/CoinWalletPage"));
const GifLibraryPage = lazy(() => import("./pages/GifLibraryPage"));
const SplitBillsPage = lazy(() => import("./pages/SplitBillsPage"));
const FitnessActivitiesPage = lazy(() => import("./pages/FitnessActivitiesPage"));
const FanBadgesPage = lazy(() => import("./pages/FanBadgesPage"));
const MyUnlocksPage = lazy(() => import("./pages/MyUnlocksPage"));
const VoiceNotesPage = lazy(() => import("./pages/VoiceNotesPage"));
const AffiliateLinksPage = lazy(() => import("./pages/AffiliateLinksPage"));
const GiftHistoryPage = lazy(() => import("./pages/GiftHistoryPage"));
const SharedTodosPage = lazy(() => import("./pages/SharedTodosPage"));
const MarketplaceCartPage = lazy(() => import("./pages/MarketplaceCartPage"));
const PointsHistoryPage = lazy(() => import("./pages/PointsHistoryPage"));
const ModerationAppealsPage = lazy(() => import("./pages/ModerationAppealsPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const ChatMediaGalleryPage = lazy(() => import("./pages/ChatMediaGalleryPage"));
const LoginActivityPage = lazy(() => import("./pages/LoginActivityPage"));
const AMAPage = lazy(() => import("./pages/AMAPage"));
const VoicemailsPage = lazy(() => import("./pages/VoicemailsPage"));
const TrustScorePage = lazy(() => import("./pages/TrustScorePage"));
const WarningsPage = lazy(() => import("./pages/WarningsPage"));
const ChatWallpapersPage = lazy(() => import("./pages/ChatWallpapersPage"));
const PromoUsagePage = lazy(() => import("./pages/PromoUsagePage"));
const BugReportsPage = lazy(() => import("./pages/BugReportsPage"));
const StreaksPage = lazy(() => import("./pages/StreaksPage"));
const MyChallengeSubmissionsPage = lazy(() => import("./pages/MyChallengeSubmissionsPage"));
const PollHistoryPage = lazy(() => import("./pages/PollHistoryPage"));
const SpamDetectionsPage = lazy(() => import("./pages/SpamDetectionsPage"));
const PlaceClicksPage = lazy(() => import("./pages/PlaceClicksPage"));
const PriceAlertsPage = lazy(() => import("./pages/PriceAlertsPage"));
const RideQuotesPage = lazy(() => import("./pages/RideQuotesPage"));
const AutoMessagesLogPage = lazy(() => import("./pages/AutoMessagesLogPage"));
const OrderDisputesPage = lazy(() => import("./pages/OrderDisputesPage"));
const FlightPriceAlertsPage = lazy(() => import("./pages/FlightPriceAlertsPage"));
const AudioRoomsPage = lazy(() => import("./pages/AudioRoomsPage"));
const CoinTransfersPage = lazy(() => import("./pages/CoinTransfersPage"));
const LiveLocationsPage = lazy(() => import("./pages/LiveLocationsPage"));
const FriendRequestsPage = lazy(() => import("./pages/FriendRequestsPage"));
const GroupOrdersPage = lazy(() => import("./pages/GroupOrdersPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const LeaderboardsPage = lazy(() => import("./pages/LeaderboardsPage"));
const RecentlyViewedPage = lazy(() => import("./pages/RecentlyViewedPage"));
const TwoStepAuthPage = lazy(() => import("./pages/TwoStepAuthPage"));
const MyJobApplicationsPage = lazy(() => import("./pages/MyJobApplicationsPage"));
const OnboardingProgressPage = lazy(() => import("./pages/OnboardingProgressPage"));
const ProfileViewsPage = lazy(() => import("./pages/ProfileViewsPage"));
const StorePromoCodesPage = lazy(() => import("./pages/StorePromoCodesPage"));
const EmojiPacksPage = lazy(() => import("./pages/EmojiPacksPage"));
const LiveChatSessionsPage = lazy(() => import("./pages/LiveChatSessionsPage"));
const MutedBlockedUsersPage = lazy(() => import("./pages/MutedBlockedUsersPage"));
const MutedChatsPage = lazy(() => import("./pages/MutedChatsPage"));
const PushDevicesPage = lazy(() => import("./pages/PushDevicesPage"));
const CreatorPayoutsPage = lazy(() => import("./pages/CreatorPayoutsPage"));
const P2PMoneyPage = lazy(() => import("./pages/P2PMoneyPage"));
const MusicStickersPage = lazy(() => import("./pages/MusicStickersPage"));
const AvatarMoodsPage = lazy(() => import("./pages/AvatarMoodsPage"));
const DownloadedPacksPage = lazy(() => import("./pages/DownloadedPacksPage"));
const LegalDisputesPage = lazy(() => import("./pages/LegalDisputesPage"));
const MyPodcastsPage = lazy(() => import("./pages/MyPodcastsPage"));
const SavedLocationsPage = lazy(() => import("./pages/SavedLocationsPage"));
const StoryCommentsPage = lazy(() => import("./pages/StoryCommentsPage"));
const RestaurantReviewDetailsPage = lazy(() => import("./pages/RestaurantReviewDetailsPage"));
const StoryViewersPage = lazy(() => import("./pages/StoryViewersPage"));
const ItinerariesPage = lazy(() => import("./pages/ItinerariesPage"));
const ConsentLogPage = lazy(() => import("./pages/ConsentLogPage"));
const TenantMembershipsPage = lazy(() => import("./pages/TenantMembershipsPage"));
const RecommendationScoresPage = lazy(() => import("./pages/RecommendationScoresPage"));
const BusinessRenterAccountPage = lazy(() => import("./pages/BusinessAccountPage"));

const Vision = lazy(() => import("./pages/Vision"));
const BrandMission = lazy(() => import("./pages/BrandMission"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Careers = lazy(() => import("./pages/Careers"));
const Press = lazy(() => import("./pages/Press"));
const Offline = lazy(() => import("./pages/Offline"));
const OutboundRedirect = lazy(() => import("./pages/OutboundRedirect"));
const BookingManagement = lazy(() => import("./pages/BookingManagement"));
const Deals = lazy(() => import("./pages/Deals"));
const ComplianceCenter = lazy(() => import("./pages/ComplianceCenter"));
const RewardsPage = lazy(() => import("./pages/RewardsPage"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const Help = lazy(() => import("./pages/Help"));

// Account pages
const AccountSettingsPage = lazy(() => import("./pages/account/AccountSettingsPage"));
const UsernamePage = lazy(() => import("./pages/account/UsernamePage"));
const LegalPoliciesPage = lazy(() => import("./pages/account/LegalPoliciesPage"));
const ProfileEditPage = lazy(() => import("./pages/account/ProfileEditPage"));
const AccountSecurity = lazy(() => import("./pages/account/AccountSecurity"));
const AccountSessionsPage = lazy(() => import("./pages/account/AccountSessionsPage"));
const LinkedDevicesPage = lazy(() => import("./pages/account/LinkedDevicesPage"));
const LinkDevicePage = lazy(() => import("./pages/account/LinkDevicePage"));
const ScanDevicePage = lazy(() => import("./pages/account/ScanDevicePage"));
const SecretChatPage = lazyWithRetry(() => import("./pages/chat/SecretChatPage"));
const PreferencesPage = lazy(() => import("./pages/account/PreferencesPage"));
const PrivacyControls = lazy(() => import("./pages/account/PrivacyControls"));
const NotificationSettings = lazy(() => import("./pages/account/NotificationSettings"));
const AccountReferralsPage = lazy(() => import("./pages/account/ReferralsPage"));
const AccountWalletPage = lazy(() => import("./pages/account/WalletPage"));
const AccountSubscriptionsPage = lazy(() => import("./pages/account/AccountSubscriptionsPage"));
const AccountTipsPage = lazy(() => import("./pages/account/AccountTipsPage"));
const CoinPurchaseSuccess = lazy(() => import("./pages/CoinPurchaseSuccess"));
const GuestProfilePreview = lazy(() => import("./components/auth/GuestProfilePreview"));
const GiftCardsPage = lazy(() => import("./pages/account/GiftCardsPage"));
const GiftCardSuccessPage = lazy(() => import("./pages/account/GiftCardSuccessPage"));
const AccountAddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const AccountFavoritesPage = lazy(() => import("./pages/account/FavoritesPage"));
const AccountInvoicesPage = lazy(() => import("./pages/account/BusinessInvoicesPage"));
const PromosPage = lazy(() => import("./pages/account/PromosPage"));
const TravelerProfilesPage = lazy(() => import("./pages/account/TravelerProfilesPage"));

// Security pages
const SecurityReport = lazy(() => import("./pages/security/SecurityReport"));
const ZeroTrustPolicy = lazy(() => import("./pages/security/ZeroTrustPolicy"));
const ScaleProtection = lazy(() => import("./pages/security/ScaleProtection"));
const RealtimeMonitoring = lazy(() => import("./pages/security/RealtimeMonitoring"));
const DataProtection = lazy(() => import("./pages/security/DataProtection"));
const PrivacyCompliance = lazy(() => import("./pages/security/PrivacyCompliance"));
const TrustCertification = lazy(() => import("./pages/security/TrustCertification"));
const ScamPrevention = lazy(() => import("./pages/security/ScamPrevention"));
const SecurityOperations = lazy(() => import("./pages/security/SecurityOperations"));
const DisasterRecovery = lazy(() => import("./pages/security/DisasterRecovery"));
const VulnerabilityDisclosure = lazy(() => import("./pages/security/VulnerabilityDisclosure"));
const EnterpriseTrust = lazy(() => import("./pages/security/EnterpriseTrust"));

// Business pages
const APIPartners = lazy(() => import("./pages/business/APIPartners"));
const BusinessDashboard = lazy(() => import("./pages/business/BusinessDashboard"));
const BusinessLandingPage = lazy(() => import("./pages/business/BusinessLandingPage"));
const BusinessAccountPage = lazy(() => import("./pages/business/BusinessAccountPage"));
const PartnerAuditDocs = lazy(() => import("./pages/business/PartnerAuditDocs"));
const EnterpriseReady = lazy(() => import("./pages/business/EnterpriseReady"));
const PartnerWithZivo = lazy(() => import("./pages/business/PartnerWithZivo"));
const PartnerOnboarding = lazy(() => import("./pages/business/PartnerOnboarding"));
const PartnerLogin = lazy(() => import("./pages/PartnerLogin"));
const CorporateTravel = lazy(() => import("./pages/business/CorporateTravel"));
const DataInsights = lazy(() => import("./pages/business/DataInsights"));

// Support pages
const TravelBookingsSupport = lazy(() => import("./pages/support/TravelBookings"));
const SiteIssuesSupport = lazy(() => import("./pages/support/SiteIssues"));
const UserSupportTicketsPage = lazy(() => import("./pages/support/UserSupportTicketsPage"));

const TicketDetailPage = lazy(() => import("./pages/support/TicketDetailPage"));

// SEO pages
const FlightToCity = lazy(() => import("./pages/seo/FlightToCity"));
const FlightRoutePage = lazy(() => import("./pages/seo/FlightRoutePage"));
const DealsPage = lazy(() => import("./pages/seo/DealsPage"));
const SeasonalDealPage = lazy(() => import("./pages/seo/SeasonalDealPage"));
const CountryHubPage = lazy(() => import("./pages/seo/CountryHubPage"));
const LocalizedFlightRoutePage = lazy(() => import("./pages/seo/LocalizedFlightRoutePage"));
const CityLandingPage = lazy(() => import("./pages/seo/CityLandingPage"));
const HotelCityLandingPage = lazy(() => import("./pages/seo/HotelCityLandingPage"));

// Guide pages
const GuidesIndex = lazy(() => import("./pages/guides/GuidesIndex"));
const CheapFlightsGuide = lazy(() => import("./pages/guides/CheapFlightsGuide"));
const CityGuide = lazy(() => import("./pages/guides/CityGuide"));
const BestTimeToBook = lazy(() => import("./pages/guides/BestTimeToBook"));

function extractHttpStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const maybeStatus = (error as { status?: unknown }).status;
    if (typeof maybeStatus === "number" && Number.isFinite(maybeStatus)) {
      return maybeStatus;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && /^\d{3}$/.test(maybeCode)) {
      return Number(maybeCode);
    }

    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      const statusMatch = maybeMessage.match(/\b([45]\d\d)\b/);
      if (statusMatch) return Number(statusMatch[1]);
    }
  }

  return null;
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  const info = categorizeError(error);
  const status = extractHttpStatus(error);

  if (info.type === "auth") return false;
  if (status !== null && [400, 401, 403, 404, 409, 410, 412, 422].includes(status)) {
    return false;
  }

  if (info.type === "rate_limit" || status === 429) {
    return failureCount < 3;
  }

  if (info.type === "network" || (status !== null && status >= 500)) {
    return failureCount < 3;
  }

  return failureCount < 2;
}

function queryRetryDelay(attempt: number, error: unknown) {
  const info = categorizeError(error);
  const baseDelay = info.type === "rate_limit" ? 1500 : 800;
  const exponential = Math.min(baseDelay * 2 ** attempt, 12_000);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.round(exponential * jitter);
}

function shouldRetryMutation(failureCount: number, error: unknown) {
  const info = categorizeError(error);
  const status = extractHttpStatus(error);
  if (info.type === "auth") return false;
  if (status !== null && [400, 401, 403, 404, 409, 410, 412, 422].includes(status)) {
    return false;
  }
  return (info.type === "network" || info.type === "rate_limit" || status === 429) && failureCount < 2;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const info = categorizeError(error);
      recordRequestIssue({
        scope: "query",
        category: info.type,
        status: extractHttpStatus(error),
        retryable: info.isRetryable,
        key: query.queryHash,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const info = categorizeError(error);
      recordRequestIssue({
        scope: "mutation",
        category: info.type,
        status: extractHttpStatus(error),
        retryable: info.isRetryable,
        key: mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : undefined,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000, // 2 min — halve unnecessary background refetches
      gcTime: 10 * 60_000, // keep cache 10 min (was 5 min)
      refetchOnWindowFocus: false, // don't refetch every tab switch
      refetchOnReconnect: "always", // always sync after network reconnects
      retry: (failureCount, error) => {
        const nextRetry = shouldRetryQuery(failureCount, error);
        if (nextRetry) {
          const info = categorizeError(error);
          recordRequestIssue({
            scope: "retry",
            category: info.type,
            status: extractHttpStatus(error),
            retryable: info.isRetryable,
            path: typeof window !== "undefined" ? window.location.pathname : undefined,
          });
        }
        if (import.meta.env.DEV && nextRetry) {
          perfLog("query.retry", {
            failureCount,
            category: categorizeError(error).type,
            status: extractHttpStatus(error),
          });
        }
        return nextRetry;
      },
      retryDelay: queryRetryDelay,
    },
    mutations: {
      retry: shouldRetryMutation,
      retryDelay: queryRetryDelay,
    },
  },
});

const PageLoader = forwardRef<HTMLDivElement>(function PageLoader(_, ref) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isFeedLikeRoute = pathname.startsWith("/feed") || pathname.startsWith("/reels");
  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");

  if (isChatRoute) {
    return (
      <div ref={ref} className="min-h-[100dvh] bg-background">
        <div className="mx-auto w-full max-w-2xl px-3 pt-4">
          <div className="h-10 rounded-full bg-muted/60 animate-pulse mb-4" />
          <div className="flex gap-3 mb-4 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 w-14 rounded-full bg-muted/50 animate-pulse shrink-0" />
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-muted/40 animate-pulse" />
            ))}
          </div>
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-2">
                <div className="h-12 w-12 rounded-full bg-muted/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 rounded bg-muted/60 animate-pulse" />
                  <div className="h-2.5 w-2/3 rounded bg-muted/40 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isFeedLikeRoute) {
    return (
      <div ref={ref} className="min-h-[100dvh] bg-background">
        <div className="hidden lg:block fixed inset-x-0 top-0 z-50 border-b border-border/20 bg-background/90 backdrop-blur-2xl">
          <div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-3 px-4">
            <div className="h-8 w-20 rounded-full bg-muted/70 animate-pulse" />
            <div className="h-9 w-24 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-9 w-24 rounded-full bg-muted/50 animate-pulse" />
            <div className="ml-auto h-10 w-full max-w-md rounded-full bg-muted/50 animate-pulse" />
            <div className="h-9 w-20 rounded-full bg-muted/50 animate-pulse" />
          </div>
        </div>
        <div className="lg:flex lg:pt-[60px]">
          <aside className="hidden lg:block h-[calc(100dvh-60px)] w-60 shrink-0 border-r border-border/20 p-3">
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-9 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          </aside>
          <main className="mx-auto w-full max-w-2xl">
            <div className="lg:hidden border-b border-border/20 px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse" />
                <div className="h-10 flex-1 rounded-full bg-muted/50 animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse" />
              </div>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-b border-border/20 bg-card">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="h-10 w-10 rounded-full bg-muted/70 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-36 rounded bg-muted/70 animate-pulse" />
                    <div className="mt-2 h-2.5 w-24 rounded bg-muted/50 animate-pulse" />
                  </div>
                </div>
                <div className="aspect-[4/5] bg-muted/60 animate-pulse" />
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="h-8 w-36 rounded-full bg-muted/50 animate-pulse" />
                  <div className="h-8 w-10 rounded-full bg-muted/50 animate-pulse" />
                </div>
              </div>
            ))}
          </main>
          <aside className="hidden xl:block h-[calc(100dvh-60px)] w-[280px] shrink-0 border-l border-border/20 p-4">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
            <div className="mt-5 h-28 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="mt-4 h-28 rounded-2xl bg-muted/40 animate-pulse" />
          </aside>
        </div>
      </div>
    );
  }

  return (
  // min-h-[100dvh] (dynamic viewport height) instead of min-h-screen so the
  // loader fills the visible viewport correctly on iOS Safari — the older
  // `100vh` overshoots when the URL bar is showing, pushing the centered
  // content off-screen and creating a visible jump when the bar hides.
  <div ref={ref} className="min-h-[100dvh] bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-ig-gradient opacity-30 blur-xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center shadow-lg shadow-black/10">
          <svg className="w-7 h-7 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>
      <p className="text-sm font-semibold tracking-[0.18em] text-ig-gradient">ZIVO</p>
    </div>
  </div>
  );
});

function BrandThemeApplicator() {
  const { brand } = useBrand();
  useEffect(() => {
    if (brand.primaryColor) {
      applyBrandTheme(brand.primaryColor);
    } else {
      resetBrandTheme();
    }
  }, [brand.primaryColor]);
  return null;
}

/** Auto-tracks page views on route change */
function PageViewTracker() {
  usePageViewTracker();
  return null;
}

/** Auto-detect country & language from IP on first visit */
function GeoDetector() {
  useGeoDetect();
  return null;
}

/** Background geofence check for boosted shops nearby — lazy loaded */
const GeofenceBootstrap = lazy(() => import("@/hooks/useGeofenceNotifications").then(m => {
  function GeofenceComp() { m.useGeofenceNotifications(); return null; }
  return { default: GeofenceComp };
}));

const DeletionReturnDialog = lazy(() => import("@/components/account/DeletionReturnDialog"));

/** Routes /partner-with-zivo: with ?type= → onboarding wizard, otherwise landing page */
const PartnerOnboardingDispatcher = () => {
  const [params] = useSearchParams();
  return params.get("type") ? <PartnerOnboarding /> : <PartnerWithZivo />;
};

function useAfterFirstPaint(timeout = 1600) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.requestIdleCallback) {
      const handle = window.requestIdleCallback(() => setReady(true), { timeout });
      return () => window.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(() => setReady(true), timeout);
    return () => window.clearTimeout(handle);
  }, [timeout]);
  return ready;
}

function DeferredPageViewTracker() {
  const ready = useAfterFirstPaint(2200);
  return ready ? <PageViewTracker /> : null;
}

function DeferredGeoDetector() {
  const ready = useAfterFirstPaint(3500);
  return ready ? <GeoDetector /> : null;
}

function RoutePerfTracker() {
  const location = useLocation();
  useEffect(() => {
    const route = `${location.pathname}${location.search ?? ""}`;
    const logRouteReady = () => perfLog("route visible", { route });
    if (window.requestAnimationFrame) {
      const frame = window.requestAnimationFrame(logRouteReady);
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(logRouteReady, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);
  return null;
}

function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let listener: { remove: () => Promise<void> | void } | null = null;

    const openUrl = (rawUrl?: string | null) => {
      const path = pathFromNativeOpenUrl(rawUrl ?? "");
      if (path) navigate(path);
    };

    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform() || cancelled) return;

        return import("@capacitor/app").then(({ App: CapacitorApp }) => {
          void CapacitorApp.getLaunchUrl()
            .then((launchUrl) => {
              if (!cancelled) openUrl(launchUrl?.url);
            })
            .catch(() => {});

          void Promise.resolve(
            CapacitorApp.addListener("appUrlOpen", (event) => {
              if (!cancelled) openUrl(event.url);
            }),
          )
            .then((handle) => {
              if (cancelled) {
                void handle.remove();
              } else {
                listener = handle;
              }
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (listener) void listener.remove();
    };
  }, [navigate]);

  return null;
}

function RouteAwareGlobalUI() {
  const location = useLocation();
  const { user } = useAuth();
  const ready = useAfterFirstPaint(4200);
  const blockedRoutes = ["/login", "/signup", "/setup", "/forgot-password", "/reset-password", "/verify-email", "/verify-otp", "/verify-new-device"];
  const hideGlobalUI = blockedRoutes.some((route) => location.pathname.startsWith(route));

  if (hideGlobalUI || !ready) return null;

  return (
    <Suspense fallback={null}>
      <CookieConsent />
      <PWAUpdatePrompt />
      <PWAInstallBanner />
      <InAppBrowserInterstitial />
      <RuntimeSecurityGuard />
      {user && <MfaChallengeDialog />}
      {user && <IncomingCallListener />}
      {user && <ChatNotificationListener />}
      {user && <AppLockGate />}
    </Suspense>
  );
}

function DeferredPassiveChatOverlays() {
  const ready = useAfterFirstPaint(3200);
  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <OfflineBanner />
      <OutboxFlusher />
      <FloatingReactionsOverlay />
      <ReactedByHost />
    </Suspense>
  );
}

function DeferredRoutePrefetcher() {
  const ready = useAfterFirstPaint(3600);
  return ready ? <Suspense fallback={null}><RoutePrefetcher /></Suspense> : null;
}

const PAYMENT_RETURN_MARKER_RE = /(?:^|[?&])(?:paypal_return|paypal_cancel|square_return|eats_paypal_return|eats_paypal_cancel|eats_square_return|grocery_paypal_return|grocery_paypal_cancel|grocery_square_return|tip_paypal_return|tip_paypal_cancel|tip_square_return)=/;

function PaymentReturnBootstrap() {
  const { search } = useLocation();
  if (!PAYMENT_RETURN_MARKER_RE.test(search)) return null;
  return <Suspense fallback={null}><PaymentReturnHandler /></Suspense>;
}

function LazyP2PTransferSheetHost() {
  const [mounted, setMounted] = useState(() => hasPendingP2PTransfer());

  useEffect(() => {
    const mount = () => setMounted(true);
    const unsubscribe = subscribeP2PTransferMount(mount);
    window.addEventListener(P2P_TRANSFER_EVENT, mount);
    if (hasPendingP2PTransfer()) mount();

    return () => {
      unsubscribe();
      window.removeEventListener(P2P_TRANSFER_EVENT, mount);
    };
  }, []);

  return mounted ? <Suspense fallback={null}><P2PTransferSheet /></Suspense> : null;
}

function DeferredGlobalSheets() {
  const ready = useAfterFirstPaint(2400);
  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <PartnerSignupSheet />
      <TwoFactorSetupSheet />
      <OnboardingTour />
      <BugReportSheet />
      <AffiliateLinkSheet />
      <CreatorSubscribeSheet />
    </Suspense>
  );
}

function DeferredCurrencyPicker() {
  const ready = useAfterFirstPaint(2400);
  return ready ? <Suspense fallback={null}><CurrencyPickerSheet /></Suspense> : null;
}

function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 1024px)").matches
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isDesktop;
}

function DesktopNavBootstrap() {
  const isDesktop = useDesktopViewport();
  const location = useLocation();
  if (location.pathname.startsWith("/desktop/auto-repair")) return null;
  return isDesktop ? <Suspense fallback={null}><GlobalDesktopNav /></Suspense> : null;
}


const VerificationRealtimeBridge = () => {
  useVerificationRealtime();
  return null;
};

function OTAUpdateBannerBridge() {
  const ota = useOTAUpdate();
  return <Suspense fallback={null}><OTAUpdateBanner {...ota} /></Suspense>;
}

function OTAUpdateBootstrap() {
  const ready = useAfterFirstPaint(1500);
  return ready ? <OTAUpdateBannerBridge /> : null;
}

function AuthBackgroundServices() {
  const { user } = useAuth();
  const ready = useAfterFirstPaint(5000);
  if (!user || !ready) return null;
  return (
    <Suspense fallback={null}>
      {import.meta.env.DEV && <StoryDebugPanel />}
      <VerificationRealtimeBridge />
      <PushNotificationsBootstrap />
      <GeofenceBootstrap />
      <DeletionReturnDialog />
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey="hizovo-theme">
        <QueryClientProvider client={queryClient}>
          <BrandProvider>
            <TooltipProvider>
              <GlobalViewportMeta />
              <SkipToContent />
              <Toaster />
              <Sonner />
              <Suspense fallback={null}><GlobalAutoTranslator /></Suspense>
              {SHOW_REQUEST_HEALTH_BADGE && <RequestHealthBadge />}
              <DeferredPassiveChatOverlays />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >

                <DeferredPageViewTracker />
                <DeferredGeoDetector />
                <RoutePerfTracker />
                <NativeDeepLinkHandler />
                <OTAUpdateBootstrap />
                <Suspense fallback={null}><NavigationProgressBar /></Suspense>
                <Suspense fallback={null}><ScrollRestoration /></Suspense>
                <Suspense fallback={null}><PostShareSheet /></Suspense>
                <DeferredRoutePrefetcher />
                <PaymentReturnBootstrap />
                <AuthProvider>
                  <DesktopNavBootstrap />
                  <AuthBackgroundServices />
                  <Suspense fallback={null}><ShareToChatSheet /></Suspense>
                  <LazyP2PTransferSheetHost />
                  <DeferredGlobalSheets />
                   <RemoteConfigProvider>
                  <ZivoPlusProvider>
                  <CustomerCityProvider>
                    <CurrencyProvider>
                      <DeferredCurrencyPicker />
                      <UTMProvider>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<Index />} />
                            
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/unsubscribe" element={<Unsubscribe />} />
                            <Route path="/connect/callback" element={<ConnectCallback />} />
                            <Route path="/d/:token" element={<PublicDocumentView />} />

                {/* App Dashboard */}
                <Route path="/app" element={<ProtectedRoute><UnifiedDashboard /></ProtectedRoute>} />
                <Route path="/app/home" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
                <Route path="/index" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
                <Route path="/hotel-admin" element={<ProtectedRoute><HotelAdminLaunchPage /></ProtectedRoute>} />
                <Route path="/my-trips" element={<ProtectedRoute><MyTripsPage /></ProtectedRoute>} />
                <Route path="/my-reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><AccountWalletPage /></ProtectedRoute>} />
                <Route path="/wallet/coins/success" element={<ProtectedRoute><CoinPurchaseSuccess /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><SupportCenterPage /></ProtectedRoute>} />
                <Route path="/travel" element={<ProtectedRoute><AppTravel /></ProtectedRoute>} />
                {/* /more is registered below with MorePage (the canonical hub).
                   Do NOT re-add an /more route here — it would shadow MorePage. */}
                <Route path="/personal-dashboard" element={<ProtectedRoute><PersonalDashboard /></ProtectedRoute>} />
                <Route path="/personal/apply-job" element={<ProtectedRoute><ApplyJobHubPage /></ProtectedRoute>} />
                <Route path="/personal/find-employee" element={<ProtectedRoute><FindEmployeePage /></ProtectedRoute>} />
                <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/personal/companies/:id" element={<ProtectedRoute><CompanyDetailPage /></ProtectedRoute>} />
                <Route path="/personal/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
                <Route path="/personal/my-applications" element={<ProtectedRoute><MyApplicationsPage /></ProtectedRoute>} />
                <Route path="/personal/employer" element={<ProtectedRoute><EmployerDashboardPage /></ProtectedRoute>} />
                <Route path="/personal/employer/jobs/:id/applicants" element={<ProtectedRoute><JobApplicantsPage /></ProtectedRoute>} />
                <Route path="/personal/create-cv" element={<ProtectedRoute><CreateCVPage /></ProtectedRoute>} />
                <Route path="/connect-website" element={<ProtectedRoute><ConnectWebsitePage /></ProtectedRoute>} />
                <Route path="/personal/connect-website" element={<ProtectedRoute><ConnectWebsitePage /></ProtectedRoute>} />
                <Route path="/personal/employees" element={<ProtectedRoute><PersonalEmployeesPage /></ProtectedRoute>} />
                <Route path="/personal/schedule" element={<ProtectedRoute><PersonalSchedulePage /></ProtectedRoute>} />
                <Route path="/personal/timesheet" element={<ProtectedRoute><PersonalTimesheetPage /></ProtectedRoute>} />
                <Route path="/personal/pay-stubs" element={<ProtectedRoute><PersonalPayStubsPage /></ProtectedRoute>} />
                <Route path="/personal/notifications" element={<ProtectedRoute><PersonalNotificationsPage /></ProtectedRoute>} />
                <Route path="/personal/help" element={<ProtectedRoute><PersonalHelpPage /></ProtectedRoute>} />
                <Route path="/personal/settings" element={<ProtectedRoute><PersonalSettingsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/employees" element={<ProtectedRoute><ShopEmployeesPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/employees/:id" element={<ProtectedRoute><ShopEmployeeDetailPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/payroll" element={<ProtectedRoute><ShopPayrollPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/employee-schedule" element={<ProtectedRoute><ShopEmployeeSchedulePage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/time-clock" element={<ProtectedRoute><ShopTimeClockPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/employee-rules" element={<ProtectedRoute><ShopEmployeeRulesPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/attendance" element={<ProtectedRoute><ShopAttendancePage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/training" element={<ProtectedRoute><ShopTrainingPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/performance" element={<ProtectedRoute><ShopPerformancePage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/documents" element={<ProtectedRoute><ShopDocumentsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/truck" element={<ProtectedRoute><TruckDashboardPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/attribution" element={<ProtectedRoute><SalesAttributionPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/sandbox" element={<ProtectedRoute><SandboxModePage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/roi" element={<ProtectedRoute><MerchantROIDashboard /></ProtectedRoute>} />
                <Route path="/shop-dashboard/refer" element={<ProtectedRoute><ReferAShopPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/products" element={<ProtectedRoute><ShopProductsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/orders" element={<ProtectedRoute><ShopOrdersPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/settings" element={<ProtectedRoute><ShopSettingsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/promotions" element={<ProtectedRoute><ShopPromotionsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/analytics" element={<ProtectedRoute><ShopAnalyticsPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/delivery" element={<ProtectedRoute><ShopDeliveryPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />

                {/* Legacy redirects */}
                <Route path="/book-flight" element={<PreserveQueryRedirect to="/flights" />} />
                <Route path="/book-hotel" element={<PreserveQueryRedirect to="/hotels" />} />
                <Route path="/travel-extras" element={<PreserveQueryRedirect to="/extras" />} />
                <Route path="/rides" element={<PreserveQueryRedirect to="/rides/hub" />} />
                <Route path="/rides/track/:tripId" element={<ProtectedRoute><PhoneRequiredGate><CambodiaOnlyGate><RideTrackingPage /></CambodiaOnlyGate></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/trip-status/:id" element={<ProtectedRoute><PhoneRequiredGate><CambodiaOnlyGate><TripStatusPage /></CambodiaOnlyGate></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/rides/hub" element={<ProtectedRoute><PhoneRequiredGate><CambodiaOnlyGate><RideHubPage /></CambodiaOnlyGate></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/ride" element={<PreserveQueryRedirect to="/rides/hub" />} />
                <Route path="/eats" element={<ProtectedRoute><PhoneRequiredGate><EatsLanding /></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/eats/restaurant/:id" element={<ProtectedRoute><EatsLanding /></ProtectedRoute>} />
                <Route path="/eats/reserve" element={<ProtectedRoute><PhoneRequiredGate><ReservationPage /></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/eats/reserve/:restaurantId" element={<ProtectedRoute><PhoneRequiredGate><ReservationPage /></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/eats/track/:orderId" element={<ProtectedRoute><EatsTrackingPage /></ProtectedRoute>} />
                <Route path="/eats/orders" element={<ProtectedRoute><EatsOrdersPage /></ProtectedRoute>} />
                <Route path="/eats/restaurant-dashboard" element={<AdminShellRoute vertical="restaurant" title="Restaurant Dashboard | ZIVO Admin"><EatsRestaurantDashboard /></AdminShellRoute>} />
                <Route path="/eats/driver-deliveries" element={<ProtectedRoute><EatsDriverDeliveryPage /></ProtectedRoute>} />
                <Route path="/food" element={<PreserveQueryRedirect to="/eats" />} />
                <Route path="/move" element={<PreserveQueryRedirect to="/rides/hub" />} />
                <Route path="/search" element={<PreserveQueryRedirect to="/flights" />} />
                <Route path="/my-trips-legacy" element={<PreserveQueryRedirect to="/trips" />} />
                <Route path="/account" element={<PreserveQueryRedirect to="/profile" />} />
                <Route path="/alerts" element={<PreserveQueryRedirect to="/notifications" />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/delivery/track/:id" element={<ProtectedRoute><DeliveryTrackingPage /></ProtectedRoute>} />
                <Route path="/delivery/track/:id/chat" element={<ProtectedRoute><DeliveryChatPage /></ProtectedRoute>} />
                <Route path="/grocery" element={<GroceryMarketplace />} />
                <Route path={SOCIAL_ROUTE_PATHS.feed} element={<ReelsFeedPage />} />
                <Route path="/feed-new" element={<SocialFeedPage />} />
                <Route path={SOCIAL_ROUTE_PATHS.reels} element={<FeedPage />} />
                <Route path="/live" element={<LiveStreamPage />} />
                <Route path="/go-live" element={<GoLivePage />} />
                <Route path="/pair/:token" element={<PairPage />} />
                <Route path="/estimate/:token" element={<EstimateApprovalPage />} />
                <Route path="/repair/:token" element={<RepairStatusPage />} />
                <Route path={SOCIAL_ROUTE_PATHS.reelDetail} element={<FeedPage />} />
                <Route path="/sound/:soundName" element={<SoundPage />} />
                <Route path="/dl/:kind/:id" element={<DeepLinkLandingPage />} />
                <Route path="/stories/:storyId" element={<StoryDeepLinkPage />} />
                <Route path="/shop/:storeId" element={<StoreProfilePage />} />
                
                <Route path="/refer" element={<ProtectedRoute><ReferAFriendPage /></ProtectedRoute>} />
                <Route path={SOCIAL_ROUTE_PATHS.chat} element={<ProtectedRoute><ChatHubPage /></ProtectedRoute>} />
                <Route path="/chat/saved" element={<ProtectedRoute><ChatHubPage /></ProtectedRoute>} />
                <Route path="/chat/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/chat/contacts/requests" element={<ProtectedRoute><ContactRequestsPage /></ProtectedRoute>} />
                <Route path="/chat/message-requests" element={<ProtectedRoute><MessageRequestsPage /></ProtectedRoute>} />
                <Route path="/chat/nearby" element={<ProtectedRoute><NearbyChatPage /></ProtectedRoute>} />
                <Route path="/chat/find-contacts" element={<ProtectedRoute><FindContactsPage /></ProtectedRoute>} />
                <Route path="/chat/find-username" element={<ProtectedRoute><FindByUsernamePage /></ProtectedRoute>} />
                <Route path="/chat/blocked" element={<ProtectedRoute><BlockedUsersPage /></ProtectedRoute>} />
                <Route path="/chat/bots" element={<ProtectedRoute><BotFatherPage /></ProtectedRoute>} />
                <Route path="/chat/bots/discover" element={<ProtectedRoute><BotDiscoverPage /></ProtectedRoute>} />
                <Route path="/chat/bots/admin" element={<ProtectedRoute><BotAdminPage /></ProtectedRoute>} />
                <Route path="/chat/bots/collections/:slug" element={<ProtectedRoute><BotCollectionPage /></ProtectedRoute>} />
                <Route path="/chat/bots/inbox" element={<ProtectedRoute><BotInboxPage /></ProtectedRoute>} />
                <Route path="/chat/bots/:id" element={<ProtectedRoute><BotDetailPage /></ProtectedRoute>} />
                <Route path="/b/:username" element={<BotPublicProfilePage />} />
                <Route path="/chat/join/:code" element={<JoinGroupPage />} />
                <Route path="/chat/secret/:partnerId" element={<ProtectedRoute><SecretChatPage /></ProtectedRoute>} />
                <Route path="/chat/call/group/:roomName" element={<ProtectedRoute><GroupCallEntryPage /></ProtectedRoute>} />
                <Route path="/chat/group-call/:roomName" element={<ProtectedRoute><GroupCallEntryPage /></ProtectedRoute>} />
                <Route path="/chat/recordings" element={<ProtectedRoute><RecordingsPage /></ProtectedRoute>} />
                <Route path="/chat/search" element={<ProtectedRoute><ChatSearchPage /></ProtectedRoute>} />
                <Route path="/channels" element={<ChannelsDirectoryPage />} />
                <Route path="/channels/new" element={<ProtectedRoute><NewChannelPage /></ProtectedRoute>} />
                <Route path="/c/:handle" element={<ChannelPage />} />
                <Route path="/c/:handle/manage" element={<ProtectedRoute><ManageChannelPage /></ProtectedRoute>} />
                <Route path="/chat/settings/privacy" element={<ProtectedRoute><PrivacySecurityPage /></ProtectedRoute>} />
                <Route path="/chat/settings/sessions" element={<ProtectedRoute><ActiveSessionsPage /></ProtectedRoute>} />
                <Route path="/chat/settings/two-step" element={<ProtectedRoute><TwoStepSetupPage /></ProtectedRoute>} />
                <Route path="/chat/settings/passcode" element={<ProtectedRoute><PasscodeSetupPage /></ProtectedRoute>} />
                <Route path="/chat/settings/login-alerts" element={<ProtectedRoute><LoginAlertsPage /></ProtectedRoute>} />
                <Route path="/chat/settings/privacy-hub" element={<ProtectedRoute><ChatPrivacyHubPage /></ProtectedRoute>} />
                <Route path="/chat/search" element={<ProtectedRoute><ChatSearchAllPage /></ProtectedRoute>} />
                <Route path="/chat/folders" element={<ProtectedRoute><CustomFoldersPage /></ProtectedRoute>} />
                <Route path="/chat/broadcasts" element={<ProtectedRoute><BroadcastListsPage /></ProtectedRoute>} />
                <Route path="/chat/broadcasts/new" element={<ProtectedRoute><NewBroadcastPage /></ProtectedRoute>} />
                <Route path="/chat/settings/storage" element={<ProtectedRoute><StorageManagerPage /></ProtectedRoute>} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/saved" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
                <Route path="/creators" element={<ProtectedRoute><CreatorDashboardPage /></ProtectedRoute>} />
                <Route path="/creator-dashboard" element={<ProtectedRoute><CreatorDashboardPage /></ProtectedRoute>} />
                <Route path="/creator/setup" element={<ProtectedRoute><CreatorSetupPage /></ProtectedRoute>} />
                <Route path="/creator-analytics" element={<ProtectedRoute><CreatorAnalyticsPage /></ProtectedRoute>} />
                <Route path="/creator/live-earnings" element={<ProtectedRoute><CreatorLiveEarningsPage /></ProtectedRoute>} />
                <Route path="/creator/subscribers" element={<ProtectedRoute><CreatorSubscribersPage /></ProtectedRoute>} />
                <Route path="/creator/tips" element={<ProtectedRoute><CreatorTipsPage /></ProtectedRoute>} />
                <Route path="/affiliate-hub" element={<ProtectedRoute><AffiliateHubPage /></ProtectedRoute>} />
                <Route path="/digital-products" element={<ProtectedRoute><DigitalProductsPage /></ProtectedRoute>} />
                <Route path="/monetization" element={<ProtectedRoute><MonetizationPage /></ProtectedRoute>} />
                <Route path="/monetization/articles" element={<ProtectedRoute><MonetizationArticlesPage /></ProtectedRoute>} />
                <Route path="/monetization/articles/:slug" element={<ProtectedRoute><MonetizationArticleDetailPage /></ProtectedRoute>} />
                <Route path="/monetization/program/:programId" element={<ProtectedRoute><ProgramDetailPage /></ProtectedRoute>} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/communities" element={<CommunitiesPage />} />
                <Route path="/communities/:id" element={<CommunityDetailPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/orders" element={<ProtectedRoute><MarketplaceOrdersPage /></ProtectedRoute>} />
                <Route path="/shop" element={<ImportShopPage />} />
                <Route path="/shop/product/:id" element={<ImportProductPage />} />
                <Route path="/shop/cart" element={<ImportCartPage />} />
                <Route path="/shop/orders" element={<ProtectedRoute><ImportOrdersPage /></ProtectedRoute>} />
                <Route path="/shop/orders/:id" element={<ProtectedRoute><ImportOrdersPage /></ProtectedRoute>} />
                <Route path="/admin" element={<Navigate to="/admin/god-view" replace />} />
                <Route path="/admin/shop" element={<ProtectedRoute requireAdmin={true}><AdminImportShopPage /></ProtectedRoute>} />
                <Route path="/content-analytics" element={<ProtectedRoute><ContentAnalyticsPage /></ProtectedRoute>} />
                <Route path="/dating" element={<ProtectedRoute><DatingPage /></ProtectedRoute>} />
                <Route path="/spaces" element={<AudioSpacesPage />} />
                <Route path="/smart-search" element={<SmartSearchPage />} />
                <Route path="/notification-center" element={<ProtectedRoute><NotificationCenterPage /></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><ActivityFeedPage /></ProtectedRoute>} />
                <Route path="/admin/moderation" element={<ProtectedRoute requireAdmin={true}><AdminModerationPage /></ProtectedRoute>} />
                <Route path="/admin/reviews/moderation" element={<ProtectedRoute requireAdmin={true}><ReviewModerationDashboard /></ProtectedRoute>} />
                <Route path="/admin/launch" element={<ProtectedRoute requireAdmin={true}><AdminLaunchDashboard /></ProtectedRoute>} />
                <Route path="/content-scheduler" element={<ProtectedRoute><ContentSchedulerPage /></ProtectedRoute>} />
                <Route path="/story-polls" element={<ProtectedRoute><StoryPollsPage /></ProtectedRoute>} />
                
                <Route path="/badges" element={<BadgesPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/wellness" element={<ProtectedRoute><WellnessPage /></ProtectedRoute>} />
                <Route path="/wellness/:section" element={<ProtectedRoute><WellnessPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppSettingsPage /></ProtectedRoute>} />
                <Route path="/account/privacy" element={<ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>} />
                <Route path="/watch-party" element={<WatchPartyPage />} />
                <Route path="/whiteboard" element={<WhiteboardPage />} />
                <Route path="/qr-profile" element={<ProtectedRoute><QRProfilePage /></ProtectedRoute>} />
                <Route path="/link-hub" element={<ProtectedRoute><LinkHubPage /></ProtectedRoute>} />
                <Route path="/nearby" element={<NearbyPage />} />
                <Route path="/check-in" element={<ProtectedRoute><CheckInPage /></ProtectedRoute>} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/auto-repair" element={<AutoRepairPage />} />
                <Route path="/safety" element={<ProtectedRoute><SafetyCenterPage /></ProtectedRoute>} />
                <Route path="/drafts" element={<ProtectedRoute><DraftsPage /></ProtectedRoute>} />
                <Route path="/account/analytics" element={<ProtectedRoute><AccountAnalyticsPage /></ProtectedRoute>} />
                <Route path="/account/verification" element={<ProtectedRoute><VerificationRequestPage /></ProtectedRoute>} />
                <Route path="/account/activity-log" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
                <Route path="/account/export" element={<ProtectedRoute><AccountExportPage /></ProtectedRoute>} />
                <Route path="/store-map" element={<StoreMapPage />} />
                <Route path="/store-map/list" element={<StoresListPage />} />
                <Route path="/book/:slug" element={<ServiceBookingPage />} />
                <Route path="/salon/:slug" element={<PublicSalonBookingPage />} />
                <Route path="/car-rental/:slug" element={<PublicCarRentalBookingPage />} />
                <Route path="/car-rental-booking" element={<PublicCarRentalBookingDetailPage />} />
                <Route path="/car-rental-booking/:code" element={<PublicCarRentalBookingDetailPage />} />
                <Route path="/admin/stores/:storeId/car-rental-daily-sheet" element={<CarRentalDailySheetPage />} />
                <Route path="/admin/stores/:storeId/car-rental-receipt/:reservationId" element={<CarRentalReceiptPage />} />
                <Route path="/car-rental-review/:reservationId" element={<PublicCarRentalReviewSubmitPage />} />
                <Route path="/my-rentals" element={<MyCarRentalsPage />} />
                <Route path="/cafe/:slug/gift-card-check" element={<CafeGiftCardCheckPage />} />
                <Route path="/cafe/:slug/about" element={<CafeStorefrontPage />} />
                <Route path="/cafe/:slug/reserve" element={<CafeReservePage />} />
                <Route path="/cafe/:slug" element={<PublicCafeOrderPage />} />
                <Route path="/cafe/receipt/:orderId" element={<CafeReceiptPage />} />
                <Route path="/cafe/kitchen-ticket/:orderId" element={<CafeKitchenTicketPage />} />
                <Route path="/cafe/order/:orderId" element={<CafeOrderStatusPage />} />
                <Route path="/cafe/review/:orderId" element={<CafeReviewSubmitPage />} />
                <Route path="/admin/cafe-summary/:storeId/:date" element={<CafeDailySummaryPage />} />
                <Route path="/admin/cafe-qr-sheet/:storeId" element={<CafeQrSheetPage />} />
                <Route path="/booking/:id" element={<PublicSalonBookingDetailPage />} />
                <Route path="/admin/salon-receipt/:bookingId" element={<SalonReceiptPage />} />
                <Route path="/admin/salon-schedule/:storeId/:date" element={<SalonDailySchedulePage />} />
                <Route path="/admin/salon-summary/:storeId/:date" element={<SalonDailySummaryPage />} />
                <Route path="/admin/salon-queue/:storeId" element={<SalonQueueDisplayPage />} />
                <Route path="/gift-card" element={<SalonGiftCardCheckPage />} />
                <Route path="/stylist/:stylistId" element={<PublicStylistDayPage />} />
                <Route path="/review/:bookingId" element={<PublicReviewSubmitPage />} />
                <Route path="/grocery/store/:slug" element={<GroceryStorePage />} />
                <Route path="/grocery/shop/:slug" element={<StoreProfilePage />} />
                <Route path="/store/:slug" element={<StoreProfilePage />} />
                <Route path="/grocery/order-placed" element={<GroceryOrderPlaced />} />
                <Route path="/grocery/order-confirmed" element={<GroceryOrderConfirmed />} />
                <Route path="/grocery/orders" element={<GroceryOrderHistory />} />
                <Route path="/grocery/track/:orderId" element={<GroceryOrderTracking />} />
                <Route path="/grocery/terms" element={<GroceryTerms />} />
                <Route path="/grocery/returns" element={<GroceryReturns />} />
                <Route path="/grocery/fees" element={<GroceryFees />} />
                <Route path="/zivo-plus" element={<ZivoPlusPage />} />
                <Route path="/drive" element={<CambodiaOnlyGate><DrivePage /></CambodiaOnlyGate>} />
                <Route path="/driver/orders" element={<DriverOrdersPage />} />
                <Route path="/driver/shopping/:orderId" element={<DriverShoppingList />} />
                <Route path="/driver/shop/:orderId" element={<DriverShopPage />} />
                <Route path="/driver/home" element={<DriverHomePage />} />
                <Route path="/driver/earnings" element={<DriverEarningsPage />} />
                <Route path="/driver/payouts" element={<ProtectedRoute><DriverPayoutsPage /></ProtectedRoute>} />
                <Route path="/driver/onboarding/documents" element={<ProtectedRoute><DriverOnboardingDocumentsPage /></ProtectedRoute>} />
                <Route path="/admin/ads/google" element={<ProtectedRoute requireAdmin={true}><AdminGoogleAdsPage /></ProtectedRoute>} />
                <Route path="/admin/ads/meta" element={<ProtectedRoute requireAdmin={true}><AdminMetaAdsPage /></ProtectedRoute>} />
                <Route path="/admin/ads/analytics" element={<ProtectedRoute requireAdmin={true}><AdminAdsAnalyticsPage /></ProtectedRoute>} />
                <Route path="/admin/marketing/campaigns" element={<ProtectedRoute requireAdmin={true}><AdminMarketingCampaignsPage /></ProtectedRoute>} />
                <Route path="/admin/marketing/promo-codes" element={<ProtectedRoute requireAdmin={true}><AdminPromoCodesPage /></ProtectedRoute>} />
                <Route path="/admin/marketing/broadcast" element={<ProtectedRoute requireAdmin={true}><AdminBroadcastPage /></ProtectedRoute>} />
                <Route path="/admin/feedback" element={<ProtectedRoute requireAdmin={true}><AdminFeedbackReplyPage /></ProtectedRoute>} />
                <Route path="/admin/stores/verification" element={<ProtectedRoute requireAdmin={true}><AdminStoreVerificationPage /></ProtectedRoute>} />
                <Route path="/admin/partners/applications" element={<ProtectedRoute requireAdmin={true}><AdminPartnerApplicationsPage /></ProtectedRoute>} />
                <Route path="/admin/finance/summary" element={<ProtectedRoute requireAdmin={true}><AdminFinanceSummaryPage /></ProtectedRoute>} />
                <Route path="/admin/payments/webhook-status" element={<ProtectedRoute requireAdmin={true}><AdminWebhookStatusPage /></ProtectedRoute>} />
                <Route path="/admin/drivers/verification" element={<ProtectedRoute requireAdmin={true}><AdminDriverVerificationPage /></ProtectedRoute>} />
                <Route path="/admin/drivers/moderation" element={<ProtectedRoute requireAdmin={true}><AdminDriverModerationPage /></ProtectedRoute>} />
                <Route path="/admin/operations/heatmap" element={<ProtectedRoute requireAdmin={true}><AdminTripHeatmapPage /></ProtectedRoute>} />
                <Route path="/admin/payments/refunds" element={<ProtectedRoute requireAdmin={true}><AdminRefundsPage /></ProtectedRoute>} />
                <Route path="/admin/moderation/messages" element={<ProtectedRoute requireAdmin={true}><AdminMessageModerationPage /></ProtectedRoute>} />
                <Route path="/admin/operations/call-closures" element={<ProtectedRoute requireAdmin={true}><AdminCallClosuresPage /></ProtectedRoute>} />
                <Route path="/admin/qa/moderation" element={<ProtectedRoute requireAdmin={true}><AdminModerationQAPage /></ProtectedRoute>} />
                <Route path="/admin/qa/marketing-responsive" element={<ProtectedRoute requireAdmin={true}><AdminMarketingResponsiveQA /></ProtectedRoute>} />
                <Route path="/track/:token" element={<SharedTripPage />} />
                <Route path="/driver/performance" element={<DriverPerformancePage />} />
                <Route path="/driver/map" element={<DriverMapPage />} />
                <Route path="/package-delivery" element={<PreserveQueryRedirect to="/delivery" />} />
                <Route path="/admin/shopping-orders" element={<ProtectedRoute requireAdmin={true}><AdminShoppingOrders /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin={true}><AdminAnalyticsDashboard /></ProtectedRoute>} />
                <Route path="/admin/feed-diagnostics" element={<ProtectedRoute requireAdmin={true}><AdminFeedDiagnosticsPage /></ProtectedRoute>} />
                <Route path="/admin/notifications/analytics" element={<ProtectedRoute requireAdmin={true}><AdminNotificationAnalyticsPage /></ProtectedRoute>} />
                <Route path="/admin/stories-funnel" element={<ProtectedRoute requireAdmin={true}><AdminStoriesFunnelPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/pricing" element={<ProtectedRoute requireAdmin={true}><AdminPricingPage /></ProtectedRoute>} />
                <Route path="/admin/remote-config" element={<ProtectedRoute requireAdmin={true}><AdminRemoteConfigPage /></ProtectedRoute>} />
                <Route path="/admin/flight-orders" element={<ProtectedRoute requireAdmin={true}><AdminFlightOrders /></ProtectedRoute>} />
                <Route path="/admin/flight-searches" element={<ProtectedRoute requireAdmin={true}><AdminFlightSearchAnalytics /></ProtectedRoute>} />
                <Route path="/admin/flight-api" element={<ProtectedRoute requireAdmin={true}><AdminFlightApiMonitoring /></ProtectedRoute>} />
                <Route path="/admin/flight-price-alerts" element={<ProtectedRoute requireAdmin={true}><AdminFlightPriceAlerts /></ProtectedRoute>} />
                <Route path="/admin/stores" element={<ProtectedRoute requireAdmin={true}><AdminStoresPage /></ProtectedRoute>} />
                <Route path="/admin/stores/:storeId" element={<ProtectedRoute requireAdmin={true} allowStoreOwner={true}><AdminStoreEditPage /></ProtectedRoute>} />
                <Route path="/admin/stores/:storeId/upload-check" element={<ProtectedRoute requireAdmin={true}><StoreAssetsUploadCheck /></ProtectedRoute>} />
                <Route path="/admin/stores/:storeId/lodging/reservations/:reservationId" element={<ProtectedRoute requireAdmin={true}><AdminLodgingReservationDetailPage /></ProtectedRoute>} />
                <Route path="/admin/lodging/qa-checklist" element={<ProtectedRoute requireAdmin={true}><AdminLodgingQAChecklistPage /></ProtectedRoute>} />
                <Route path="/admin/lodging/completion-verification" element={<ProtectedRoute requireAdmin={true}><AdminLodgingCompletionVerificationPage /></ProtectedRoute>} />
                <Route path="/admin/security/blocked-links" element={<ProtectedRoute requireAdmin={true}><AdminBlockedLinksPage /></ProtectedRoute>} />
                <Route path="/admin/security/threat-history" element={<ProtectedRoute requireAdmin={true}><AdminThreatHistoryPage /></ProtectedRoute>} />
                <Route path="/admin/security/csp-violations" element={<ProtectedRoute requireAdmin={true}><AdminCspViolationsPage /></ProtectedRoute>} />
                <Route path="/admin/security/audit" element={<ProtectedRoute requireAdmin={true}><AdminSecurityAuditPage /></ProtectedRoute>} />
                <Route path="/admin/security/notifications" element={<ProtectedRoute requireAdmin={true}><AdminSecurityNotificationsPage /></ProtectedRoute>} />
                <Route path="/admin/security" element={<ProtectedRoute requireAdmin={true}><AdminSecurityOverviewPage /></ProtectedRoute>} />
                <Route path="/admin/lodging/wiring-check" element={<ProtectedRoute requireAdmin={true}><AdminLodgingWiringCheckPage /></ProtectedRoute>} />
                <Route path="/admin/lodging/webhook-events" element={<ProtectedRoute requireAdmin={true}><AdminLodgingWebhookEventsPage /></ProtectedRoute>} />
                <Route path="/store/setup" element={<ProtectedRoute><StoreSetup /></ProtectedRoute>} />
                <Route path="/business/new" element={<ProtectedRoute><BusinessPageWizard /></ProtectedRoute>} />
                <Route path="/business/software/:storeId" element={<ProtectedRoute><BusinessSoftwareDownloadPage /></ProtectedRoute>} />
                <Route path="/desktop/auto-repair/:storeId" element={<ProtectedRoute requireAdmin={true} allowStoreOwner={true}><AutoRepairDesktopAppPage /></ProtectedRoute>} />
                <Route path="/admin/employees" element={<ProtectedRoute requireAdmin={true}><AdminEmployeesPage /></ProtectedRoute>} />
                <Route path="/admin/wallet" element={<ProtectedRoute requireAdmin={true}><AdminWalletPage /></ProtectedRoute>} />
                <Route path="/admin/system-health" element={<ProtectedRoute requireAdmin={true}><AdminSystemHealth /></ProtectedRoute>} />
                <Route path="/admin/app-store-assets" element={<ProtectedRoute requireAdmin={true}><AdminAppStoreAssets /></ProtectedRoute>} />
                <Route path="/admin/android-verification" element={<ProtectedRoute requireAdmin={true}><AdminAndroidVerification /></ProtectedRoute>} />
                <Route path="/admin/support" element={<ProtectedRoute requireAdmin={true}><AdminSupportDashboard /></ProtectedRoute>} />
                <Route path="/admin/user-accounts" element={<ProtectedRoute requireAdmin={true}><AdminUserAccounts /></ProtectedRoute>} />
                <Route path="/shop-dashboard/boost" element={<ProtectedRoute><AdBoostBidding /></ProtectedRoute>} />
                <Route path="/shop-dashboard/boost-engine" element={<ProtectedRoute><MerchantBoostEngine /></ProtectedRoute>} />
                <Route path="/shop-dashboard/ai-creative" element={<ProtectedRoute><AiCreativeSuite /></ProtectedRoute>} />
                <Route path="/shop-dashboard/ai-content" element={<ProtectedRoute><AiContentSuite /></ProtectedRoute>} />
                <Route path="/shop-dashboard/wallet" element={<ProtectedRoute><MerchantWalletPage /></ProtectedRoute>} />
                <Route path="/shop-dashboard/tax-reports" element={<ProtectedRoute><MerchantTaxReportPage /></ProtectedRoute>} />
                <Route path="/admin/god-view" element={<ProtectedRoute requireAdmin={true}><AdminGodView /></ProtectedRoute>} />
                <Route path="/admin/chat-security" element={<ProtectedRoute requireAdmin={true}><AdminChatSecurityPage /></ProtectedRoute>} />
                <Route path="/admin/security-sentinel" element={<ProtectedRoute requireAdmin={true}><AdminSecuritySentinelPage /></ProtectedRoute>} />
                <Route path="/admin/auth-shield" element={<ProtectedRoute requireAdmin={true}><AdminAuthShieldPage /></ProtectedRoute>} />
                <Route path="/events" element={<PreserveQueryRedirect to="/things-to-do" />} />
                <Route path="/ground-transport" element={<PreserveQueryRedirect to="/car-rental" />} />
                <Route path="/insurance" element={<PreserveQueryRedirect to="/travel-insurance" />} />

                {/* Flights */}
                <Route path="/flights" element={<RouteErrorBoundary section="Flights"><FlightLanding /></RouteErrorBoundary>} />
                <Route path="/flights/from-:fromCity" element={<RouteErrorBoundary section="Flights"><FlightLanding /></RouteErrorBoundary>} />
                <Route path="/flights/to-:toCity" element={<RouteErrorBoundary section="Flights"><FlightLanding /></RouteErrorBoundary>} />
                <Route path="/flights/to/:citySlug" element={<RouteErrorBoundary section="Flights"><FlightToCity /></RouteErrorBoundary>} />
                <Route path="/flights/cities/:citySlug" element={<RouteErrorBoundary section="Flights"><FlightCityPage /></RouteErrorBoundary>} />
                <Route path="/flights/:origin-to-:destination" element={<RouteErrorBoundary section="Flights"><FlightRoutePage /></RouteErrorBoundary>} />
                <Route path="/flights/:route" element={<RouteErrorBoundary section="Flights"><FlightLanding /></RouteErrorBoundary>} />
                <Route path="/flights/results" element={<RouteErrorBoundary section="Flights"><FlightResults /></RouteErrorBoundary>} />
                <Route path="/flights/live" element={<RouteErrorBoundary section="Flights"><FlightLive /></RouteErrorBoundary>} />
                <Route path="/flights/details/review" element={<RouteErrorBoundary section="Flights"><FlightReview /></RouteErrorBoundary>} />
                <Route path="/flights/details/:id" element={<RouteErrorBoundary section="Flights"><FlightDetails /></RouteErrorBoundary>} />
                <Route path="/flights/traveler" element={<RouteErrorBoundary section="Flights"><FlightTravelerInfo /></RouteErrorBoundary>} />
                <Route path="/flights/traveler-info" element={<RouteErrorBoundary section="Flights"><FlightTravelerInfo /></RouteErrorBoundary>} />
                <Route path="/flights/checkout" element={<RouteErrorBoundary section="Flights"><PhoneRequiredGate><FlightCheckout /></PhoneRequiredGate></RouteErrorBoundary>} />
                <Route path="/flights/confirmation/:bookingId" element={<RouteErrorBoundary section="Flights"><FlightConfirmation /></RouteErrorBoundary>} />
                <Route path="/flights/bookings" element={<RouteErrorBoundary section="Flights"><FlightBookingsPage /></RouteErrorBoundary>} />
                {/* flights-dashboard removed */}
                <Route path="/airports/:iata" element={<RouteErrorBoundary section="Flights"><AirportPage /></RouteErrorBoundary>} />
                <Route path="/booking/duffel-checkout" element={<RouteErrorBoundary section="Checkout"><DuffelCheckout /></RouteErrorBoundary>} />
                {/* /checkout removed — partners block iframe; redirect model used instead */}

                {/* Hotels */}
                <Route path="/hotels/:city" element={<RouteErrorBoundary section="Hotels"><CambodiaOnlyGate><HotelCityLandingPage /></CambodiaOnlyGate></RouteErrorBoundary>} />
                <Route path="/hotel/:storeId" element={<RouteErrorBoundary section="HotelDetail"><CambodiaOnlyGate><HotelResortDetailPage /></CambodiaOnlyGate></RouteErrorBoundary>} />
                <Route path="/hotel/:storeId/book" element={<ProtectedRoute><RouteErrorBoundary section="HotelCheckout"><CambodiaOnlyGate><HotelRoomCheckoutPage /></CambodiaOnlyGate></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/hotel/:storeId/booking-confirmed" element={<ProtectedRoute><RouteErrorBoundary section="HotelBookingConfirmed"><CambodiaOnlyGate><HotelBookingConfirmedPage /></CambodiaOnlyGate></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/hotels" element={<RouteErrorBoundary section="HotelsLanding"><CambodiaOnlyGate><HotelsLandingPage /></CambodiaOnlyGate></RouteErrorBoundary>} />
                <Route path="/hotels-list" element={<RouteErrorBoundary section="HotelsDirectory"><CambodiaOnlyGate><HotelsResortsDirectoryPage /></CambodiaOnlyGate></RouteErrorBoundary>} />
                {/* /hotels and /hotels/in-:city removed */}

                {/* Car Rental */}
                <Route path="/car-rental" element={<RouteErrorBoundary section="Cars"><CarRentalLanding /></RouteErrorBoundary>} />
                <Route path="/car-rental/in-:location" element={<RouteErrorBoundary section="Cars"><CarRentalLanding /></RouteErrorBoundary>} />
                <Route path="/rent-car" element={<RouteErrorBoundary section="Cars"><CarRentalBooking /></RouteErrorBoundary>} />
                <Route path="/rent-car/results" element={<RouteErrorBoundary section="Cars"><CarResultsPage /></RouteErrorBoundary>} />
                <Route path="/rent-car/detail" element={<RouteErrorBoundary section="Cars"><CarDetailPage /></RouteErrorBoundary>} />
                <Route path="/rent-car/traveler-info" element={<RouteErrorBoundary section="Cars"><CarTravelerInfoPage /></RouteErrorBoundary>} />
                <Route path="/rent-car/checkout" element={<RouteErrorBoundary section="Cars"><CarCheckoutPage /></RouteErrorBoundary>} />
                <Route path="/rent-car/confirmation" element={<RouteErrorBoundary section="Cars"><CarConfirmationPage /></RouteErrorBoundary>} />
                <Route path="/rent-car/:city" element={<RouteErrorBoundary section="Cars"><CarRentalLanding /></RouteErrorBoundary>} />
                <Route path="/cars" element={<RouteErrorBoundary section="Cars"><Cars /></RouteErrorBoundary>} />
                <Route path="/cars/search" element={<RouteErrorBoundary section="Cars"><CarsSearchPage /></RouteErrorBoundary>} />
                <Route path="/cars/:id" element={<RouteErrorBoundary section="Cars"><CarsDetailPage /></RouteErrorBoundary>} />
                <Route path="/cars/:id/checkout" element={<ProtectedRoute><RouteErrorBoundary section="Cars"><CarRentalCheckoutPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/cars/:id/booking-confirmed" element={<RouteErrorBoundary section="Cars"><CarRentalConfirmedPage /></RouteErrorBoundary>} />
                <Route path="/how-to-rent" element={<RouteErrorBoundary section="Cars"><HowToRent /></RouteErrorBoundary>} />

                {/* Travel Checkout */}
                <Route path="/travel/checkout" element={<RouteErrorBoundary section="Checkout"><PhoneRequiredGate><TravelCheckoutPage /></PhoneRequiredGate></RouteErrorBoundary>} />
                <Route path="/confirmation/:orderNumber" element={<RouteErrorBoundary section="Checkout"><TravelConfirmationPage /></RouteErrorBoundary>} />
                <Route path="/my-trips/lodging/:reservationId" element={<ProtectedRoute><RouteErrorBoundary section="Lodging"><MyLodgingTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/cars/:bookingId" element={<ProtectedRoute><RouteErrorBoundary section="Cars"><MyCarTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/flights/:bookingId" element={<ProtectedRoute><RouteErrorBoundary section="Flights"><MyFlightTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/hotels/:bookingId" element={<ProtectedRoute><RouteErrorBoundary section="Hotels"><MyHotelTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/restaurants/:bookingId" element={<ProtectedRoute><RouteErrorBoundary section="Restaurants"><MyRestaurantTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/activities/:bookingId" element={<ProtectedRoute><RouteErrorBoundary section="Activities"><MyActivityTripPage /></RouteErrorBoundary></ProtectedRoute>} />
                <Route path="/my-trips/:orderNumber" element={<RouteErrorBoundary section="Checkout"><TravelOrderDetailPage /></RouteErrorBoundary>} />

                {/* Extras */}
                <Route path="/things-to-do" element={<ThingsToDo />} />
                <Route path="/activities" element={<ThingsToDo />} />
                <Route path="/experiences" element={<ThingsToDo />} />
                <Route path="/travel-insurance" element={<TravelInsurance />} />
                <Route path="/extras" element={<TravelExtras />} />

                {/* Auth & Account */}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth-callback" element={<AuthCallback />} />
                <Route path="/onboarding" element={<Onboarding />} />
                
                <Route path="/verify-otp" element={<VerifyOTP />} />
                <Route path="/verify-new-device" element={<VerifyNewDevice />} />
                <Route path="/setup" element={<Setup />} />
                
                <Route path={SOCIAL_ROUTE_PATHS.profile} element={<GuestOrUser guestPreview={<GuestProfilePreview />}><Profile /></GuestOrUser>} />
                <Route path="/more" element={<ProtectedRoute><MorePage /></ProtectedRoute>} />
                <Route path="/profile/delete-account" element={<ProtectedRoute><DeleteAccountPage /></ProtectedRoute>} />
                <Route path="/user/:userId" element={<PublicProfilePage />} />
                <Route path="/@:username" element={<UsernameRedirectPage />} />
                <Route path="/u/:username" element={<UsernameRedirectPage />} />
                <Route path="/p/:code" element={<ShareProfileRedirect />} />
                <Route path="/r/:slug" element={<AffiliateRedirectPage />} />
                <Route path="/events-hub" element={<EventsHubPage />} />
                <Route path="/marketplace-hub" element={<MarketplaceHubPage />} />
                <Route path="/jobs-hub" element={<JobsHubPage />} />
                <Route path="/voice-rooms" element={<VoiceRoomsHubPage />} />
                <Route path="/fitness" element={<FitnessHubPage />} />
                <Route path="/events-hub/create" element={<CreateEventPage />} />
                <Route path="/marketplace-hub/create" element={<CreateListingPage />} />
                <Route path="/jobs-hub/create" element={<CreateJobPage />} />
                <Route path="/voice-rooms/create" element={<StartVoiceRoomPage />} />
                <Route path="/support/new" element={<CreateSupportTicketPage />} />
                <Route path="/traveler" element={<ProtectedRoute><TravelerDashboard /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/saved-searches" element={<ProtectedRoute><SavedSearchesPage /></ProtectedRoute>} />
                <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodsPage /></ProtectedRoute>} />

                {/* Account sub-pages */}
                <Route path="/account/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                <Route path="/account/username" element={<ProtectedRoute><UsernamePage /></ProtectedRoute>} />
                <Route path="/account/legal" element={<LegalPoliciesPage />} />
                <Route path="/account/profile-edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
                <Route path="/account/security" element={<ProtectedRoute><AccountSecurity /></ProtectedRoute>} />
                <Route path="/account/sessions" element={<ProtectedRoute><AccountSessionsPage /></ProtectedRoute>} />
                <Route path="/account/linked-devices" element={<ProtectedRoute><LinkedDevicesPage /></ProtectedRoute>} />
                <Route path="/account/link-device" element={<ProtectedRoute><LinkDevicePage /></ProtectedRoute>} />
                <Route path="/account/scan-device" element={<ProtectedRoute><ScanDevicePage /></ProtectedRoute>} />
                <Route path="/account/data-rights" element={<ProtectedRoute><PrivacyControls /></ProtectedRoute>} />
                <Route path="/account/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                <Route path="/account/referrals" element={<ProtectedRoute><AccountReferralsPage /></ProtectedRoute>} />
                <Route path="/account/wallet" element={<PreserveQueryRedirect to="/wallet" />} />
                <Route path="/account/gift-cards" element={<ProtectedRoute><GiftCardsPage /></ProtectedRoute>} />
                <Route path="/account/gift-cards/success" element={<ProtectedRoute><GiftCardSuccessPage /></ProtectedRoute>} />
                <Route path="/account/travelers" element={<ProtectedRoute><TravelerProfilesPage /></ProtectedRoute>} />
                <Route path="/account/addresses" element={<ProtectedRoute><AccountAddressesPage /></ProtectedRoute>} />
                <Route path="/account/saved-places" element={<ProtectedRoute><AccountAddressesPage /></ProtectedRoute>} />
                <Route path="/account/favorites" element={<ProtectedRoute><AccountFavoritesPage /></ProtectedRoute>} />
                <Route path="/account/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
                <Route path="/account/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
                <Route path="/account/promos" element={<ProtectedRoute><PromosPage /></ProtectedRoute>} />
                <Route path="/account/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
                <Route path="/account/invoices" element={<ProtectedRoute><AccountInvoicesPage /></ProtectedRoute>} />

                {/* Other ComingSoon placeholders */}
                <Route path="/filters" element={<ARFiltersPage />} />
                <Route path="/promote" element={<ProtectedRoute><PromotePage /></ProtectedRoute>} />
                <Route path="/brand-deals" element={<ProtectedRoute><BrandDealsPage /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
                <Route path="/archive" element={<ProtectedRoute><StoryArchivePage /></ProtectedRoute>} />
                <Route path="/highlights" element={<ProtectedRoute><HighlightsPage /></ProtectedRoute>} />
                <Route path="/close-friends" element={<ProtectedRoute><CloseFriendsPage /></ProtectedRoute>} />
                <Route path="/collections" element={<ProtectedRoute><CollectionsPage /></ProtectedRoute>} />
                <Route path="/polls" element={<ProtectedRoute><PollsPage /></ProtectedRoute>} />
                <Route path="/creator/milestones" element={<ProtectedRoute><CreatorMilestonesPage /></ProtectedRoute>} />
                <Route path="/mentions" element={<ProtectedRoute><MentionsPage /></ProtectedRoute>} />
                <Route path="/albums" element={<ProtectedRoute><PostAlbumsPage /></ProtectedRoute>} />
                <Route path="/collabs" element={<ProtectedRoute><CollabsPage /></ProtectedRoute>} />
                <Route path="/stickers" element={<StickerStorePage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
                <Route path="/chat-themes" element={<ProtectedRoute><ChatThemesPage /></ProtectedRoute>} />
                <Route path="/rewards-center" element={<ProtectedRoute><RewardsCenterPage /></ProtectedRoute>} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/creator/earnings" element={<ProtectedRoute><CreatorEarningsPage /></ProtectedRoute>} />
                <Route path="/notifications/preferences" element={<ProtectedRoute><NotificationPrefsPage /></ProtectedRoute>} />
                <Route path="/story-insights" element={<ProtectedRoute><StoryInsightsPage /></ProtectedRoute>} />
                <Route path="/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
                <Route path="/interests" element={<ProtectedRoute><InterestsPage /></ProtectedRoute>} />
                <Route path="/challenges" element={<ChallengesPage />} />
                <Route path="/game-scores" element={<ProtectedRoute><GameScoresPage /></ProtectedRoute>} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/forums" element={<ForumsPage />} />
                <Route path="/playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
                <Route path="/trending" element={<TrendingTopicsPage />} />
                <Route path="/reel-effects" element={<ReelEffectsPage />} />
                <Route path="/places" element={<PlacesPage />} />
                <Route path="/reaction-packs" element={<ReactionPacksPage />} />
                <Route path="/journals" element={<ProtectedRoute><TravelJournalsPage /></ProtectedRoute>} />
                <Route path="/surveys" element={<SurveysPage />} />
                <Route path="/exchange-rates" element={<ExchangeRatesPage />} />
                <Route path="/hashtags" element={<HashtagsDirectoryPage />} />
                <Route path="/coins" element={<ProtectedRoute><CoinWalletPage /></ProtectedRoute>} />
                <Route path="/gifs" element={<GifLibraryPage />} />
                <Route path="/split-bills" element={<ProtectedRoute><SplitBillsPage /></ProtectedRoute>} />
                <Route path="/fitness" element={<ProtectedRoute><FitnessActivitiesPage /></ProtectedRoute>} />
                <Route path="/fan-badges" element={<ProtectedRoute><FanBadgesPage /></ProtectedRoute>} />
                <Route path="/my-unlocks" element={<ProtectedRoute><MyUnlocksPage /></ProtectedRoute>} />
                <Route path="/voice-notes" element={<ProtectedRoute><VoiceNotesPage /></ProtectedRoute>} />
                <Route path="/affiliate-links" element={<ProtectedRoute><AffiliateLinksPage /></ProtectedRoute>} />
                <Route path="/gift-history" element={<ProtectedRoute><GiftHistoryPage /></ProtectedRoute>} />
                <Route path="/shared-todos" element={<ProtectedRoute><SharedTodosPage /></ProtectedRoute>} />
                <Route path="/marketplace-cart" element={<ProtectedRoute><MarketplaceCartPage /></ProtectedRoute>} />
                <Route path="/points-history" element={<ProtectedRoute><PointsHistoryPage /></ProtectedRoute>} />
                <Route path="/moderation-appeals" element={<ProtectedRoute><ModerationAppealsPage /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
                <Route path="/chat-media" element={<ProtectedRoute><ChatMediaGalleryPage /></ProtectedRoute>} />
                <Route path="/login-activity" element={<ProtectedRoute><LoginActivityPage /></ProtectedRoute>} />
                <Route path="/ama" element={<AMAPage />} />
                <Route path="/voicemails" element={<ProtectedRoute><VoicemailsPage /></ProtectedRoute>} />
                <Route path="/trust-score" element={<ProtectedRoute><TrustScorePage /></ProtectedRoute>} />
                <Route path="/warnings" element={<ProtectedRoute><WarningsPage /></ProtectedRoute>} />
                <Route path="/chat-wallpapers" element={<ProtectedRoute><ChatWallpapersPage /></ProtectedRoute>} />
                <Route path="/promo-usage" element={<ProtectedRoute><PromoUsagePage /></ProtectedRoute>} />
                <Route path="/bug-reports" element={<ProtectedRoute><BugReportsPage /></ProtectedRoute>} />
                <Route path="/streaks" element={<ProtectedRoute><StreaksPage /></ProtectedRoute>} />
                <Route path="/my-challenges" element={<ProtectedRoute><MyChallengeSubmissionsPage /></ProtectedRoute>} />
                <Route path="/poll-history" element={<ProtectedRoute><PollHistoryPage /></ProtectedRoute>} />
                <Route path="/spam-detections" element={<ProtectedRoute><SpamDetectionsPage /></ProtectedRoute>} />
                <Route path="/place-clicks" element={<ProtectedRoute><PlaceClicksPage /></ProtectedRoute>} />
                <Route path="/price-alerts" element={<ProtectedRoute><PriceAlertsPage /></ProtectedRoute>} />
                <Route path="/ride-quotes" element={<ProtectedRoute><RideQuotesPage /></ProtectedRoute>} />
                <Route path="/auto-messages" element={<ProtectedRoute><AutoMessagesLogPage /></ProtectedRoute>} />
                <Route path="/order-disputes" element={<ProtectedRoute><OrderDisputesPage /></ProtectedRoute>} />
                <Route path="/flight-price-alerts" element={<ProtectedRoute><FlightPriceAlertsPage /></ProtectedRoute>} />
                <Route path="/audio-rooms" element={<AudioRoomsPage />} />
                <Route path="/coin-transfers" element={<ProtectedRoute><CoinTransfersPage /></ProtectedRoute>} />
                <Route path="/live-locations" element={<ProtectedRoute><LiveLocationsPage /></ProtectedRoute>} />
                <Route path="/friend-requests" element={<ProtectedRoute><FriendRequestsPage /></ProtectedRoute>} />
                <Route path="/group-orders" element={<ProtectedRoute><GroupOrdersPage /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="/leaderboards" element={<LeaderboardsPage />} />
                <Route path="/recently-viewed" element={<ProtectedRoute><RecentlyViewedPage /></ProtectedRoute>} />
                <Route path="/two-step-auth" element={<ProtectedRoute><TwoStepAuthPage /></ProtectedRoute>} />
                <Route path="/my-applications" element={<ProtectedRoute><MyJobApplicationsPage /></ProtectedRoute>} />
                <Route path="/onboarding-progress" element={<ProtectedRoute><OnboardingProgressPage /></ProtectedRoute>} />
                <Route path="/profile-views" element={<ProtectedRoute><ProfileViewsPage /></ProtectedRoute>} />
                <Route path="/store-promos" element={<StorePromoCodesPage />} />
                <Route path="/emoji-packs" element={<EmojiPacksPage />} />
                <Route path="/live-chat-sessions" element={<ProtectedRoute><LiveChatSessionsPage /></ProtectedRoute>} />
                <Route path="/muted-blocked" element={<ProtectedRoute><MutedBlockedUsersPage /></ProtectedRoute>} />
                <Route path="/muted-chats" element={<ProtectedRoute><MutedChatsPage /></ProtectedRoute>} />
                <Route path="/push-devices" element={<ProtectedRoute><PushDevicesPage /></ProtectedRoute>} />
                <Route path="/creator-payouts" element={<ProtectedRoute><CreatorPayoutsPage /></ProtectedRoute>} />
                <Route path="/p2p-money" element={<ProtectedRoute><P2PMoneyPage /></ProtectedRoute>} />
                <Route path="/music-stickers" element={<MusicStickersPage />} />
                <Route path="/avatar-moods" element={<AvatarMoodsPage />} />
                <Route path="/downloaded-packs" element={<ProtectedRoute><DownloadedPacksPage /></ProtectedRoute>} />
                <Route path="/legal-disputes" element={<ProtectedRoute><LegalDisputesPage /></ProtectedRoute>} />
                <Route path="/my-podcasts" element={<ProtectedRoute><MyPodcastsPage /></ProtectedRoute>} />
                <Route path="/saved-locations" element={<ProtectedRoute><SavedLocationsPage /></ProtectedRoute>} />
                <Route path="/story-comments" element={<ProtectedRoute><StoryCommentsPage /></ProtectedRoute>} />
                <Route path="/restaurant-reviews" element={<ProtectedRoute><RestaurantReviewDetailsPage /></ProtectedRoute>} />
                <Route path="/story-viewers" element={<ProtectedRoute><StoryViewersPage /></ProtectedRoute>} />
                <Route path="/itineraries" element={<ProtectedRoute><ItinerariesPage /></ProtectedRoute>} />
                <Route path="/consent-log" element={<ProtectedRoute><ConsentLogPage /></ProtectedRoute>} />
                <Route path="/tenant-memberships" element={<ProtectedRoute><TenantMembershipsPage /></ProtectedRoute>} />
                <Route path="/recommendation-scores" element={<ProtectedRoute><RecommendationScoresPage /></ProtectedRoute>} />
                <Route path="/business-account" element={<ProtectedRoute><BusinessRenterAccountPage /></ProtectedRoute>} />
                <Route path="/podcasts" element={<PodcastsPage />} />
                <Route path="/sounds" element={<SoundsPage />} />
                <Route path="/media-library" element={<ProtectedRoute><MediaLibraryPage /></ProtectedRoute>} />
                <Route path="/creator/goals" element={<ProtectedRoute><CreatorGoalsPage /></ProtectedRoute>} />
                <Route path="/track" element={<ProtectedRoute><TrackPackagePage /></ProtectedRoute>} />
                {/* Redirect legacy paths to the real implementations */}
                <Route path="/account/cookies" element={<Navigate to="/account/data-rights#cookies" replace />} />
                <Route path="/account/translation" element={<Navigate to="/account/preferences#translation" replace />} />
                <Route path="/account/accessibility" element={<Navigate to="/account/preferences#accessibility" replace />} />
                <Route path="/account/contact" element={<Navigate to="/account/profile-edit" replace />} />

                {/* Wellness — placeholders */}
                <Route path="/wellness/meds" element={<ProtectedRoute><MedicationsPage /></ProtectedRoute>} />
                <Route path="/wellness/mindfulness" element={<ProtectedRoute><MindfulnessPage /></ProtectedRoute>} />
                <Route path="/wellness/nutrition" element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
                <Route path="/account/tax" element={<ProtectedRoute><TaxInfoPage /></ProtectedRoute>} />
                <Route path="/account/receipts" element={<ProtectedRoute><ReceiptsPage /></ProtectedRoute>} />
                <Route path="/account/reviews" element={<ProtectedRoute><MyReviewsPage /></ProtectedRoute>} />
                <Route path="/account/subscriptions" element={<ProtectedRoute><AccountSubscriptionsPage /></ProtectedRoute>} />
                <Route path="/account/tips" element={<ProtectedRoute><AccountTipsPage /></ProtectedRoute>} />

                {/* Trip Itineraries */}
                <Route path="/trips" element={<ProtectedRoute><TripsListPage /></ProtectedRoute>} />
                <Route path="/trip/:id" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />

                {/* Legal */}
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/legal/terms" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/legal/refunds" element={<RefundPolicy />} />
                <Route path="/partner-agreement" element={<PartnerAgreement />} />
                <Route path="/legal/accessibility" element={<AccessibilityStatement />} />
                <Route path="/legal/do-not-sell" element={<DoNotSell />} />
                <Route path="/legal/partner-disclosure" element={<PartnerDisclosure />} />
                <Route path="/legal/cancellation" element={<CancellationPolicy />} />
                <Route path="/legal/security-incident" element={<SecurityIncident />} />
                <Route path="/legal/security" element={<SecurityPolicy />} />
                <Route path="/legal/vdp" element={<VulnerabilityDisclosureLegal />} />
                <Route path="/legal/seller-of-travel" element={<SellerOfTravel />} />
                <Route path="/legal/flight-terms" element={<FlightTerms />} />
                <Route path="/legal/social-media-policy" element={<SocialMediaPolicy />} />
                <Route path="/legal/acceptable-use" element={<AcceptableUsePolicy />} />
                <Route path="/legal/data-retention" element={<DataRetentionPolicy />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route path="/legal/dmca" element={<DMCACopyrightPolicy />} />
                <Route path="/legal/dispute-resolution" element={<DisputeResolution />} />
                <Route path="/legal/limitation-of-liability" element={<LimitationOfLiability />} />
                <Route path="/legal/indemnification" element={<IndemnificationPolicy />} />
                <Route path="/legal/age-restriction" element={<AgeRestrictionPolicy />} />
                <Route path="/legal/assumption-of-risk" element={<AssumptionOfRisk />} />
                <Route path="/legal/electronic-consent" element={<ElectronicConsent />} />
                <Route path="/legal/force-majeure" element={<ForceMajeure />} />
                <Route path="/legal/no-guarantee" element={<NoGuaranteeDisclaimer />} />
                <Route path="/legal/governing-law" element={<GoverningLaw />} />
                <Route path="/legal/intellectual-property" element={<IntellectualProperty />} />
                <Route path="/legal/account-termination" element={<AccountTermination />} />
                <Route path="/legal/third-party-links" element={<ThirdPartyLinks />} />
                <Route path="/legal/communication-consent" element={<CommunicationConsent />} />
                <Route path="/legal/modification-of-terms" element={<ModificationOfTerms />} />
                <Route path="/legal/class-action-waiver" element={<ClassActionWaiver />} />
                <Route path="/legal/anti-money-laundering" element={<AntiMoneyLaundering />} />
                <Route path="/legal/user-conduct" element={<UserConduct />} />
                <Route path="/legal/california-privacy" element={<CaliforniaPrivacy />} />
                <Route path="/legal/fraud-prevention" element={<FraudPrevention />} />
                <Route path="/legal/warranty-disclaimer" element={<WarrantyDisclaimer />} />
                <Route path="/legal/gdpr" element={<GDPRCompliance />} />
                <Route path="/legal/non-discrimination" element={<NonDiscrimination />} />
                <Route path="/legal/transportation-disclaimer" element={<TransportationDisclaimer />} />
                <Route path="/legal/car-rental-disclaimer" element={<CarRentalDisclaimer />} />
                <Route path="/legal/insurance-disclaimer" element={<InsuranceDisclaimer />} />
                <Route path="/legal/damage-policy" element={<DamagePolicy />} />
                <Route path="/terms/owner" element={<OwnerTerms />} />
                <Route path="/terms/renter" element={<RenterTerms />} />
                <Route path="/legal/meta-privacy" element={<MetaPrivacyDisclosure />} />
                <Route path="/legal/insurance-disclosure" element={<InsuranceDisclosure />} />
                <Route path="/legal/insurance-policy" element={<InsurancePolicy />} />
                <Route path="/legal/*" element={<GenericLegalPage />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/cancellation-policy" element={<CancellationPolicy />} />

                {/* Public */}
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/refunds" element={<Refunds />} />
                <Route path="/company" element={<Company />} />
                <Route path="/security" element={<Security />} />
                <Route path="/security-status" element={<SecurityStatus />} />
                {/* /saved is taken by BookmarksPage above; tile-grid view lives at /saved-posts */}
                <Route path="/saved-posts" element={<ProtectedRoute><SavedPostsPage /></ProtectedRoute>} />
                <Route path="/tag/:tag" element={<HashtagPage />} />
                <Route path="/ai-trip-planner" element={<AITripPlanner />} />
                <Route path="/multi-city-builder" element={<MultiCityBuilder />} />
                {/* /zivo-plus defined above */}
                <Route path="/vision" element={<Vision />} />

                {/* SEO landing pages */}
                <Route path="/airport-transfers" element={<AirportTransfersPage />} />
                <Route path="/car-rental/:city" element={<CarRentalCityPage />} />
                <Route path="/destinations/:city/activities" element={<DestinationActivitiesPage />} />
                <Route path="/destinations/:city/hotels" element={<DestinationHotelsPage />} />

                {/* Grocery + service flows */}
                <Route path="/grocery" element={<GroceryPage />} />
                <Route path="/services/new-order" element={<ProtectedRoute><NewServiceOrderPage /></ProtectedRoute>} />
                <Route path="/app/request-ride" element={<ProtectedRoute><CambodiaOnlyGate><RequestRidePage /></CambodiaOnlyGate></ProtectedRoute>} />
                <Route path="/press" element={<Press />} />
                <Route path="/for-customers" element={<ForCustomers />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/compliance" element={<ComplianceCenter />} />
                <Route path="/enterprise-trust" element={<EnterpriseTrust />} />
                <Route path="/partner-audit-docs" element={<PartnerAuditDocs />} />
                <Route path="/reliability" element={<Reliability />} />
                <Route path="/enterprise-ready" element={<EnterpriseReady />} />
                <Route path="/install" element={<Install />} />
                <Route path="/status" element={<Status />} />
                <Route path="/privacy-security" element={<PrivacySecurity />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/booking/return" element={<BookingReturn />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/rewards/redeem" element={<RewardsPage />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/deals/:slug" element={<SeasonalDealPage />} />
                <Route path="/brand" element={<BrandMission />} />
                <Route path="/mission" element={<BrandMission />} />
                <Route path="/company-profile" element={<CompanyProfile />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/jobs" element={<Careers />} />
                <Route path="/trust-statement" element={<TrustStatement />} />
                <Route path="/help" element={<Help />} />
                <Route path="/offline" element={<Offline />} />
                <Route path="/out" element={<OutboundRedirect />} />

                {/* Security */}
                <Route path="/security/report" element={<SecurityReport />} />
                <Route path="/security/zero-trust" element={<ZeroTrustPolicy />} />
                <Route path="/security/scale-protection" element={<ScaleProtection />} />
                <Route path="/security/monitoring" element={<RealtimeMonitoring />} />
                <Route path="/security/data-protection" element={<DataProtection />} />
                <Route path="/security/privacy-compliance" element={<PrivacyCompliance />} />
                <Route path="/security/trust" element={<TrustCertification />} />
                <Route path="/security/scams" element={<ScamPrevention />} />
                <Route path="/security/operations" element={<SecurityOperations />} />
                <Route path="/security/disaster-recovery" element={<DisasterRecovery />} />
                <Route path="/security/vulnerability-disclosure" element={<VulnerabilityDisclosure />} />
                {ENABLE_DEV_ROUTES && SecurityTestPage && (
                  <Route path="/security-test" element={<SecurityTestPage />} />
                )}

                {/* Business */}
                <Route path="/partner-with-zivo" element={<PartnerOnboardingDispatcher />} />
                <Route path="/become-partner" element={<BecomePartnerPage />} />
                <Route path="/partners/join" element={<PreserveQueryRedirect to="/become-partner" />} />
                <Route path="/network" element={<NetworkPlacesPage />} />
                <Route path="/places" element={<PreserveQueryRedirect to="/network" />} />
                <Route path="/network/saved" element={<SavedFavoritesPage />} />
                <Route path="/favorites/network" element={<PreserveQueryRedirect to="/network/saved" />} />
                <Route path="/concierge" element={<ConciergePage />} />
                <Route path="/share/trip/:tripId" element={<PublicTripSharePage />} />
                <Route path="/rides/multi-stop" element={<ProtectedRoute><PhoneRequiredGate><CambodiaOnlyGate><MultiStopRideBuilder /></CambodiaOnlyGate></PhoneRequiredGate></ProtectedRoute>} />
                <Route path="/share/order/:orderId" element={<PublicOrderSharePage />} />
                <Route path="/share/with-me" element={<ShareWatchlistPage />} />
                <Route path="/partner-login" element={<PartnerLogin />} />
                <Route path="/partners" element={<PartnerWithZivo />} />
                <Route path="/business" element={<BusinessLandingPage />} />
                <Route path="/api-partners" element={<APIPartners />} />
                <Route path="/developers" element={<APIPartners />} />
                <Route path="/business/dashboard" element={<AdminShellRoute vertical="business" title="Business Dashboard | ZIVO Admin"><BusinessDashboard /></AdminShellRoute>} />
                <Route path="/business/account" element={<BusinessAccountPage />} />
                <Route path="/business/insights" element={<DataInsights />} />
                <Route path="/data-insights" element={<DataInsights />} />
                <Route path="/corporate" element={<CorporateTravel />} />
                <Route path="/business-travel" element={<CorporateTravel />} />
                <Route path="/booking-management" element={<ProtectedRoute><BookingManagement /></ProtectedRoute>} />

                {/* Support */}
                <Route path="/support/travel-bookings" element={<TravelBookingsSupport />} />
                <Route path="/support/site-issues" element={<SiteIssuesSupport />} />
                <Route path="/support/tickets" element={<ProtectedRoute><UserSupportTicketsPage /></ProtectedRoute>} />
                <Route path="/support/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
                {/* Referrals & Feedback */}
                <Route path="/referrals" element={<ReferralProgram />} />
                <Route path="/invite" element={<ReferralProgram />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/roadmap" element={<Roadmap />} />

                {/* Guides */}
                <Route path="/guides" element={<GuidesIndex />} />
                <Route path="/guides/cheap-flights" element={<CheapFlightsGuide />} />
                <Route path="/guides/best-time-to-book" element={<BestTimeToBook />} />
                <Route path="/guides/:citySlug" element={<CityGuide />} />

                {/* City SEO */}
                <Route path="/city/:citySlug" element={<CityLandingPage />} />

                {/* Country Hub */}
                <Route path="/:countrySlug" element={<CountryHubPage />} />
                <Route path="/:countrySlug/flights/:routeSlug" element={<LocalizedFlightRoutePage />} />

                {/* Dev-only QA. Do not expose demo/test routes in production. */}
                {ENABLE_DEV_ROUTES && PostMenuRegressionPage && SafeAreaQAPage && ChatCallPreviewPage && (
                  <>
                    <Route path="/dev/post-menu-check" element={<PostMenuRegressionPage />} />
                    <Route path="/dev/qa/safe-area" element={<SafeAreaQAPage />} />
                    <Route path="/dev/chat-call-preview" element={<ChatCallPreviewPage />} />
                  </>
                )}

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </UTMProvider>
          </CurrencyProvider>
          </CustomerCityProvider>
          <RouteAwareGlobalUI />
          <BrandThemeApplicator />
        </ZivoPlusProvider>
        </RemoteConfigProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </BrandProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
