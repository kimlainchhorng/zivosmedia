/**
 * CreatePostModal — ZIVO creator composer modal
 * Shared component for Feed and Profile pages
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X as XIcon, Globe, Users, Lock, FolderPlus, MapPin, Hash,
  ChevronDown, Image as ImageIcon, Play, Film, Radio, Plus, Search, Share2, Loader2,
  Smile, Music, ShoppingBag, ShieldAlert, ShieldCheck, Sparkles, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { uploadWithProgress } from "@/utils/uploadWithProgress";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import { nativeConfirm } from "@/lib/native/dialog";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { detectSensitiveContent, isSensitiveSchemaDriftError } from "@/lib/social/sensitiveContent";
import ProductPickerSheet from "@/components/social/ProductPickerSheet";
import { useSwipeDownClose } from "@/components/social/useSwipeDownClose";
import { useOwnerStores } from "@/hooks/useOwnerStoreProfile";

interface CreatePostModalProps {
  userId: string;
  userProfile: { name: string; avatar: string | null } | null;
  onClose: () => void;
  onCreated: () => void;
  initialCaption?: string;
  sharedMediaUrl?: string;
  sharedMediaType?: "image" | "video";
  sharedPostId?: string;
  sharedPostAuthorId?: string;
  sharedPostAuthorName?: string;
  remixType?: "duet" | "stitch";
  commerceLinkDraft?: {
    linkType: "store_product" | "truck_sale";
    storeId?: string;
    storeProductId?: string;
    truckSaleId?: string;
    checkoutPath?: string;
    mapLat?: number;
    mapLng?: number;
    mapLabel?: string;
  };
  initialAudioName?: string;
  // Preselect a creation mode so entry buttons (Photo/Reels/Poll) skip the
  // redundant second tap inside the modal toolbar.
  initialMode?: "photo" | "reel" | "poll" | "story" | "shop" | "live";
}

const COMPOSER_WORKFLOWS = [
  { mode: "post", label: "Post", description: "Photos only", icon: ImageIcon },
  { mode: "reel", label: "Reel", description: "Videos only", icon: Film },
  { mode: "story", label: "Story", description: "Photo or video under 1m", icon: Play },
  { mode: "poll", label: "Poll", description: "Ask and collect votes", icon: Hash },
  { mode: "shop", label: "Shop", description: "Tag product or sale", icon: ShoppingBag },
  { mode: "live", label: "Live", description: "Go on air now", icon: Radio },
] as const;

type ComposerWorkflow = (typeof COMPOSER_WORKFLOWS)[number]["mode"];


const WORKFLOW_STYLES: Record<ComposerWorkflow, {
  accent: string;
  activeCard: string;
  iconBubble: string;
  soft: string;
  text: string;
}> = {
  post: {
    accent: "from-sky-500 via-blue-500 to-indigo-500",
    activeCard: "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_8px_24px_rgba(14,165,233,0.14)]",
    iconBubble: "bg-sky-500 text-white",
    soft: "bg-sky-50 text-sky-700",
    text: "text-sky-700",
  },
  reel: {
    accent: "from-fuchsia-500 via-rose-500 to-orange-400",
    activeCard: "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_8px_24px_rgba(244,63,94,0.14)]",
    iconBubble: "bg-rose-500 text-white",
    soft: "bg-rose-50 text-rose-700",
    text: "text-rose-700",
  },
  story: {
    accent: "from-amber-400 via-orange-500 to-pink-500",
    activeCard: "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_8px_24px_rgba(249,115,22,0.14)]",
    iconBubble: "bg-orange-500 text-white",
    soft: "bg-orange-50 text-orange-700",
    text: "text-orange-700",
  },
  poll: {
    accent: "from-violet-500 via-purple-500 to-indigo-500",
    activeCard: "border-violet-200 bg-violet-50 text-violet-700 shadow-[0_8px_24px_rgba(139,92,246,0.14)]",
    iconBubble: "bg-violet-500 text-white",
    soft: "bg-violet-50 text-violet-700",
    text: "text-violet-700",
  },
  shop: {
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    activeCard: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.14)]",
    iconBubble: "bg-emerald-500 text-white",
    soft: "bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
  },
  live: {
    accent: "from-red-500 via-pink-500 to-fuchsia-500",
    activeCard: "border-red-200 bg-red-50 text-red-700 shadow-[0_8px_24px_rgba(239,68,68,0.14)]",
    iconBubble: "bg-red-500 text-white",
    soft: "bg-red-50 text-red-700",
    text: "text-red-700",
  },
};

const WORKFLOW_PROMPTS: Record<ComposerWorkflow, string> = {
  post: "Share an update, tag people, or add a place...",
  reel: "Write a short hook for your reel...",
  story: "Add a quick story caption...",
  poll: "Ask a clear question for your audience...",
  shop: "Describe what you are selling or promoting...",
  live: "Tell people what your live is about...",
};


const FILTERS = [
  { name: "Original", className: "[filter:none]" },
  { name: "Vivid", className: "[filter:saturate(1.75)_contrast(1.08)]" },
  { name: "Warm", className: "[filter:sepia(0.3)_saturate(1.35)_brightness(1.04)]" },
  { name: "Cool", className: "[filter:saturate(0.85)_hue-rotate(18deg)_brightness(1.06)]" },
  { name: "B&W", className: "[filter:grayscale(1)_contrast(1.2)]" },
  { name: "Vintage", className: "[filter:sepia(0.28)_saturate(1.08)_contrast(0.94)_brightness(1.08)]" },
  { name: "Dreamy", className: "[filter:brightness(1.15)_saturate(0.72)_contrast(0.84)]" },
  { name: "Noir", className: "[filter:grayscale(0.9)_contrast(1.35)_brightness(0.88)]" },
];

const LOCATIONS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Miami, FL",
  "San Francisco, CA", "Las Vegas, NV", "Seattle, WA", "Austin, TX",
  "Denver, CO", "Nashville, TN", "Portland, OR", "Boston, MA",
  "Phnom Penh, Cambodia", "Siem Reap, Cambodia", "Battambang, Cambodia",
];

const QUICK_EMOJIS = ["😀", "❤️", "🔥", "👏", "😂", "😍", "🎉", "💯", "🤩", "😎", "✨", "🙏"];

const FEELINGS = [
  { emoji: "😊", label: "happy" },
  { emoji: "😢", label: "sad" },
  { emoji: "😍", label: "in love" },
  { emoji: "😂", label: "laughing" },
  { emoji: "😤", label: "motivated" },
  { emoji: "🙏", label: "grateful" },
  { emoji: "😴", label: "tired" },
  { emoji: "🤩", label: "excited" },
  { emoji: "😡", label: "frustrated" },
  { emoji: "😎", label: "cool" },
  { emoji: "🥳", label: "celebrating" },
  { emoji: "😌", label: "relaxed" },
  { emoji: "🤔", label: "thoughtful" },
  { emoji: "💪", label: "strong" },
  { emoji: "🥺", label: "overwhelmed" },
  { emoji: "😏", label: "confident" },
  { emoji: "🤒", label: "sick" },
  { emoji: "😇", label: "blessed" },
  { emoji: "🫶", label: "loved" },
  { emoji: "🧠", label: "focused" },
];

const DRAFT_KEY = "zivo-post-draft";
const isVideoMediaUrl = (url?: string) =>
  Boolean(url && /\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(url));

const getRemixCaptionSeed = (remixType?: "duet" | "stitch", authorName?: string) => {
  if (!remixType) return null;
  const sourceName = authorName?.trim() || "original creator";
  return `${remixType === "duet" ? "Duet" : "Stitch"} with ${sourceName}`;
};

export default function CreatePostModal({
  userId,
  userProfile,
  onClose,
  onCreated,
  initialCaption,
  sharedMediaUrl,
  sharedMediaType,
  sharedPostId,
  sharedPostAuthorId,
  sharedPostAuthorName,
  remixType,
  commerceLinkDraft,
  initialAudioName,
  initialMode,
}: CreatePostModalProps) {
  const { motionProps: swipeDownMotionProps, startDrag: startSwipeDownClose } = useSwipeDownClose(onClose);
  const navigate = useNavigate();
  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved && !initialCaption && !sharedMediaUrl) {
        const draft = JSON.parse(saved);
        return draft.caption || "";
      }
    } catch {}
    return initialCaption || "";
  };

  const [caption, setCaption] = useState(loadDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(sharedMediaUrl ? [sharedMediaUrl] : []);
  // Reels are videos; otherwise honor the shared/default image.
  const [mediaType, setMediaType] = useState<"image" | "video">(
    sharedMediaType || (initialMode === "reel" || initialMode === "story" ? "video" : "image"),
  );
  const [selectedType, setSelectedType] = useState<"Photo" | "Video" | "Reel" | "Story" | "Live" | null>(
    initialMode === "photo" || initialMode === "shop"
      ? "Photo"
      : initialMode === "reel" || initialMode === "story"
        ? "Reel"
        : initialMode === "live"
          ? "Live"
          : null,
  );
  const [workflowMode, setWorkflowMode] = useState<ComposerWorkflow>(
    initialMode === "reel"
      ? "reel"
      : initialMode === "story"
        ? "story"
        : initialMode === "poll"
          ? "poll"
          : initialMode === "shop"
            ? "shop"
            : initialMode === "live"
              ? "live"
              : "post",
  );
  const [visibility, setVisibility] = useState<"everyone" | "friends" | "onlyme">("everyone");
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [album, setAlbum] = useState<string | null>(null);
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  const [albumInput, setAlbumInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [location, setLocation] = useState<string | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([]);
  const [showTagSearch, setShowTagSearch] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<any[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const [showEmojis, setShowEmojis] = useState(false);
  const [audioName, setAudioName] = useState(initialAudioName || "");
  const [showAudioInput, setShowAudioInput] = useState(!!initialAudioName);
  const [showCameraChoice, setShowCameraChoice] = useState(false);
  const [feeling, setFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [isPoll, setIsPoll] = useState(initialMode === "poll");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  // Shoppable: products selected to tag on this post.
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [taggedProductIds, setTaggedProductIds] = useState<string[]>([]);
  // Resolve effective store: prefer the passed commerce link, fall back to the user's own first store.
  const { data: ownedStores = [] } = useOwnerStores();
  const effectiveStoreId = commerceLinkDraft?.storeId ?? ownedStores[0]?.id ?? null;
  const { isOFMode: zivoOFMode } = useZivoOFMode();
  const [unlockPrice, setUnlockPrice] = useState<string>("");
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [markSensitive, setMarkSensitive] = useState(() => detectSensitiveContent(initialCaption).isSensitive);
  const hasVideoAttachment =
    files.some((file) => file.type.startsWith("video/")) ||
    Boolean(sharedMediaUrl && (sharedMediaType === "video" || isVideoMediaUrl(sharedMediaUrl)));

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const tagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const filteredLocations = locationQuery
    ? LOCATIONS.filter((l) => l.toLowerCase().includes(locationQuery.toLowerCase()))
    : LOCATIONS;

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.info("Your browser doesn't support geolocation");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation("My location");
        setShowLocationSearch(false);
        setGeoLoading(false);
      },
      () => {
        toast.info("Location access denied. Search for a city.");
        setGeoLoading(false);
      },
      { timeout: 8000 },
    );
  };

  // Auto-save draft
  useEffect(() => {
    if (!sharedMediaUrl && !initialCaption) {
      const timer = setTimeout(() => {
        if (caption.trim()) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ caption, timestamp: Date.now() }));
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [caption, sharedMediaUrl, initialCaption]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = captionRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, []);

  useEffect(() => { autoResize(); }, [caption, autoResize]);

  useEffect(() => {
    if (detectSensitiveContent(caption).isSensitive) {
      setMarkSensitive(true);
    }
  }, [caption]);

  // Focus album input when shown
  useEffect(() => {
    if (showAlbumInput) albumInputRef.current?.focus();
  }, [showAlbumInput]);

  // Auto-show camera choice when coming from "Use this sound" with no media
  useEffect(() => {
    if (initialAudioName && files.length === 0 && !showCameraChoice) {
      const timer = setTimeout(() => setShowCameraChoice(true), 400);
      return () => clearTimeout(timer);
    }
  }, [files.length, initialAudioName, showCameraChoice]);

  const getVideoDuration = (file: File) => new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video duration"));
    };
    video.src = url;
  });

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (selected.length === 0) return;

    let allowedFiles = selected;
    if (workflowMode === "post") {
      allowedFiles = selected.filter((file) => file.type.startsWith("image/"));
      if (allowedFiles.length !== selected.length) toast.error("Post is for pictures only");
    } else if (workflowMode === "reel") {
      allowedFiles = selected.filter((file) => file.type.startsWith("video/")).slice(0, 1);
      if (allowedFiles.length === 0) toast.error("Reel is for videos only");
    } else if (workflowMode === "story") {
      const checkedFiles: File[] = [];
      for (const file of selected) {
        if (!file.type.startsWith("video/")) {
          checkedFiles.push(file);
          continue;
        }
        try {
          const duration = await getVideoDuration(file);
          if (duration <= 60) {
            checkedFiles.push(file);
          } else {
            toast.error("Story videos must be under 1 minute");
          }
        } catch {
          toast.error("Could not read that video. Try another file.");
        }
      }
      allowedFiles = checkedFiles;
    }
    if (allowedFiles.length === 0) return;

    const nextFiles = workflowMode === "reel" ? allowedFiles : [...files, ...allowedFiles];
    if (workflowMode === "reel" && files.length > 0) {
      previews.forEach((p) => { if (p.startsWith("blob:")) URL.revokeObjectURL(p); });
    }
    const newFiles = nextFiles.slice(0, 10);
    setFiles(newFiles);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach((p) => { if (p.startsWith("blob:")) URL.revokeObjectURL(p); });
      return newPreviews;
    });
    setMediaType(newFiles.some((file) => file.type.startsWith("video/")) ? "video" : "image");
  };

  const removeMedia = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (previews[index]?.startsWith("blob:")) URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    if (currentPreview >= newFiles.length) setCurrentPreview(Math.max(0, newFiles.length - 1));
  };

  const handleTagSearch = (q: string) => {
    setTagQuery(q);
    if (tagTimerRef.current) clearTimeout(tagTimerRef.current);
    if (!q.trim()) { setTagResults([]); return; }
    setTagSearching(true);
    tagTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .ilike("full_name", `%${q}%`)
        .limit(8);
      setTagResults(data || []);
      setTagSearching(false);
    }, 300);
  };

  const handleCaptionChange = (text: string) => {
    setCaption(text);
    const lastWord = text.split(/\s/).pop() || "";
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      handleTagSearch(lastWord.slice(1));
      setShowTagSearch(true);
    } else if (showTagSearch && !tagQuery) {
      setShowTagSearch(false);
    }
  };

  const insertMention = (user: any) => {
    const words = caption.split(/\s/);
    words[words.length - 1] = `@${user.full_name} `;
    setCaption(words.join(" "));
    setShowTagSearch(false);
    if (!taggedUsers.find((t) => t.id === user.id)) {
      setTaggedUsers((prev) => [...prev, { id: user.id, name: user.full_name }]);
    }
  };

  const insertEmoji = (emoji: string) => {
    setCaption((prev) => prev + emoji);
    captionRef.current?.focus();
  };

  const hasSharedLink = !!initialCaption || !!sharedMediaUrl;
  const remixCaptionSeed = getRemixCaptionSeed(remixType, sharedPostAuthorName);

  const [uploadStatus, setUploadStatus] = useState("");

  const openMediaPicker = (accept: string, multiple: boolean) => {
    window.setTimeout(() => {
      if (!fileRef.current) return;
      fileRef.current.accept = accept;
      fileRef.current.multiple = multiple;
      fileRef.current.value = "";
      fileRef.current.click();
    }, 0);
  };

  const openPostPhotoPicker = () => openMediaPicker("image/*", true);

  const selectWorkflowMode = (mode: ComposerWorkflow) => {
    setWorkflowMode(mode);
    if (mode === "live") {
      setSelectedType("Live");
      setIsPoll(false);
      return;
    }
    if (mode === "poll") {
      setSelectedType(null);
      setMediaType("image");
      setIsPoll(true);
      setShowAudioInput(false);
      return;
    }
    setIsPoll(false);
    if (mode === "reel") {
      setSelectedType("Reel");
      setMediaType("video");
      setShowAudioInput(true);
      openMediaPicker("video/*", false);
      return;
    }
    if (mode === "story") {
      setSelectedType("Story");
      setMediaType("image");
      setShowAudioInput(false);
      openMediaPicker("image/*,video/*", true);
      return;
    }
    setSelectedType("Photo");
    setMediaType("image");
    setShowAudioInput(false);
    openPostPhotoPicker();
  };

  const handlePost = async () => {
    if (workflowMode === "post") {
      if (files.length === 0) {
        toast.error("Add at least one picture for a post");
        return;
      }
      if (files.some((file) => !file.type.startsWith("image/"))) {
        toast.error("Post is for pictures only");
        return;
      }
    }
    if (workflowMode === "reel" && files.some((file) => !file.type.startsWith("video/"))) {
      toast.error("Reel is for videos only");
      return;
    }
    if (workflowMode === "story") {
      for (const file of files) {
        if (!file.type.startsWith("video/")) continue;
        try {
          const duration = await getVideoDuration(file);
          if (duration > 60) {
            toast.error("Story videos must be under 1 minute");
            return;
          }
        } catch {
          toast.error("Could not read that story video. Try another file.");
          return;
        }
      }
    }
    if (isPoll) {
      const valid = pollOptions.filter((o) => o.trim());
      if (!caption.trim()) { toast.error("Please write a poll question"); return; }
      if (valid.length < 2) { toast.error("Add at least 2 poll options"); return; }
    } else if (workflowMode === "reel" && !hasVideoAttachment) {
      toast.error("Add a video before sharing a reel");
      return;
    } else if (files.length === 0 && !hasSharedLink && !caption.trim()) {
      toast.error("Please add a photo, video, or write something");
      return;
    }
    if (!confirmContentSafe(caption, "caption")) return;
    setUploading(true);
    setUploadStatus("");
    try {
      let mediaUrl: string | null = null;
      let allMediaUrls: string[] = [];
      let finalMediaType = mediaType;

      // Upload all files (first one is primary media_url)
      if (files.length > 0) {
        const uploadedUrls: string[] = [];
        let storageDown = false;
        try {
          for (let i = 0; i < files.length; i++) {
            const original = files[i];
            const file = await stripImageMetadata(original);
            const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
            setUploadStatus(`Uploading ${i + 1}/${files.length} — ${file.name} (${sizeMB} MB) — 0%`);
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
            const publicUrl = await uploadWithProgress("user-posts", path, file, (pct) => {
              setUploadStatus(`Uploading ${i + 1}/${files.length} — ${file.name} (${sizeMB} MB) — ${pct}%`);
            });
            uploadedUrls.push(publicUrl);
          }
        } catch (uploadErr: any) {
          // Two cases trigger the inline-base64 fallback:
          //   1) Supabase storage schema-drift (translated by uploadWithProgress).
          //   2) iOS WKWebView network failures during binary upload
          //      ("Load failed" / "Failed to fetch" / "Network error during upload"
          //      / "The network connection was lost.") — common on simulator and
          //      occasionally on real devices.
          //
          // For small images we embed bytes inline as a data URL in media_url so
          // the post still works. For videos/large files we fall back to text-only.
          const msg = String(uploadErr?.message || "");
          const isStorageDown = /Upload service is temporarily unavailable/i.test(msg);
          const isNetworkFailure = /Load failed|Failed to fetch|NetworkError|connection (was lost|appears to be offline)|Network error during upload/i.test(msg);
          if (!isStorageDown && !isNetworkFailure) {
            throw uploadErr;
          }

          // Try inline-base64 path for small images
          const INLINE_LIMIT = 2 * 1024 * 1024; // 2 MB per image
          const allInlineable = files.every(
            (f) => f.type.startsWith("image/") && f.size <= INLINE_LIMIT
          );
          if (allInlineable) {
            setUploadStatus("Storage offline — embedding images inline…");
            const inlineUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
              const original = files[i];
              const file = await stripImageMetadata(original);
              const dataUrl: string = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.onerror = () => reject(new Error("Failed to read image"));
                r.readAsDataURL(file);
              });
              inlineUrls.push(dataUrl);
            }
            uploadedUrls.length = 0;
            uploadedUrls.push(...inlineUrls);
          } else if (caption.trim()) {
            // Fall back to text-only
            const proceed = await nativeConfirm(
              "Media upload is temporarily unavailable.\n\nPost just your text caption without the attached media?"
            );
            if (proceed) {
              storageDown = true;
            } else {
              throw uploadErr;
            }
          } else {
            throw uploadErr;
          }
        }
        if (!storageDown) {
          mediaUrl = uploadedUrls[0];
          allMediaUrls = uploadedUrls;
          if (files[0].type.startsWith("video")) finalMediaType = "video";
        } else {
          // Text-only fallback path
          finalMediaType = "image";
        }
      } else if (sharedMediaUrl) {
        mediaUrl = sharedMediaUrl;
        allMediaUrls = [sharedMediaUrl];
        finalMediaType = sharedMediaType || (isVideoMediaUrl(sharedMediaUrl) ? "video" : "image");
      } else {
        finalMediaType = "image";
      }

      setUploadStatus("Creating post...");

      let finalCaption = caption.trim() || null;
      if (remixCaptionSeed) {
        const remixPrefix = remixType === "stitch" ? "stitch with" : "duet with";
        const hasRemixPrefix = finalCaption?.toLowerCase().startsWith(remixPrefix);
        if (!finalCaption) {
          finalCaption = remixCaptionSeed;
        } else if (!hasRemixPrefix) {
          finalCaption = `${remixCaptionSeed}\n\n${finalCaption}`;
        }
      }
      if (feeling && finalCaption) {
        finalCaption = `${finalCaption}\n\n— feeling ${feeling.emoji} ${feeling.label}`;
      } else if (feeling) {
        finalCaption = `feeling ${feeling.emoji} ${feeling.label}`;
      }
      if (isPoll && finalCaption) {
        const validOptions = pollOptions.filter((o) => o.trim());
        const optLines = validOptions.map((o, i) => `${["🔵", "🟢", "🔴", "🟡", "🟠", "🟣"][i] || "▪"} ${o}`).join("\n");
        finalCaption = `📊 ${finalCaption}\n\n${optLines}`;
        finalMediaType = "image";
      }
      if (zivoOFMode && unlockPrice) {
        const priceNum = parseFloat(unlockPrice);
        if (Number.isFinite(priceNum) && priceNum > 0) {
          const tag = `🔒 Unlock for $${priceNum.toFixed(2)}`;
          finalCaption = finalCaption ? `${tag}\n\n${finalCaption}` : tag;
        }
      }

      const sensitiveAnalysis = detectSensitiveContent(finalCaption, { creatorMarked: markSensitive });
      const shouldMarkSensitive = markSensitive || sensitiveAnalysis.isSensitive;

      const insertData: any = {
        user_id: userId,
        media_type: finalMediaType,
        media_url: mediaUrl,
        media_urls: allMediaUrls,
        caption: finalCaption,
        filter_css: (FILTERS[activeFilter] as any)?.css || null,
        is_published: true,
        visibility,
      };
      if (shouldMarkSensitive) {
        insertData.is_sensitive = true;
        insertData.sensitive_reason = sensitiveAnalysis.reason || "creator_marked";
      }
      if (location) insertData.location = location;
      if (audioName.trim()) insertData.audio_name = audioName.trim();
      if (sharedPostId) insertData.shared_from_post_id = sharedPostId;
      if (sharedPostAuthorId) insertData.shared_from_user_id = sharedPostAuthorId;

      let { data: insertedPost, error: insertErr } = await (supabase as any)
        .from("user_posts")
        .insert(insertData)
        .select("id")
        .single();
      if (insertErr && shouldMarkSensitive && isSensitiveSchemaDriftError(insertErr)) {
        const retryData = { ...insertData };
        delete retryData.is_sensitive;
        delete retryData.sensitive_reason;
        delete retryData.sensitive_report_count;
        const retry = await (supabase as any)
          .from("user_posts")
          .insert(retryData)
          .select("id")
          .single();
        insertedPost = retry.data;
        insertErr = retry.error;
      }
      if (insertErr) throw insertErr;

      if (commerceLinkDraft && insertedPost?.id) {
        await (supabase as any).from("social_reel_links").insert({
          post_id: insertedPost.id,
          post_source: "user",
          link_type: commerceLinkDraft.linkType,
          store_id: commerceLinkDraft.storeId || null,
          store_product_id: commerceLinkDraft.storeProductId || null,
          truck_sale_id: commerceLinkDraft.truckSaleId || null,
          checkout_path: commerceLinkDraft.checkoutPath || null,
          map_lat: commerceLinkDraft.mapLat ?? null,
          map_lng: commerceLinkDraft.mapLng ?? null,
          map_label: commerceLinkDraft.mapLabel || null,
          created_by: userId,
        });
      }

      // Persist shoppable product tags (separate from single commerce link).
      if (taggedProductIds.length > 0 && insertedPost?.id) {
        const storeIdForTags = commerceLinkDraft?.storeId ?? ownedStores[0]?.id ?? null;
        const rows = taggedProductIds.map((pid, i) => ({
          post_id: insertedPost.id,
          post_source: "user",
          store_product_id: pid,
          store_id: storeIdForTags,
          sort_order: i,
        }));
        const { error: tagErr } = await (supabase as any).from("post_products").insert(rows);
        if (tagErr) console.warn("[CreatePost] product tag insert failed", tagErr);
      }

      // Persist album association (find-or-create album, then link post)
      if (album && insertedPost?.id) {
        try {
          let albumId: string | null = null;
          const { data: existingAlbum } = await (supabase as any)
            .from("post_albums")
            .select("id")
            .eq("user_id", userId)
            .eq("name", album)
            .maybeSingle();
          if (existingAlbum?.id) {
            albumId = existingAlbum.id;
          } else {
            const { data: createdAlbum } = await (supabase as any)
              .from("post_albums")
              .insert({ user_id: userId, name: album })
              .select("id")
              .single();
            albumId = createdAlbum?.id ?? null;
          }
          if (albumId) {
            await (supabase as any)
              .from("post_album_items")
              .insert({ album_id: albumId, post_id: insertedPost.id });
          }
        } catch (albumErr) {
          console.warn("[CreatePost] album save failed", albumErr);
        }
      }

      // Persist tagged people as post_mentions
      if (taggedUsers.length > 0 && insertedPost?.id) {
        const mentionRows = taggedUsers.map((u) => ({
          post_id: insertedPost.id,
          mentioned_user_id: u.id,
        }));
        const { error: mentionErr } = await (supabase as any)
          .from("post_mentions")
          .insert(mentionRows);
        if (mentionErr) console.warn("[CreatePost] mentions save failed", mentionErr);
      }

      // Clear draft on successful post
      localStorage.removeItem(DRAFT_KEY);

      toast.success("Post shared! 🎉");
      onCreated();
    } catch (err: any) {
      console.error("[CreatePost]", err);
      toast.error(err.message || "Failed to create post");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const charCount = caption.length;
  const charLimit = 2200;
  const activeWorkflow = COMPOSER_WORKFLOWS.find((workflow) => workflow.mode === workflowMode) || COMPOSER_WORKFLOWS[0];
  const activeWorkflowStyle = WORKFLOW_STYLES[workflowMode];
  const captionPlaceholder = zivoOFMode ? "Compose a new post for your fans..." : WORKFLOW_PROMPTS[workflowMode];
  const publishLabel = workflowMode === "reel"
    ? "Share Reel"
    : workflowMode === "story"
      ? "Share Story"
      : workflowMode === "poll"
        ? "Post Poll"
        : workflowMode === "shop"
          ? "Share Shop"
          : workflowMode === "live"
            ? "Go Live"
            : "Share";
  const canPublish = !uploading && (
    workflowMode === "live" ||
    isPoll ||
    (workflowMode === "reel" && hasVideoAttachment) ||
    (workflowMode !== "reel" && (
    files.length > 0 ||
    hasSharedLink ||
    !!caption.trim()
    ))
  );
  const composerSensitive = markSensitive || detectSensitiveContent(caption).isSensitive;
  const mediaSignal = previews.length > 1
    ? { label: "Media stack", detail: `${previews.length} items attached`, width: "100%" }
    : previews.length === 1
      ? { label: sharedMediaUrl && files.length === 0 ? "Shared media" : mediaType === "video" ? "Video ready" : "Photo ready", detail: activeFilter === 0 ? "Original look" : `${FILTERS[activeFilter].name} filter active`, width: "68%" }
      : { label: "No media yet", detail: "Add photo or video", width: "18%" };
  const filterSignal = activeFilter === 0
    ? { label: "Original color", detail: "No filter applied", width: "26%" }
    : { label: `${FILTERS[activeFilter].name} look`, detail: "Styled preview active", width: `${Math.min(100, 44 + activeFilter * 7)}%` };
  const audioSignal = audioName.trim()
    ? { label: "Sound attached", detail: audioName.trim(), width: `${Math.min(100, Math.max(42, audioName.trim().length * 3))}%` }
    : { label: "Name your sound", detail: "Add audio credit for reels", width: "24%" };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1700] flex items-stretch justify-center bg-black/50 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        {...swipeDownMotionProps}
        className="zivo-social-composer-panel z-[1700] flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-auto rounded-none border-0 bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 overflow-hidden border-b border-border/50 bg-background/95 backdrop-blur-xl">
          <div
            className="flex cursor-grab justify-center pt-2 active:cursor-grabbing"
            onPointerDown={startSwipeDownClose}
            style={{ touchAction: "none" }}
            aria-hidden="true"
          >
            <span className="h-1.5 w-12 rounded-full bg-border" />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(84px,1fr)] items-center gap-2 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 justify-self-start">
              <div className="zivo-social-avatar-ring h-9 w-9 shrink-0 overflow-hidden rounded-full">
                {userProfile?.avatar ? (
                  <img src={userProfile.avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground/40">
                    {userProfile?.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <p className="max-w-[132px] truncate text-sm font-bold text-foreground">
                {userProfile?.name || "You"}
              </p>
            </div>
            <div className="min-w-0 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">ZIVO Studio</p>
              <h2 className="text-base font-black leading-tight text-foreground">{activeWorkflow.label}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close create post"
              title="Close create post"
              className="zivo-social-icon-button grid h-10 w-10 place-items-center justify-self-end rounded-2xl border border-border/60 bg-card text-muted-foreground shadow-sm transition-transform hover:text-foreground active:scale-90"
            >
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>


        {/* Remix source indicator */}
        {remixCaptionSeed && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            {remixCaptionSeed}
          </div>
        )}

        {/* Caption with @mention autocomplete */}
        <div className="relative flex min-h-[360px] flex-1 flex-col px-4 pt-3 sm:min-h-[440px]">
          <textarea
            ref={captionRef}
            placeholder={captionPlaceholder}
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            maxLength={charLimit}
            rows={2}
            className="zivo-social-sheet-input h-full min-h-0 w-full flex-1 resize-none rounded-2xl px-4 py-3 pr-12 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />

          <button type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            aria-label={showEmojis ? "Hide emoji picker" : "Show emoji picker"}
            title={showEmojis ? "Hide emoji picker" : "Show emoji picker"}
            className="zivo-social-icon-button absolute bottom-2 right-6 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {showEmojis && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_EMOJIS.map((e) => (
                    <button type="button"
                      key={e}
                      onClick={() => insertEmoji(e)}
                      className="zivo-social-emoji-chip flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors active:scale-90"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showTagSearch && tagResults.length > 0 && !showAlbumInput && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 bottom-full mb-1 bg-card border border-border/40 rounded-xl shadow-lg z-20 max-h-[160px] overflow-y-auto"
              >
                {tagResults.map((u: any) => (
                  <button type="button"
                    key={u.id}
                    onClick={() => insertMention(u)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-muted overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} loading="lazy" decoding="async" className="h-full w-full object-cover" alt="" /> :
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">{(u.full_name || "?")[0]}</div>}
                    </div>
                    <span className="text-xs font-medium text-foreground inline-flex items-center gap-1">
                      <span>{u.full_name}</span>
                      {isBlueVerified(u.is_verified) && <VerifiedBadge size={11} interactive={false} />}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {COMPOSER_WORKFLOWS.map((workflow) => {
              const isActive = workflow.mode === workflowMode;
              const workflowStyle = WORKFLOW_STYLES[workflow.mode];
              return (
                <button
                  type="button"
                  aria-label={workflow.label + " " + workflow.description.toLowerCase()}
                  key={workflow.mode}
                  onClick={() => selectWorkflowMode(workflow.mode)}
                  className={cn(
                    "min-w-[92px] shrink-0 rounded-2xl border px-2 py-2 text-left shadow-sm transition-all active:scale-[0.98] sm:min-w-[104px]",
                    isActive
                      ? "border-border bg-card text-foreground"
                      : "border-border/60 bg-muted/25 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-xl", isActive ? workflowStyle.iconBubble : "bg-background text-muted-foreground")}>
                      <workflow.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-[11px] font-black">{workflow.label}</span>
                  </span>
                  <span className="mt-0.5 block max-w-[84px] truncate text-[9px] font-semibold text-muted-foreground sm:max-w-[96px]">
                    {workflow.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {taggedUsers.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {taggedUsers.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                @{t.name}
                <button type="button" aria-label={`Remove ${t.name} tag`} title={`Remove ${t.name} tag`} onClick={() => setTaggedUsers((prev) => prev.filter((u) => u.id !== t.id))}>
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Privacy & extras row */}
        <div className="px-4 pb-2 flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide">

          {/* 18+ sensitivity chip */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => setMarkSensitive((v) => !v)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold min-h-[34px] transition-colors",
              composerSensitive
                ? "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-400/30"
                : "bg-muted/40 text-muted-foreground border-border/30",
            )}
            aria-pressed={composerSensitive}
            title="Mark as 18+ sensitive"
          >
            {composerSensitive
              ? <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              : <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
            {composerSensitive ? "18+ on" : "18+"}
          </motion.button>

          {/* Album chip */}
          {!zivoOFMode && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                if (album) { setAlbum(null); setShowAlbumInput(false); setAlbumInput(""); }
                else { setShowAlbumInput((v) => !v); }
              }}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold min-h-[34px] transition-colors",
                album
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-400/30"
                  : showAlbumInput
                    ? "bg-muted/60 text-foreground border-border/50"
                    : "bg-muted/40 text-muted-foreground border-border/30",
              )}
            >
              <FolderPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[80px] truncate">{album || "Album"}</span>
              {album && <XIcon className="h-3 w-3 shrink-0 opacity-70" />}
            </motion.button>
          )}

          {/* Location chip */}
          {!zivoOFMode && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowLocationSearch((v) => !v)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold min-h-[34px] transition-colors",
                location
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30"
                  : showLocationSearch
                    ? "bg-muted/60 text-foreground border-border/50"
                    : "bg-muted/40 text-muted-foreground border-border/30",
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[80px] truncate">{location || "Location"}</span>
            </motion.button>
          )}

          {/* Tag people chip */}
          {!zivoOFMode && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => { setShowTagSearch(true); setTagQuery(""); handleTagSearch(""); }}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold min-h-[34px] transition-colors",
                taggedUsers.length > 0
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-400/30"
                  : showTagSearch
                    ? "bg-muted/60 text-foreground border-border/50"
                    : "bg-muted/40 text-muted-foreground border-border/30",
              )}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              {taggedUsers.length > 0 ? `${taggedUsers.length} tagged` : "Tag people"}
              {taggedUsers.length > 0 && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[9px] font-black text-white">
                  {taggedUsers.length}
                </span>
              )}
            </motion.button>
          )}

          {/* Tag products chip */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              if (!effectiveStoreId) {
                toast.info("Create a store first to tag products", {
                  action: { label: "Create store", onClick: () => navigate("/app/shop") },
                });
                return;
              }
              setShowProductPicker(true);
            }}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold min-h-[34px] transition-colors",
              taggedProductIds.length > 0
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/30"
                : "bg-muted/40 text-muted-foreground border-border/30",
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            {taggedProductIds.length > 0
              ? `${taggedProductIds.length} product${taggedProductIds.length !== 1 ? "s" : ""}`
              : "Tag products"}
            {taggedProductIds.length > 0 && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white">
                {taggedProductIds.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* Album input panel */}
        <AnimatePresence>
          {showAlbumInput && !album && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-4 mb-2 overflow-hidden"
            >
              <div className="rounded-2xl border border-border/30 bg-card/85 p-2 shadow-sm">
                <input
                  ref={albumInputRef}
                  type="text"
                  placeholder="Album name..."
                  value={albumInput}
                  onChange={(e) => setAlbumInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && albumInput.trim()) {
                      setAlbum(albumInput.trim());
                      setShowAlbumInput(false);
                      setAlbumInput("");
                    }
                  }}
                  className="w-full rounded-xl border border-border/20 bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40"
                />
                <button type="button"
                  onClick={() => {
                    if (albumInput.trim()) {
                      setAlbum(albumInput.trim());
                      setShowAlbumInput(false);
                      setAlbumInput("");
                    }
                  }}
                  disabled={!albumInput.trim()}
                  className="mt-2 w-full rounded-xl bg-ig-gradient py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  Add to Album
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location search dropdown */}
        <AnimatePresence>
          {showLocationSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mx-4 mb-2"
            >
              <div className="bg-muted/30 rounded-xl border border-border/20 p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                    autoFocus
                  />
                  {location && (
                    <button type="button" onClick={() => { setLocation(null); setShowLocationSearch(false); }} className="text-xs text-destructive">Clear</button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  className="w-full flex items-center gap-2 px-2 py-1.5 mb-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors border-b border-border/20 pb-2"
                >
                  {geoLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    : <MapPin className="h-3.5 w-3.5 shrink-0" />}
                  {geoLoading ? "Detecting location…" : "Use my current location"}
                </button>
                <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                  {filteredLocations.map((loc) => (
                    <button type="button"
                      key={loc}
                      onClick={() => { setLocation(loc); setShowLocationSearch(false); setLocationQuery(""); }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                        location === loc ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <MapPin className="h-3 w-3 inline mr-1.5 text-muted-foreground" />
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tag search panel (standalone, not caption-based) */}
        <AnimatePresence>
          {showTagSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mx-4 mb-2"
            >
              <div className="bg-muted/30 rounded-xl border border-border/20 p-2">
                {taggedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-border/20">
                    {taggedUsers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTaggedUsers((prev) => prev.filter((u) => u.id !== t.id))}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] font-semibold"
                      >
                        @{t.name}
                        <XIcon className="h-3 w-3 opacity-70" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={tagQuery}
                    onChange={(e) => handleTagSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowTagSearch(false)} className="text-xs text-muted-foreground">Done</button>
                </div>
                {tagSearching && <p className="text-xs text-muted-foreground py-2 text-center">Searching...</p>}
                <div className="max-h-[140px] overflow-y-auto space-y-0.5">
                  {tagResults.map((u: any) => {
                    const isTagged = taggedUsers.some((t) => t.id === u.id);
                    return (
                      <button type="button"
                        key={u.id}
                        onClick={() => {
                          if (isTagged) {
                            setTaggedUsers((prev) => prev.filter((t) => t.id !== u.id));
                          } else {
                            setTaggedUsers((prev) => [...prev, { id: u.id, name: u.full_name }]);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                          isTagged ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="h-7 w-7 rounded-full bg-muted overflow-hidden shrink-0">
                          {u.avatar_url ? <img src={u.avatar_url} loading="lazy" decoding="async" className="h-full w-full object-cover" alt="" /> :
                            <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">{(u.full_name || "?")[0]}</div>}
                        </div>
                        <span className="text-xs font-medium text-foreground flex-1 text-left truncate inline-flex items-center gap-1">
                          <span className="truncate">{u.full_name}</span>
                          {isBlueVerified(u.is_verified) && <VerifiedBadge size={11} interactive={false} />}
                        </span>
                        {isTagged && <span className="text-primary text-xs">✓</span>}
                      </button>
                    );
                  })}
                  {!tagSearching && tagQuery && tagResults.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No results</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feeling picker */}
        <AnimatePresence>
          {showFeelingPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">How are you feeling?</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {FEELINGS.map((f) => (
                    <button type="button"
                      key={f.label}
                      onClick={() => { setFeeling(feeling?.label === f.label ? null : f); setShowFeelingPicker(false); }}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95",
                        feeling?.label === f.label ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xl">{f.emoji}</span>
                      <span className="text-[9px] font-medium text-muted-foreground capitalize">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OF mode: Money Unlock price input */}
        <AnimatePresence>
          {zivoOFMode && showUnlockInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-4 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-[#00AEEF] uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Lock post — fans pay to unlock
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00AEEF]/5 border border-[#00AEEF]/30 focus-within:ring-2 focus-within:ring-[#00AEEF]/30">
                    <span className="text-sm font-bold text-[#00AEEF]">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={unlockPrice}
                      onChange={(e) => setUnlockPrice(e.target.value)}
                      placeholder="Price (e.g. 9.99)"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>
                  {unlockPrice && (
                    <button
                      type="button"
                      onClick={() => { setUnlockPrice(""); setShowUnlockInput(false); }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/40"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Free preview is shown to non-subscribers. They tap to pay and unlock.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poll creation */}
        <AnimatePresence>
          {isPoll && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-4 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Poll Options</p>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-base">{["🔵", "🟢", "🔴", "🟡"][i] || "▪"}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      maxLength={80}
                      className="flex-1 px-3 py-2 rounded-xl bg-muted/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" aria-label={`Remove option ${i + 1}`} title={`Remove option ${i + 1}`} onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/40 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media preview — grid layout like Facebook */}
        {previews.length > 0 && (
          <div className="mx-4 mb-3">
            {/* Main preview */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square mb-2">
              {(files[currentPreview]?.type?.startsWith("video") || (currentPreview === 0 && mediaType === "video" && files.length === 0)) ? (
                <video
                  src={previews[currentPreview]}
	                  className={cn("h-full w-full object-cover", FILTERS[activeFilter]?.className ?? "[filter:none]")}
	                  controls
	                  muted
	                  preload="metadata"
	                />
	              ) : (
	                <img
	                  src={previews[currentPreview]}
	                  alt=""
	                  className={cn("h-full w-full object-cover", FILTERS[activeFilter]?.className ?? "[filter:none]")}
	                  loading="lazy"
	                  decoding="async"
	                />
	              )}

              {files.length > 0 && (
                <button type="button"
                  aria-label="Remove current media"
                  title="Remove current media"
                  onClick={() => removeMedia(currentPreview)}
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <XIcon className="h-4 w-4 text-white" />
                </button>
              )}

              {previews.length > 1 && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-[10px] font-bold text-white">
                  {currentPreview + 1}/{previews.length}
                </div>
              )}

              {sharedMediaUrl && files.length === 0 && (
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Share2 className="h-3 w-3" /> Shared
                </div>
              )}
            </div>

            <div className="zivo-social-module-tile mb-2 rounded-2xl px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl", activeWorkflowStyle.text)}>
                    {mediaType === "video" ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-foreground">{mediaSignal.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-foreground">{mediaSignal.detail}</span>
                  </span>
                </span>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Media
                </span>
              </div>
              <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", activeWorkflowStyle.accent)}
                  style={{ width: mediaSignal.width }}
                />
              </div>
            </div>

            {/* Thumbnail grid */}
            {previews.length >= 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative shrink-0 h-14 w-14",
                      i === currentPreview ? "scale-105" : ""
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentPreview(i)}
                      aria-label={`Preview media ${i + 1}`}
                      title={`Preview media ${i + 1}`}
                      className={cn(
                        "h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                        i === currentPreview ? "border-primary ring-1 ring-primary/30" : "border-border/30 opacity-70 hover:opacity-100"
                      )}
                    >
                      {files[i]?.type?.startsWith("video") ? (
	                        <video src={p} className="h-full w-full object-cover" muted preload="metadata" />
	                      ) : (
	                        <img src={p} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
	                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove media ${i + 1}`}
                      title={`Remove media ${i + 1}`}
                      onClick={() => removeMedia(i)}
                      className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center"
                    >
                      <XIcon className="h-2.5 w-2.5 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                {/* Add more inline */}
                {files.length < 10 && (
                  <button type="button"
                    aria-label="Add more media"
                    title="Add more media"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.accept = "image/*,video/*";
                        fileRef.current.multiple = true;
                        fileRef.current.click();
                      }
                    }}
                    className="shrink-0 h-14 w-14 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center hover:bg-muted/30 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter strip */}
        {previews.length > 0 && mediaType === "image" && (
          <div className="px-4 pb-3">
            <div className="zivo-social-module-tile mb-2 rounded-2xl px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl", activeWorkflowStyle.text)}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-foreground">{filterSignal.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-foreground">{filterSignal.detail}</span>
                  </span>
                </span>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Filter
                </span>
              </div>
              <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", activeWorkflowStyle.accent)}
                  style={{ width: filterSignal.width }}
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {FILTERS.map((f, i) => (
                <button type="button"
                  key={f.name}
                  onClick={() => setActiveFilter(i)}
                  className="shrink-0 flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                      activeFilter === i ? "border-primary scale-105" : "border-transparent"
                    )}
                  >
                    <img
	                      src={previews[0]}
	                      alt={f.name}
	                      className={cn("h-full w-full object-cover", f.className)}
	                      loading="lazy"
	                      decoding="async"
	                    />
                  </div>
                  <span className={cn(
                    "text-[9px] font-medium",
                    activeFilter === i ? "text-primary" : "text-muted-foreground"
                  )}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio name input */}
        <AnimatePresence>
          {showAudioInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-4 py-3">
                <div className="zivo-social-share-preview flex items-center gap-3 rounded-3xl px-3 py-2.5">
                  <div className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                    <Music className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{audioSignal.label}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-black tabular-nums text-muted-foreground">
                        {audioName.trim().length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      value={audioName}
                      onChange={(e) => setAudioName(e.target.value)}
                      placeholder="Sound name (e.g. Original Sound)"
                      className="h-8 w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
                      maxLength={100}
                      autoFocus
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="zivo-social-chip h-1.5 flex-1 overflow-hidden rounded-full p-0">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", activeWorkflowStyle.accent)}
                          style={{ width: audioSignal.width }}
                        />
                      </div>
                      <span className="max-w-[8rem] truncate text-[10px] font-bold text-muted-foreground">
                        {audioSignal.detail}
                      </span>
                    </div>
                  </div>
                  {audioName && (
                    <button
                      type="button"
                      aria-label="Clear sound"
                      title="Clear sound"
                      onClick={() => { setAudioName(""); setShowAudioInput(false); }}
                      className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    >
                      <XIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record/Select video prompt when using a sound */}
        <AnimatePresence>
          {showCameraChoice && files.length === 0 && initialAudioName && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/30"
            >
              <div className="px-4 py-4 space-y-2.5">
                <div className="zivo-social-share-preview flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-primary">Reel setup</span>
                      <span className="block truncate text-xs font-bold text-foreground">Create with this sound</span>
                    </span>
                  </span>
                  <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
                    Audio
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => {
                      if (cameraRef.current) {
                        cameraRef.current.click();
                      }
                      setShowCameraChoice(false);
                    }}
                    className="zivo-social-module-tile flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-transform hover:-translate-y-0.5 active:scale-95"
                    aria-label="Record a video with this sound"
                  >
                    <Film className="h-6 w-6 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold text-primary">Record Video</span>
                  </button>
                  <button type="button"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.accept = "video/*";
                        fileRef.current.multiple = false;
                        fileRef.current.click();
                      }
                      setShowCameraChoice(false);
                    }}
                    className="zivo-social-module-tile flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-transform hover:-translate-y-0.5 active:scale-95"
                    aria-label="Choose a gallery video with this sound"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-semibold text-muted-foreground">From Gallery</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Add more media button */}
        {files.length > 0 && files.length < 10 && (
          <div className="px-4 pb-2">
            <button type="button"
              onClick={() => {
                if (workflowMode === "reel") {
                  openMediaPicker("video/*", false);
                } else if (workflowMode === "story") {
                  openMediaPicker("image/*,video/*", true);
                } else {
                  openPostPhotoPicker();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/40 text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add more ({files.length}/10)
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          aria-label="Select media files"
          title="Select media files"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={cameraRef}
          type="file"
          aria-label="Record or choose a video"
          title="Record or choose a video"
          accept="video/*"
          className="hidden"
          onChange={handleFiles}
        />

        <div className="sticky bottom-0 z-10 mt-auto border-t border-border/40 bg-background/85 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <button type="button"
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border/40 bg-muted/35 px-3 py-2 text-sm font-bold text-foreground active:scale-[0.99]"
            >
              {visibility === "everyone" && <Globe className="h-4 w-4 text-primary" />}
              {visibility === "friends" && <Users className="h-4 w-4 text-primary" />}
              {visibility === "onlyme" && <Lock className="h-4 w-4 text-primary" />}
              <span>
                {zivoOFMode
                  ? visibility === "everyone" ? "All Subscribers" : visibility === "friends" ? "Free Fans" : "Only me"
                  : visibility === "everyone" ? "Everyone" : visibility === "friends" ? "Friends" : "Only me"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showVisibilityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full left-0 z-20 mb-2 w-44 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-lg"
                >
                  {(zivoOFMode
                    ? [
                        { value: "everyone" as const, label: "All Subscribers", icon: Globe },
                        { value: "friends" as const, label: "Free Fans", icon: Users },
                        { value: "onlyme" as const, label: "Only me", icon: Lock },
                      ]
                    : [
                        { value: "everyone" as const, label: "Everyone", icon: Globe },
                        { value: "friends" as const, label: "Friends", icon: Users },
                        { value: "onlyme" as const, label: "Only me", icon: Lock },
                      ]
                  ).map((opt) => (
                    <button type="button"
                      key={opt.value}
                      onClick={() => { setVisibility(opt.value); setShowVisibilityMenu(false); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-sm font-bold transition-colors",
                        visibility === opt.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/40"
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                      {visibility === opt.value && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="button"
            onClick={() => {
              if (workflowMode === "live") {
                onClose();
                navigate("/live");
                return;
              }
              handlePost();
            }}
            disabled={!canPublish}
            aria-label={publishLabel}
            title={publishLabel}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-black transition-all active:scale-[0.98]",
              canPublish
                ? cn("bg-gradient-to-r text-white shadow-sm", activeWorkflowStyle.accent)
                : "border border-border/60 bg-muted/35 text-muted-foreground"
            )}
          >
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadStatus || "Posting..."}
              </span>
            ) : publishLabel}
          </button>
          </div>
        </div>

        {/* Product picker for shoppable posts */}
        <ProductPickerSheet
          open={showProductPicker}
          onOpenChange={setShowProductPicker}
          storeId={effectiveStoreId}
          selectedIds={taggedProductIds}
          onChange={setTaggedProductIds}
        />
      </motion.div>
    </motion.div>
  );
}
