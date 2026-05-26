/**
 * ChatMediaUploader — Enhanced file/media sharing with documents, progress tracking
 */
import { useState, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { signedUrlFor, SIGNED_URL_TTL } from "@/lib/security/signedMedia";
import { validateFileClient, type FileCategory } from "@/lib/security/fileUploadSecurity";
import Image from "lucide-react/dist/esm/icons/image";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Film from "lucide-react/dist/esm/icons/film";
import X from "lucide-react/dist/esm/icons/x";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatMediaUploaderProps {
  recipientId: string;
  onMediaSent: (opts: {
    imageUrl?: string;
    videoUrl?: string;
    voiceUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  }) => void;
  renderTrigger?: (openFilePicker: () => void) => ReactNode;
}

const FILE_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

const ACCEPT_TYPES = {
  image: "image/*",
  video: "video/*,.gif",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image")) return <Image className="w-5 h-5 text-blue-500" />;
  if (type.startsWith("video")) return <Film className="w-5 h-5 text-foreground" />;
  return <FileText className="w-5 h-5 text-orange-500" />;
}

export function ChatMediaUploader({ recipientId, onMediaSent, renderTrigger }: ChatMediaUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<{ url: string; name: string; size: number; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const category = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document";
    const limit = FILE_LIMITS[category];

    if (file.size > limit) {
      toast.error(`File must be under ${formatFileSize(limit)}`);
      return;
    }

    // Defence-in-depth: extension + MIME + size validation before upload
    const securityCheck = validateFileClient(file, category as FileCategory);
    if (!securityCheck.ok) {
      toast.error(securityCheck.error ?? "File rejected");
      return;
    }

    // Preview
    if (file.type.startsWith("image")) {
      const url = URL.createObjectURL(file);
      setPreview({ url, name: file.name, size: file.size, type: file.type });
    } else {
      setPreview({ url: "", name: file.name, size: file.size, type: file.type });
    }

    // Upload
    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 200);

      const { error } = await supabase.storage
        .from("chat-media-files")
        .upload(path, file, { contentType: file.type });

      clearInterval(progressInterval);

      if (error) throw error;

      setProgress(100);
      // Mint a short-lived signed URL for the sender to embed in the message.
      // The DB stores the storage path (file_url) so receivers can re-sign on view.
      const signedUrl = await signedUrlFor("chat-media-files", path, "display");

      await (supabase as any).from("chat_media").insert({
        sender_id: user.id,
        chat_partner_id: recipientId,
        file_url: path, // storage path, not URL — receivers re-sign on view
        file_name: file.name,
        file_type: category,
        file_size_bytes: file.size,
        mime_type: file.type,
      });

      if (category === "image") {
        onMediaSent({ imageUrl: signedUrl });
      } else if (category === "video") {
        onMediaSent({ videoUrl: signedUrl });
      } else {
        onMediaSent({
          fileUrl: signedUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
      }

      toast.success("File sent");
    } catch {
      toast.error("Upload failed");
    }

    setUploading(false);
    setProgress(0);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [user?.id, recipientId, onMediaSent]);

  const cancelUpload = () => {
    setPreview(null);
    setUploading(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        // Documents only — Photo and Video buttons in the attach menu already
        // cover image/video pickers. Including image/video here pops a confusing
        // multi-source picker that overlaps those flows on iOS.
        accept={ACCEPT_TYPES.document}
        className="hidden"
        onChange={handleFileSelect}
      />

      {renderTrigger?.(openFilePicker)}

      {/* Upload progress overlay */}
      <AnimatePresence>
        {uploading && preview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-background border border-border/50 rounded-xl p-3 shadow-lg"
          >
            <div className="flex items-center gap-3">
              {preview.url ? (
	                <img
	                  src={preview.url}
	                  className="w-12 h-12 rounded-lg object-cover"
	                  alt=""
	                  loading="lazy"
	                  decoding="async"
	                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  {getFileIcon(preview.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{preview.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(preview.size)}</p>
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button type="button" onClick={cancelUpload} className="p-1">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
