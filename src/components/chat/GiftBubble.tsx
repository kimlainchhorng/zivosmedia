/**
 * GiftBubble — Renders a chat gift inside the message stream.
 * Reads from msg.gift_payload (or msg.message JSON fallback).
 */
import { motion } from "framer-motion";
import Coins from "lucide-react/dist/esm/icons/coins";

export interface GiftPayload {
  icon?: string;       // emoji or image URL
  name?: string;
  coins?: number;
  note?: string;
}

interface Props {
  payload: GiftPayload;
  isMine: boolean;
}

export default function GiftBubble({ payload, isMine }: Props) {
  const { icon = "🎁", name = "Gift", coins = 0, note } = payload || {};
  const isImage = typeof icon === "string" && /^https?:\/\//.test(icon);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 280 }}
      className={`relative w-[210px] rounded-2xl p-4 overflow-hidden ${
        isMine
          ? "bg-gradient-to-br from-amber-400/95 via-amber-500/95 to-orange-500/95 text-white"
          : "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-900 dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-100"
      }`}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15 blur-2xl pointer-events-none" />
      <div className="flex items-center justify-center mb-2">
        {isImage ? (
	          <img
	            src={icon}
	            alt={name}
	            className="w-16 h-16 object-contain"
	            loading="lazy"
	            decoding="async"
	          />
        ) : (
          <div className="text-5xl">{icon}</div>
        )}
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wider opacity-80">
        {isMine ? "Gift sent" : "Gift received"}
      </div>
      <div className="text-center text-sm font-bold mt-0.5">{name}</div>
      <div className="flex items-center justify-center gap-1 mt-1.5 text-sm font-semibold">
        <Coins className="w-3.5 h-3.5" />
        {coins.toLocaleString()}
      </div>
      {note && (
        <div className={`mt-2 text-[11px] text-center px-2 py-1 rounded-lg ${isMine ? "bg-white/15" : "bg-amber-200/60 dark:bg-amber-800/40"}`}>
          "{note}"
        </div>
      )}
    </motion.div>
  );
}
