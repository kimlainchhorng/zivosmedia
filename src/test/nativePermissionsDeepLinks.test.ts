import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

// The Capacitor-generated Xcode project is machine-local (never committed);
// iOS contract tests run on release machines that have it.
const hasIosProject = existsSync(
  path.join(root, "ios/App/App.xcodeproj/project.pbxproj"),
);

describe("native permissions, deep links, and push contracts", () => {
  it("keeps Android runtime permissions, app links, and transport security aligned", () => {
    const manifest = source("android/app/src/main/AndroidManifest.xml");
    const network = source("android/app/src/main/res/xml/network_security_config.xml");
    const nativeContracts = source("scripts/qa/native-app-contracts.mjs");

    for (const permission of [
      "android.permission.INTERNET",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ]) {
      expect(manifest).toContain(permission);
    }

    expect(manifest).toContain(
      '<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />',
    );
    expect(manifest).not.toContain(
      '<uses-permission android:name="com.google.android.gms.permission.AD_ID" />',
    );

    for (const needle of [
      '<uses-feature android:name="android.hardware.camera" android:required="false" />',
      '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
      'android:allowBackup="false"',
      'android:fullBackupContent="false"',
      'android:dataExtractionRules="@xml/data_extraction_rules"',
      'android:usesCleartextTraffic="false"',
      'android:networkSecurityConfig="@xml/network_security_config"',
      'android:autoVerify="true"',
      'android:host="zivosmedia.com"',
      'android:host="www.zivosmedia.com"',
      'android:scheme="com.hizovo.app"',
    ]) {
      expect(manifest).toContain(needle);
    }

    expect(network).toContain('cleartextTrafficPermitted="false"');
    expect(network).toContain('<certificates src="system" />');
    expect(nativeContracts).toContain("native-permissions-deeplinks-push");
  });

  it.skipIf(!hasIosProject)("keeps iOS notification, universal link, and extension wiring intact", () => {
    const info = source("ios/App/App/Info.plist");
    const entitlements = source("ios/App/App/App.entitlements");
    const appDelegate = source("ios/App/App/AppDelegate.swift");
    const extensionInfo = source("ios/App/NotificationServiceExtension/Info.plist");
    const extensionSwift = source("ios/App/NotificationServiceExtension/NotificationService.swift");
    const project = source("ios/App/App.xcodeproj/project.pbxproj");

    for (const needle of [
      "NSCameraUsageDescription",
      "NSMicrophoneUsageDescription",
      "NSLocationWhenInUseUsageDescription",
      "CFBundleURLSchemes",
      "com.hizovo.app",
      "UIBackgroundModes",
      "remote-notification",
    ]) {
      expect(info).toContain(needle);
    }
    expect(info).not.toContain("NSUserTrackingUsageDescription");
    expect(info).not.toContain("<string>voip</string>");
    expect(info).not.toContain("<string>audio</string>");
    expect(project).not.toContain("INFOPLIST_KEY_CFBundleDisplayName = ZIVOS;");
    expect(project).not.toContain("INFOPLIST_KEY_CFBundleDisplayName = ZIVO;");
    expect(
      project.match(/INFOPLIST_KEY_CFBundleDisplayName = "Zivo Media - All in one";/g),
    ).toHaveLength(2);

    for (const needle of [
      "applinks:zivosmedia.com",
      "applinks:www.zivosmedia.com",
      "webcredentials:zivosmedia.com",
      "com.apple.developer.usernotifications.communication",
    ]) {
      expect(entitlements).toContain(needle);
    }

    expect(appDelegate).toContain("UNUserNotificationCenter.current().delegate = self");
    expect(appDelegate).toContain(".capacitorDidRegisterForRemoteNotifications");
    expect(appDelegate).toContain(".capacitorDidFailToRegisterForRemoteNotifications");
    expect(appDelegate).toContain("ApplicationDelegateProxy.shared.application(app, open: url");
    expect(appDelegate).toContain("ApplicationDelegateProxy.shared.application(application, continue: userActivity");

    expect(project).toContain("NotificationServiceExtension.appex in Embed App Extensions");
    expect(project).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app.NotificationServiceExtension");
    expect(project).toContain("NotificationService.swift in Sources");
    expect(extensionInfo).toContain("com.apple.usernotifications.service");
    expect(extensionInfo).toContain("$(PRODUCT_MODULE_NAME).NotificationService");
    expect(extensionSwift).toContain("INSendMessageIntent");
    expect(extensionSwift).toContain("isAllowedImageURL");
    expect(extensionSwift).toContain("serviceExtensionTimeWillExpire");
  });
});
