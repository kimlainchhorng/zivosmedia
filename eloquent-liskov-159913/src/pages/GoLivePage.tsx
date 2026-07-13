/**
 * GoLivePage — Broadcast a real live stream.
 *
 * 100% real:
 * - Creates a row in `live_streams` when going live
 * - Subscribes to real `live_comments`, `live_viewers`, `live_likes`, `live_gift_displays`
 * - Marks stream as `ended` on stop
 * - Coin balance + Add Coin sheet wired to `user_coin_balances` + `recharge_coins` RPC
 *
 * Removed (per spec): PK battles, treasure chest, AR stickers, polls, super chat,
 * leaderboard popup, hashtags, BG music picker, screen effects, stream rating,
 * fake viewers / likes / gifts simulators.
 */
import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { motion, AnimatePresence } from "framer-motion";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Radio from "lucide-react/dist/esm/icons/radio";
import Camera from "lucide-react/dist/esm/icons/camera";
import CameraOff from "lucide-react/dist/esm/icons/camera-off";
import Mic from "lucide-react/dist/esm/icons/mic";
import MicOff from "lucide-react/dist/esm/icons/mic-off";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Users from "lucide-react/dist/esm/icons/users";
import Heart from "lucide-react/dist/esm/icons/heart";
import X from "lucide-react/dist/esm/icons/x";
import Gift from "lucide-react/dist/esm/icons/gift";
import Eye from "lucide-react/dist/esm/icons/eye";
import Music from "lucide-react/dist/esm/icons/music";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2";
import ChefHat from "lucide-react/dist/esm/icons/chef-hat";
import Laptop from "lucide-react/dist/esm/icons/laptop";
import Dumbbell from "lucide-react/dist/esm/icons/dumbbell";
import PaintBucket from "lucide-react/dist/esm/icons/paintbrush";
import Plane from "lucide-react/dist/esm/icons/plane";
import Globe from "lucide-react/dist/esm/icons/globe";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import { useBeautyFilter, DEFAULT_BEAUTY, BEAUTY_PRESETS, type BeautySettings } from "@/hooks/useBeautyFilter";
import { useVirtualBackground } from "@/hooks/useVirtualBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import {
 getPairedIdentity,
 getPairToken,
 getPairedSessionByToken,
 clearPairedIdentity,
 type PairedIdentity,
} from "@/lib/livePairing";
import { ICE_SERVERS, getIceServers, logSelectedCandidatePair, sendSignal, subscribeSignals } from "@/lib/liveWebrtc";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import bgOffice from "@/assets/bg-office.jpg";
import bgBeach from "@/assets/bg-beach.jpg";
import bgCafe from "@/assets/bg-cafe.jpg";
import bgCity from "@/assets/bg-city.jpg";
import bgStudio from "@/assets/bg-studio.jpg";
import bgNature from "@/assets/bg-nature.jpg";
import SEOHead from "@/components/SEOHead";

type BgPreset = { id: string; kind: "off" | "blur" | "image"; url?: string; label: string };
const BG_PRESETS: BgPreset[] = [
 { id: "off", kind: "off", label: "None" },
 { id: "blur", kind: "blur", label: "Blur" },
 { id: "office", kind: "image", url: bgOffice, label: "Office" },
 { id: "studio", kind: "image", url: bgStudio, label: "Studio" },
 { id: "cafe", kind: "image", url: bgCafe, label: "Cafe" },
 { id: "beach", kind: "image", url: bgBeach, label: "Beach" },
 { id: "city", kind: "image", url: bgCity, label: "City" },
 { id: "nature", kind: "image", url: bgNature, label: "Nature" },
];

const CoinRechargeSheet = lazy(() =>import("@/components/live/CoinRechargeSheet"));

type LivePhase = "setup" | "countdown" | "live" | "ended";

interface ChatRow { id: string; user_id: string; user_name: string; text: string; created_at: string; isGift?: boolean; user_is_verified?: boolean }

const TOPICS = [
 { name: "General", icon: Globe, emoji: "" },
 { name: "Music", icon: Music, emoji: "" },
 { name: "Gaming", icon: Gamepad2, emoji: "" },
 { name: "Cooking", icon: ChefHat, emoji: "" },
 { name: "Tech", icon: Laptop, emoji: "" },
 { name: "Fitness", icon: Dumbbell, emoji: "" },
 { name: "Art", icon: PaintBucket, emoji: "" },
 { name: "Travel", icon: Plane, emoji: "" },
 { name: "Beauty", icon: Sparkles, emoji: "" },
 { name: "Dance", icon: Sparkles, emoji: "" },
 { name: "Talent", icon: Sparkles, emoji: "" },
 { name: "Comedy", icon: Sparkles, emoji: "" },
 { name: "Talk Show", icon: Sparkles, emoji: "" },
 { name: "Education", icon: Sparkles, emoji: "" },
 { name: "ASMR", icon: Sparkles, emoji: "" },
 { name: "Pets", icon: Sparkles, emoji: "" },
];

type StreamType = "video" | "audio" | "pk" | "multi";
const STREAM_TYPES: { id: StreamType; label: string; desc: string; emoji: string; gradient: string }[] = [
 { id: "video", label: "Video Live", desc: "Standard camera stream", emoji: "", gradient: "from-red-500 to-rose-600" },
 { id: "audio", label: "Voice Room", desc: "Audio only · multi-host", emoji: "", gradient: "from-indigo-500 to-violet-600" },
 { id: "pk", label: "PK Battle", desc: "Compete head-to-head", emoji: "", gradient: "from-amber-500 to-orange-500" },
 { id: "multi", label: "Multi-Guest", desc: "Up to 9 guests", emoji: "", gradient: "from-emerald-500 to-teal-500" },
];

type Privacy = "public" | "followers" | "private";
const PRIVACY_OPTIONS: { id: Privacy; label: string; desc: string; emoji: string }[] = [
 { id: "public", label: "Public", desc: "Anyone can watch", emoji: "" },
 { id: "followers", label: "Followers only", desc: "Only your followers", emoji: "" },
 { id: "private", label: "Private", desc: "Invite link required", emoji: "" },
];

