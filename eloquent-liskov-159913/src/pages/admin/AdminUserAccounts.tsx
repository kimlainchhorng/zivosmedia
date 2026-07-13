/**
 * Admin User Accounts — Support staff can create new user accounts with just a username
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithProgress } from "@/utils/uploadWithProgress";
import ReelThumbnail from "@/components/social/ReelThumbnail";
import {
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Camera,
  Link2,
  X,
  Facebook,
  Instagram,
  Twitter,
  Eye,
  RotateCcw,
  Mail,
  Phone,
  Calendar,
  Shield,
  Globe,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Play,
  Plus,
  Film,
  MapPin,
  Move,
} from "lucide-react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface CreatedAccount {
  userId?: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverPosition: number;
  socialLinks: Record<string, string>;
  bio: string;
}

interface AccountPreviewPost {
  id: string;
  media_url: string | null;
  media_type: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  mediaCount: number;
}

/* Inline SVG icons for platforms not in Lucide */
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.27 3.238-.928 1.135-2.256 1.738-3.95 1.795h-.113c-1.234-.04-2.27-.465-2.995-1.232-.645-.683-1.004-1.578-1.037-2.587-.066-2.08 1.462-3.564 3.87-3.756.894-.07 1.727-.03 2.482.118-.094-.528-.266-.98-.516-1.353-.443-.662-1.132-1.006-2.05-1.024h-.063c-.72.013-1.32.237-1.837.684l-1.352-1.56c.79-.684 1.81-1.074 2.95-1.128l.127-.003c1.524.022 2.71.592 3.527 1.696.72.97 1.122 2.252 1.205 3.834l.01.267c.917.456 1.68 1.1 2.25 1.912.87 1.239 1.176 2.757.886 4.392-.398 2.243-1.725 3.986-3.834 5.037C17.16 23.436 14.862 23.98 12.186 24zm-.09-9.792c-1.458.112-2.248.783-2.218 1.755.014.48.15.853.407 1.107.36.355.883.539 1.55.56h.076c1.07-.038 1.878-.396 2.474-1.095.326-.382.58-.874.774-1.484-.67-.186-1.387-.296-2.122-.328l-.138-.005-.003-.51z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.19 8.19 0 004.77 1.53V6.79a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

type SocialPlatform = {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
};

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    key: "facebook",
    label: "Facebook",
    icon: <Facebook className="h-3.5 w-3.5" />,
    color: "hsl(221 83% 53%)",
    placeholder: "https://facebook.com/username",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <Instagram className="h-3.5 w-3.5" />,
    color: "hsl(339 78% 55%)",
    placeholder: "https://instagram.com/username",
  },
  {
    key: "threads",
    label: "Threads",
    icon: <ThreadsIcon className="h-3.5 w-3.5" />,
    color: "hsl(0 0% 10%)",
    placeholder: "https://threads.net/@username",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: <TikTokIcon className="h-3.5 w-3.5" />,
    color: "hsl(0 0% 10%)",
    placeholder: "https://tiktok.com/@username",
  },
  {
    key: "x",
    label: "X",
    icon: <XIcon className="h-3.5 w-3.5" />,
    color: "hsl(0 0% 10%)",
    placeholder: "https://x.com/username",
  },
];

const CREATED_ACCOUNTS_STORAGE_KEY = "admin-user-accounts-session";


function generatePassword() {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$";
  const all = lower + upper + digits + special;

  // Guarantee at least one from each required set
  let pw = "";
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += special[Math.floor(Math.random() * special.length)];

  for (let i = pw.length; i < 14; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

function normalizeCreatedAccount(account: Partial<CreatedAccount>): CreatedAccount {
  return {
    userId: account.userId,
    username: account.username ?? "",
    email: account.email ?? "",
    password: account.password ?? "",
    createdAt: account.createdAt ?? new Date().toLocaleString(),
    avatarUrl: account.avatarUrl ?? null,
    coverUrl: account.coverUrl ?? null,
    coverPosition: account.coverPosition ?? 50,
    socialLinks: account.socialLinks ?? {},
    bio: account.bio ?? "",
  };
}

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }

  return btoa(binary);
}

function loadStoredCreatedAccounts(): CreatedAccount[] {
  if (typeof window === "undefined") return [];

  try {
    const stored =
      window.localStorage.getItem(CREATED_ACCOUNTS_STORAGE_KEY) ??
      window.sessionStorage.getItem(CREATED_ACCOUNTS_STORAGE_KEY);

    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeCreatedAccount(item as Partial<CreatedAccount>))
      .filter((item) => item.username && item.email);
  } catch {
    return [];
  }
}

function persistCreatedAccounts(accounts: CreatedAccount[]) {
  if (typeof window === "undefined") return;

  try {
    if (accounts.length === 0) {
      window.localStorage.removeItem(CREATED_ACCOUNTS_STORAGE_KEY);
      window.sessionStorage.removeItem(CREATED_ACCOUNTS_STORAGE_KEY);
      return;
    }

    const serialized = JSON.stringify(accounts);
    window.localStorage.setItem(CREATED_ACCOUNTS_STORAGE_KEY, serialized);
    window.sessionStorage.removeItem(CREATED_ACCOUNTS_STORAGE_KEY);
  } catch {
    // Ignore storage quota errors silently to avoid breaking account creation UI.
  }
}

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mergeCreatedAccounts(storedAccounts: CreatedAccount[], remoteAccounts: CreatedAccount[]): CreatedAccount[] {
  const merged = new Map<string, CreatedAccount>();

  remoteAccounts.forEach((account) => {
    const normalized = normalizeCreatedAccount(account);
    if (!normalized.email) return;
    merged.set(normalized.email.toLowerCase(), normalized);
  });

  storedAccounts.forEach((account) => {
    const normalized = normalizeCreatedAccount(account);
    if (!normalized.email) return;

    const key = normalized.email.toLowerCase();
    const existing = merged.get(key);

    merged.set(
      key,
      existing
        ? {
            ...existing,
            ...normalized,
            userId: normalized.userId || existing.userId,
            password: normalized.password || existing.password,
            avatarUrl: normalized.avatarUrl ?? existing.avatarUrl,
            coverUrl: normalized.coverUrl ?? existing.coverUrl,
            socialLinks: Object.keys(normalized.socialLinks ?? {}).length
              ? normalized.socialLinks
              : existing.socialLinks,
            createdAt: normalized.createdAt || existing.createdAt,
          }
        : normalized,
    );
  });

  return Array.from(merged.values()).sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
}


