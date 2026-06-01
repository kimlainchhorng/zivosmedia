import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getSafeRedirectTarget, withRedirectParam } from "@/lib/authRedirect";

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, "..", relativePath), "utf8");

describe("auth redirect safety", () => {
  it("keeps only same-origin app paths as auth return targets", () => {
    expect(getSafeRedirectTarget("/chat?with=user-123#compose")).toBe("/chat?with=user-123#compose");
    expect(getSafeRedirectTarget("/profile")).toBe("/profile");
    expect(getSafeRedirectTarget("https://example.com/profile")).toBe("/");
    expect(getSafeRedirectTarget("//example.com/profile")).toBe("/");
    expect(getSafeRedirectTarget("javascript:alert(1)")).toBe("/");
  });

  it("does not allow auth routes to recursively redirect into auth", () => {
    expect(getSafeRedirectTarget("/login?redirect=%2Fprofile")).toBe("/");
    expect(getSafeRedirectTarget("/signup?redirect=%2Fprofile")).toBe("/");
    expect(getSafeRedirectTarget("/forgot-password?redirect=%2Fprofile")).toBe("/");
    expect(getSafeRedirectTarget("/reset-password?redirect=%2Fprofile")).toBe("/");
    expect(getSafeRedirectTarget("/verify-otp?redirect=%2Fchat")).toBe("/");
    expect(getSafeRedirectTarget("/verify-new-device?redirect=%2Fchat")).toBe("/");
    expect(withRedirectParam("/login", "/profile")).toBe("/login?redirect=%2Fprofile");
    expect(withRedirectParam("/login", "https://example.com/profile")).toBe("/login");
  });

  it("preserves invite acceptance as a safe post-login return target", () => {
    const inviteReturnPath = "/auth/accept-invite?token=store-token-123";

    expect(getSafeRedirectTarget(inviteReturnPath)).toBe(inviteReturnPath);
    expect(withRedirectParam("/login", inviteReturnPath)).toBe(
      "/login?redirect=%2Fauth%2Faccept-invite%3Ftoken%3Dstore-token-123",
    );
  });

  it("wires Login, Signup, OTP, and new-device verification through the sanitizer", () => {
    const login = readSource("pages/Login.tsx");
    const signup = readSource("pages/Signup.tsx");
    const verifyOtp = readSource("pages/VerifyOTP.tsx");
    const verifyDevice = readSource("pages/VerifyNewDevice.tsx");

    for (const source of [login, signup, verifyOtp, verifyDevice]) {
      expect(source).toContain('from "@/lib/authRedirect"');
    }

    expect(login).toContain('const redirect = getSafeRedirectTarget(params.get("redirect"));');
    expect(signup).toContain('const redirect = getSafeRedirectTarget(params.get("redirect"));');
    expect(verifyOtp).toContain('const redirect = getSafeRedirectTarget(params.get("redirect"));');
    expect(verifyDevice).toContain("getSafeRedirectTarget(navRedirectTo)");
  });

  it("wires login, signup, and OTP handoff links through shared redirect helpers", () => {
    const login = readSource("pages/Login.tsx");
    const signup = readSource("pages/Signup.tsx");
    const verifyOtp = readSource("pages/VerifyOTP.tsx");

    for (const source of [login, signup, verifyOtp]) {
      expect(source).toContain("withRedirectParam");
    }

    expect(login).toContain('withRedirectParam(`/forgot-password${query ? `?${query}` : ""}`, redirect)');
    expect(login).toContain('`${window.location.origin}${withRedirectParam("/auth-callback", redirect)}`');
    expect(login).toContain('withRedirectParam(`/verify-otp?email=${encodeURIComponent(targetEmail)}&mode=login&entry=link`, redirect)');
    expect(login).toContain('navigate(withRedirectParam("/signup", redirect))');
    expect(login).toContain('to={withRedirectParam("/signup", redirect)}');
    expect(signup).toContain('navigate(withRedirectParam("/login", redirect))');
    expect(signup).toContain('navigate(withRedirectParam(`/verify-otp?mode=signup&email=${encodeURIComponent(email.trim())}`, redirect));');
    expect(signup).toContain('to={withRedirectParam("/login", redirect)}');
    expect(verifyOtp).toContain('`${window.location.origin}${withRedirectParam("/auth-callback", redirect)}`');
    expect(verifyOtp).toContain('navigate(withRedirectParam("/login", redirect), { replace: true });');
    expect(verifyOtp).toContain('to={withRedirectParam("/login", redirect)}');
    expect(login).not.toContain("`/signup${redirect ?");
    expect(signup).not.toContain("`/login${redirect ?");
    expect(signup).not.toContain("encodeURIComponent(redirect)");
    expect(verifyOtp).not.toContain("`/login${redirect ?");
  });

  it("wires forgot and reset password through safe redirect helpers", () => {
    const forgot = readSource("pages/ForgotPassword.tsx");
    const reset = readSource("pages/ResetPassword.tsx");

    expect(forgot).toContain('import { getSafeRedirectTarget, withRedirectParam } from "@/lib/authRedirect";');
    expect(reset).toContain('import { getSafeRedirectTarget, withRedirectParam } from "@/lib/authRedirect";');
    expect(forgot).toContain('const redirect = getSafeRedirectTarget(params.get("redirect"));');
    expect(reset).toContain('const redirect = getSafeRedirectTarget(params.get("redirect"));');
    expect(forgot).toContain('const loginHref = withRedirectParam("/login", redirect);');
    expect(forgot).toContain('const resetRedirectPath = withRedirectParam("/reset-password", redirect);');
    expect(forgot).toContain("redirectTo: `${window.location.origin}${resetRedirectPath}`");
    expect(forgot).toContain('to={withRedirectParam("/signup", redirect)}');
    expect(reset).toContain("withRedirectParam(window.location.pathname, redirect)");
    expect(reset).toContain('navigate(withRedirectParam("/login", redirect));');
    expect(forgot).not.toContain("`/login${redirect ?");
    expect(forgot).not.toContain("`/signup${redirect ?");
    expect(reset).not.toContain("`/login${redirect ?");
  });

  it("wires public auth CTAs through shared redirect helpers", () => {
    const zivoPlus = readSource("pages/ZivoPlus.tsx");
    const eats = readSource("pages/EatsLanding.tsx");
    const loyalty = readSource("pages/account/LoyaltyPage.tsx");
    const howToRent = readSource("pages/HowToRent.tsx");
    const paymentMethods = readSource("pages/PaymentMethodsPage.tsx");
    const rewards = readSource("pages/RewardsPage.tsx");

    expect(zivoPlus).toContain('navigate(withRedirectParam("/login", "/zivo-plus"))');
    expect(eats).toContain('navigate(withRedirectParam("/login", "/eats"))');
    expect(loyalty).toContain('to={withRedirectParam("/login", "/account/loyalty")}');
    expect(howToRent).toContain('navigate(withRedirectParam("/signup", "/renter/dashboard"))');
    expect(paymentMethods).toContain('navigate(withRedirectParam("/login", "/payment-methods"))');
    expect(rewards).toContain('to={withRedirectParam("/login", "/rewards")}');

    for (const source of [zivoPlus, eats, loyalty, howToRent, paymentMethods, rewards]) {
      expect(source).toContain('from "@/lib/authRedirect"');
      expect(source).not.toContain("?redirect=");
    }
  });

  it("wires dynamic detail and profile login handoffs through shared redirect helpers", () => {
    const connectChat = readSource("pages/ConnectChat.tsx");
    const jobDetail = readSource("pages/app/personal/JobDetailPage.tsx");
    const eventDetail = readSource("pages/hubs/EventDetailPage.tsx");
    const voiceRoom = readSource("pages/hubs/VoiceRoomDetailPage.tsx");
    const publicProfile = readSource("pages/PublicProfilePage.tsx");
    const profile = readSource("pages/Profile.tsx");

    expect(connectChat).toContain('navigate(withRedirectParam("/login", resume), { replace: true });');
    expect(jobDetail).toContain('navigate(withRedirectParam("/login", `/personal/jobs/${id}`));');
    expect(eventDetail).toContain('navigate(withRedirectParam("/login", `/events-hub/${id}`))');
    expect(voiceRoom).toContain('navigate(withRedirectParam("/login", `/voice-rooms/${id}`))');
    expect(publicProfile).toContain('navigate(withRedirectParam("/login", window.location.pathname + window.location.search));');
    expect(profile).toContain('navigate(withRedirectParam("/login", "/shop-dashboard"));');
    expect(profile).toContain('navigate(withRedirectParam("/login", "/personal-dashboard"));');

    for (const source of [connectChat, jobDetail, eventDetail, voiceRoom, publicProfile, profile]) {
      expect(source).toContain('from "@/lib/authRedirect"');
      expect(source).not.toContain("/login?redirect=");
    }
  });

  it("replaces legacy auth redirect handoffs with real login and signup routes", () => {
    const publicUserProfile = readSource("pages/user/PublicUserProfilePage.tsx");
    const carDetail = readSource("pages/cars/CarDetailPage.tsx");
    const joinGroup = readSource("pages/chat/JoinGroupPage.tsx");
    const serviceBooking = readSource("pages/store/ServiceBookingPage.tsx");

    expect(publicUserProfile).toContain('navigate(withRedirectParam("/login", `/user/${profile.user_id}`))');
    expect(carDetail).toContain('navigate(withRedirectParam("/login", `/cars/${id}`));');
    expect(joinGroup).toContain('navigate(withRedirectParam("/login", `/chat/join/${encodeURIComponent(code)}`), { replace: true });');
    expect(serviceBooking).toContain('navigate(withRedirectParam("/signup", `/store/${slug}`))');

    for (const source of [publicUserProfile, carDetail, joinGroup, serviceBooking]) {
      expect(source).toContain('from "@/lib/authRedirect"');
      expect(source).not.toContain("/auth?redirect=");
    }
  });

  it("replaces legacy public engagement auth handoffs with safe login redirects", () => {
    const creatorTiers = readSource("components/creator/CreatorTiersSubscribe.tsx");
    const botProfile = readSource("pages/BotPublicProfilePage.tsx");
    const trendingCreators = readSource("components/social/TrendingCreators.tsx");
    const channelsDirectory = readSource("pages/channels/ChannelsDirectoryPage.tsx");

    expect(creatorTiers).toContain('navigate(withRedirectParam("/login", `${location.pathname}${location.search}${location.hash}`));');
    expect(botProfile).toContain('navigate(withRedirectParam("/login", `/chat?with=${bot.bot_user_id}`));');
    expect(trendingCreators).toContain('navigate(withRedirectParam("/login", `${location.pathname}${location.search}${location.hash}`));');
    expect(channelsDirectory).toContain('navigate(withRedirectParam("/login", `${location.pathname}${location.search}${location.hash}`));');
    expect(botProfile).not.toContain("post_auth_redirect");

    for (const source of [creatorTiers, botProfile, trendingCreators, channelsDirectory]) {
      expect(source).toContain('from "@/lib/authRedirect"');
      expect(source).not.toContain('navigate("/auth")');
    }
  });

  it("replaces social feed auth-next handoffs with the shared login redirect", () => {
    const socialFeed = readSource("pages/SocialFeedPage.tsx");

    expect(socialFeed).toContain('from "@/lib/authRedirect"');
    expect((socialFeed.match(/withRedirectParam\("\/login", "\/feed"\)/g) ?? []).length).toBeGreaterThanOrEqual(7);
    expect(socialFeed).not.toContain("/auth?next=");
    expect(socialFeed).not.toContain('encodeURIComponent("/feed")');
  });

  it("replaces remaining direct auth route buttons with safe login redirects", () => {
    const reelsFeed = readSource("pages/ReelsFeedPage.tsx");
    const publicProfile = readSource("pages/PublicProfilePage.tsx");
    const importCart = readSource("pages/shop/ImportCartPage.tsx");
    const acceptInvite = readSource("pages/auth/AcceptInvitePage.tsx");

    expect(reelsFeed).toContain('from "@/lib/authRedirect"');
    expect(reelsFeed).toContain('navigate(withRedirectParam("/login", `${location.pathname}${location.search}${location.hash}`))');
    expect(publicProfile).toContain('navigate(withRedirectParam("/login", window.location.pathname + window.location.search));');
    expect(importCart).toContain('from "@/lib/authRedirect"');
    expect(importCart).toContain('navigate(withRedirectParam("/login", `${location.pathname}${location.search}${location.hash}`));');
    expect(acceptInvite).toContain('from "@/lib/authRedirect"');
    expect(acceptInvite).toContain('withRedirectParam("/login", inviteReturnPath)');
    expect(acceptInvite).not.toContain("/auth?next=");

    for (const source of [reelsFeed, publicProfile, importCart]) {
      expect(source).not.toContain('navigate("/auth")');
    }
  });
});
