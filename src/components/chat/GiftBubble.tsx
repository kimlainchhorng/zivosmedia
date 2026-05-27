/**
 * GiftBubble - renders coin gifts and Premium gifts inside the chat stream.
 */
import { motion } from "framer-motion";
import Coins from "lucide-react/dist/esm/icons/coins";
import Crown from "lucide-react/dist/esm/icons/crown";

export interface GiftPayload {
  kind?: string;
  icon?: string;
  name?: string;
  coins?: number;
  total_coins?: number;
  note?: string;
  premium_months?: number;
  stripe_session_id?: string;
  subscription_id?: string;
}

interface Props {
  payload: GiftPayload;
  isMine: boolean;
}

export default function GiftBubble({ payload, isMine }: Props) {
  const {
    icon = "Gift",
    name = "Gift",
    coins = 0,
    total_coins,
    note,
    premium_months,
  } = payload || {};
  const isPremiumGift = payload?.kind === "premium_gift";
  const isImage = typeof icon === "string" && /^https?:\/\//.test(icon);
  const displayCoins = total_coins ?? coins;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 280 }}
      className={`relative w-[220px] overflow-hidden rounded-2xl p-4 ${
        isPremiumGift
          ? isMine
            ? "bg-gradient-to-br from-sky-500 via-violet-500 to-fuchsia-500 text-white"
            : "bg-gradient-to-br from-sky-50 via-violet-50 to-fuchsia-100 text-violet-950 dark:from-sky-950/50 dark:via-violet-950/50 dark:to-fuchsia-950/50 dark:text-violet-50"
          : isMine
            ? "bg-gradient-to-br from-amber-400/95 via-amber-500/95 to-orange-500/95 text-white"
            : "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-100"
      }`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      <div className="mb-2 flex items-center justify-center">
        {isImage ? (
          <img
            src={icon}
            alt={name}
            className="h-16 w-16 object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : isPremiumGift ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-inner">
            <Crown className="h-8 w-8" />
          </div>
        ) : (
          <div className="text-4xl font-black leading-none">{icon}</div>
        )}
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wider opacity-80">
        {isPremiumGift ? (isMine ? "Premium sent" : "Premium received") : isMine ? "Gift sent" : "Gift received"}
      </div>
      <div className="mt-0.5 text-center text-sm font-bold">{name}</div>
      {isPremiumGift && premium_months ? (
        <div className="mt-1.5 text-center text-xs font-semibold opacity-90">
          {premium_months} month{premium_months === 1 ? "" : "s"} of ZIVO Premium
        </div>
      ) : null}
      <div className="mt-1.5 flex items-center justify-center gap-1 text-sm font-semibold">
        <Coins className="h-3.5 w-3.5" />
        {displayCoins.toLocaleString()}
      </div>
      {note && (
        <div className={`mt-2 rounded-lg px-2 py-1 text-center text-[11px] ${isMine ? "bg-white/15" : "bg-amber-200/60 dark:bg-amber-800/40"}`}>
          "{note}"
        </div>
      )}
    </motion.div>
  );
}