export default function AdminUserAccounts() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: access, isLoading: accessLoading } = useUserAccess(user?.id);
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[]>(() => loadStoredCreatedAccounts());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isPrivilegedEmail = user?.email === "chhorngkimlain1@gmail.com";

  const isAuthorized =
    access?.isSupport || access?.isAdmin || isPrivilegedEmail;

  const {
    data: remoteCreatedAccounts = [],
    isSuccess: hasLoadedRemoteCreatedAccounts,
  } = useQuery({
    queryKey: ["admin-created-accounts", user?.id],
    enabled: !!user && !!isAuthorized,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-list-created-users");

      if (error) throw error;

      const accounts = Array.isArray(data?.accounts) ? (data.accounts as Partial<CreatedAccount>[]) : [];
      return accounts.map((account) => normalizeCreatedAccount(account));
    },
  });

  useEffect(() => {
    persistCreatedAccounts(createdAccounts);
  }, [createdAccounts]);

  useEffect(() => {
    if (!hasLoadedRemoteCreatedAccounts) return;

    const liveEmails = new Set(
      remoteCreatedAccounts
        .map((account) => account.email.trim().toLowerCase())
        .filter(Boolean),
    );

    setCreatedAccounts((prev) =>
      mergeCreatedAccounts(
        prev.filter((account) => liveEmails.has(account.email.trim().toLowerCase())),
        remoteCreatedAccounts,
      ),
    );
  }, [hasLoadedRemoteCreatedAccounts, remoteCreatedAccounts]);

  if (authLoading || (!!user && !isPrivilegedEmail && accessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-ig-gradient">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to manage user accounts.
          </p>
          <Button onClick={() => navigate("/feed")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      toast({ title: "Username required", variant: "destructive" });
      return;
    }

    if (trimmed.length < 3) {
      toast({
        title: "Username too short",
        description: "Must be at least 3 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const generatedEmail = `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "")}+${Date.now()}@zivo.app`;
    const generatedPassword = generatePassword();

    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: generatedEmail, password: generatedPassword, username: trimmed },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newAccount: CreatedAccount = {
        userId: data.user?.id ?? "",
        username: trimmed,
        email: generatedEmail,
        password: generatedPassword,
        createdAt: new Date().toLocaleString(),
        avatarUrl: null,
        coverUrl: null,
        coverPosition: 50,
        socialLinks: {},
        bio: "",
      };

      setCreatedAccounts((prev) => [newAccount, ...prev]);
      queryClient.invalidateQueries({ queryKey: ["admin-created-accounts"] });
      toast({
        title: "Account created!",
        description: `Account "${trimmed}" is ready. Share the credentials below.`,
      });
      setUsername("");
    } catch (err: any) {
      toast({
        title: "Failed to create account",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImageUpload = async (index: number, type: "avatar" | "cover", file: File) => {
    const account = createdAccounts[index];
    if (!account || !account.userId) return;

    try {
      const bucket = type === "avatar" ? "avatars" : "covers";

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("admin-update-profile", {
        body: {
          userId: account.userId,
          uploadFile: {
            base64,
            bucket,
            contentType: file.type || "image/jpeg",
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const publicUrl = data?.uploadedUrl ?? "";

      // Update local state
      const fieldKey = type === "avatar" ? "avatarUrl" : "coverUrl";
      setCreatedAccounts((prev) =>
        prev.map((acc, i) =>
          i === index ? { ...acc, [fieldKey]: publicUrl, ...(type === "cover" ? { coverPosition: 50 } : {}) } : acc,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-created-accounts"] });

      toast({ title: `${type === "avatar" ? "Profile photo" : "Cover photo"} updated` });
    } catch (err: any) {
      toast({
        title: "Image upload failed",
        description: err.message || "Please try another image.",
        variant: "destructive",
      });
    }
  };

  const handleSocialLinkChange = (index: number, platform: string, value: string) => {
    setCreatedAccounts((prev) =>
      prev.map((acc, i) => {
        if (i !== index) return acc;
        return { ...acc, socialLinks: { ...(acc.socialLinks ?? {}), [platform]: value } };
      }),
    );
  };

  const handleSocialLinkBlur = (index: number) => {
    const account = createdAccounts[index];
    if (account) persistSocialLinks(account);
  };

  const persistSocialLinks = async (account: CreatedAccount) => {
    if (!account.userId) return;
    const links = account.socialLinks ?? {};
    if (Object.keys(links).length === 0) return;
    await supabase.functions.invoke("admin-update-profile", {
      body: { userId: account.userId, socialLinks: links },
    });
  };

  const removeSocialLink = (index: number, platform: string) => {
    setCreatedAccounts((prev) =>
      prev.map((acc, i) => {
        if (i !== index) return acc;
        const updated = { ...(acc.socialLinks ?? {}) };
        delete updated[platform];
        const newAcc = { ...acc, socialLinks: updated };
        // Persist removal
        if (acc.userId) {
          supabase.functions.invoke("admin-update-profile", {
            body: { userId: acc.userId, socialLinks: updated },
          });
        }
        return newAcc;
      }),
    );
  };

  const handleDeleteAccount = async (index: number) => {
    const account = createdAccounts[index];
    if (!account) return;

    try {
      // Try to delete from Supabase if we have a userId
      if (account.userId) {
        const { data, error } = await supabase.functions.invoke("admin-delete-user", {
          body: { userId: account.userId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      // Remove from local state
      setCreatedAccounts((prev) => prev.filter((_, i) => i !== index));
      queryClient.invalidateQueries({ queryKey: ["admin-created-accounts"] });
      toast({ title: "Account deleted", description: `${account.username} has been removed.` });
    } catch (err: any) {
      toast({
        title: "Failed to delete account",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="User Accounts" brandLabel="ZIVO Support">
      <div className="max-w-2xl space-y-8">
        <div className="bg-card rounded-2xl border border-border/40 p-6">
          <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create New Account
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Just enter a username. Email and password are generated automatically.
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                disabled={loading}
                autoFocus
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>
        </div>

        {createdAccounts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Created Accounts — Save these credentials!
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {createdAccounts.map((account, i) => {
              const acc = normalizeCreatedAccount(account);
              const hasPassword = Boolean(acc.password);
              const credText = hasPassword
                ? `Username: ${acc.username}\nEmail: ${acc.email}\nPassword: ${acc.password}`
                : `Username: ${acc.username}\nEmail: ${acc.email}`;
              const isCopied = copiedId === `acc-${i}`;
              const initials = acc.username
                .split(/[\s_]+/)
                .map((w) => w[0]?.toUpperCase())
                .join("")
                .slice(0, 2);
              const hue = acc.username.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;

              return (
                <ProfileCard
                  key={`${acc.email}-${i}`}
                  index={i}
                  acc={acc}
                  initials={initials}
                  hue={hue}
                  isCopied={isCopied}
                  hasPassword={hasPassword}
                  credText={credText}
                   onCopy={copyToClipboard}
                   onImageUpload={handleImageUpload}
                   onCoverPositionChange={(idx, pos) => {
                     setCreatedAccounts((prev) =>
                       prev.map((a, j) => j === idx ? { ...a, coverPosition: pos } : a)
                     );
                     // Also save to DB
                     const target = createdAccounts[idx];
                     if (target?.userId) {
                       supabase.from("profiles").update({ cover_position: Math.round(pos) } as any)
                         .or(`id.eq.${target.userId},user_id.eq.${target.userId}`)
                         .then(() => {});
                     }
                   }}
                   onSocialLinkChange={handleSocialLinkChange}
                   onSocialLinkBlur={handleSocialLinkBlur}
                   onRemoveSocialLink={removeSocialLink}
                   onDelete={handleDeleteAccount}
                   onBioChange={(idx, bio) => {
                     setCreatedAccounts((prev) =>
                       prev.map((a, j) => j === idx ? { ...a, bio } : a)
                     );
                   }}
                 />
              );
            })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

interface ProfileCardProps {
  index: number;
  acc: CreatedAccount;
  initials: string;
  hue: number;
  isCopied: boolean;
  hasPassword: boolean;
  credText: string;
  onCopy: (text: string, id: string) => void;
  onImageUpload: (index: number, type: "avatar" | "cover", file: File) => void;
  onCoverPositionChange: (index: number, position: number) => void;
  onSocialLinkChange: (index: number, platform: string, value: string) => void;
  onSocialLinkBlur: (index: number) => void;
  onRemoveSocialLink: (index: number, platform: string) => void;
  onDelete: (index: number) => void;
  onBioChange: (index: number, bio: string) => void;
}

function ProfileCard({
  index,
  acc,
  initials,
  hue,
  isCopied,
  hasPassword,
  credText,
  onCopy,
  onImageUpload,
  onCoverPositionChange,
  onSocialLinkChange,
  onSocialLinkBlur,
  onRemoveSocialLink,
  onDelete,
  onBioChange,
}: ProfileCardProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postTab, setPostTab] = useState<"all" | "photos" | "reels">("all");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostLocation, setNewPostLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [newPostMedia, setNewPostMedia] = useState<File[]>([]);
  const [newPostPreviews, setNewPostPreviews] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<AccountPreviewPost | null>(null);
  const postMediaRef = useRef<HTMLInputElement>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Array<{ id: string; user_id: string; content: string; created_at: string; display_name?: string; avatar_url?: string }>>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const queryClient = useQueryClient();

  // Cover repositioning
  const [coverRepositioning, setCoverRepositioning] = useState(false);
  const [localCoverPos, setLocalCoverPos] = useState(acc.coverPosition);
  const coverDragRef = useRef<{ startY: number; startPos: number } | null>(null);

  useEffect(() => {
    setLocalCoverPos(acc.coverPosition);
  }, [acc.coverPosition]);

  const handleCoverDragStart = (clientY: number) => {
    coverDragRef.current = { startY: clientY, startPos: localCoverPos };
  };
  const handleCoverDragMove = (clientY: number) => {
    if (!coverDragRef.current) return;
    const delta = clientY - coverDragRef.current.startY;
    const newPos = Math.max(0, Math.min(100, coverDragRef.current.startPos + delta * 0.3));
    setLocalCoverPos(newPos);
  };
  const handleCoverDragEnd = () => { coverDragRef.current = null; };
  const saveCoverPosition = () => {
    onCoverPositionChange(index, Math.round(localCoverPos));
    setCoverRepositioning(false);
    toast({ title: "Cover position saved!" });
  };

  useEffect(() => {
    previewUrlsRef.current = newPostPreviews;
  }, [newPostPreviews]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!isFlipped) {
      setSelectedPost(null);
    }
  }, [isFlipped]);

  // Fetch comments when a post is selected
  useEffect(() => {
    if (!selectedPost) {
      setPostComments([]);
      setNewComment("");
      return;
    }
    let cancelled = false;
    setLoadingComments(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("post_comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", selectedPost.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load comments:", error);
        setPostComments([]);
      } else {
        // Fetch profile names for commenters
        const userIds = [...new Set((data || []).map((c: any) => c.user_id))] as string[];
        const profileMap = new Map<string, { display_name?: string; avatar_url?: string }>();
        if (userIds.length > 0) {
          const { data: profiles } = await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", userIds);
          (profiles || []).forEach((p: any) => profileMap.set(p.user_id, { display_name: p.full_name, avatar_url: p.avatar_url }));
        }
        setPostComments(
          (data || []).map((c: any) => ({
            ...c,
            display_name: (profileMap.get(c.user_id) as any)?.display_name || "User",
            avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
          }))
        );
      }
      setLoadingComments(false);
    })();
    return () => { cancelled = true; };
  }, [selectedPost?.id]);

  const handleDeletePost = async (postId: string) => {
    setDeletingPostId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user-post", {
        body: { postId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSelectedPost(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-user-posts", acc.userId] });
      toast({ title: "Post deleted" });
    } catch (err: any) {
      toast({ title: "Failed to delete post", description: err.message, variant: "destructive" });
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim() || !acc.userId) return;
    setSubmittingComment(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-post-comment", {
        body: {
          postId: selectedPost.id,
          userId: acc.userId,
          content: newComment.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const comment = data?.comment;
      setPostComments((prev) => [...prev, { ...comment, display_name: acc.username, avatar_url: acc.avatarUrl }]);
      setNewComment("");
      // Update comment count in selectedPost
      setSelectedPost((prev) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
      await queryClient.invalidateQueries({ queryKey: ["admin-user-posts", acc.userId] });
    } catch (err: any) {
      toast({ title: "Failed to add comment", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const availableSlots = Math.max(0, 10 - newPostMedia.length);
    if (availableSlots === 0) {
      toast({
        title: "Media limit reached",
        description: "You can add up to 10 files per post.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const nextFiles = selectedFiles.slice(0, availableSlots);
    const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file));

    if (selectedFiles.length > availableSlots) {
      toast({
        title: "Only 10 files allowed",
        description: "Extra files were skipped.",
      });
    }

    setNewPostMedia((prev) => [...prev, ...nextFiles]);
    setNewPostPreviews((prev) => [...prev, ...nextPreviews]);

    if (newPostMedia.length === 0) {
      setActivePreviewIndex(0);
    }

    e.target.value = "";
  };

  const removePostMedia = (index: number) => {
    const removedPreview = newPostPreviews[index];
    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }

    setNewPostMedia((prev) => prev.filter((_, i) => i !== index));
    setNewPostPreviews((prev) => prev.filter((_, i) => i !== index));
    setActivePreviewIndex((current) => {
      const nextLength = newPostPreviews.length - 1;
      if (nextLength <= 0) return 0;
      if (current > index) return current - 1;
      return Math.min(current, nextLength - 1);
    });
  };

  const resetPostComposer = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setNewPostCaption("");
    setNewPostLocation("");
    setShowLocationInput(false);
    setNewPostMedia([]);
    setNewPostPreviews([]);
    setActivePreviewIndex(0);

    if (postMediaRef.current) {
      postMediaRef.current.value = "";
    }
  };

  const handleCreatePost = async () => {
    if (!newPostCaption.trim() && newPostMedia.length === 0) return false;
    setIsPosting(true);
    setUploadProgress("");

    try {
      let targetUserId = acc.userId;

      if (!targetUserId) {
        const { data: uid, error: lookupError } = await supabase.rpc("admin_lookup_profile_by_email" as any, {
          _email: acc.email,
        });

        if (lookupError || !uid) {
          throw new Error("Could not find this account user ID. Please refresh the account list and try again.");
        }

        targetUserId = uid as string;
      }

      const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB

      const uploadedFiles: Array<{ storageUrl?: string; base64?: string; name: string; contentType: string }> = [];
      for (let index = 0; index < newPostMedia.length; index++) {
        const file = newPostMedia[index];
        if (file.size > DIRECT_UPLOAD_THRESHOLD) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
          const filePath = `${targetUserId}/post_${Date.now()}_${index}_${crypto.randomUUID()}.${ext}`;
          const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
          setUploadProgress(`Uploading ${file.name} (${sizeMB} MB) — 0%`);

          const publicUrl = await uploadWithProgress("user-posts", filePath, file, (pct) => {
            setUploadProgress(`Uploading ${file.name} (${sizeMB} MB) — ${pct}%`);
          });

          setUploadProgress(`Uploaded ${file.name} ✓`);

          uploadedFiles.push({
            storageUrl: publicUrl,
            name: file.name,
            contentType: file.type || "application/octet-stream",
          });
        } else {
          uploadedFiles.push({
            base64: await fileToBase64(file),
            name: file.name,
            contentType: file.type || "application/octet-stream",
          });
        }
      }
      const files = uploadedFiles;

      setUploadProgress("Creating post...");

      const captionWithLocation = [
        newPostCaption.trim(),
        newPostLocation.trim() ? `📍 ${newPostLocation.trim()}` : "",
      ].filter(Boolean).join("\n") || null;

      const { data, error } = await supabase.functions.invoke("admin-create-user-post", {
        body: {
          userId: targetUserId,
          caption: captionWithLocation,
          files,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      resetPostComposer();
      setUploadProgress("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-posts", targetUserId] });
      toast({ title: "Post created", description: `Posted as ${acc.username}` });
      return true;
    } catch (err: any) {
      toast({
        title: "Failed to post",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsPosting(false);
      setUploadProgress("");
    }
  };

  const socialLinks = acc.socialLinks ?? {};
  const addedPlatforms = Object.keys(socialLinks);
  const availablePlatforms = SOCIAL_PLATFORMS.filter((platform) => !addedPlatforms.includes(platform.key));

  // Fetch user posts when card is flipped
  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["admin-user-posts", acc.userId],
    queryFn: async () => {
      if (!acc.userId) return [];

      const { data, error } = await (supabase as any)
        .from("user_posts")
        .select("id, media_url, media_type, caption, likes_count, comments_count, created_at")
        .eq("user_id", acc.userId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      const posts = (data || []) as Array<Omit<AccountPreviewPost, "mediaCount">>;

      if (posts.length === 0) {
        return [];
      }

      const { data: mediaRows, error: mediaError } = await (supabase as any)
        .from("post_media")
        .select("post_id")
        .in("post_id", posts.map((post) => post.id));

      if (mediaError) throw mediaError;

      const mediaCountByPostId = new Map<string, number>();
      (mediaRows || []).forEach((row: { post_id: string }) => {
        mediaCountByPostId.set(row.post_id, (mediaCountByPostId.get(row.post_id) ?? 0) + 1);
      });

      return posts.map((post) => ({
        ...post,
        mediaCount: Math.max(mediaCountByPostId.get(post.id) ?? 0, post.media_url ? 1 : 0),
      }));
    },
    enabled: isFlipped && !!acc.userId,
  });

  return (
    <div>
      <div
        className="relative"
      >
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(index, "cover", file);
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(index, "avatar", file);
        }}
      />
        {/* ===== FRONT SIDE ===== */}
        <div className={`rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm ${isFlipped ? "hidden" : ""}`}>

      {/* Cover */}
      <div
        className={`h-28 w-full relative group overflow-hidden ${coverRepositioning ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        onClick={coverRepositioning ? undefined : () => coverInputRef.current?.click()}
        onMouseDown={coverRepositioning ? (e) => { e.preventDefault(); handleCoverDragStart(e.clientY); } : undefined}
        onMouseMove={coverRepositioning ? (e) => handleCoverDragMove(e.clientY) : undefined}
        onMouseUp={coverRepositioning ? handleCoverDragEnd : undefined}
        onMouseLeave={coverRepositioning ? handleCoverDragEnd : undefined}
        onTouchStart={coverRepositioning ? (e) => handleCoverDragStart(e.touches[0].clientY) : undefined}
        onTouchMove={coverRepositioning ? (e) => handleCoverDragMove(e.touches[0].clientY) : undefined}
        onTouchEnd={coverRepositioning ? handleCoverDragEnd : undefined}
      >
        {acc.coverUrl ? (
          <img
            src={acc.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover select-none"
            style={{ objectPosition: `center ${localCoverPos}%` }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 60% 45%))` }}
          />
        )}
        {!coverRepositioning && (
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
            <Camera className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {coverRepositioning && (
          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
            <span className="text-background text-xs font-semibold bg-foreground/50 rounded-full px-3 py-1">
              Drag up / down to reposition
            </span>
          </div>
        )}
        {acc.coverUrl && !coverRepositioning && (
          <button type="button"
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => { e.stopPropagation(); setCoverRepositioning(true); }}
          >
            <Move className="h-3 w-3" /> Reposition
          </button>
        )}
        {coverRepositioning && (
          <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
            <button type="button"
              className="rounded-full bg-card px-3 py-1 text-[10px] font-semibold text-foreground border border-border/40 shadow-sm"
              onClick={(e) => { e.stopPropagation(); setLocalCoverPos(acc.coverPosition); setCoverRepositioning(false); }}
            >
              Cancel
            </button>
            <button type="button"
              className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm"
              onClick={(e) => { e.stopPropagation(); saveCoverPosition(); }}
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Left-aligned avatar + name + stats */}
      <div className="flex flex-col items-start -mt-10 pb-4 px-4">
        <div
          className="h-20 w-20 rounded-full border-4 border-card flex items-center justify-center text-background text-xl font-bold shadow-md relative group cursor-pointer overflow-hidden bg-card"
          onClick={() => avatarInputRef.current?.click()}
          style={{
            background: acc.avatarUrl
              ? "hsl(var(--card))"
              : `linear-gradient(145deg, hsl(${hue} 65% 50%), hsl(${(hue + 30) % 360} 55% 40%))`,
          }}
        >
          {acc.avatarUrl ? (
            <img src={acc.avatarUrl} alt={`${acc.username} avatar`} className="h-full w-full object-cover object-top" loading="lazy" />
          ) : (
            initials
          )}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center rounded-full">
            <Camera className="h-4 w-4 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-foreground mt-2">{acc.username}</h3>
        <p className="text-[10px] text-muted-foreground">Created {acc.createdAt}</p>
        <span className="inline-flex items-center gap-1 mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
          <Shield className="h-2.5 w-2.5" />
          active
        </span>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Friends</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Following</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">


          <div className="space-y-2">
            {addedPlatforms.map((key) => {
              const platform = SOCIAL_PLATFORMS.find((item) => item.key === key);
              if (!platform) return null;
              const linkValue = socialLinks[key] || "";
              const isEditing = editingLink === key;

              return (
                <div key={key} className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <span
                        className="h-7 w-7 rounded-full flex items-center justify-center text-background text-xs font-bold shrink-0"
                        style={{ backgroundColor: platform.color }}
                      >
                        {platform.icon}
                      </span>
                      <Input
                        value={linkValue}
                        onChange={(e) => onSocialLinkChange(index, key, e.target.value)}
                        placeholder={platform.placeholder}
                        className="h-8 text-xs"
                        autoFocus
                        onBlur={() => { onSocialLinkBlur(index); setEditingLink(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onSocialLinkBlur(index); setEditingLink(null); }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveSocialLink(index, key)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : linkValue ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={linkValue.startsWith("http") ? linkValue : `https://${linkValue}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <span
                          className="h-5 w-5 rounded-full flex items-center justify-center text-background text-[10px] font-bold"
                          style={{ backgroundColor: platform.color }}
                        >
                          {platform.icon}
                        </span>
                        {platform.label}
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingLink(key)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit link"
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSocialLink(index, key)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingLink(key)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <span
                        className="h-5 w-5 rounded-full flex items-center justify-center text-background text-[10px] font-bold"
                        style={{ backgroundColor: platform.color }}
                      >
                        {platform.icon}
                      </span>
                      Add {platform.label}
                    </button>
                  )}
                </div>
              );
            })}

            {availablePlatforms.length > 0 && (
              <div className="relative">
                {!showLinkForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => setShowLinkForm(true)}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Add Social Link
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-xl">
                    {availablePlatforms.map((platform) => (
                      <button type="button"
                        key={platform.key}
                        onClick={() => {
                          onSocialLinkChange(index, platform.key, "");
                          setShowLinkForm(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <span
                          className="h-5 w-5 rounded-full flex items-center justify-center text-background text-[10px] font-bold"
                          style={{ backgroundColor: platform.color }}
                        >
                          {platform.icon}
                        </span>
                        {platform.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowLinkForm(false)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-muted/40 rounded-xl p-3 space-y-1 font-mono text-xs text-muted-foreground">
            <p>Email: {acc.email}</p>
            <p>Password: {acc.password || "Only available right after creation on this device"}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCopy(credText, `acc-${index}`)}
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {hasPassword ? "Copy Credentials" : "Copy Account Details"}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFlipped(true)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>

            {!confirmDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    onDelete(index);
                  }}
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                  Confirm Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

     {/* ===== BACK SIDE (Profile Preview — matches user profile page) ===== */}
    <div className={`rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm ${isFlipped ? "" : "hidden"}`}>
      {/* Content */}
      <div>
        {/* Your Story */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex flex-col items-start gap-1 w-fit">
            <div className="relative w-14 h-14">
              <div className="w-full h-full rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center bg-primary/5">
                <Camera className="h-5 w-5 text-primary/50" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                <Plus className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground w-full text-center">Your story</span>
          </div>
        </div>

        {/* Profile card with gradient cover */}
        <div className="rounded-xl border border-border/30 overflow-hidden mx-3 mt-1 bg-gradient-to-b from-primary/10 to-card">
          {/* Cover */}
          <div
            className="h-24 w-full relative group cursor-pointer overflow-hidden"
            onClick={() => coverInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={acc.coverUrl ? "Change cover photo" : "Add cover photo"}
          >
            {acc.coverUrl ? (
              <img
                src={acc.coverUrl}
                alt="Cover"
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${localCoverPos}%` }}
              />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(180deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.05) 100%)` }} />
            )}
            <div className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/20" />
            <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm">
              <Camera className="h-3 w-3" />
              {acc.coverUrl ? "Change cover" : "Add cover"}
            </div>
          </div>

          {/* Left-aligned avatar + name */}
          <div className="flex flex-col items-start -mt-10 pb-4 px-4 relative z-10">
            <div
              className="relative h-20 w-20 rounded-full border-4 border-card flex items-center justify-center text-background text-xl font-bold shadow-md overflow-hidden bg-card group cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  avatarInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={acc.avatarUrl ? "Change profile photo" : "Add profile photo"}
              style={{
                background: acc.avatarUrl
                  ? "hsl(var(--card))"
                  : `linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
              }}
            >
              {acc.avatarUrl ? (
                <img
                  src={acc.avatarUrl}
                  alt={`${acc.username} avatar`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                initials
              )}
              <div className="absolute inset-0 rounded-full bg-foreground/0 transition-colors group-hover:bg-foreground/20" />
              <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-card text-foreground shadow-sm">
                <Camera className="h-3 w-3" />
              </div>
            </div>

            <h3 className="text-base font-bold text-foreground mt-2">{acc.username}</h3>

            {/* Bio */}
            <div className="w-full mt-1 px-2">
              <textarea
                className="w-full text-xs text-muted-foreground bg-transparent border border-transparent hover:border-border/40 focus:border-primary/40 rounded-lg px-2 py-1 resize-none outline-none transition-colors placeholder:text-muted-foreground/50"
                placeholder="Add bio..."
                rows={2}
                maxLength={160}
                value={acc.bio}
                onChange={(e) => onBioChange(index, e.target.value)}
                onBlur={async () => {
                  if (!acc.userId) return;
                  await supabase.functions.invoke("admin-update-profile", {
                    body: { userId: acc.userId, bio: acc.bio },
                  });
                }}
              />
            </div>

            <span className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-2.5 w-2.5" />
              active
            </span>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-3">
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">0</p>
                <p className="text-[10px] text-muted-foreground">Friends</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">0</p>
                <p className="text-[10px] text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">0</p>
                <p className="text-[10px] text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Post composer trigger — click to open modal */}
        <div
          className="mx-3 mt-3 rounded-xl border border-border/30 bg-card p-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowPostModal(true)}
        >
          <input ref={postMediaRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handlePostMediaSelect} />
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-background text-xs font-bold overflow-hidden border-2 border-primary/20 bg-card"
              style={{
                background: acc.avatarUrl
                  ? "hsl(var(--card))"
                  : `linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
              }}
            >
              {acc.avatarUrl ? (
                <img src={acc.avatarUrl} alt={`${acc.username} avatar`} className="h-full w-full object-cover object-top" loading="lazy" />
              ) : (
                initials
              )}
            </div>
            <span className="flex-1 text-sm text-muted-foreground">What's on your mind?</span>
            <div className="flex items-center gap-1.5">
              <span className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              <span className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Film className="h-3.5 w-3.5 text-blue-600" />
              </span>
              <span className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-orange-600" />
              </span>
            </div>
          </div>
        </div>

        {/* ===== Facebook-style Create Post Modal (portaled to body) ===== */}
        {showPostModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={() => setShowPostModal(false)}>
            <div
              className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:mx-4 sm:rounded-2xl border-0 sm:border border-border/40 bg-card shadow-2xl overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
                <h3 className="text-base font-bold text-foreground">Create Post</h3>
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* User row */}
              <div className="flex items-center gap-3 px-5 pt-4">
                <div
                  className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-background text-xs font-bold overflow-hidden border-2 border-primary/20 bg-card"
                  style={{
                    background: acc.avatarUrl
                      ? "hsl(var(--card))"
                      : `linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                  }}
                >
                  {acc.avatarUrl ? (
                    <img src={acc.avatarUrl} alt={`${acc.username} avatar`} className="h-full w-full object-cover object-top" loading="lazy" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{acc.username}</p>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5" /> Public
                  </span>
                </div>
              </div>

              {/* Text area */}
              <div className="px-5 py-3 flex-1 sm:flex-none">
                <textarea
                  placeholder={`What's on your mind, ${acc.username.split(/[\s_]/)[0]}?`}
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="w-full min-h-[120px] sm:min-h-[120px] h-full sm:h-auto bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none resize-none"
                  autoFocus
                />
              </div>

               {/* Media preview */}
               {newPostPreviews.length > 0 && (
                 <div className="px-5 pb-3 space-y-3">
                   <div className="relative aspect-square overflow-hidden rounded-xl border border-border/30 bg-muted/30">
                     {newPostMedia[activePreviewIndex]?.type?.startsWith("video") ? (
                       <video src={newPostPreviews[activePreviewIndex]} className="h-full w-full object-cover" controls muted />
                     ) : (
                       <img src={newPostPreviews[activePreviewIndex]} alt="" className="h-full w-full object-cover" />
                     )}

                     <button
                       type="button"
                       onClick={() => removePostMedia(activePreviewIndex)}
                       className="absolute top-2 left-2 h-7 w-7 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground/90 transition-colors"
                     >
                       <X className="h-3.5 w-3.5" />
                     </button>

                     {newPostPreviews.length > 1 && (
                       <div className="absolute top-2 right-2 rounded-full bg-foreground/70 px-2 py-1 text-[10px] font-semibold text-background">
                         {activePreviewIndex + 1}/{newPostPreviews.length}
                       </div>
                     )}
                   </div>

                   <div className="flex gap-2 overflow-x-auto pb-1">
                     {newPostPreviews.map((preview, previewIndex) => (
                       <button type="button"
                         key={`${preview}-${previewIndex}`}
                         onClick={() => setActivePreviewIndex(previewIndex)}
                         className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${previewIndex === activePreviewIndex ? "border-primary ring-1 ring-primary/30" : "border-border/30 opacity-70 hover:opacity-100"}`}
                       >
                         {newPostMedia[previewIndex]?.type?.startsWith("video") ? (
                           <video src={preview} className="h-full w-full object-cover" muted />
                         ) : (
                           <img src={preview} alt="" className="h-full w-full object-cover" />
                         )}
                       </button>
                     ))}

                     {newPostMedia.length < 10 && (
                       <button
                         type="button"
                         onClick={() => postMediaRef.current?.click()}
                         className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border/40 text-muted-foreground transition-colors hover:bg-muted/30"
                       >
                         <Plus className="h-4 w-4" />
                       </button>
                     )}
                   </div>
                 </div>
              )}

              {/* Add to post options */}
              <div className="mx-5 mb-4 rounded-xl border border-border/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Add to your post</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => postMediaRef.current?.click()}
                      className="h-9 w-9 rounded-full hover:bg-emerald-500/10 flex items-center justify-center transition-colors"
                      title="Photo"
                    >
                      <ImageIcon className="h-5 w-5 text-emerald-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => postMediaRef.current?.click()}
                      className="h-9 w-9 rounded-full hover:bg-blue-500/10 flex items-center justify-center transition-colors"
                      title="Video"
                    >
                      <Film className="h-5 w-5 text-blue-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => postMediaRef.current?.click()}
                      className="h-9 w-9 rounded-full hover:bg-orange-500/10 flex items-center justify-center transition-colors"
                      title="Camera"
                    >
                      <Camera className="h-5 w-5 text-orange-500" />
                    </button>
                    <button
                      type="button"
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${showLocationInput ? "bg-red-500/20" : "hover:bg-red-500/10"}`}
                      title="Add location"
                      onClick={() => setShowLocationInput((v) => !v)}
                    >
                      <MapPin className={`h-5 w-5 ${showLocationInput ? "text-red-600" : "text-red-500"}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Location input */}
              {showLocationInput && (
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                    <input
                      type="text"
                      value={newPostLocation}
                      onChange={(e) => setNewPostLocation(e.target.value)}
                      placeholder="Add location..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      autoFocus
                    />
                    {newPostLocation && (
                      <button type="button" onClick={() => setNewPostLocation("")} className="shrink-0">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Post button */}
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={async () => {
                    const didPost = await handleCreatePost();
                    if (didPost) setShowPostModal(false);
                  }}
                  disabled={isPosting || (!newPostCaption.trim() && newPostMedia.length === 0)}
                  className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isPosting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadProgress || "Processing..."}
                    </span>
                  ) : "Post"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Post tabs */}
        <div className="flex items-center border-b border-border/30 mx-3 mt-3">
          {(["all", "photos", "reels"] as const).map((tab) => (
            <button type="button"
              key={tab}
              onClick={() => setPostTab(tab)}
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors border-b-2 ${
                postTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" && "⊞ All"}
              {tab === "photos" && "📷 Photos"}
              {tab === "reels" && "🎬 Reels"}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div className="px-3 py-3">
          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (() => {
            const filtered = userPosts.filter((post) => {
              if (postTab === "photos") return post.media_type !== "video" && post.media_url;
              if (postTab === "reels") return post.media_type === "video";
              return true;
            });
            return filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">No posts yet</p>
              </div>
            ) : (
               <div className={`grid gap-1 rounded-lg overflow-hidden ${postTab === "reels" ? "grid-cols-2" : "grid-cols-3"}`}>
                {filtered.map((post) => {
                  const isVideo = post.media_type === "video";
                  return (
                   <button type="button"
                     key={post.id}
                     onClick={() => setSelectedPost(post)}
                     className={`relative overflow-hidden bg-muted/60 text-left cursor-pointer border-0 p-0 group ${isVideo ? "aspect-[9/14]" : "aspect-square"}`}
                     aria-label={`Open post preview for ${acc.username}`}
                   >
                    {post.media_url ? (
                      isVideo ? (
                        <ReelThumbnail url={post.media_url} />
                      ) : (
                        <img src={post.media_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="h-full w-full flex items-center justify-center p-2">
                        <p className="text-[10px] text-muted-foreground line-clamp-3 text-center">{post.caption}</p>
                      </div>
                    )}
                    {post.mediaCount > 1 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-foreground/70 px-1.5 py-0.5 text-[10px] font-semibold text-background">
                        <ImageIcon className="h-3 w-3" />
                        {post.mediaCount}
                      </div>
                    )}
                     <div className="pointer-events-none absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1 text-background text-xs font-medium">
                        <Heart className="h-3.5 w-3.5" fill="currentColor" />
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-background text-xs font-medium">
                        <MessageCircle className="h-3.5 w-3.5" fill="currentColor" />
                        {post.comments_count || 0}
                      </span>
                    </div>
                   </button>
                 );
               })}
              </div>
            );
          })()}
        </div>

        {selectedPost && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-foreground/70 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          >
            <div
              className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-card border-0 sm:border border-border/40 sm:rounded-2xl overflow-hidden flex flex-col sm:flex-row shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex min-h-[45vh] flex-1 items-center justify-center bg-foreground/95">
                {selectedPost.media_url ? (
                  selectedPost.media_type === "video" ? (
                    <video
                      src={selectedPost.media_url}
                      className="max-h-full max-w-full"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={selectedPost.media_url}
                      alt={selectedPost.caption || `${acc.username} post`}
                      className="max-h-full max-w-full object-contain"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8 text-center">
                    <p className="max-w-md text-sm text-background/90">{selectedPost.caption || "No media attached to this post."}</p>
                  </div>
                )}
              </div>

              <div className="flex w-full shrink-0 flex-col bg-card sm:max-w-sm">
                <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
                  <div
                    className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border border-border/40 bg-card text-background text-xs font-bold"
                    style={{
                      background: acc.avatarUrl
                        ? "hsl(var(--card))"
                        : `linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                    }}
                  >
                    {acc.avatarUrl ? (
                      <img src={acc.avatarUrl} alt={`${acc.username} avatar`} className="h-full w-full object-cover object-top" loading="lazy" />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{acc.username}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 transition-colors hover:bg-muted"
                    aria-label="Close post preview"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {selectedPost.caption?.trim() ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedPost.caption}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No caption</p>
                  )}

                  <div className="flex items-center gap-4 border-t border-border/30 pt-3 text-sm">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 font-medium text-foreground hover:text-red-500 transition-colors"
                      onClick={async () => {
                        const next = (selectedPost.likes_count || 0) + 1;
                        await supabase.from("user_posts" as any).update({ likes_count: next }).eq("id", selectedPost.id);
                        setSelectedPost(prev => prev ? { ...prev, likes_count: next } : prev);
                      }}
                    >
                      <Heart className="h-4 w-4" />
                      {selectedPost.likes_count || 0}
                    </button>
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      {selectedPost.comments_count || 0}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {selectedPost.mediaCount} {selectedPost.mediaCount === 1 ? "file" : "files"}
                    </span>
                    <div className="ml-auto">
                      <button
                        type="button"
                        disabled={deletingPostId === selectedPost.id}
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="flex items-center gap-1 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                      >
                        {deletingPostId === selectedPost.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Comments section */}
                  <div className="border-t border-border/30 pt-3 space-y-3">
                    <p className="text-xs font-semibold text-foreground">Comments</p>
                    {loadingComments ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : postComments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No comments yet</p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {postComments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="h-7 w-7 rounded-full shrink-0 bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                              {comment.avatar_url ? (
                                <img src={comment.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                (comment.display_name || "U")[0].toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs">
                                <span className="font-semibold text-foreground">{comment.display_name} </span>
                                <span className="text-foreground/90">{comment.content}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                        className="flex-1 h-8 rounded-lg border border-border/40 bg-muted/30 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                      />
                      <button
                        type="button"
                        disabled={submittingComment || !newComment.trim()}
                        onClick={handleAddComment}
                        className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
                      >
                        {submittingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      </div>

      {/* Action buttons — sticky bottom */}
      <div className="flex gap-2 p-3 border-t border-border/30 bg-card shrink-0">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsFlipped(false)} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Back
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={async () => {
            if (acc.userId) {
              window.open(`/user/${acc.userId}`, "_blank");
            } else {
              try {
                const { data: uid, error } = await supabase.rpc("admin_lookup_profile_by_email" as any, { _email: acc.email });
                if (error || !uid) {
                  toast({ title: "User not found", description: "Could not find a profile for this account.", variant: "destructive" });
                  return;
                }
                window.open(`/user/${uid}`, "_blank");
              } catch {
                toast({ title: "Lookup failed", description: "Could not look up user profile.", variant: "destructive" });
              }
            }
          }}
          className="gap-1.5"
        >
          <Globe className="h-3.5 w-3.5" /> Open Full Profile
        </Button>
      </div>
    </div>

      </div>
    </div>
  );
}
