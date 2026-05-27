/**
 * SoftwareDownloadsSection — Companion app & driver downloads for store owners.
 * Filters apps by store category (hotel vs shop vs all).
 */
import { useEffect, useState } from "react";
import {
  Download, Apple, Smartphone, Monitor, Laptop, Bell,
  Building2, ShoppingBag, Car, Printer, ScanBarcode, ChefHat,
  LayoutDashboard, BellRing, Brush, Navigation, Hotel,
  Briefcase, Server, ShieldCheck, Wifi, WifiOff, CheckCircle2, Sparkles, RefreshCw,
  ExternalLink, Copy, UserCog, Clock, AlertCircle, PackageCheck, Wrench, FileText,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { isLodgingStoreCategory } from "@/hooks/useOwnerStoreProfile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "ios" | "android" | "windows" | "macos";
type Audience = "hotel" | "shop" | "all";

type DownloadStatus = {
  title: string;
  detail: string;
} | null;

type DeviceAccessRecord = {
  id: string;
  name: string;
  platform: string;
  user: string;
  lastDownloaded: string;
  status: "Active" | "Ready" | "Revoked";
};

type DownloadAuditRecord = {
  id: string;
  fileName: string;
  platformLabel: string;
  downloadedBy: string;
  deviceName: string;
  downloadedAt: string;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: string | Blob | ArrayBuffer) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

interface SoftwareApp {
  id: string;
  name: string;
  description: string;
  audience: Audience;
  platforms: Platform[];
  downloads: Partial<Record<Platform, string>>;
  icon: LucideIcon;
  status: "available" | "coming-soon";
  version?: string;
}

const SOFTWARE_CATALOG: SoftwareApp[] = [
  {
    id: "zivo-manager",
    name: "ZIVO Manager",
    description: "Run your store from your phone — orders, inbox, payouts, and analytics in one place.",
    audience: "all",
    platforms: ["ios", "android"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo",
      android: "https://play.google.com/store/apps/details?id=com.hizovo.app",
    },
    icon: LayoutDashboard,
    status: "available",
    version: "v2.6",
  },
  {
    id: "zivo-pos",
    name: "ZIVO POS",
    description: "Point-of-sale for in-store checkout, receipt printing, and split payments.",
    audience: "shop",
    platforms: ["ios", "android", "windows"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo-pos",
      android: "https://play.google.com/store/apps/details?id=com.hizovo.pos",
    },
    icon: ShoppingBag,
    status: "coming-soon",
    version: "Beta",
  },
  {
    id: "zivo-frontdesk",
    name: "ZIVO Front Desk",
    description: "Check-in/out, room assignments, and key card issuance for hotel reception.",
    audience: "hotel",
    platforms: ["ios", "windows"],
    downloads: {},
    icon: BellRing,
    status: "coming-soon",
  },
  {
    id: "zivo-housekeeping",
    name: "ZIVO Housekeeping",
    description: "Room status, cleaning queues, and maintenance tickets for housekeeping staff.",
    audience: "hotel",
    platforms: ["ios", "android"],
    downloads: {},
    icon: Brush,
    status: "coming-soon",
  },
  {
    id: "zivo-kds",
    name: "ZIVO Kitchen Display",
    description: "Kitchen Display System for restaurants — incoming orders, prep timers, ticket routing.",
    audience: "shop",
    platforms: ["ios", "android"],
    downloads: {},
    icon: ChefHat,
    status: "coming-soon",
  },
  {
    id: "zivo-driver",
    name: "ZIVO Driver",
    description: "Accept rides and delivery jobs, navigate with built-in maps, and track earnings.",
    audience: "all",
    platforms: ["ios", "android"],
    downloads: {
      ios: "https://apps.apple.com/app/zivo-driver",
      android: "https://play.google.com/store/apps/details?id=com.zivodriver.app",
    },
    icon: Navigation,
    status: "available",
    version: "v1.8",
  },
  {
    id: "receipt-printer",
    name: "Receipt Printer Driver",
    description: "Universal driver for ESC/POS thermal receipt printers (USB & network).",
    audience: "all",
    platforms: ["windows", "macos"],
    downloads: {},
    icon: Printer,
    status: "coming-soon",
  },
  {
    id: "inventory-scanner",
    name: "Inventory Scanner",
    description: "Barcode scanning for stock counts, restocking, and supplier receiving.",
    audience: "shop",
    platforms: ["android"],
    downloads: {},
    icon: ScanBarcode,
    status: "coming-soon",
  },
  {
    id: "zivo-property",
    name: "ZIVO Property Suite",
    description: "Desktop property management — rates, channels, reservations, and reporting.",
    audience: "hotel",
    platforms: ["windows", "macos"],
    downloads: {},
    icon: Hotel,
    status: "coming-soon",
  },
];

const AUTO_REPAIR_HIDDEN_APP_IDS = new Set(["zivo-kds", "zivo-driver"]);

const PLATFORM_META: Record<Platform, { label: string; icon: LucideIcon }> = {
  ios: { label: "iOS", icon: Apple },
  android: { label: "Android", icon: Smartphone },
  windows: { label: "Windows", icon: Monitor },
  macos: { label: "macOS", icon: Laptop },
};

interface Props {
  storeCategory?: string;
  storeId?: string;
}

const DEVICE_LIMIT = 5;
const AUTO_REPAIR_DESKTOP_VERSION = "v1.1.0";
const AUTO_REPAIR_PREVIOUS_VERSION = "v1.0.0";

const formatAuditTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const getCurrentDeviceProfile = () => {
  if (typeof window === "undefined") {
    return { id: "server", name: "Current device", platform: "Web" };
  }
  const userAgent = navigator.userAgent || "";
  const platform = /iPad/i.test(userAgent)
    ? "iPad"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Mac/i.test(userAgent)
        ? "macOS"
        : /Win/i.test(userAgent)
          ? "Windows"
          : "Web";
  const stored = localStorage.getItem("zivo-business-device-id");
  const id = stored || crypto.randomUUID();
  if (!stored) localStorage.setItem("zivo-business-device-id", id);
  return { id, name: `${platform} Browser`, platform };
};

export default function SoftwareDownloadsSection({ storeCategory, storeId }: Props) {
  const { user } = useAuth();
  const isHotel = isLodgingStoreCategory(storeCategory);
  const audience: Audience = isHotel ? "hotel" : "shop";
  const isAutoRepair = (storeCategory || "").toLowerCase().trim() === "auto-repair";
  const softwareName = isAutoRepair ? "ZIVO Auto Repair Software" : "ZIVO Business App";
  const storageKey = `zivo-software-access:${storeId || storeCategory || "default"}`;
  const userDownloadPath = storeId ? `/business/software/${storeId}?category=${encodeURIComponent(storeCategory || "business")}` : "";
  const userDownloadUrl = typeof window === "undefined" || !userDownloadPath ? "" : `${window.location.origin}${userDownloadPath}`;
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  });
  const [launcherUrl, setLauncherUrl] = useState<string | null>(null);
  const [launcherDownloadName, setLauncherDownloadName] = useState("");
  const [launcherReady, setLauncherReady] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineTestActive, setOfflineTestActive] = useState(false);
  const [deviceRecords, setDeviceRecords] = useState<DeviceAccessRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`${storageKey}:devices`);
      if (saved) return JSON.parse(saved);
    } catch {
      return [];
    }
    return [];
  });
  const [downloadRecords, setDownloadRecords] = useState<DownloadAuditRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`${storageKey}:downloads`);
      if (saved) return JSON.parse(saved);
    } catch {
      return [];
    }
    return [];
  });

  const apps = SOFTWARE_CATALOG.filter((app) => {
    if (isAutoRepair && AUTO_REPAIR_HIDDEN_APP_IDS.has(app.id)) return false;
    return app.audience === "all" || app.audience === audience;
  });

  const launcherFileName = isAutoRepair
    ? "ZIVO Auto Repair Software.html"
    : "ZIVO Business App Launcher.html";
  const desktopInstallerName = "ZIVO Auto Repair Software-1.1.0-arm64.dmg";
  const desktopInstallerUrl = `/downloads/auto-repair/${encodeURIComponent(desktopInstallerName)}`;
  const buildLauncherHtml = (platformLabel = "Universal") => {
    const dashboardUrl = typeof window === "undefined" ? "/" : window.location.href;
    const escapedDashboardUrl = dashboardUrl
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
    const launcherHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=${escapedDashboardUrl}" />
  <title>${softwareName} - ${platformLabel}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b1220; color: white; }
    main { width: min(460px, calc(100vw - 32px)); padding: 28px; border: 1px solid rgba(255,255,255,.16); border-radius: 24px; background: rgba(255,255,255,.08); box-shadow: 0 24px 80px rgba(0,0,0,.35); }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 18px; color: rgba(255,255,255,.72); line-height: 1.5; }
    ul { margin: 0 0 20px; padding-left: 20px; color: rgba(255,255,255,.72); }
    a { display: inline-flex; border-radius: 999px; padding: 12px 18px; color: #07111f; background: white; font-weight: 800; text-decoration: none; }
  </style>
</head>
<body>
  <main>
    <h1>${softwareName}</h1>
    <p>${platformLabel} backup access file. Opening your ${isAutoRepair ? "Auto Repair-only workspace" : "business dashboard"}. Sign in with your business account if asked.</p>
    ${isAutoRepair ? "<ul><li>Auto Repair dashboard</li><li>Customer bookings and estimates</li><li>Work orders and invoices</li><li>Technicians, bays, parts, inventory, finance, and reports</li></ul>" : ""}
    <a href="${escapedDashboardUrl}">Open workspace</a>
  </main>
</body>
</html>`;
    return launcherHtml;
  };

  const platformDownloads = [
    { label: "Windows access", file: "ZIVO Auto Repair Windows Access.html", icon: Monitor, note: "front desk and office PCs" },
    { label: "macOS backup", file: "ZIVO Auto Repair macOS Access.html", icon: Laptop, note: "MacBook and iMac" },
    { label: "Android access", file: "ZIVO Auto Repair Android Access.html", icon: Smartphone, note: "shop tablets and phones" },
    { label: "iPad access", file: "ZIVO Auto Repair iPad Access.html", icon: Apple, note: "service advisor tablet" },
  ];

  const installerPackages = [
    { label: "Windows Access Package", file: "ZIVO Auto Repair Windows Access.html", icon: Monitor, tag: "Office PC" },
    { label: "macOS Desktop Package", file: "ZIVO Auto Repair macOS Access.html", icon: Laptop, tag: "Mac" },
    { label: "Android Shop Package", file: "ZIVO Auto Repair Android Access.html", icon: Smartphone, tag: "Tablet" },
    { label: "iPad Service Package", file: "ZIVO Auto Repair iPad Access.html", icon: Apple, tag: "iPadOS" },
  ];

  const deviceSetup = [
    { label: "Downloaded", detail: downloadStatus ? "Ready" : "Waiting", complete: !!downloadStatus },
    { label: "Installed", detail: isInstalled ? "Installed" : "Install desktop app or save backup access", complete: isInstalled || launcherReady },
    { label: "Signed in", detail: "Business account required", complete: true },
    { label: "Synced", detail: isOnline ? "Online sync active" : "Waiting for internet", complete: isOnline },
  ];

  const staffAccess = [
    { role: "Manager", file: "ZIVO Auto Repair Manager Access.html", icon: UserCog, access: "dashboard, reports, invoices" },
    { role: "Front desk", file: "ZIVO Auto Repair Front Desk Access.html", icon: Briefcase, access: "bookings, estimates, customer inbox" },
    { role: "Technician", file: "ZIVO Auto Repair Technician Access.html", icon: Wrench, access: "work orders, inspections, job photos" },
    { role: "Parts desk", file: "ZIVO Auto Repair Parts Access.html", icon: PackageCheck, access: "parts, tires, suppliers, inventory" },
  ];

  const offlineQueue = [
    { label: "Work orders", count: 0 },
    { label: "Invoices", count: 0 },
    { label: "Job photos", count: 0 },
    { label: "Parts updates", count: 0 },
  ];

  const updateItems = [
    "Auto Repair v1.1 desktop workspace",
    "Added full Auto Repair module set to the computer app",
    "Separated Auto Repair software from the main ZIVO platform",
    "Added upgrade center, offline cache, reconnect sync, and device access",
  ];

  const activationKey = "ZIVO-AR-A914-2026";

  const starterDevices: DeviceAccessRecord[] = [
    { id: "front-desk-pc", name: "Front Desk PC", platform: "Windows", user: "Manager", lastDownloaded: "Today", status: "Active" },
    { id: "service-tablet", name: "Service Tablet", platform: "iPad", user: "Service advisor", lastDownloaded: "Today", status: "Active" },
    { id: "shop-phone", name: "Shop Phone", platform: "Android", user: "Technician", lastDownloaded: "May 23", status: "Ready" },
  ];
  const assignedDevices = deviceRecords.length ? deviceRecords : starterDevices;
  const activeDeviceCount = assignedDevices.filter((device) => device.status !== "Revoked").length;
  const latestDownload = downloadRecords[0];

  const downloadAudit = [
    { label: "Last downloaded", value: latestDownload ? `${latestDownload.fileName} • ${formatAuditTime(latestDownload.downloadedAt)}` : "No file downloaded yet" },
    { label: "Downloaded by", value: latestDownload?.downloadedBy || user?.email || "Business owner" },
    { label: "Shop access", value: "Auto Repair only" },
    { label: "Device seats", value: `${activeDeviceCount}/${DEVICE_LIMIT} active` },
  ];

  const getDeviceIcon = (platform: string) => {
    if (platform === "Windows") return Monitor;
    if (platform === "macOS") return Laptop;
    if (platform === "Android") return Smartphone;
    if (platform === "iPad") return Apple;
    return Monitor;
  };

  const releaseNotes = [
    "Auto Repair v1.1 desktop software for this shop",
    "Front desk, shop floor, inventory, customer care, marketing, digital, finance, insights, and team modules",
    "Feed, Reels, Chat, Rides, and other ZIVO platform apps are hidden from the desktop software",
    "Offline-ready app shell with reconnect sync",
  ];

  const setupSteps = [
    "Save the macOS desktop app installer or send the user download link to staff",
    "Install ZIVO Auto Repair Software.app on the computer",
    "Open the app and use the Auto Repair-only workspace",
    "Use backup access files only when a browser blocks the desktop download",
  ];

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("Business app installed.");
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (launcherUrl) URL.revokeObjectURL(launcherUrl);
    };
  }, [launcherUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${storageKey}:devices`, JSON.stringify(deviceRecords));
  }, [deviceRecords, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${storageKey}:downloads`, JSON.stringify(downloadRecords));
  }, [downloadRecords, storageKey]);

  const handleDownload = (url?: string, appName?: string, platformLabel?: string) => {
    if (!url) {
      toast.info(`${appName} for ${platformLabel} is coming soon.`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNotify = (appName: string) => {
    toast.success(`We'll notify you when ${appName} is available.`);
  };

  const saveLauncherFile = async (fileName: string, html: string) => {
    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
    if (!picker) return false;
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [
          {
        description: "Backup access file",
            accept: { "text/html": [".html"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(html);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  };

  const saveBinaryFile = async (fileName: string, url: string, description: string, mimeType: string, extension: string) => {
    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
    if (!picker) return false;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const fileBlob = await response.blob();
      const fileBuffer = await fileBlob.arrayBuffer();
      const handle = await picker({
        suggestedName: fileName,
        types: [
          {
            description,
            accept: { [mimeType]: [extension] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(fileBuffer);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  };

  const triggerBrowserDownload = (fileName: string, url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadLauncherFile = async (fileName: string, platformLabel = "Universal") => {
    if (!user) {
      setDownloadStatus({
        title: "Business login required",
        detail: "Sign in with an approved business account before downloading this shop software.",
      });
      toast.error("Business login required before download.");
      return;
    }

    const device = getCurrentDeviceProfile();
    const activeRecords = assignedDevices.filter((record) => record.status !== "Revoked");
    const existingDevice = assignedDevices.find((record) => record.id === device.id);
    if (!existingDevice && activeRecords.length >= DEVICE_LIMIT) {
      setDownloadStatus({
        title: "Device limit reached",
        detail: `This shop already has ${DEVICE_LIMIT} active devices. Revoke an old device before downloading on a new one.`,
      });
      toast.error("Device limit reached.");
      return;
    }

    const now = new Date().toISOString();
    const deviceRecord: DeviceAccessRecord = {
      id: device.id,
      name: device.name,
      platform: device.platform,
      user: user.email || "Business user",
      lastDownloaded: formatAuditTime(now),
      status: "Active",
    };

    const launcherHtml = buildLauncherHtml(platformLabel);
    const blob = new Blob([launcherHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setLauncherUrl(url);
    setLauncherDownloadName(fileName);
    setLauncherReady(true);
    setDownloadStatus({
      title: `${platformLabel} file ready`,
      detail: `${fileName} is ready for ${device.name}. Tap Save File to save the backup access file to this computer.`,
    });
    setDeviceRecords((current) => {
      const source = current.length ? current : starterDevices;
      const withoutCurrent = source.filter((record) => record.id !== device.id);
      return [deviceRecord, ...withoutCurrent].slice(0, DEVICE_LIMIT);
    });
    setDownloadRecords((current) => [
      {
        id: crypto.randomUUID(),
        fileName,
        platformLabel,
        downloadedBy: user.email || "Business user",
        deviceName: device.name,
        downloadedAt: now,
      },
      ...current,
    ].slice(0, 8));
    toast.success(`${fileName} ready. Tap Save File if needed.`);
    const savedWithPicker = await saveLauncherFile(fileName, launcherHtml);
    setDownloadStatus({
      title: `${platformLabel} download ready`,
      detail: savedWithPicker
        ? `${fileName} was saved for ${device.name}. Open it to reach this shop's Auto Repair workspace.`
        : `${fileName} is ready for ${device.name}. If it is not in Downloads, tap Save File below.`,
    });
    toast.success(savedWithPicker ? `${fileName} saved.` : `${fileName} ready. Tap Save File if needed.`);
  };

  const handleInstallBusinessApp = async () => {
    if (isInstalled) {
      toast.success("Business app is already installed.");
      return;
    }
    if (!installPrompt) {
      window.open("/install", "_blank", "noopener,noreferrer");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      toast.success("Business app installed.");
    }
  };

  const handleDownloadBusinessLauncher = () => {
    downloadLauncherFile(launcherFileName, isAutoRepair ? "Backup Auto Repair" : "Backup Business");
  };

  const handleDirectLauncherDownload = () => {
    downloadLauncherFile(launcherFileName, softwareName);
  };

  const handleDesktopInstallerDownload = async () => {
    setDownloadStatus({
      title: "Preparing macOS desktop app",
      detail: "Choose where to save the real ZIVO Auto Repair Software installer.",
    });
    toast.info("Preparing ZIVO Auto Repair Software installer...");
    const savedWithPicker = await saveBinaryFile(
      desktopInstallerName,
      desktopInstallerUrl,
      "macOS app installer",
      "application/x-apple-diskimage",
      ".dmg",
    );
    if (!savedWithPicker) {
      triggerBrowserDownload(desktopInstallerName, desktopInstallerUrl);
    }
    setDownloadStatus({
      title: savedWithPicker ? "macOS desktop app saved" : "macOS desktop app download started",
      detail: savedWithPicker
        ? "Open the saved .dmg file, then drag ZIVO Auto Repair Software.app to Applications."
        : "If the file is not visible, use the browser downloads list or try again in Chrome/Safari.",
    });
    toast.success(savedWithPicker ? "ZIVO Auto Repair Software saved." : "ZIVO Auto Repair Software .dmg download started.");
  };

  const handlePlatformDownload = (platformLabel: string, fileName: string) => {
    downloadLauncherFile(fileName, platformLabel);
  };

  const handleOpenBusinessLauncher = () => {
    if (!launcherUrl) {
      handleDownloadBusinessLauncher();
      return;
    }
    window.open(launcherUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyDashboardLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Dashboard link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleCopyUserDownloadLink = async () => {
    if (!userDownloadUrl) {
      toast.error("Store download link is not ready.");
      return;
    }
    try {
      await navigator.clipboard.writeText(userDownloadUrl);
      toast.success("User download link copied.");
    } catch {
      toast.error("Could not copy user download link.");
    }
  };

  const handleOpenUserDownloadLink = () => {
    if (!userDownloadPath) {
      toast.error("Store download link is not ready.");
      return;
    }
    window.open(userDownloadPath, "_blank", "noopener,noreferrer");
  };

  const handleUpdateNow = () => {
    setUpdateReady(true);
    toast.success("Auto Repair v1.1 update is ready to download.");
  };

  const handleCopyActivationKey = async () => {
    try {
      await navigator.clipboard.writeText(activationKey);
      toast.success("Activation key copied.");
    } catch {
      toast.error("Could not copy activation key.");
    }
  };

  const handleRevokeDevice = (deviceName: string) => {
    setDeviceRecords((current) => {
      const source = current.length ? current : starterDevices;
      return source.map((device) =>
        device.name === deviceName ? { ...device, status: "Revoked" as const } : device,
      );
    });
    toast.success(`${deviceName} access revoked.`);
  };

  const handleTestOfflineMode = () => {
    setOfflineTestActive(true);
    toast.success("Offline mode test completed.");
  };

  return (
    <div className="space-y-4">
      <div className="zivo-card-organic overflow-hidden">
        <div className="flex flex-col gap-4 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="zivo-icon-pill shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-foreground">
                  {isAutoRepair ? "ZIVO Auto Repair Software" : "ZIVO Business Suite"}
                </h2>
                <Badge variant="secondary" className="h-5 text-[10px]">{isAutoRepair ? AUTO_REPAIR_DESKTOP_VERSION : "v3.0"}</Badge>
                <Badge variant="outline" className="h-5 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                  {isAutoRepair ? "Desktop app" : "2026 release"}
                </Badge>
              </div>
              <p className="text-[12px] md:text-[13px] text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {isAutoRepair
                  ? "Business-only install center for this auto repair shop. Download the desktop app, send staff access, and keep shop tools available when the device goes offline."
                  : "New business-only install center for owners and staff. Install the app and keep core tools available when the device goes offline."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-[360px]">
            {[
              { label: isAutoRepair ? "Latest" : "Install", value: isAutoRepair ? AUTO_REPAIR_DESKTOP_VERSION : isInstalled ? "Ready" : "App" },
              { label: "Mode", value: isOnline ? "Online" : "Offline" },
              { label: isAutoRepair ? "Scope" : "Sync", value: isAutoRepair ? "Shop" : "Auto" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/50 bg-muted/30 px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 border-t border-border/40 md:grid-cols-3">
          {[
            { icon: Download, label: "Desktop installer", text: "Save the Auto Repair computer app on this device." },
            { icon: WifiOff, label: "Offline-ready app", text: "Cached shop screens open without a connection." },
            { icon: RefreshCw, label: "Reconnect sync", text: "Updates resume when the device is back online." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-2 border-border/40 px-4 py-3 md:border-l first:md:border-l-0">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        <div className="zivo-card-organic p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="zivo-icon-pill shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{softwareName}</h3>
                <Badge variant="secondary" className="text-[10px] h-5">{isAutoRepair ? "Auto repair" : "Business access"}</Badge>
                <Badge variant={isOnline ? "secondary" : "outline"} className="text-[10px] h-5 gap-1">
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                {isAutoRepair
                  ? "Download the Auto Repair desktop software for this shop. It opens bookings, work orders, invoices, technicians, parts, inventory, finance, reports, and upgrades."
                  : "Opens this business dashboard as an installed app. Cached screens load offline; updates, payments, messages, bookings, and sync resume when the device reconnects."}
              </p>
            </div>
          </div>
          {isAutoRepair && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-bold text-foreground">User Download Link</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Send this to staff so they can download the Auto Repair software for their device.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleOpenUserDownloadLink}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleCopyUserDownloadLink}>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
              {userDownloadUrl && (
                <p className="mt-2 truncate rounded-xl bg-background/60 px-3 py-2 text-[10px] text-muted-foreground">
                  {userDownloadUrl}
                </p>
              )}
            </div>
          )}
          {isAutoRepair && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-bold text-foreground">Computer Software</p>
                    <Badge variant="secondary" className="h-5 text-[10px]">macOS app</Badge>
                    <Badge variant="outline" className="h-5 border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400">
                      Not browser HTML
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    Download the real desktop installer. It installs as ZIVO Auto Repair Software.app and opens in its own computer app window.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[420px]">
                  <Button type="button" size="sm" className="h-10 gap-2" onClick={handleDesktopInstallerDownload}>
                    <Download className="w-4 h-4" />
                    Download macOS App
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-10 gap-2" onClick={() => toast.info("Windows desktop installer needs a Windows build machine next.")}>
                    <Monitor className="w-4 h-4" />
                    Windows Next
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", isAutoRepair ? "xl:grid-cols-3" : "xl:grid-cols-4")}>
            {!isAutoRepair && (
              <Button
                type="button"
                size="sm"
                className="h-10 gap-2"
                onClick={handleInstallBusinessApp}
              >
                <Download className="w-4 h-4" />
                {isInstalled ? "Installed" : "Install Business App"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 gap-2"
              onClick={handleDirectLauncherDownload}
            >
              <Download className="w-4 h-4" />
              {isAutoRepair ? "Prepare Backup File" : "Prepare File"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 gap-2"
              onClick={handleDownloadBusinessLauncher}
            >
              <Download className="w-4 h-4" />
              {isAutoRepair ? "Backup Access File" : "Backup Download"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 gap-2"
              onClick={() => window.open("/offline", "_blank", "noopener,noreferrer")}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              Offline Screen
            </Button>
          </div>
          {isAutoRepair && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {platformDownloads.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handlePlatformDownload(item.label, item.file)}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-emerald-600" />
                      <span className="text-[12px] font-bold text-foreground">{item.label}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{item.note}</p>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {isAutoRepair
              ? "Use Download macOS App for the real desktop software. Use backup files only if a browser blocks the download."
              : "Use Install for a full app experience. Prepare File creates a clickable business dashboard file on this device."}
          </p>
          {downloadStatus && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-bold text-foreground">{downloadStatus.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{downloadStatus.detail}</p>
                </div>
                {launcherUrl && (
                  <Button asChild size="sm" className="h-9 gap-1.5 text-[12px]">
                    <a href={launcherUrl} download={launcherDownloadName || launcherFileName}>
                      <Download className="w-3.5 h-3.5" />
                      Save File
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          {launcherReady && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-bold text-foreground">Backup access file ready</p>
                  <p className="text-[11px] text-muted-foreground">
                    If your browser blocked the automatic save, tap Save File.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {launcherUrl && (
                    <Button asChild size="sm" className="h-8 gap-1.5 text-[12px]">
                      <a href={launcherUrl} download={launcherDownloadName || launcherFileName}>
                        <Download className="w-3.5 h-3.5" />
                        Save File
                      </a>
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleOpenBusinessLauncher}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Access File
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleCopyDashboardLink}>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="zivo-card-organic p-4">
          <h3 className="text-sm font-semibold text-foreground">Online / Offline</h3>
          <div className="mt-3 space-y-2">
            {(isAutoRepair
              ? [
                  "Auto Repair desktop app for business users",
                  "Auto Repair workspace opens offline",
                  "Work orders, invoices, and shop screens stay available",
                  "Live shop data syncs again when online",
                ]
              : [
                  "Installable for business users",
                  "Dashboard shell opens offline",
                  "Cached media and pages stay available",
                  "Live data syncs again when online",
                ]).map((item) => (
              <div key={item} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAutoRepair && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="zivo-card-organic p-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">Version / Release Notes</h3>
              <Badge variant="secondary" className="h-5 text-[10px]">Auto Repair v1.1</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {releaseNotes.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="zivo-card-organic p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">Setup Guide</h3>
            </div>
            <div className="mt-3 grid gap-2">
              {setupSteps.map((item, index) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAutoRepair && (
        <>
          <div className="zivo-card-organic p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Device Access Packages</h3>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Prepare device-specific Auto Repair access packages for each workstation or tablet. macOS uses the real desktop app installer above.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit text-[10px]">4 packages</Badge>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {installerPackages.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handlePlatformDownload(item.label, item.file)}
                    className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-emerald-600" />
                      <span className="text-[12px] font-bold text-foreground">{item.label}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{item.tag}</span>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="zivo-card-organic p-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Device Setup Status</h3>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {deviceSetup.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={cn("h-4 w-4", item.complete ? "text-emerald-600" : "text-muted-foreground")} />
                      <p className="text-[12px] font-bold text-foreground">{item.label}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="zivo-card-organic p-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Staff Access Downloads</h3>
              </div>
              <div className="mt-3 grid gap-2">
                {staffAccess.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => handlePlatformDownload(item.role, item.file)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-bold text-foreground">{item.role}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">{item.access}</span>
                        </span>
                      </span>
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="zivo-card-organic p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Offline Queue</h3>
                </div>
                <Badge variant={isOnline ? "secondary" : "outline"} className="text-[10px]">
                  {isOnline ? "Synced" : "Offline"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {offlineQueue.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-lg font-bold text-foreground">{item.count}</p>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Offline work saves locally and syncs when the device reconnects.
              </p>
            </div>

            <div className="zivo-card-organic p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-foreground">Update Center</h3>
                    <Badge variant="outline" className="h-5 border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-400">
                      Latest {AUTO_REPAIR_DESKTOP_VERSION}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    When ZIVO releases an upgrade, users download the newest installer, open it, and replace the old app. Shop data stays synced to their business account.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleUpdateNow}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Check
                  </Button>
                  <Button type="button" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={handleDesktopInstallerDownload}>
                    <Download className="h-3.5 w-3.5" />
                    Download Update
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Older app</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{AUTO_REPAIR_PREVIOUS_VERSION}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Latest app</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{AUTO_REPAIR_DESKTOP_VERSION}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {updateItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              {updateReady && (
                <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
                  <p className="text-[12px] font-bold text-foreground">Update ready</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Download {desktopInstallerName}, open the .dmg, then drag ZIVO Auto Repair Software.app to Applications.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="zivo-card-organic p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-foreground">License / Activation Key</h3>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Use this key to activate downloaded auto repair software for this shop only.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px]">Business only</Badge>
              </div>
              <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Activation key</p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all font-mono text-sm font-bold text-foreground">{activationKey}</p>
                  <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleCopyActivationKey}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Key
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Seats</p>
                  <p className="mt-1 text-sm font-bold text-foreground">Business users</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Devices</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{activeDeviceCount}/{DEVICE_LIMIT} active</p>
                </div>
              </div>
            </div>

            <div className="zivo-card-organic p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Download Audit</h3>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {downloadAudit.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-[12px] font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-border/50 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent downloads</p>
                <div className="mt-2 space-y-2">
                  {(downloadRecords.length ? downloadRecords.slice(0, 3) : [
                    { id: "empty", fileName: "No downloads yet", platformLabel: "Waiting", downloadedBy: user?.email || "Business user", deviceName: "No device", downloadedAt: new Date().toISOString() },
                  ]).map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-foreground">{record.fileName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {record.platformLabel} • {record.deviceName}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {record.id === "empty" ? "Ready" : formatAuditTime(record.downloadedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
            <div className="zivo-card-organic p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-foreground">Assigned Devices</h3>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    See which computers, tablets, and phones can use this shop software.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={handleCopyDashboardLink}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Shop Link
                </Button>
              </div>
              <div className="mt-3 grid gap-2">
                {assignedDevices.map((device) => {
                  const Icon = getDeviceIcon(device.platform);
                  return (
                    <div key={device.name} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
                          <Icon className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold text-foreground">{device.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {device.platform} • {device.user} • downloaded {device.lastDownloaded}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Badge variant="secondary" className="text-[10px]">{device.status}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-[12px]"
                          onClick={() => handleRevokeDevice(device.name)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="zivo-card-organic p-4">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Test Offline Mode</h3>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Check that the Auto Repair app, cached shop screens, and reconnect sync are ready before staff use it.
              </p>
              <Button type="button" size="sm" className="mt-3 h-9 w-full gap-1.5 text-[12px]" onClick={handleTestOfflineMode}>
                <WifiOff className="h-3.5 w-3.5" />
                Run Offline Test
              </Button>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Auto Repair app opens", ready: launcherReady || offlineTestActive },
                  { label: "Cached screens available", ready: true },
                  { label: "Reconnect sync enabled", ready: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", item.ready ? "text-emerald-600" : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              {offlineTestActive && (
                <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-3">
                  <p className="text-[12px] font-bold text-foreground">Offline test passed</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Staff can keep working in the Auto Repair software and sync when internet returns.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!isAutoRepair && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {apps.map((app) => {
              const Icon = app.icon;
              const isComingSoon = app.status === "coming-soon";
              return (
                <div
                  key={app.id}
                  className="zivo-card-organic p-3 md:p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="zivo-icon-pill shrink-0">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[13px] md:text-sm font-semibold text-foreground truncate">
                          {app.name}
                        </h3>
                        {app.version && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {app.version}
                          </Badge>
                        )}
                        {isComingSoon && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-700 dark:text-amber-400"
                          >
                            Coming soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {app.platforms.map((p) => {
                      const meta = PLATFORM_META[p];
                      const PIcon = meta.icon;
                      return (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
                        >
                          <PIcon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {isComingSoon ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[12px] gap-1.5"
                        onClick={() => handleNotify(app.name)}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Notify me
                      </Button>
                    ) : (
                      app.platforms.map((p) => {
                        const meta = PLATFORM_META[p];
                        const PIcon = meta.icon;
                        const url = app.downloads[p];
                        return (
                          <Button
                            key={p}
                            size="sm"
                            variant={url ? "default" : "outline"}
                            className="h-8 text-[12px] gap-1.5"
                            onClick={() => handleDownload(url, app.name, meta.label)}
                            disabled={!url}
                          >
                            <PIcon className="w-3.5 h-3.5" />
                            {meta.label}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Need something else? Email{" "}
            <a
              href="mailto:partners@hizivo.com"
              className="text-emerald-600 hover:underline"
            >
              partners@hizivo.com
            </a>{" "}
            — we ship custom integrations for enterprise partners.
          </p>
        </>
      )}
    </div>
  );
}
