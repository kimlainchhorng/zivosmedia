/**
 * GroupReadReceipts — show who's read a group message
 */
import { motion } from "framer-motion";
import Eye from "lucide-react/dist/esm/icons/eye";

interface Props {
  seenCount: number;
  totalMembers: number;
  align?: "left" | "right";
}

export default function GroupReadReceipts({ seenCount, totalMembers, align = "left" }: Props) {
  if (seenCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <Eye className="w-2.5 h-2.5" />
      <span>
        Seen by {seenCount} of {totalMembers}
      </span>
    </motion.div>
  );
}
