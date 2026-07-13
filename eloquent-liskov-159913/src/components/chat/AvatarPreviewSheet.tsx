import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";

interface Props {
  open: boolean;
  src?: string | null;
  name: string;
  initials?: string;
  onClose: () => void;
}

/**
 * Fullscreen avatar zoom — tap an avatar in the chat header to see it large.
 * Telegram-style: dim background, image scales up, dismissable via tap, X
 * button, or Escape.
 */
export default function AvatarPreviewSheet({ open, src, name, initials, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} profile photo`}
        >
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close preview"
            className="absolute top-[max(1rem,var(--zivo-safe-top,0px))] right-4 h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="relative max-w-[88vw] max-h-[78vh]"
          >
            {src ? (
              <img
	                src={src}
	                alt={name}
	                loading="eager"
	                decoding="async"
	                draggable={false}
                className="rounded-full object-cover w-[78vw] max-w-[420px] aspect-square shadow-2xl select-none"
              />
            ) : (
              <div className="rounded-full w-[78vw] max-w-[420px] aspect-square flex items-center justify-center bg-primary/20 text-primary text-7xl font-bold shadow-2xl">
                {initials || name[0]?.toUpperCase() || "?"}
              </div>
            )}
            <p className="text-center mt-4 text-white text-base font-semibold">{name}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
