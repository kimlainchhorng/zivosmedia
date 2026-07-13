/**
 * SmartReplyBar — Contextual one-tap reply chips above the composer.
 * Suggestions are derived from the last received message using lightweight
 * keyword/intent rules (questions, greetings, time/place asks, etc.).
 * No external service needed.
 */
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { cn } from "@/lib/utils";

interface SmartReplyBarProps {
  /** The latest message received from the other person, or null if none. */
  lastIncomingMessage: string | null;
  /** Whether the user is currently typing — hide suggestions to avoid jitter. */
  userTyping?: boolean;
  /** Tap handler — caller decides whether to insert into composer or send immediately. */
  onPick: (text: string) => void;
  className?: string;
}

interface Rule {
  /** Lower-cased keywords/phrases — match if ANY appears in the message. */
  match: RegExp[];
  /** 2-4 candidate replies (the bar shows up to 3). */
  replies: string[];
}

// Order matters — first matching rule wins, so put the most specific first.
const RULES: Rule[] = [
  // Missed call (synthesized by PersonalChat when last timeline item is a missed call from partner)
  {
    match: [/\bmissed call\b/i, /\btried to call\b/i, /\bcall (me )?back\b/i],
    replies: ["Calling you back 📞", "Sorry I missed your call", "Can you call again?", "Free in 5 min"],
  },
  // Shared social profile / music link
  {
    match: [
      /https?:\/\/[^\s]*(facebook|fb)\.com\//i,
      /https?:\/\/[^\s]*onlyfans\.com\//i,
      /https?:\/\/[^\s]*instagram\.com\//i,
      /https?:\/\/[^\s]*tiktok\.com\//i,
      /https?:\/\/[^\s]*(x\.com|twitter\.com)\//i,
      /https?:\/\/[^\s]*youtube\.com\//i,
      /https?:\/\/[^\s]*youtu\.be\//i,
      /https?:\/\/[^\s]*snapchat\.com\//i,
      /https?:\/\/[^\s]*linkedin\.com\//i,
      /https?:\/\/[^\s]*t\.me\//i,
      /https?:\/\/[^\s]*spotify\.com\//i,
      /https?:\/\/[^\s]*music\.apple\.com\//i,
      /https?:\/\/[^\s]*soundcloud\.com\//i,
    ],
    replies: ["Following you ✓", "Cool, will check 🔗", "Nice, sending mine back", "Loved it 🔥"],
  },
  // Yes/no questions
  {
    match: [/\?$/, /\bis it\b/i, /\bdo you\b/i, /\bcan you\b/i, /\bwill you\b/i, /\bare you\b/i, /\bshould\b/i],
    replies: ["Yes 👍", "No, thanks", "Let me check", "Maybe later"],
  },
  // Plans / when / time
  {
    match: [/\bwhen\b/i, /\bwhat time\b/i, /\btomorrow\b/i, /\btonight\b/i, /\bschedule\b/i, /\bavailable\b/i],
    replies: ["Sounds good ✅", "I'll check my schedule", "Let's do it", "Need to confirm"],
  },
  // Location / where
  {
    match: [/\bwhere\b/i, /\baddress\b/i, /\bdirection/i, /\bmeet\b/i, /\bpickup\b/i, /\bdrop\b/i],
    replies: ["I'll send the address 📍", "On my way 🚗", "Coming now", "Need 5 min"],
  },
  // Greetings
  {
    match: [/^\s*(hi|hey|hello|yo|sup)[\s!?.,]?$/i, /\bgood (morning|afternoon|evening)\b/i],
    replies: ["Hey! 👋", "Hi, how are you?", "All good, you?"],
  },
  // Thanks
  {
    match: [/\bthanks?\b/i, /\bthank you\b/i, /\bappreciate\b/i, /🙏/, /❤️/],
    replies: ["You're welcome 🙌", "Anytime!", "No problem"],
  },
  // Apology
  {
    match: [/\bsorry\b/i, /\bapolog/i, /\bmy bad\b/i],
    replies: ["No worries", "All good 👌", "It's fine"],
  },
  // Confirmation/agreement
  {
    match: [/\bok(ay)?\b/i, /\bsure\b/i, /\bsounds good\b/i, /\balright\b/i, /✅|👍/],
    replies: ["👍", "Got it", "Cool, talk later"],
  },
  // Money / cost
  {
    match: [/\bhow much\b/i, /\bprice\b/i, /\bcost\b/i, /\$\d/, /\bpay\b/i],
    replies: ["Let me check 💰", "Sending you the breakdown", "Sounds reasonable"],
  },
  // Photo / media share
  {
    match: [/\bphoto\b/i, /\bpicture\b/i, /\bpic\b/i, /\bvideo\b/i, /\bsend (it|the)\b/i],
    replies: ["Sending now", "One moment", "Will send shortly"],
  },
];

const FALLBACK_REPLIES = ["👍", "Got it", "I'll get back to you"];

function pickReplies(message: string): string[] {
  const trimmed = message.trim();
  if (!trimmed) return [];
  for (const rule of RULES) {
    if (rule.match.some((re) => re.test(trimmed))) {
      return rule.replies.slice(0, 3);
    }
  }
  return FALLBACK_REPLIES;
}

export default function SmartReplyBar({ lastIncomingMessage, userTyping, onPick, className }: SmartReplyBarProps) {
  const replies = useMemo(
    () => (lastIncomingMessage ? pickReplies(lastIncomingMessage) : []),
    [lastIncomingMessage],
  );

  const visible = !userTyping && replies.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="smart-reply-bar"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 overflow-x-auto scrollbar-none",
            className,
          )}
        >
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 shrink-0" aria-hidden="true" />
          {replies.map((r) => (
            <button type="button"
              key={r}
              onClick={() => onPick(r)}
              className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 active:scale-95 text-[11px] sm:text-xs font-semibold text-primary transition-all whitespace-nowrap"
            >
              {r}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