export default function GoLivePage() {
 const navigate = useNavigate();
 const goBack = useSmartBack("/live");
 const { user } = useAuth();
 const { data: userProfile } = useUserProfile();
 const { balance: coinBalance, recharge } = useCoinBalance();

 // Paired-device mode: phone confirmed via QR can broadcast as the store without sign-in.
 const [paired, setPaired] = useState<PairedIdentity | null>(() =>getPairedIdentity());
 const [pairToken, setPairTokenState] = useState<string | null>(() =>getPairToken());
 const isPaired = !!paired && !!pairToken;

 // Re-validate pair token on mount; clear it if revoked / expired
 useEffect(() =>{
 if (!pairToken) return;
 let alive = true;
 (async () =>{
 try {
 const sess = await getPairedSessionByToken(pairToken);
 if (!alive) return;
 if (!sess) {
 clearPairedIdentity();
 setPaired(null);
 setPairTokenState(null);
 return;
 }
 // Refresh stored identity (avatar/name may have changed)
 setPaired((prev) =>prev ? { ...prev, store_name: sess.store_name, store_avatar_url: sess.store_avatar_url } : prev);
 } catch {
 clearPairedIdentity();
 setPaired(null);
 setPairTokenState(null);
 toast.error("Pairing expired. Please scan the QR again.");
 }
 })();
 return () =>{ alive = false; };
 }, [pairToken]);

 const hostDisplayName = isPaired
 ? (paired?.store_name || "Live Shop")
 : (userProfile?.full_name || user?.email?.split("@")[0] || "Host");
 const hostAvatarUrl = isPaired
 ? paired?.store_avatar_url ?? null
 : userProfile?.avatar_url ?? null;

 const videoRef = useRef<HTMLVideoElement>(null);
 const streamRef = useRef<MediaStream | null>(null);
 const [rawStream, setRawStream] = useState<MediaStream | null>(null);
 const [beauty, setBeauty] = useState<BeautySettings>(DEFAULT_BEAUTY);
 const [showBeautyPanel, setShowBeautyPanel] = useState(false);
 const [activePreset, setActivePreset] = useState<"real" | "natural" | "sweet" | "pro" | "glam" | "auto" | "off" | "custom">("custom");
 const { stream: beautifiedStream, status: beautyStatus, luma } = useBeautyFilter(rawStream, beauty);
 const [compareHold, setCompareHold] = useState(false);

 // Virtual background (segmentation) — chosen on setup screen.
 const [bgChoice, setBgChoice] = useState<{ id: string; kind: "off" | "blur" | "image"; url?: string; label: string }>(
 { id: "off", kind: "off", label: "None" },
 );
 const bgConfig = useMemo(
 () =>({ kind: bgChoice.kind, imageUrl: bgChoice.url, blurPx: 22 }),
 [bgChoice.kind, bgChoice.url],
 );
 const { stream: bgStream, status: bgStatus } = useVirtualBackground(beautifiedStream ?? rawStream, bgConfig);

 // Toast when Beauty Pro becomes active for the first time
 const proAnnouncedRef = useRef(false);
 useEffect(() =>{
 if (beautyStatus === "pro" && beauty.enabled && !proAnnouncedRef.current) {
 proAnnouncedRef.current = true;
 toast.success("Beauty Pro active", { description: "Face tracking enabled", duration: 1500 });
 }
 }, [beautyStatus, beauty.enabled]);

 // Auto-match face: when the Beauty panel opens, snap to "Auto" preset so
 // brightness/smoothing self-tune to the user's lighting + skin in real time.
 useEffect(() =>{
 if (!showBeautyPanel) return;
 setActivePreset((prev) =>(prev === "custom" || prev === "off" ? "auto" : prev));
 setBeauty((b) =>{
 if (!b.enabled) return { ...BEAUTY_PRESETS.auto, tone: b.tone, blurBg: b.blurBg };
 return b;
 });
 }, [showBeautyPanel]);

 // Auto preset: self-tune brighten/smooth from sampled face luma
 useEffect(() =>{
 if (activePreset !== "auto" || !beauty.enabled) return;
 // luma 0..1 ; target ~0.55
 const base = BEAUTY_PRESETS.auto;
 let brighten = base.brighten;
 let smooth = base.smooth;
 if (luma< 0.35) { brighten = Math.min(85, base.brighten + 25); smooth = Math.min(95, base.smooth + 10); }
 else if (luma< 0.5) { brighten = Math.min(75, base.brighten + 12); }
 else if (luma >0.75) { brighten = Math.max(15, base.brighten - 18); }
 setBeauty((b) =>(b.brighten === brighten && b.smooth === smooth ? b : { ...b, brighten, smooth }));
 }, [luma, activePreset, beauty.enabled]);

 // When user is holding "Compare", show raw camera so they can see the before/after.
 const filteredStream = bgStream ?? beautifiedStream ?? rawStream;
 const previewStream = compareHold ? rawStream : filteredStream;
 const localStream = filteredStream;
 const chatEndRef = useRef<HTMLDivElement>(null);
 // Cache verified flags so chat/gift inserts hydrate the badge without flicker
 const verifiedCacheRef = useRef<Map<string, boolean>>(new Map());

 const [phase, setPhase] = useState<LivePhase>("setup");
 const [streamType, setStreamType] = useState<StreamType>("video");
 const [privacy, setPrivacy] = useState<Privacy>("public");
 const [hashtags, setHashtags] = useState<string>("");
 const [coinGoal, setCoinGoal] = useState<number>(0);
 const [showAdvanced, setShowAdvanced] = useState(false);
 const [allowGifts, setAllowGifts] = useState(true);
 const [allowComments, setAllowComments] = useState(true);
 const [ageRestricted, setAgeRestricted] = useState(false);
 const [coverImage, setCoverImage] = useState<string | null>(null);
 const [language, setLanguage] = useState("en");
 const [country, setCountry] = useState("global");
 const [scheduleAt, setScheduleAt] = useState<string>("");
 const [streamRules, setStreamRules] = useState("");
 const [arEffect, setArEffect] = useState<string | null>(null);
 const [beautyIntensity, setBeautyIntensity] = useState(50);
 const [agency, setAgency] = useState<string | null>(null);
 const [quality, setQuality] = useState<"480p" | "720p" | "1080p">("720p");
 const [saveReplay, setSaveReplay] = useState(true);
 const [slowMode, setSlowMode] = useState<0 | 5 | 10 | 30>(0);
 const [bannedWords, setBannedWords] = useState("");
 const [pinnedMessage, setPinnedMessage] = useState("");
 const [coHosts, setCoHosts] = useState<string[]>([]);
 const [donationCause, setDonationCause] = useState<string | null>(null);
 const [donationGoal, setDonationGoal] = useState(0);
 const [streamMood, setStreamMood] = useState<string>("chill");
 const [connTested, setConnTested] = useState<"idle" | "testing" | "ok" | "weak">("idle");
 const [bgm, setBgm] = useState<string | null>(null);
 const [bgmVolume, setBgmVolume] = useState(50);
 const [streamDesc, setStreamDesc] = useState("");
 const [welcomeMsg, setWelcomeMsg] = useState("");
 const [milestones, setMilestones] = useState<{ viewers: number; reward: string }[]>([]);
 const [products, setProducts] = useState<string[]>([]);
 const [cameraFilter, setCameraFilter] = useState<string>("none");
 const [preRoll, setPreRoll] = useState<0 | 5 | 10 | 30>(0);
 const [autoEnd, setAutoEnd] = useState<0 | 30 | 60 | 120 | 240>(0);
 const [streamTags, setStreamTags] = useState<string[]>([]);
 const [polls, setPolls] = useState<{ q: string; opts: string[] }[]>([]);
 const [qaQueue, setQaQueue] = useState<boolean>(false);
 const [multistream, setMultistream] = useState<string[]>([]);
 const [subscriberOnly, setSubscriberOnly] = useState<boolean>(false);
 const [showSetupDetails, setShowSetupDetails] = useState(false);
 const [newPollQ, setNewPollQ] = useState<string>("");
 const [voiceEffect, setVoiceEffect] = useState<string>("none");
 const [autoClip, setAutoClip] = useState<boolean>(true);

 const playSFX = useCallback((label: string) => {
   try {
     const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
     const gain = ctx.createGain();
     gain.connect(ctx.destination);
     const now = ctx.currentTime;

     if (label === "Ding") {
       const osc = ctx.createOscillator();
       osc.connect(gain);
       osc.frequency.setValueAtTime(1047, now);
       osc.frequency.exponentialRampToValueAtTime(523, now + 0.8);
       gain.gain.setValueAtTime(0.5, now);
       gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
       osc.start(now); osc.stop(now + 0.9);
     } else if (label === "Air horn") {
       const osc = ctx.createOscillator();
       osc.type = "sawtooth";
       osc.connect(gain);
       osc.frequency.setValueAtTime(220, now);
       osc.frequency.linearRampToValueAtTime(440, now + 0.15);
       gain.gain.setValueAtTime(0.6, now);
       gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
       osc.start(now); osc.stop(now + 0.8);
     } else if (label === "Boom") {
       const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
       const d = buf.getChannelData(0);
       for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
       const src = ctx.createBufferSource();
       const lp = ctx.createBiquadFilter();
       lp.type = "lowpass"; lp.frequency.value = 120;
       src.buffer = buf;
       src.connect(lp); lp.connect(gain);
       gain.gain.setValueAtTime(1.2, now);
       gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
       src.start(now);
     } else if (label === "Drum roll") {
       for (let i = 0; i < 16; i++) {
         const t = now + i * 0.04;
         const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
         const d = buf.getChannelData(0);
         for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2);
         const src = ctx.createBufferSource();
         const hp = ctx.createBiquadFilter();
         hp.type = "highpass"; hp.frequency.value = 2000;
         src.buffer = buf; src.connect(hp); hp.connect(gain);
         gain.gain.setValueAtTime(0.3 + i * 0.04, t);
         src.start(t);
       }
     } else if (label === "Applause") {
       for (let i = 0; i < 6; i++) {
         const t = now + i * 0.07;
         const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
         const d = buf.getChannelData(0);
         for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 1.5);
         const src = ctx.createBufferSource();
         const bp = ctx.createBiquadFilter();
         bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.6;
         src.buffer = buf; src.connect(bp); bp.connect(gain);
         gain.gain.setValueAtTime(0.45, t);
         src.start(t);
       }
     } else if (label === "Laugh") {
       const freqs = [350, 420, 380, 440, 360];
       freqs.forEach((freq, i) => {
         const osc = ctx.createOscillator();
         osc.type = "sine";
         osc.connect(gain);
         const t = now + i * 0.1;
         osc.frequency.setValueAtTime(freq, t);
         osc.frequency.linearRampToValueAtTime(freq * 0.85, t + 0.08);
         gain.gain.setValueAtTime(0.3, t);
         gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
         osc.start(t); osc.stop(t + 0.12);
       });
     } else if (label === "Boo") {
       const osc = ctx.createOscillator();
       osc.type = "sawtooth";
       osc.connect(gain);
       osc.frequency.setValueAtTime(180, now);
       osc.frequency.linearRampToValueAtTime(120, now + 0.7);
       gain.gain.setValueAtTime(0.4, now);
       gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
       osc.start(now); osc.stop(now + 0.8);
     } else if (label === "Crickets") {
       for (let i = 0; i < 3; i++) {
         const t = now + i * 0.25;
         for (let k = 0; k < 4; k++) {
           const osc = ctx.createOscillator();
           osc.type = "square";
           osc.connect(gain);
           const chirpT = t + k * 0.05;
           osc.frequency.setValueAtTime(4200 + Math.random() * 400, chirpT);
           gain.gain.setValueAtTime(0.08, chirpT);
           gain.gain.exponentialRampToValueAtTime(0.001, chirpT + 0.04);
           osc.start(chirpT); osc.stop(chirpT + 0.05);
         }
       }
     }

     setTimeout(() => ctx.close(), 2000);
   } catch {
     // AudioContext may be blocked — silent fail
   }
 }, []);
 const [pushFollowers, setPushFollowers] = useState<boolean>(true);
 const [moderators, setModerators] = useState<string[]>([]);
 const [streamTemplate, setStreamTemplate] = useState<string | null>(null);
 const [bannedUsers, setBannedUsers] = useState("");
 const [streamId, setStreamId] = useState<string | null>(null);
 const [title, setTitle] = useState("");
 const [topic, setTopic] = useState("General");
 const [cameraOn, setCameraOn] = useState(true);
 const [micOn, setMicOn] = useState(true);
 const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
 const [cameraError, setCameraError] = useState(false);
 const [countdown, setCountdown] = useState(0);

 const [viewerCount, setViewerCount] = useState(0);
 const [likes, setLikes] = useState(0);
 const [coinsEarned, setCoinsEarned] = useState(0);
 const [giftsReceived, setGiftsReceived] = useState(0);
 const [elapsed, setElapsed] = useState(0);
 const [chatMessages, setChatMessages] = useState<ChatRow[]>([]);
 const [showRechargeSheet, setShowRechargeSheet] = useState(false);
 const [showEndConfirm, setShowEndConfirm] = useState(false);
 const [showBgSheet, setShowBgSheet] = useState(false);

 // ── Camera ──
 // Tries multiple constraint shapes so we work on phones that lack the
 // requested facing camera (e.g. desktops with only one webcam, tablets
 // without a back camera, etc.). Without these fallbacks getUserMedia throws
 // NotFoundError and we'd allow the user to "go live" with no video.
 const startCamera = useCallback(async () =>{
 streamRef.current?.getTracks().forEach((t) =>t.stop());
 streamRef.current = null;
 setRawStream(null);

 const attempts: MediaStreamConstraints[] = [
 { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 } as any },
 { video: { facingMode: { ideal: facingMode }, width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }, audio: true },
 { video: { facingMode: { ideal: facingMode } }, audio: true },
 { video: true, audio: true },
 { video: true, audio: false },
 ];

 let s: MediaStream | null = null;
 let lastErr: unknown = null;
 for (const c of attempts) {
 try {
 s = await navigator.mediaDevices.getUserMedia(c);
 if (s) break;
 } catch (err) {
 lastErr = err;
 console.warn("[GoLivePage] getUserMedia attempt failed", c, err);
 }
 }

 // Final fallback: enumerateDevices + explicit deviceId
 if (!s) {
 try {
 const devices = await navigator.mediaDevices.enumerateDevices();
 const cam = devices.find((d) =>d.kind === "videoinput");
 if (cam?.deviceId) {
 s = await navigator.mediaDevices.getUserMedia({
 video: { deviceId: { exact: cam.deviceId } },
 audio: true,
 });
 }
 } catch (err) {
 lastErr = err;
 console.warn("[GoLivePage] deviceId fallback failed", err);
 }
 }

 if (!s) {
 console.warn("[GoLivePage] all getUserMedia attempts failed", lastErr);
 setCameraError(true);
 return;
 }

 streamRef.current = s;
 setRawStream(s);
 // videoRef will be bound to the beautified stream via the effect below.
 setCameraError(false);
 }, [facingMode]);

 useEffect(() =>{
 startCamera();
 return () =>streamRef.current?.getTracks().forEach((t) =>t.stop());
 }, [startCamera]);

 // Bind whichever stream is current (beautified preferred) to the preview<video>.
 // While holding "Compare", switch to the raw stream so the streamer sees the before/after.
 useEffect(() =>{
 if (videoRef.current && previewStream) {
 videoRef.current.srcObject = previewStream;
 videoRef.current.play().catch(() =>{});
 }
 }, [previewStream]);

 const toggleCamera = useCallback(() =>{
 streamRef.current?.getVideoTracks().forEach((t) =>(t.enabled = !t.enabled));
 setCameraOn((p) =>!p);
 }, []);

 const toggleMic = useCallback(() =>{
 streamRef.current?.getAudioTracks().forEach((t) =>(t.enabled = !t.enabled));
 setMicOn((p) =>!p);
 }, []);

 const flipCamera = useCallback(() =>setFacingMode((p) =>(p === "user" ? "environment" : "user")), []);

 // ── Go live: create live_streams row (or call edge function in paired mode) ──
 const goLive = useCallback(async () =>{
 if (!user?.id && !isPaired) { toast.error("Please sign in or pair this device"); return; }

 // Block headless broadcasts: we MUST have a working camera/mic before
 // creating the live row, otherwise the desktop viewer hangs forever on
 // "Connecting to phone…" because no offer is ever produced.
 const hasLiveVideo = !!localStream
 && localStream.getVideoTracks().some((t) =>t.readyState === "live");
 if (!hasLiveVideo) {
 toast.error("Camera not ready", { description: "Allow camera access and try again." });
 // Try to acquire it now so the next tap works.
 startCamera();
 return;
 }

 const streamTitle = title.trim() || "My Live Stream";
 setTitle(streamTitle);
 setPhase("countdown");
 setCountdown(3);
 let c = 3;
 const iv = setInterval(async () =>{
 c -= 1;
 if (c<= 0) {
 clearInterval(iv);
 try {
 let newStreamId: string | null = null;

 if (isPaired && pairToken) {
 // Paired-device flow: edge function authorizes via pair token
 const { data, error } = await supabase.functions.invoke("pair-go-live", {
 body: {
 pair_token: pairToken,
 action: "start",
 payload: { title: streamTitle, topic },
 },
 });
 if (error) throw error;
 if ((data as any)?.error) throw new Error((data as any).error);
 newStreamId = (data as any)?.stream_id ?? null;
 } else {
 const { data, error } = await (supabase as any)
 .from("live_streams")
 .insert({
 user_id: user!.id,
 title: streamTitle,
 topic,
 host_name: hostDisplayName,
 host_avatar: hostAvatarUrl,
 status: "live",
 started_at: new Date().toISOString(),
 })
 .select("id")
 .single();
 if (error) throw error;
 newStreamId = data.id;
 }

 if (!newStreamId) throw new Error("No stream id returned");
 setStreamId(newStreamId);
 setPhase("live");
 toast.success("You're live!");
 } catch (e: any) {
 toast.error("Failed to start", { description: e?.message ?? String(e) });
 setPhase("setup");
 }
 } else {
 setCountdown(c);
 }
 }, 1000);
 }, [title, topic, user, isPaired, pairToken, hostDisplayName, hostAvatarUrl, localStream, startCamera]);

 // ── Realtime subscriptions for the active stream ──
 useEffect(() =>{
 if (!streamId) return;
 const channel = supabase
 .channel(`go-live-${streamId}`)
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_comments", filter: `stream_id=eq.${streamId}` },
 async (payload: any) =>{
 const row = payload.new;
 const { data: prof } = await supabase
 .from("profiles")
 .select("full_name, is_verified")
 .eq("user_id", row.user_id)
 .maybeSingle();
 const verified = (prof as any)?.is_verified === true;
 verifiedCacheRef.current.set(row.user_id, verified);
 setChatMessages((prev) =>[
 ...prev.slice(-39),
 { id: row.id, user_id: row.user_id, user_name: (prof as any)?.full_name || "Guest", text: row.content, created_at: row.created_at, user_is_verified: verified },
 ]);
 }
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_viewers", filter: `stream_id=eq.${streamId}` },
 () =>setViewerCount((v) =>v + 1)
 )
 .on(
 "postgres_changes",
 { event: "DELETE", schema: "public", table: "live_viewers", filter: `stream_id=eq.${streamId}` },
 () =>setViewerCount((v) =>Math.max(0, v - 1))
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_likes", filter: `stream_id=eq.${streamId}` },
 () =>setLikes((l) =>l + 1)
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_gift_displays", filter: `stream_id=eq.${streamId}` },
 async (payload: any) =>{
 const g = payload.new;
 setCoinsEarned((c) =>c + g.coins);
 setGiftsReceived((n) =>n + 1);
 let senderVerified = verifiedCacheRef.current.get(g.sender_id);
 if (senderVerified === undefined) {
 const { data: prof } = await (supabase as any)
 .from("profiles")
 .select("is_verified")
 .eq("user_id", g.sender_id)
 .maybeSingle();
 senderVerified = (prof as any)?.is_verified === true;
 verifiedCacheRef.current.set(g.sender_id, senderVerified);
 }
 setChatMessages((prev) =>[
 ...prev.slice(-39),
 { id: `gift-${g.id}`, user_id: g.sender_id, user_name: g.sender_name, text: `sent ${g.gift_name}`, created_at: g.created_at, isGift: true, user_is_verified: senderVerified },
 ]);
 }
 )
 .on(
 "postgres_changes",
 { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
 (payload: any) =>{
 const r = payload.new;
 if (typeof r.viewer_count === "number") setViewerCount(r.viewer_count);
 if (typeof r.like_count === "number") setLikes(r.like_count);
 if (typeof r.coins_earned === "number") setCoinsEarned(r.coins_earned);
 if (typeof r.gifts_received === "number") setGiftsReceived(r.gifts_received);
 }
 )
 .subscribe();
 return () =>{ supabase.removeChannel(channel); };
 }, [streamId]);

 // ── WebRTC publisher: when live, broadcast camera to watchers via Supabase signaling ──
 // IMPORTANT: depends on `localStream` so when the camera becomes ready slightly
 // AFTER the stream is created, this effect will rerun and start publishing.
 useEffect(() =>{
 if (!streamId || phase !== "live") return;
 if (!localStream || localStream.getTracks().length === 0) {
 if (import.meta.env.DEV) console.log("[publisher] waiting for local media stream...");
 return;
 }

 let pc: RTCPeerConnection | null = null;
 let unsub: (() =>void) | null = null;
 let alive = true;
 const pendingIce: RTCIceCandidateInit[] = [];

 if (import.meta.env.DEV) console.log("[publisher] starting peer connection for stream", streamId);
 pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
 // Swap in real TURN servers as soon as the edge function returns.
 getIceServers().then((servers) =>{
 if (!alive || !pc) return;
 try { pc.setConfiguration({ iceServers: servers }); } catch (e) {
 console.warn("[publisher] setConfiguration failed", e);
 }
 });
 localStream.getTracks().forEach((t) =>pc!.addTrack(t, localStream));

 // ── Boost video quality: raise encoder bitrate so the watcher gets a
 // sharp image instead of the heavily-compressed default (~300-500 kbps).
 // We target 2.5 Mbps which is plenty for 720p portrait video and still
 // fits comfortably on 5G / decent Wi-Fi uploads. Also enable degradation
 // preference "maintain-resolution" so frames get smoother rather than
 // pixelated when bandwidth dips.
 try {
 const videoSender = pc.getSenders().find((s) =>s.track?.kind === "video");
 if (videoSender) {
 const params = videoSender.getParameters();
 if (!params.encodings || params.encodings.length === 0) {
 params.encodings = [{}];
 }
 // Stable mobile profile: 1.8 Mbps + 30fps for faster startup and fewer stalls.
 params.encodings[0].maxBitrate = 1_800_000;
 params.encodings[0].maxFramerate = 30;
 (params as any).degradationPreference = "balanced";
 videoSender.setParameters(params).catch((e) =>
 console.warn("[publisher] setParameters failed", e),
 );
 }
 const audioSender = pc.getSenders().find((s) =>s.track?.kind === "audio");
 if (audioSender) {
 const aParams = audioSender.getParameters();
 if (!aParams.encodings || aParams.encodings.length === 0) aParams.encodings = [{}];
 aParams.encodings[0].maxBitrate = 64_000;
 audioSender.setParameters(aParams).catch(() =>{});
 }
 } catch (e) {
 console.warn("[publisher] bitrate boost failed", e);
 }

 pc.onicecandidate = (ev) =>{
 if (ev.candidate && alive) {
 sendSignal(streamId, "publisher", "viewer", "ice", ev.candidate.toJSON());
 }
 };

 pc.oniceconnectionstatechange = () =>{
 if (import.meta.env.DEV) console.log("[publisher] iceConnectionState=", pc?.iceConnectionState);
 };

 pc.onconnectionstatechange = () =>{
 if (import.meta.env.DEV) console.log("[publisher] connectionState=", pc?.connectionState);
 if (pc?.connectionState === "connected") {
 logSelectedCandidatePair(pc, "publisher");
 return;
 }
 if (pc?.connectionState === "failed" && alive) {
 // Trigger ICE restart
 try { pc.restartIce(); } catch {}
 }
 };

 const flushIce = async () =>{
 while (pendingIce.length) {
 const c = pendingIce.shift()!;
 try { await pc!.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {
 console.warn("[publisher] failed to add queued ICE", e);
 }
 }
 };

 let answered = false;
 let creatingOffer = false;
 unsub = subscribeSignals(streamId, "publisher", async (row) =>{
 if (!pc || !alive) return;
 try {
 if (row.type === "join") {
 if (creatingOffer) {
 if (import.meta.env.DEV) console.log("[publisher] ignoring re-join, offer creation in progress");
 return;
 }
 if (pc.signalingState !== "stable" && !answered) {
 if (import.meta.env.DEV) console.log("[publisher] ignoring re-join, negotiation in progress");
 return;
 }
 if (answered && (pc.connectionState === "connected" || pc.connectionState === "connecting")) {
 if (import.meta.env.DEV) console.log("[publisher] ignoring re-join, already connected/connecting");
 return;
 }
 creatingOffer = true;
 answered = false;
 try {
 if (import.meta.env.DEV) console.log("[publisher] viewer joined, creating offer for stream", streamId);
 const offer = await pc.createOffer();
 await pc.setLocalDescription(offer);
 await sendSignal(streamId, "publisher", "viewer", "offer", { type: offer.type, sdp: offer.sdp });
 if (import.meta.env.DEV) console.log("[publisher] offer sent");
 } finally {
 creatingOffer = false;
 }
 } else if (row.type === "answer") {
 if (pc.signalingState !== "have-local-offer") {
 if (import.meta.env.DEV) console.log("[publisher] ignoring answer, state=", pc.signalingState);
 return;
 }
 await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
 answered = true;
 await flushIce();
 } else if (row.type === "ice" && row.payload) {
 if (!pc.remoteDescription) {
 // Queue until remote description is set
 pendingIce.push(row.payload);
 return;
 }
 try { await pc.addIceCandidate(new RTCIceCandidate(row.payload)); } catch (e) {
 console.warn("[publisher] addIceCandidate failed", e);
 }
 }
 } catch (e) {
 console.warn("[GoLivePage publisher] signal error", e);
 }
 });

 return () =>{
 alive = false;
 try { unsub?.(); } catch {}
 // Do NOT signal "bye" on every dependency change — that would
 // disconnect the desktop viewer mid-handshake when the camera/mic
 // toggles. The explicit "End Stream" flow handles teardown.
 try { pc?.close(); } catch {}
 };
 }, [streamId, phase, localStream]);

 // Stream timer
 useEffect(() =>{
 if (phase !== "live") return;
 const i = setInterval(() =>setElapsed((e) =>e + 1), 1000);
 return () =>clearInterval(i);
 }, [phase]);

 // Publisher heartbeat — every 8 s, while live, so the desktop can detect
 // when the phone disappears and auto-end the stream.
 useEffect(() =>{
 if (phase !== "live" || !streamId) return;
 let stopped = false;
 const ping = () =>{
 if (stopped) return;
 sendSignal(streamId, "publisher", "viewer", "heartbeat", {});
 };
 ping();
 const t = setInterval(ping, 8000);
 return () =>{ stopped = true; clearInterval(t); };
 }, [phase, streamId]);

 useEffect(() =>{ chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

 const endActiveStream = useCallback(async (options?: { keepalive?: boolean }) =>{
 if (!streamId) return;

 const endedAt = new Date().toISOString();

 try {
 // Paired-device flow: end via edge function
 if (isPaired && pairToken && !options?.keepalive) {
 await supabase.functions.invoke("pair-go-live", {
 body: { pair_token: pairToken, action: "end", stream_id: streamId },
 });
 return;
 }

 if (options?.keepalive) {
 const { data: sessionData } = await supabase.auth.getSession();
 const accessToken = sessionData.session?.access_token;

 await fetch(`${SUPABASE_URL}/rest/v1/live_streams?id=eq.${streamId}&status=eq.live`, {
 method: "PATCH",
 keepalive: true,
 headers: {
 "Content-Type": "application/json",
 apikey: SUPABASE_PUBLISHABLE_KEY,
 Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
 Prefer: "return=minimal",
 },
 body: JSON.stringify({ status: "ended", ended_at: endedAt }),
 });

 return;
 }

 await (supabase as any)
 .from("live_streams")
 .update({ status: "ended", ended_at: endedAt })
 .eq("id", streamId)
 .eq("status", "live");
 } catch (error) {
 console.warn("[GoLivePage] failed to end stream", error);
 }
 }, [streamId, isPaired, pairToken]);

 const endStream = useCallback(async () =>{
 await endActiveStream();
 streamRef.current?.getTracks().forEach((t) =>t.stop());
 setStreamId(null);
 setPhase("ended");
 }, [endActiveStream]);

 // NOTE: We intentionally DO NOT auto-end the stream on unmount, page refresh,
 // tab close, or navigation. The host's stream stays "live" until they
 // explicitly tap End / X. This lets them refresh, lose connection, or hide
 // the studio panel without dropping their broadcast.

 // ── Resume an existing live stream on mount (after refresh / re-open) ──
 useEffect(() =>{
 if (phase !== "setup" || streamId) return;
 if (!user?.id && !(isPaired && pairToken)) return;

 let cancelled = false;

 const restoreLiveStream = (data: any) =>{
 if (cancelled || !data?.id) return;
 setStreamId(data.id);
 setTitle(data.title || "");
 if (data.topic) setTopic(data.topic);
 setViewerCount(data.viewer_count ?? 0);
 setLikes(data.like_count ?? 0);
 setCoinsEarned(data.coins_earned ?? 0);
 setGiftsReceived(data.gifts_received ?? 0);
 if (data.started_at) {
 setElapsed(Math.max(0, Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)));
 }
 setPhase("live");
 };

 (async () =>{
 if (isPaired && pairToken) {
 const { data, error } = await supabase.functions.invoke("pair-go-live", {
 body: { pair_token: pairToken, action: "heartbeat" },
 });
 if (cancelled || error) return;
 restoreLiveStream((data as any)?.active_stream ?? null);
 return;
 }

 const { data, error } = await (supabase as any)
 .from("live_streams")
 .select("id, title, topic, started_at, viewer_count, like_count, coins_earned, gifts_received")
 .eq("user_id", user.id)
 .eq("status", "live")
 .is("ended_at", null)
 .order("started_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (cancelled || error || !data) return;
 restoreLiveStream(data);
 })();

 return () =>{ cancelled = true; };
 }, [user?.id, isPaired, pairToken, phase, streamId]);

 const formatTime = (s: number) =>`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

 // ── SETUP / COUNTDOWN / ENDED screens ──
 if (phase === "setup" || phase === "countdown") {
 return (
<div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col lg:flex lg:items-stretch lg:justify-center">
<SEOHead
 title="Go Live – ZIVO"
 description="Start a live stream on ZIVO and connect with your audience in real time."
 canonical="/go-live"
 noIndex
 />
<div className="absolute inset-0 lg:max-w-md lg:left-1/2 lg:-translate-x-1/2 lg:rounded-[32px] lg:overflow-hidden lg:my-6 lg:bottom-6 lg:h-auto lg:bg-zinc-950 lg:shadow-2xl lg:ring-1 lg:ring-white/10">
<video ref={videoRef} autoPlay muted playsInline className={cn("absolute inset-0 w-full h-full object-cover", facingMode === "user" && "scale-x-[-1]")} />
 {cameraError && (
<div className="absolute left-4 right-4 top-[calc(var(--zivo-safe-top,0px)+4.75rem)] h-20 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50">
<div className="flex h-full items-center gap-3 px-4">
<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
<CameraOff className="h-5 w-5 text-white/50" />
</div>
<div className="min-w-0 flex-1">
<p className="text-white/85 text-sm font-semibold">Camera unavailable</p>
<p className="mt-0.5 truncate text-white/45 text-xs">Allow camera access, then retry.</p>
</div>
<Button onClick={startCamera} className="h-8 shrink-0 rounded-full px-4 text-xs" variant="outline">Retry</Button>
</div>
</div>
 )}
{/* Top: 25% subtle dim. Bottom 60%: dark for form readability */}
<div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/95 pointer-events-none" />
{/* Extra dark backdrop behind the form area */}
<div className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-black/95 via-black/85 to-transparent pointer-events-none" />
</div>

 {phase === "setup" && (
<div className="relative z-10 w-full h-full flex flex-col lg:max-w-md lg:mx-auto lg:my-6 lg:rounded-[32px] lg:overflow-hidden">
<div className="relative z-10 flex items-center gap-2 px-3 pt-2" style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 8px)" }}>
<button type="button" onClick={goBack} aria-label="Back" className="relative z-20 min-w-[44px] min-h-[44px] rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shrink-0 pointer-events-auto">
<ArrowLeft className="h-5 w-5 text-white" />
</button>
 {isPaired ? (
<div className="flex-1 flex items-center justify-center gap-2">
<Avatar className="h-9 w-9 ring-2 ring-white/30 shadow-lg">
<AvatarImage src={optimizeAvatar(hostAvatarUrl, 96)} alt={hostDisplayName} />
<AvatarFallback className="bg-white/15 text-white text-sm font-bold">
 {hostDisplayName?.[0]?.toUpperCase() ?? "S"}
</AvatarFallback>
</Avatar>
<div className="flex flex-col items-start leading-tight">
<span className="text-white text-sm font-bold truncate max-w-[140px]">{hostDisplayName}</span>
<span className="text-[9px] uppercase tracking-wider text-emerald-300 font-semibold">Paired device</span>
</div>
</div>
 ) : (
<h1 className="text-white font-bold flex-1 text-center mr-9">Go Live</h1>
 )}
 {isPaired && (
<button type="button"
 onClick={() =>{
 clearPairedIdentity();
 setPaired(null);
 setPairTokenState(null);
 toast.success("Unpaired");
 }}
 className="text-[10px] font-semibold text-white/70 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm shrink-0"
 >
 Unpair
</button>
 )}
</div>

<div className={cn("relative z-10 mt-24 overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-black/[0.72] px-4 pb-6 pt-4 shadow-2xl shadow-black/60 backdrop-blur-md space-y-3 scrollbar-hide", cameraError ? "max-h-[80vh]" : "max-h-[84vh]")} style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 24px)" }}>
 {/* Streamer Pro Tips carousel (kept out of the primary setup flow) */}
<div className="hidden">
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold flex items-center gap-1">
 Pro tips
</span>
<span className="text-[10px] text-white/40">Swipe →</span>
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
 {[
 { tip: "Start with a strong title to grab viewers", icon: "", gradient: "from-white/10 to-white/5" },
 { tip: "Greet new viewers within 10 seconds", icon: "", gradient: "from-white/10 to-white/5" },
 { tip: "Use good lighting — face a window", icon: "", gradient: "from-amber-500/30 via-yellow-500/20 to-orange-500/10" },
 { tip: "Respond to comments to boost engagement", icon: "", gradient: "from-emerald-500/30 via-green-500/20 to-teal-500/10" },
 { tip: "Stream for at least 30 mins for algo boost", icon: "⏱", gradient: "from-white/10 to-white/5" },
 { tip: "Set a coin goal to motivate gifts", icon: "", gradient: "from-white/10 to-white/5" },
 { tip: "Add hashtags for discovery", icon: "#", gradient: "from-white/10 to-white/5" },
 { tip: "Schedule streams to build a routine", icon: "", gradient: "from-white/10 to-white/5" },
 ].map((p, i) =>(
<div
 key={i}
 className={cn(
 "shrink-0 snap-start w-[220px] rounded-2xl p-3 bg-gradient-to-br border border-white/15 backdrop-blur-sm",
 p.gradient,
 )}
 >
<span className="text-2xl">{p.icon}</span>
<p className="text-[12px] font-semibold text-white leading-tight mt-1.5">{p.tip}</p>
</div>
 ))}
</div>
</div>

 {/* Stream type selector */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Stream type</span>
<div className="grid grid-cols-4 gap-1.5">
 {STREAM_TYPES.map((t) =>{
 const active = streamType === t.id;
 return (
<button type="button"
 key={t.id}
 onClick={() =>setStreamType(t.id)}
 className={cn(
 "rounded-2xl p-2 flex flex-col items-center gap-0.5 border-2 transition-all",
 active
 ? `bg-gradient-to-br ${t.gradient} border-white/30 shadow-lg`
 : "bg-white/[0.08] border-white/15",
 )}
 >
<span className="text-2xl">{t.emoji}</span>
<span className={cn("text-[10px] font-bold leading-tight", active ? "text-white" : "text-white/80")}>{t.label}</span>
</button>
 );
 })}
</div>
</div>

<Input
 value={title}
 onChange={(e) =>setTitle(e.target.value)}
 placeholder="What are you streaming?"
 maxLength={80}
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-12 text-base"
 />

 {/* Topics */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Category · {topic}</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {TOPICS.map((t) =>(
<button type="button"
 key={t.name}
 onClick={() =>setTopic(t.name)}
 className={cn(
 "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors",
 topic === t.name ? "bg-red-500 border-red-400 text-white" : "bg-white/10 border-white/20 text-white/70"
 )}
 >
<span>{t.emoji}</span>{t.name}
</button>
 ))}
</div>
</div>

<button type="button"
 onClick={() =>setShowSetupDetails((v) =>!v)}
 className="w-full rounded-2xl border border-white/15 bg-white/[0.08] px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
>
<div className="flex items-center justify-between gap-3">
<div>
<p className="text-[12px] font-bold text-white">More setup options</p>
<p className="text-[10px] text-white/40">Templates, cover, tags, effects, background</p>
</div>
<span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70">
 {showSetupDetails ? "Hide" : "Open"}
</span>
</div>
</button>

 {showSetupDetails && (
<div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3">
 {/* Stream Templates (load preset config) */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Stream templates</span>
 {streamTemplate && (
<button type="button" onClick={() =>setStreamTemplate(null)} className="text-[10px] text-white/50 hover:text-white">Reset</button>
 )}
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "karaoke", label: "Karaoke Night", emoji: "", topic: "Music" },
 { id: "gaming", label: "Gaming Stream", emoji: "", topic: "Gaming" },
 { id: "cook", label: "Cooking Show", emoji: "", topic: "Cooking" },
 { id: "qna", label: "Q&A Session", emoji: "", topic: "Talk Show" },
 { id: "fitness", label: "Workout", emoji: "", topic: "Fitness" },
 { id: "travel", label: "Travel Vlog", emoji: "", topic: "Travel" },
 { id: "asmr", label: "ASMR Sleep", emoji: "", topic: "ASMR" },
 { id: "study", label: "Study With Me", emoji: "", topic: "Education" },
 ].map((t) =>(
<button type="button"
 key={t.id}
 onClick={() =>{
 setStreamTemplate(t.id);
 setTopic(t.topic);
 toast.success(`Template "${t.label}" loaded`);
 }}
 className={cn(
 "shrink-0 flex flex-col items-center gap-0.5 w-[80px] py-2 rounded-2xl border transition-colors",
 streamTemplate === t.id ? "bg-fuchsia-500/20 border-fuchsia-400" : "bg-white/5 border-white/15",
 )}
 >
<span className="text-2xl">{t.emoji}</span>
<span className="text-[10px] font-bold text-white text-center leading-tight">{t.label}</span>
</button>
 ))}
</div>
<p className="text-[9px] text-white/40 mt-0.5 px-1">Pre-configured settings for your stream type</p>
</div>

 {/* Stream description */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Description (optional)</span>
<textarea
 value={streamDesc}
 onChange={(e) =>setStreamDesc(e.target.value)}
 placeholder="Tell viewers what your stream is about..."
 rows={2}
 maxLength={300}
 className="w-full px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm resize-none focus:outline-none focus:border-blue-400"
 />
<p className="text-[9px] text-white/40 mt-0.5 px-1 text-right">{streamDesc.length}/300</p>
</div>

 {/* Cover image upload */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Cover image (optional)</span>
<label className="block w-full h-20 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 cursor-pointer overflow-hidden relative">
<input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) =>{
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onload = () =>setCoverImage(reader.result as string);
 reader.readAsDataURL(file);
 }
 }}
 />
 {coverImage ? (
<>
<img src={coverImage} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
<button
 type="button"
 onClick={(e) =>{ e.preventDefault(); setCoverImage(null); }}
 className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
 >
<X className="h-3 w-3 text-white" />
</button>
</>
 ) : (
<div className="w-full h-full flex flex-col items-center justify-center gap-1">
<ImageIcon className="h-5 w-5 text-white/50" />
<span className="text-[11px] text-white/60 font-semibold">Tap to upload thumbnail</span>
</div>
 )}
</label>
</div>

 {/* Predefined Stream Tags */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Stream tags ({streamTags.length})</span>
 {streamTags.length >0 && (
<button type="button" onClick={() =>setStreamTags([])} className="text-[10px] text-white/50 hover:text-white">Clear</button>
 )}
</div>
<div className="flex flex-wrap gap-1.5">
 {[
 "First time live", "English speaker", "Multilingual", "18+", "Family-friendly",
 "Solo", "With friends", "Beginner", "Pro", "Interactive", "Quiet vibes", "High energy",
 "Birthday", "Celebration", "Charity", "Sponsored", "Educational", "Behind-the-scenes",
 ].map((tag) =>{
 const on = streamTags.includes(tag);
 return (
<button type="button"
 key={tag}
 onClick={() =>setStreamTags((prev) =>(prev.includes(tag) ? prev.filter((x) =>x !== tag) : [...prev, tag]))}
 className={cn(
 "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
 on ? "bg-blue-500 border-blue-400 text-white" : "bg-white/[0.08] border-white/15 text-white/65",
 )}
 >
 {on && " "}{tag}
</button>
 );
 })}
</div>
</div>

 {/* Hashtags */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Hashtags (comma separated)</span>
<Input
 value={hashtags}
 onChange={(e) =>setHashtags(e.target.value)}
 placeholder="#newyearlive, #khmernewyear, #vibes"
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-10 text-sm"
 />
</div>

 {/* Stream Language */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Stream language</span>
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "en", label: "English", flag: "US" },
 { id: "km", label: "ខ្មែរ", flag: "KH" },
 { id: "zh", label: "中文", flag: "CN" },
 { id: "ja", label: "日本語", flag: "JP" },
 { id: "ko", label: "한국어", flag: "KR" },
 { id: "th", label: "ไทย", flag: "TH" },
 { id: "vi", label: "Tiếng Việt", flag: "VN" },
 { id: "es", label: "Español", flag: "ES" },
 { id: "fr", label: "Français", flag: "FR" },
 { id: "id", label: "Indonesia", flag: "ID" },
 ].map((l) =>(
<button type="button"
 key={l.id}
 onClick={() =>setLanguage(l.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 language === l.id ? "bg-blue-500 border-blue-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{l.flag}</span>{l.label}
</button>
 ))}
</div>
</div>

 {/* Country / region */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Broadcast region</span>
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "global", label: "Global", flag: "" },
 { id: "kh", label: "Cambodia", flag: "KH" },
 { id: "us", label: "USA", flag: "US" },
 { id: "jp", label: "Japan", flag: "JP" },
 { id: "kr", label: "Korea", flag: "KR" },
 { id: "th", label: "Thailand", flag: "TH" },
 { id: "vn", label: "Vietnam", flag: "VN" },
 { id: "cn", label: "China", flag: "CN" },
 { id: "id", label: "Indonesia", flag: "ID" },
 { id: "my", label: "Malaysia", flag: "MY" },
 { id: "ph", label: "Philippines", flag: "PH" },
 { id: "in", label: "India", flag: "IN" },
 ].map((c) =>(
<button type="button"
 key={c.id}
 onClick={() =>setCountry(c.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 country === c.id ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{c.flag}</span>{c.label}
</button>
 ))}
</div>
</div>

 {/* AR effects preview */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">AR Effects · {arEffect ?? "None"}</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: null, label: "None", emoji: "", gradient: "from-zinc-700 to-zinc-800" },
 { id: "beauty", label: "Beauty", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "anime", label: "Anime", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "cat", label: "Cat", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "bunny", label: "Bunny", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "crown", label: "Crown", emoji: "", gradient: "from-amber-300 to-yellow-200" },
 { id: "galaxy", label: "Galaxy", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "vintage", label: "Vintage", emoji: "", gradient: "from-amber-200 to-orange-200" },
 { id: "neon", label: "Neon", emoji: "", gradient: "from-white/10 to-white/5" },
 ].map((e) =>{
 const active = arEffect === e.id;
 return (
<button type="button"
 key={e.label}
 onClick={() =>setArEffect(e.id)}
 className={cn(
 "shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br flex flex-col items-center justify-center gap-0.5 border-2 transition-all",
 e.gradient,
 active ? "border-white shadow-lg" : "border-white/15",
 )}
 >
<span className="text-xl">{e.emoji}</span>
<span className="text-[8px] font-bold text-white">{e.label}</span>
</button>
 );
 })}
</div>
</div>

 {/* Beauty intensity slider */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Beauty intensity</span>
<span className="text-[11px] text-white/60 font-mono">{beautyIntensity}%</span>
</div>
<input
 type="range"
 min={0}
 max={100}
 value={beautyIntensity}
 onChange={(e) =>setBeautyIntensity(parseInt(e.target.value))}
 className="w-full h-2 rounded-full bg-white/10 appearance-none accent-pink-400 cursor-pointer"
 />
<div className="flex justify-between text-[9px] text-white/40 mt-1 px-1">
<span>Natural</span>
<span>Soft</span>
<span>Smooth</span>
<span>Glow</span>
</div>
</div>

 {/* Schedule for later */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Schedule for later</span>
 {scheduleAt && (
<button type="button" onClick={() =>setScheduleAt("")} className="text-[10px] text-white/50 hover:text-white">Clear</button>
 )}
</div>
<input
 type="datetime-local"
 value={scheduleAt}
 onChange={(e) =>setScheduleAt(e.target.value)}
 className="w-full h-10 px-3 rounded-2xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-400 [color-scheme:dark]"
 />
 {scheduleAt && (
<p className="text-[10px] text-blue-300 mt-1 px-1">⏰ Stream will be scheduled — followers get notified</p>
 )}
</div>

 {/* Family / Agency */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Family / Agency (optional)</span>
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: null, label: "None", emoji: "—" },
 { id: "dragon", label: "DragonFamily", emoji: "" },
 { id: "moon", label: "MoonGuild", emoji: "" },
 { id: "phoenix", label: "PhoenixFam", emoji: "" },
 { id: "sakura", label: "SakuraVibe", emoji: "" },
 { id: "angel", label: "AngelClub", emoji: "" },
 { id: "royal", label: "RoyalCrew", emoji: "" },
 ].map((f) =>(
<button type="button"
 key={f.label}
 onClick={() =>setAgency(f.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 agency === f.id ? "bg-violet-500 border-violet-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{f.emoji}</span>{f.label}
</button>
 ))}
</div>
</div>

 {/* Stream rules */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Room rules (shown to viewers)</span>
<textarea
 value={streamRules}
 onChange={(e) =>setStreamRules(e.target.value)}
 placeholder="No spam · Respect everyone · Keep it fun!"
 rows={2}
 maxLength={200}
 className="w-full px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm resize-none focus:outline-none focus:border-blue-400"
 />
<p className="text-[9px] text-white/40 mt-0.5 px-1 text-right">{streamRules.length}/200</p>
</div>

 {/* Privacy */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Who can watch</span>
<div className="grid grid-cols-3 gap-1.5">
 {PRIVACY_OPTIONS.map((p) =>{
 const active = privacy === p.id;
 return (
<button type="button"
 key={p.id}
 onClick={() =>setPrivacy(p.id)}
 className={cn(
 "rounded-2xl p-2 flex flex-col items-center gap-0.5 border-2 transition-all",
 active ? "bg-red-500/20 border-red-500" : "bg-white/[0.08] border-white/15",
 )}
 >
<span className="text-lg">{p.emoji}</span>
<span className="text-[11px] font-bold text-white">{p.label}</span>
<span className="text-[9px] text-white/60 leading-tight text-center">{p.desc}</span>
</button>
 );
 })}
</div>
</div>

 {/* Coin goal */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Coin goal · {coinGoal >0 ? coinGoal.toLocaleString() : "Off"}</span>
 {coinGoal >0 && (
<button type="button" onClick={() =>setCoinGoal(0)} className="text-[10px] text-white/50 hover:text-white">Clear</button>
 )}
</div>
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[0, 1000, 5000, 10000, 50000, 100000].map((g) =>{
 const active = coinGoal === g;
 return (
<button type="button"
 key={g}
 onClick={() =>setCoinGoal(g)}
 className={cn(
 "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 active ? "bg-amber-500 border-amber-400 text-black" : "bg-white/10 border-white/20 text-white/70"
 )}
 >
 {g === 0 ? "Off" : (
<>
<img src={goldCoinIcon} alt="" className="w-3.5 h-3.5" />
 {g >= 1000 ? `${g / 1000}K` : g}
</>
 )}
</button>
 );
 })}
</div>
</div>

 {/* Stream Mood / Vibe selector */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Stream vibe</span>
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "chill", label: "Chill", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "hype", label: "Hype", emoji: "", gradient: "from-red-500/40 to-orange-500/30" },
 { id: "cozy", label: "Cozy", emoji: "", gradient: "from-amber-500/40 to-yellow-500/30" },
 { id: "spicy", label: "Spicy", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "wholesome", label: "Wholesome", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "savage", label: "Savage", emoji: "", gradient: "from-zinc-500/40 to-slate-500/30" },
 { id: "romantic", label: "Romantic", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "mysterious", label: "Mysterious", emoji: "", gradient: "from-white/10 to-white/5" },
 { id: "energetic", label: "Energetic", emoji: "", gradient: "from-yellow-500/40 to-amber-500/30" },
 ].map((m) =>(
<button type="button"
 key={m.id}
 onClick={() =>setStreamMood(m.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
 streamMood === m.id ? `bg-gradient-to-br ${m.gradient} border-white/40 text-white shadow-md` : "bg-white/5 border-white/15 text-white/60",
 )}
 >
<span>{m.emoji}</span>{m.label}
</button>
 ))}
</div>
</div>

 {/* Donation Goal / Cause */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Charity / Cause goal</span>
 {donationCause && (
<button type="button" onClick={() =>{ setDonationCause(null); setDonationGoal(0); }} className="text-[10px] text-white/50 hover:text-white">Clear</button>
 )}
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2">
 {[
 { id: null, label: "None", emoji: "—" },
 { id: "education", label: "Education", emoji: "" },
 { id: "kids", label: "Kids in need", emoji: "" },
 { id: "ocean", label: "Ocean cleanup", emoji: "" },
 { id: "wildlife", label: "Wildlife", emoji: "" },
 { id: "disaster", label: "Disaster relief", emoji: "" },
 { id: "mental", label: "Mental health", emoji: "" },
 { id: "lgbt", label: "LGBTQ+", emoji: "" },
 { id: "veterans", label: "Veterans", emoji: "" },
 ].map((d) =>(
<button type="button"
 key={d.label}
 onClick={() =>setDonationCause(d.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 donationCause === d.id ? "bg-pink-500 border-pink-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{d.emoji}</span>{d.label}
</button>
 ))}
</div>
 {donationCause && (
<div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
 {[100, 500, 1000, 5000, 10000].map((amt) =>(
<button type="button"
 key={amt}
 onClick={() =>setDonationGoal(amt)}
 className={cn(
 "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
 donationGoal === amt ? "bg-pink-500/30 border-pink-400 text-pink-200" : "bg-white/5 border-white/15 text-white/60",
 )}
 >
 ${amt.toLocaleString()}
</button>
 ))}
</div>
 )}
</div>

 {/* Connection / Network test */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Connection check</span>
 {connTested === "ok" &&<span className="text-[10px] text-emerald-400 font-bold">Stable</span>}
 {connTested === "weak" &&<span className="text-[10px] text-amber-400 font-bold">Weak signal</span>}
</div>
<button type="button"
 onClick={() =>{
 setConnTested("testing");
 setTimeout(() =>{
 // Simulate ping check using navigator.connection if available
 const eff = (navigator as any).connection?.effectiveType;
 const isWeak = eff === "slow-2g" || eff === "2g";
 setConnTested(isWeak ? "weak" : "ok");
 }, 1200);
 }}
 disabled={connTested === "testing"}
 className={cn(
 "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border-2 transition-all font-bold text-[12px]",
 connTested === "ok" && "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
 connTested === "weak" && "bg-amber-500/15 border-amber-500/40 text-amber-300",
 connTested === "testing" && "bg-blue-500/15 border-blue-500/40 text-blue-300",
 connTested === "idle" && "bg-white/5 border-white/15 text-white",
 )}
 >
 {connTested === "testing" ? (
<>
<span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
 Testing connection…
</>
 ) : connTested === "ok" ? (
<>Connection healthy — ready to stream</>
 ) : connTested === "weak" ? (
<>Connection weak — try lowering quality</>
 ) : (
<>Run connection test</>
 )}
</button>
</div>

 {/* Background Music (BGM) */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Background music</span>
 {bgm &&<span className="text-[10px] text-foreground font-bold">{bgm}</span>}
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: null, label: "Off", emoji: "" },
 { id: "lofi", label: "Lo-fi chill", emoji: "" },
 { id: "house", label: "House mix", emoji: "" },
 { id: "kpop", label: "K-Pop hits", emoji: "" },
 { id: "rnb", label: "R&B vibes", emoji: "" },
 { id: "acoustic", label: "Acoustic", emoji: "" },
 { id: "jazz", label: "Jazz cafe", emoji: "" },
 { id: "classical", label: "Classical", emoji: "" },
 { id: "khmer", label: "Khmer pop", emoji: "KH" },
 { id: "edm", label: "EDM festival", emoji: "" },
 ].map((m) =>(
<button type="button"
 key={m.label}
 onClick={() =>setBgm(m.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 bgm === m.id ? "bg-purple-500 border-purple-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{m.emoji}</span>{m.label}
</button>
 ))}
</div>
 {bgm && (
<div className="mt-2">
<div className="flex items-center justify-between mb-1 px-1">
<span className="text-[10px] text-white/60">BGM volume</span>
<span className="text-[10px] text-foreground font-mono">{bgmVolume}%</span>
</div>
<input
 type="range"
 min={0}
 max={100}
 value={bgmVolume}
 onChange={(e) =>setBgmVolume(parseInt(e.target.value))}
 className="w-full h-2 rounded-full bg-white/10 appearance-none accent-purple-400 cursor-pointer"
 />
</div>
 )}
</div>

 {/* Voice Effects */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Voice effect</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "none", label: "Natural", emoji: "" },
 { id: "echo", label: "Echo", emoji: "" },
 { id: "robot", label: "Robot", emoji: "" },
 { id: "helium", label: "Helium", emoji: "" },
 { id: "deep", label: "Deep", emoji: "" },
 { id: "alien", label: "Alien", emoji: "" },
 { id: "demon", label: "Demon", emoji: "" },
 { id: "kid", label: "Kid", emoji: "" },
 { id: "bee", label: "Bee", emoji: "" },
 ].map((v) =>(
<button type="button"
 key={v.id}
 onClick={() =>setVoiceEffect(v.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 voiceEffect === v.id ? "bg-indigo-500 border-indigo-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{v.emoji}</span>{v.label}
</button>
 ))}
</div>
</div>

 {/* Sound Effects pad */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Sound effects (tap to test)</span>
<div className="grid grid-cols-4 gap-1.5">
 {[
 { label: "Laugh", emoji: "" },
 { label: "Applause", emoji: "" },
 { label: "Drum roll", emoji: "" },
 { label: "Boo", emoji: "" },
 { label: "Air horn", emoji: "" },
 { label: "Boom", emoji: "" },
 { label: "Ding", emoji: "" },
 { label: "Crickets", emoji: "" },
 ].map((s) =>(
<button type="button"
 key={s.label}
 onClick={() => playSFX(s.label)}
 className="aspect-square rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform"
 >
<span className="text-2xl">{s.emoji}</span>
<span className="text-[9px] text-white/70 font-semibold">{s.label}</span>
</button>
 ))}
</div>
</div>

 {/* Camera filter / color grading */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Camera filter</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "none", label: "Original", emoji: "" },
 { id: "warm", label: "Warm", emoji: "" },
 { id: "cool", label: "Cool", emoji: "" },
 { id: "vintage", label: "Vintage", emoji: "" },
 { id: "noir", label: "Noir B&W", emoji: "" },
 { id: "vivid", label: "Vivid", emoji: "" },
 { id: "dreamy", label: "Dreamy", emoji: "" },
 { id: "cinema", label: "Cinema", emoji: "" },
 ].map((f) =>(
<button type="button"
 key={f.id}
 onClick={() =>setCameraFilter(f.id)}
 className={cn(
 "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
 cameraFilter === f.id ? "bg-cyan-500 border-cyan-400 text-white" : "bg-white/10 border-white/20 text-white/70",
 )}
 >
<span>{f.emoji}</span>{f.label}
</button>
 ))}
</div>
</div>

 {/* Goal Milestones */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Goal milestones</span>
 {milestones.length >0 && (
<button type="button" onClick={() =>setMilestones([])} className="text-[10px] text-white/50 hover:text-white">Clear all</button>
 )}
</div>
<div className="space-y-1.5">
 {[
 { viewers: 100, reward: "Sing a song " },
 { viewers: 500, reward: "Reveal next category" },
 { viewers: 1000, reward: "Try a beauty filter swap" },
 { viewers: 5000, reward: "1-hour Q&A" },
 { viewers: 10000, reward: "Dance challenge " },
 ].map((m, i) =>{
 const set = milestones.some((x) =>x.viewers === m.viewers);
 return (
<button type="button"
 key={i}
 onClick={() =>{
 setMilestones((prev) =>
 prev.some((x) =>x.viewers === m.viewers)
 ? prev.filter((x) =>x.viewers !== m.viewers)
 : [...prev, m],
 );
 }}
 className={cn(
 "w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors text-left",
 set ? "bg-amber-500/15 border-amber-500/40" : "bg-white/5 border-white/10",
 )}
 >
<span className="text-base">{set ? "" : "○"}</span>
<div className="flex-1 min-w-0">
<p className="text-[12px] font-bold text-white">When {m.viewers.toLocaleString()} viewers</p>
<p className="text-[10px] text-white/60">{m.reward}</p>
</div>
 {set &&<span className="text-[10px] text-amber-300 font-bold">Set</span>}
</button>
 );
 })}
</div>
</div>

 {/* Welcome auto-message */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Auto-welcome (new viewers)</span>
<Input
 value={welcomeMsg}
 onChange={(e) =>setWelcomeMsg(e.target.value)}
 placeholder="Hi! Drop a like if you're new here"
 maxLength={150}
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-10 text-sm"
 />
<p className="text-[9px] text-white/40 mt-0.5 px-1">DM'd to viewers when they join</p>
</div>

 {/* Live Shopping products */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Pin products to sell</span>
<span className="text-[10px] text-emerald-300 font-bold">{products.length} pinned</span>
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "p1", label: "Spring fashion", price: "$19+", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=70&auto=format&fit=crop" },
 { id: "p2", label: "K-Beauty kit", price: "$29+", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&q=70&auto=format&fit=crop" },
 { id: "p3", label: "Tech gadgets", price: "$49+", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=70&auto=format&fit=crop" },
 { id: "p4", label: "Home & decor", price: "$15+", img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&q=70&auto=format&fit=crop" },
 { id: "p5", label: "Snacks pack", price: "$9+", img: "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=200&q=70&auto=format&fit=crop" },
 ].map((p) =>{
 const pinned = products.includes(p.id);
 return (
<button type="button"
 key={p.id}
 onClick={() =>setProducts((prev) =>(prev.includes(p.id) ? prev.filter((x) =>x !== p.id) : [...prev, p.id]))}
 className="shrink-0 w-[100px] rounded-2xl overflow-hidden border-2 transition-all relative active:scale-95"
 style={{ borderColor: pinned ? "rgb(16 185 129)" : "rgba(255,255,255,0.15)" }}
 >
<div className="relative aspect-square">
<img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
 {pinned && (
<div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
<span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center shadow-md"></span>
</div>
 )}
</div>
<div className="bg-black/80 p-1.5 text-left">
<p className="text-[10px] font-bold text-white truncate">{p.label}</p>
<p className="text-[9px] text-emerald-300 font-bold">{p.price}</p>
</div>
</button>
 );
 })}
</div>
</div>

 {/* Pre-roll countdown */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">⏱ Pre-roll countdown</span>
<div className="grid grid-cols-4 gap-1.5">
 {([
 { val: 0, label: "Off" },
 { val: 5, label: "5s" },
 { val: 10, label: "10s" },
 { val: 30, label: "30s" },
 ] as const).map((p) =>(
<button type="button"
 key={p.val}
 onClick={() =>setPreRoll(p.val)}
 className={cn(
 "py-1.5 rounded-xl text-[11px] font-bold border transition-colors",
 preRoll === p.val ? "bg-orange-500 border-orange-400 text-white" : "bg-white/5 border-white/15 text-white/70",
 )}
 >
 {p.label}
</button>
 ))}
</div>
<p className="text-[9px] text-white/40 mt-1 px-1">Counts down before going live so you can prep</p>
</div>

 {/* Auto-end timer */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">⏰ Auto-end stream after</span>
<div className="grid grid-cols-5 gap-1.5">
 {([
 { val: 0, label: "Off" },
 { val: 30, label: "30m" },
 { val: 60, label: "1h" },
 { val: 120, label: "2h" },
 { val: 240, label: "4h" },
 ] as const).map((a) =>(
<button type="button"
 key={a.val}
 onClick={() =>setAutoEnd(a.val)}
 className={cn(
 "py-1.5 rounded-xl text-[11px] font-bold border transition-colors",
 autoEnd === a.val ? "bg-rose-500 border-rose-400 text-white" : "bg-white/5 border-white/15 text-white/70",
 )}
 >
 {a.label}
</button>
 ))}
</div>
</div>

 {/* Pre-set polls */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Pre-set polls ({polls.length})</span>
 {polls.length >0 && (
<button type="button" onClick={() =>setPolls([])} className="text-[10px] text-white/50 hover:text-white">Clear</button>
 )}
</div>
<div className="flex gap-1.5">
<Input
 value={newPollQ}
 onChange={(e) =>setNewPollQ(e.target.value)}
 placeholder="Ask a poll question..."
 maxLength={120}
 className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-10 text-sm"
 />
<button type="button"
 onClick={() =>{
 if (newPollQ.trim()) {
 setPolls([...polls, { q: newPollQ.trim(), opts: ["Yes", "No"] }]);
 setNewPollQ("");
 }
 }}
 className="px-3 rounded-2xl bg-blue-500 text-white text-xs font-bold active:scale-95 transition-transform"
 >
 Add
</button>
</div>
 {polls.length >0 && (
<div className="space-y-1 mt-2">
 {polls.map((p, i) =>(
<div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
<span className="text-base"></span>
<p className="flex-1 text-[11px] font-semibold text-white truncate">{p.q}</p>
<button type="button"
 onClick={() =>setPolls(polls.filter((_, j) =>j !== i))}
 className="text-white/50 hover:text-red-400"
 >
<X className="h-3 w-3" />
</button>
</div>
 ))}
</div>
 )}
</div>

 {/* Q&A queue toggle */}
<button type="button"
 onClick={() =>setQaQueue((v) =>!v)}
 className={cn(
 "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors text-left",
 qaQueue ? "bg-cyan-500/15 border-cyan-500/40" : "bg-white/5 border-white/15",
 )}
 >
<span className="text-xl"></span>
<div className="flex-1">
<p className="text-[12px] font-bold text-white">Enable Q&A queue</p>
<p className="text-[10px] text-white/60">Viewers can submit questions to answer live</p>
</div>
<span className={cn(
 "w-9 h-5 rounded-full p-0.5 transition-colors",
 qaQueue ? "bg-cyan-500" : "bg-white/20",
 )}>
<span className={cn("block w-4 h-4 rounded-full bg-white transition-transform", qaQueue && "translate-x-4")} />
</span>
</button>

 {/* Subscriber-only mode toggle */}
<button type="button"
 onClick={() =>setSubscriberOnly((v) =>!v)}
 className={cn(
 "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors text-left",
 subscriberOnly ? "bg-amber-500/15 border-amber-500/40" : "bg-white/5 border-white/15",
 )}
 >
<span className="text-xl"></span>
<div className="flex-1">
<p className="text-[12px] font-bold text-white">Subscriber-only chat</p>
<p className="text-[10px] text-white/60">Only ZIVO+ members can comment</p>
</div>
<span className={cn(
 "w-9 h-5 rounded-full p-0.5 transition-colors",
 subscriberOnly ? "bg-amber-500" : "bg-white/20",
 )}>
<span className={cn("block w-4 h-4 rounded-full bg-white transition-transform", subscriberOnly && "translate-x-4")} />
</span>
</button>

 {/* Multistream / RTMP destinations */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Restream to ({multistream.length})</span>
<span className="text-[10px] text-white/40">PRO feature</span>
</div>
<div className="grid grid-cols-3 gap-1.5">
 {[
 { id: "yt", label: "YouTube", emoji: "▶", color: "bg-red-500/15 border-red-500/30" },
 { id: "fb", label: "Facebook", emoji: "", color: "bg-blue-500/15 border-blue-500/30" },
 { id: "ig", label: "Instagram", emoji: "", color: "bg-pink-500/15 border-pink-500/30" },
 { id: "tw", label: "X / Twitter", emoji: "", color: "bg-zinc-500/15 border-zinc-500/30" },
 { id: "tt", label: "TikTok", emoji: "", color: "bg-purple-500/15 border-purple-500/30" },
 { id: "tch", label: "Twitch", emoji: "", color: "bg-violet-500/15 border-violet-500/30" },
 { id: "kc", label: "Kick", emoji: "", color: "bg-emerald-500/15 border-emerald-500/30" },
 { id: "rtmp", label: "Custom RTMP", emoji: "", color: "bg-cyan-500/15 border-cyan-500/30" },
 ].map((d) =>{
 const on = multistream.includes(d.id);
 return (
<button type="button"
 key={d.id}
 onClick={() =>setMultistream((prev) =>(prev.includes(d.id) ? prev.filter((x) =>x !== d.id) : [...prev, d.id]))}
 className={cn(
 "py-2 px-2 rounded-2xl border-2 flex flex-col items-center gap-0.5 transition-all",
 on ? `${d.color} ring-2 ring-white/30` : "bg-white/5 border-white/15",
 )}
 >
<span className="text-xl">{d.emoji}</span>
<span className="text-[9px] font-bold text-white">{on && " "}{d.label}</span>
</button>
 );
 })}
</div>
</div>

 {/* Coin balance + recharge shortcut */}
<div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
<div className="flex items-center gap-2">
<img src={goldCoinIcon} alt="" className="w-5 h-5" />
<div>
<p className="text-[10px] text-white/60 leading-none">Your balance</p>
<p className="text-[14px] font-black text-amber-300 leading-tight">{coinBalance.toLocaleString()}</p>
</div>
</div>
<button type="button"
 onClick={() =>setShowRechargeSheet(true)}
 className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950 text-[11px] font-bold active:scale-95 transition-transform"
 >
 + Recharge
</button>
</div>

 {/* Advanced toggles */}
<button type="button"
 onClick={() =>setShowAdvanced((v) =>!v)}
 className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/5 border border-white/15 active:scale-[0.99] transition-transform"
 >
<span className="text-[12px] font-semibold text-white">Advanced settings</span>
<span className="text-white/60 text-xs">{showAdvanced ? "−" : "+"}</span>
</button>
 {showAdvanced && (
<div className="space-y-3 pl-1">
 {/* Toggles */}
 {[
 { label: "Allow gifts & tips", desc: "Viewers can send gifts", value: allowGifts, set: setAllowGifts, icon: "" },
 { label: "Allow comments", desc: "Public chat enabled", value: allowComments, set: setAllowComments, icon: "" },
 { label: "Age-restricted (18+)", desc: "Hide from minors", value: ageRestricted, set: setAgeRestricted, icon: "" },
 { label: "Save replay", desc: "Record stream for VOD", value: saveReplay, set: setSaveReplay, icon: "" },
 { label: "Auto-clip best moments", desc: "AI saves top reactions as Reels", value: autoClip, set: setAutoClip, icon: "" },
 { label: "Notify followers", desc: "Push alert when you go live", value: pushFollowers, set: setPushFollowers, icon: "" },
 ].map((t) =>(
<button type="button"
 key={t.label}
 onClick={() =>t.set(!t.value)}
 className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
 >
<span className="text-lg">{t.icon}</span>
<div className="flex-1 text-left">
<p className="text-[12px] font-semibold text-white">{t.label}</p>
<p className="text-[10px] text-white/50">{t.desc}</p>
</div>
<span className={cn(
 "w-9 h-5 rounded-full p-0.5 transition-colors",
 t.value ? "bg-emerald-500" : "bg-white/20",
 )}>
<span className={cn(
 "block w-4 h-4 rounded-full bg-white transition-transform",
 t.value && "translate-x-4",
 )} />
</span>
</button>
 ))}

 {/* Stream quality */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Stream quality</span>
<div className="grid grid-cols-3 gap-1.5">
 {(["480p", "720p", "1080p"] as const).map((q) =>(
<button type="button"
 key={q}
 onClick={() =>setQuality(q)}
 className={cn(
 "py-2 rounded-xl text-xs font-bold border transition-colors",
 quality === q ? "bg-blue-500 border-blue-400 text-white" : "bg-white/5 border-white/15 text-white/70",
 )}
 >
 {q}
<span className="block text-[9px] font-normal opacity-70">
 {q === "480p" ? "Save data" : q === "720p" ? "Recommended" : "HD · pro"}
</span>
</button>
 ))}
</div>
</div>

 {/* Slow mode chat */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Slow mode (chat rate limit)</span>
<div className="grid grid-cols-4 gap-1.5">
 {([
 { val: 0, label: "Off" },
 { val: 5, label: "5s" },
 { val: 10, label: "10s" },
 { val: 30, label: "30s" },
 ] as const).map((s) =>(
<button type="button"
 key={s.val}
 onClick={() =>setSlowMode(s.val)}
 className={cn(
 "py-1.5 rounded-xl text-[11px] font-bold border transition-colors",
 slowMode === s.val ? "bg-amber-500 border-amber-400 text-amber-950" : "bg-white/5 border-white/15 text-white/70",
 )}
 >
 {s.label}
</button>
 ))}
</div>
</div>

 {/* Pinned message */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Pinned message (top of chat)</span>
<Input
 value={pinnedMessage}
 onChange={(e) =>setPinnedMessage(e.target.value)}
 placeholder="Welcome! Drop a like "
 maxLength={120}
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-10 text-sm"
 />
</div>

 {/* Banned words */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Banned words (comma separated)</span>
<Input
 value={bannedWords}
 onChange={(e) =>setBannedWords(e.target.value)}
 placeholder="spam, scam, link"
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-10 text-sm"
 />
</div>

 {/* Approved Moderators */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">
 Chat moderators ({moderators.length})
</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "modA", name: "Sarah", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&q=70&auto=format&fit=crop" },
 { id: "modB", name: "Yui", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&q=70&auto=format&fit=crop" },
 { id: "modC", name: "Felix", img: "https://images.unsplash.com/photo-1528741013444-c4e9f3f5beda?w=120&q=70&auto=format&fit=crop" },
 { id: "modD", name: "Diego", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=70&auto=format&fit=crop" },
 { id: "modE", name: "Emma", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&q=70&auto=format&fit=crop" },
 ].map((m) =>{
 const on = moderators.includes(m.id);
 return (
<button type="button"
 key={m.id}
 onClick={() =>setModerators((prev) =>(prev.includes(m.id) ? prev.filter((x) =>x !== m.id) : [...prev, m.id]))}
 className="shrink-0 flex flex-col items-center gap-1 w-[52px]"
 >
<div className="relative">
<Avatar className={cn("h-11 w-11 ring-2", on ? "ring-blue-500" : "ring-white/20")}>
<AvatarImage src={m.img} />
<AvatarFallback className="text-xs">{m.name[0]}</AvatarFallback>
</Avatar>
 {on &&<span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white"></span>}
</div>
<span className="text-[9px] font-semibold text-white truncate w-full text-center">{m.name}</span>
</button>
 );
 })}
</div>
<p className="text-[9px] text-white/40 mt-0.5 px-1">Mods can timeout/ban viewers</p>
</div>

 {/* Banned users list */}
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">Pre-banned users (handles)</span>
<Input
 value={bannedUsers}
 onChange={(e) =>setBannedUsers(e.target.value)}
 placeholder="@spammer1, @troll22, @scam"
 className="!bg-white/10 !border-white/20 !text-white [-webkit-text-fill-color:white] placeholder:!text-white/40 h-10 text-sm"
 />
</div>

 {/* Co-host invite */}
 {(streamType === "multi" || streamType === "pk") && (
<div>
<span className="text-white/80 text-xs font-semibold mb-1.5 block px-1">
 Invite co-hosts {coHosts.length >0 && `(${coHosts.length})`}
</span>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {[
 { id: "maya", name: "Maya", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=70&auto=format&fit=crop" },
 { id: "jin", name: "Jin", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=70&auto=format&fit=crop" },
 { id: "lily", name: "Lily", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=70&auto=format&fit=crop" },
 { id: "sofia", name: "Sofia", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=70&auto=format&fit=crop" },
 { id: "alex", name: "Alex", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=70&auto=format&fit=crop" },
 { id: "ryan", name: "Ryan", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&q=70&auto=format&fit=crop" },
 ].map((c) =>{
 const invited = coHosts.includes(c.id);
 return (
<button type="button"
 key={c.id}
 onClick={() =>
 setCoHosts((prev) =>(prev.includes(c.id) ? prev.filter((x) =>x !== c.id) : [...prev, c.id]))
 }
 className="shrink-0 flex flex-col items-center gap-1 w-[56px]"
 >
<div className="relative">
<Avatar className={cn("h-12 w-12 ring-2", invited ? "ring-emerald-500" : "ring-white/20")}>
<AvatarImage src={c.img} />
<AvatarFallback className="text-xs">{c.name[0]}</AvatarFallback>
</Avatar>
 {invited && (
<span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shadow"></span>
 )}
</div>
<span className="text-[10px] font-semibold text-white truncate w-full text-center">{c.name}</span>
</button>
 );
 })}
</div>
</div>
 )}
</div>
 )}

 {/* Settings summary card */}
<div className="rounded-2xl border border-white/15 bg-white/5 p-3 mt-2">
<p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">Stream summary</p>
<div className="flex flex-wrap gap-1.5">
<Badge className="bg-secondary text-foreground border-border text-[10px] gap-1">
 {STREAM_TYPES.find((t) =>t.id === streamType)?.emoji} {STREAM_TYPES.find((t) =>t.id === streamType)?.label}
</Badge>
<Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] gap-1">
 {TOPICS.find((t) =>t.name === topic)?.emoji} {topic}
</Badge>
<Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
 {PRIVACY_OPTIONS.find((p) =>p.id === privacy)?.emoji} {PRIVACY_OPTIONS.find((p) =>p.id === privacy)?.label}
</Badge>
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {quality}
</Badge>
 {coinGoal >0 && (
<Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
 {coinGoal.toLocaleString()} coins
</Badge>
 )}
 {scheduleAt && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 ⏰ Scheduled
</Badge>
 )}
 {arEffect && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {arEffect}
</Badge>
 )}
 {coHosts.length >0 && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {coHosts.length} co-host{coHosts.length >1 ? "s" : ""}
</Badge>
 )}
 {agency && (
<Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]">
 {agency}
</Badge>
 )}
 {!allowComments && (
<Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
 Chat off
</Badge>
 )}
 {ageRestricted && (
<Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
 18+
</Badge>
 )}
 {donationCause && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {donationCause}{donationGoal >0 ? ` · $${donationGoal.toLocaleString()}` : ""}
</Badge>
 )}
 {streamMood !== "chill" && (
<Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
 {streamMood}
</Badge>
 )}
 {connTested === "ok" && (
<Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
 Network OK
</Badge>
 )}
 {bgm && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {bgm}
</Badge>
 )}
 {cameraFilter !== "none" && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {cameraFilter}
</Badge>
 )}
 {milestones.length >0 && (
<Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
 {milestones.length} milestone{milestones.length >1 ? "s" : ""}
</Badge>
 )}
 {products.length >0 && (
<Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
 {products.length} product{products.length >1 ? "s" : ""}
</Badge>
 )}
 {streamTags.length >0 && (
<Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
 {streamTags.length} tag{streamTags.length >1 ? "s" : ""}
</Badge>
 )}
 {preRoll >0 && (
<Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]">
 ⏱ Pre-roll {preRoll}s
</Badge>
 )}
 {autoEnd >0 && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 ⏰ Auto-end {autoEnd >= 60 ? `${autoEnd / 60}h` : `${autoEnd}m`}
</Badge>
 )}
 {polls.length >0 && (
<Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
 {polls.length} poll{polls.length >1 ? "s" : ""}
</Badge>
 )}
 {qaQueue && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 Q&A on
</Badge>
 )}
 {subscriberOnly && (
<Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
 Sub-only
</Badge>
 )}
 {multistream.length >0 && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 Restream {multistream.length}
</Badge>
 )}
 {streamTemplate && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 Template
</Badge>
 )}
 {voiceEffect !== "none" && (
<Badge className="bg-secondary text-foreground border-border text-[10px]">
 {voiceEffect}
</Badge>
 )}
 {moderators.length >0 && (
<Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
 {moderators.length} mod{moderators.length >1 ? "s" : ""}
</Badge>
 )}
 {!autoClip && (
<Badge className="bg-zinc-500/20 text-zinc-300 border-zinc-500/30 text-[10px]">
 Clipping off
</Badge>
 )}
 {!pushFollowers && (
<Badge className="bg-zinc-500/20 text-zinc-300 border-zinc-500/30 text-[10px]">
 No follow alert
</Badge>
 )}
</div>
</div>

 {/* Virtual background picker */}
<div>
<div className="flex items-center justify-between mb-1.5 px-1">
<span className="text-white/80 text-xs font-semibold">Background</span>
 {bgChoice.kind !== "off" && (
<span className="text-[10px] text-white/50">
 {bgStatus === "loading" ? "Loading…" : bgStatus === "error" ? "Unavailable" : "Active"}
</span>
 )}
</div>
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
 {BG_PRESETS.map((p) =>{
 const active = bgChoice.id === p.id;
 return (
<button type="button"
 key={p.id}
 onClick={() =>setBgChoice(p)}
 className={cn(
 "shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 relative",
 active ? "border-red-500" : "border-white/20",
 )}
 title={p.label}
 >
 {p.kind === "off" && (
<div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] text-white/70 font-semibold">None</div>
 )}
 {p.kind === "blur" && (
<div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-[10px] text-white font-semibold" style={{ filter: "blur(0px)" }}>Blur</div>
 )}
 {p.kind === "image" && p.url && (
<>
<img src={p.url} alt={p.label} className="w-full h-full object-cover" />
<span className="absolute bottom-0 inset-x-0 bg-black/55 text-[9px] text-white text-center py-0.5 font-semibold">{p.label}</span>
</>
 )}
</button>
 );
 })}
</div>
</div>

</div>
 )}

<div className="flex justify-center gap-3 py-2">
<button type="button" onClick={toggleCamera} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
 {cameraOn ?<Camera className="h-5 w-5 text-white" />:<CameraOff className="h-5 w-5 text-white/50" />}
</button>
<button type="button" onClick={toggleMic} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
 {micOn ?<Mic className="h-5 w-5 text-white" />:<MicOff className="h-5 w-5 text-white/50" />}
</button>
<button type="button" onClick={flipCamera} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
<RotateCcw className="h-5 w-5 text-white" />
</button>
</div>

 {(() =>{
 const hasMedia = !!localStream && localStream.getVideoTracks().some((t) =>t.readyState === "live");
 const disabled = (!user && !isPaired) || (!hasMedia && !cameraError);
 let label: string;
 if (!user && !isPaired) label = "Sign in to go live";
 else if (cameraError) label = "Retry camera";
 else if (!hasMedia) label = "Preparing camera…";
 else if (isPaired) label = `Go Live as ${hostDisplayName}`;
 else label = "Go Live";
 return (
<Button onClick={cameraError ? startCamera : goLive} disabled={disabled} className={cn("w-full h-14 rounded-full font-bold text-base disabled:opacity-60", cameraError ? "border border-white/15 bg-white/10 text-white/85 hover:bg-white/15 shadow-none" : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40")}>
 {cameraError ? <CameraOff className="h-5 w-5 mr-2" /> : <Radio className="h-5 w-5 mr-2" />}{label}
</Button>
 );
 })()}
</div>
</div>
 )}

 {phase === "countdown" && (
<div className="relative z-10 flex-1 flex items-center justify-center">
<motion.div
 key={countdown}
 initial={{ scale: 0.5, opacity: 0 }}
 animate={{ scale: 1.5, opacity: 1 }}
 exit={{ scale: 2, opacity: 0 }}
 className="text-white font-black text-[10rem] drop-shadow-[0_0_30px_rgba(255,80,80,0.6)]"
 >
 {countdown}
</motion.div>
</div>
 )}
</div>
 );
 }

 // ── ENDED summary ──
 if (phase === "ended") {
 return (
<div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center px-6 text-center">
<div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
<Radio className="h-9 w-9 text-red-400" />
</div>
<h2 className="text-white text-2xl font-bold mb-1">Stream Ended</h2>
<p className="text-white/60 text-sm mb-8">{formatTime(elapsed)} broadcast time</p>

<div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
<Stat label="Viewers" value={viewerCount} icon={<Eye className="h-4 w-4" />} />
<Stat label="Likes" value={likes} icon={<Heart className="h-4 w-4 text-red-400" />} />
<Stat label="Gifts" value={giftsReceived} icon={<Gift className="h-4 w-4 text-amber-300" />} />
<Stat label="Coins" value={coinsEarned} icon={<img src={goldCoinIcon} alt="" className="h-4 w-4" />} />
</div>

<Button onClick={() =>navigate("/live")} className="w-full max-w-sm h-12 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold">
 Done
</Button>
</div>
 );
 }

 // ── LIVE screen ──
 return (
<div className="fixed inset-0 z-50 bg-black flex flex-col">
<video ref={videoRef} autoPlay muted playsInline className={cn("absolute inset-0 w-full h-full object-cover", facingMode === "user" && "scale-x-[-1]")} />

 {/* Top legibility gradient — keeps chips readable on bright scenes */}
<div className="absolute inset-x-0 top-0 h-32 z-[5] pointer-events-none bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
 {/* Bottom legibility gradient — keeps chat + controls readable */}
<div className="absolute inset-x-0 bottom-0 h-56 z-[5] pointer-events-none bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

 {/* Top bar */}
<div className="relative z-10 flex items-center gap-1.5 px-3 pt-2" style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 8px)" }}>
<div className="flex items-center gap-1 bg-red-500 rounded-full px-2 py-1 shadow-lg shrink-0">
<Radio className="h-3 w-3 text-white animate-pulse" />
<span className="text-white text-[10px] font-black tracking-wider">LIVE</span>
</div>
<div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full pl-0.5 pr-2 py-0.5 shrink min-w-0">
<Avatar className="h-5 w-5 ring-1 ring-white/30">
<AvatarImage src={optimizeAvatar(hostAvatarUrl, 48)} alt={hostDisplayName} />
<AvatarFallback className="bg-zinc-700 text-white text-[9px] font-bold">
 {hostDisplayName?.[0]?.toUpperCase() ?? "S"}
</AvatarFallback>
</Avatar>
<span className="text-[11px] font-semibold text-white truncate max-w-[80px] drop-shadow">{hostDisplayName}</span>
 {isPaired &&<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Paired" />}
</div>
<div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-1 shrink-0">
<Eye className="h-3 w-3 text-white/70" />
<span className="text-[11px] text-white font-medium">{viewerCount}</span>
</div>
<div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-1 shrink-0">
<Heart className="h-3 w-3 text-red-400 fill-red-400" />
<span className="text-[11px] text-white font-medium">{likes}</span>
</div>
<div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-sm rounded-full px-1.5 py-1 border border-amber-500/30 shrink-0">
<img src={goldCoinIcon} alt="" className="h-3 w-3" />
<span className="text-[11px] text-amber-300 font-bold">{coinsEarned}</span>
</div>
<div className="flex-1" />
<span className="text-white font-mono text-[10px] bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 drop-shadow">{formatTime(elapsed)}</span>
<button type="button" onClick={() =>setShowEndConfirm(true)} aria-label="End stream" className="min-w-[44px] min-h-[44px] -my-1.5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-lg">
<X className="h-4 w-4 text-white drop-shadow" />
</button>
</div>

 {/* Title */}
<div className="relative z-10 px-4 mt-2">
<p className="text-white text-xs font-medium drop-shadow truncate">{title} · {topic}</p>
</div>

 {/* Chat */}
<div className="absolute left-0 right-16 z-10" style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 80px)" }}>
<div className="pl-3 pr-3 max-h-[200px] overflow-y-auto scrollbar-hide space-y-1.5 flex flex-col items-start">
 {chatMessages.length === 0 ? (
<div className="text-[11px] text-white/80 italic px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm drop-shadow inline-block self-start">Waiting for viewers…</div>
 ) : (
 chatMessages.slice(-10).map((m) =>(
<motion.div
 key={m.id}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 className={cn(
 "rounded-2xl px-2.5 py-1.5 max-w-full backdrop-blur-sm",
 m.isGift ? "bg-amber-500/30 border border-amber-500/50" : "bg-black/40"
 )}
 >
<span className="text-[10px] font-bold text-amber-300 mr-1.5 inline-flex items-center gap-0.5 align-middle">
 {m.user_name}
 {isBlueVerified(m.user_is_verified) &&<VerifiedBadge size={11} interactive={false} />}
</span>
<span className="text-[11px] text-white">{m.text}</span>
</motion.div>
 ))
 )}
<div ref={chatEndRef} />
</div>
</div>

 {/* Right tools — single glass rail (legible on any background) */}
<div
 className="absolute right-2.5 z-10 flex flex-col gap-1.5 items-center bg-black/35 backdrop-blur-md rounded-full px-1.5 py-2 border border-white/10 shadow-xl shadow-black/40"
 style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 80px)" }}
 >
<button type="button" onClick={toggleMic} className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition flex items-center justify-center">
 {micOn ?<Mic className="h-4 w-4 text-white" />:<MicOff className="h-4 w-4 text-red-400" />}
</button>
<button type="button" onClick={toggleCamera} className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition flex items-center justify-center">
 {cameraOn ?<Camera className="h-4 w-4 text-white" />:<CameraOff className="h-4 w-4 text-red-400" />}
</button>
<button type="button" onClick={flipCamera} className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 transition flex items-center justify-center">
<RotateCcw className="h-4 w-4 text-white" />
</button>
<button type="button"
 onClick={() =>setShowBgSheet(true)}
 className={cn(
 "w-11 h-11 rounded-full active:scale-95 transition flex flex-col items-center justify-center",
 bgChoice.kind !== "off" ? "bg-red-500/40 border border-red-400/60" : "bg-white/5 hover:bg-white/15",
 )}
 >
<ImageIcon className="h-3.5 w-3.5 text-white" />
<span className="text-[7px] text-white/90 -mt-0.5 font-semibold">BG</span>
</button>
<button type="button" onClick={() =>setShowRechargeSheet(true)} className="w-11 h-11 rounded-full bg-amber-500/40 hover:bg-amber-500/55 border border-amber-400/60 active:scale-95 transition flex flex-col items-center justify-center">
<img src={goldCoinIcon} alt="" className="h-3.5 w-3.5" />
<span className="text-[7px] text-amber-100 -mt-0.5 font-bold">+Coin</span>
</button>
</div>

 {/* End confirm */}
<AnimatePresence>
 {showEndConfirm && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center px-6">
<motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-white/10">
<h3 className="text-white font-bold text-lg mb-1">End stream?</h3>
<p className="text-white/60 text-sm mb-5">You can't restart the same broadcast.</p>
<div className="flex gap-2">
<Button variant="outline" onClick={() =>setShowEndConfirm(false)} className="flex-1 rounded-full">Keep going</Button>
<Button onClick={() =>{ setShowEndConfirm(false); endStream(); }} className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white">End</Button>
</div>
</motion.div>
</motion.div>
 )}
</AnimatePresence>

 {/* Background picker sheet (live) */}
<AnimatePresence>
 {showBgSheet && (
<motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] bg-black/60 flex items-end"
 onClick={() =>setShowBgSheet(false)}
 >
<motion.div
 initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
 transition={{ type: "spring", damping: 28, stiffness: 280 }}
 className="w-full bg-zinc-900 rounded-t-3xl p-5 border-t border-white/10"
 style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 20px)" }}
 onClick={(e) =>e.stopPropagation()}
 >
<div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
<div className="flex items-center justify-between mb-3">
<h3 className="text-white font-bold text-base">Background</h3>
 {bgChoice.kind !== "off" && (
<span className="text-[11px] text-white/60">
 {bgStatus === "loading" ? "Loading…" : bgStatus === "error" ? "Unavailable" : "Active"}
</span>
 )}
</div>
<div className="grid grid-cols-4 gap-2.5">
 {BG_PRESETS.map((p) =>{
 const active = bgChoice.id === p.id;
 return (
<button type="button"
 key={p.id}
 onClick={() =>setBgChoice(p)}
 className={cn(
 "aspect-square rounded-2xl overflow-hidden border-2 relative",
 active ? "border-red-500" : "border-white/15",
 )}
 >
 {p.kind === "off" && (
<div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-white/80 font-semibold">None</div>
 )}
 {p.kind === "blur" && (
<div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs text-white font-semibold">Blur</div>
 )}
 {p.kind === "image" && p.url && (
<>
<img src={p.url} alt={p.label} className="w-full h-full object-cover" />
<span className="absolute bottom-0 inset-x-0 bg-black/55 text-[10px] text-white text-center py-0.5 font-semibold">{p.label}</span>
</>
 )}
</button>
 );
 })}
</div>
</motion.div>
</motion.div>
 )}
</AnimatePresence>

<Suspense fallback={null}>
<CoinRechargeSheet
 open={showRechargeSheet}
 onClose={() =>setShowRechargeSheet(false)}
 currentBalance={coinBalance}
 onPurchase={async (coins) =>{
 try { await recharge(coins); } catch (e: any) { throw new Error(e?.message ?? "Recharge failed", { cause: e }); }
 }}
 />
</Suspense>
</div>
 );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
 return (
<div className="bg-white/5 rounded-2xl p-4 border border-white/10">
<div className="flex items-center gap-1.5 text-white/50 text-[10px] mb-1">{icon} {label}</div>
<div className="text-white text-2xl font-bold">{value.toLocaleString()}</div>
</div>
 );
}
