#!/usr/bin/env node
/**
 * Browser gate contracts for undeployed Edge Functions.
 *
 * Keeps browser code from calling known-missing production functions directly.
 * Each gated function must have a wrapper, a disabled env default, and no
 * direct `functions.invoke("<slug>")` usage outside its wrapper.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const gatedFunctions = [
  {
    slug: "analytics-event-track",
    flag: "VITE_ANALYTICS_EVENT_TRACK_ENABLED",
    wrapper: "src/lib/analytics.ts",
    errorName: null,
  },
  // notification-manage was retired by "Enable direct per-user notification
  // mutations" (ebb1a9cd7): per-user rows are mutated directly under
  // owner-scoped RLS, so there is no browser gate to enforce.
  {
    slug: "social-notification-manage",
    flag: "VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED",
    wrapper: "src/lib/notifications/socialNotificationManage.ts",
    errorName: "SocialNotificationManageUnavailableError",
  },
  {
    slug: "push-device-manage",
    flag: "VITE_PUSH_DEVICE_MANAGE_ENABLED",
    wrapper: "src/lib/notifications/pushDeviceManage.ts",
    errorName: "PushDeviceManageUnavailableError",
  },
  {
    slug: "talent-invite-notification",
    flag: "VITE_TALENT_INVITE_NOTIFICATION_ENABLED",
    wrapper: "src/lib/notifications/talentInviteNotification.ts",
    errorName: "TalentInviteNotificationUnavailableError",
  },
  {
    slug: "admin-broadcast-notification",
    flag: "VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED",
    wrapper: "src/lib/notifications/adminBroadcastNotification.ts",
    errorName: "AdminBroadcastNotificationUnavailableError",
  },
];

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (relative === "src/test") continue;
      walk(absolute, files);
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

function directInvokeMatches(source, slug) {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`functions\\.invoke\\(\\s*["']${escaped}["']`, "g").test(source);
}

const envFiles = [".env.example", ".env.deploy.example"];
const srcFiles = walk(path.join(root, "src"));

for (const fn of gatedFunctions) {
  const wrapper = read(fn.wrapper);
  if (!wrapper.includes(fn.flag)) {
    failures.push(`${fn.slug}: ${fn.wrapper} missing ${fn.flag}`);
  }
  if (!directInvokeMatches(wrapper, fn.slug)) {
    failures.push(`${fn.slug}: ${fn.wrapper} must contain functions.invoke("${fn.slug}")`);
  }
  if (fn.errorName && !wrapper.includes(fn.errorName)) {
    failures.push(`${fn.slug}: ${fn.wrapper} missing ${fn.errorName}`);
  }

  for (const envFile of envFiles) {
    const env = read(envFile);
    if (!env.includes(`${fn.flag}=false`)) {
      failures.push(`${fn.slug}: ${envFile} must default ${fn.flag}=false`);
    }
  }

  for (const file of srcFiles) {
    if (file === fn.wrapper) continue;
    const source = read(file);
    if (directInvokeMatches(source, fn.slug)) {
      failures.push(`${fn.slug}: direct browser invoke found in ${file}; use ${fn.wrapper}`);
    }
  }
}

const report = {
  generated: new Date().toISOString(),
  counts: {
    gatedFunctions: gatedFunctions.length,
    scannedSrcFiles: srcFiles.length,
    failures: failures.length,
  },
  gatedFunctions,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) process.exit(1);
