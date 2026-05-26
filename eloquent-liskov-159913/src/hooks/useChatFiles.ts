/**
 * useChatFiles — upload a file (or scanner-built PDF) to the chat-files bucket
 * and record metadata in chat_files. Returns a public-ish signed URL for the
 * sender to embed in the message.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UploadedChatFile = {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  page_count?: number | null;
  thumbnail_url?: string | null;
  source: "upload" | "scan";
};

export function useChatFiles() {
  const { user } = useAuth();

  const uploadFile = useCallback(
    async (file: File | Blob, opts: {
      filename: string;
      mimeType: string;
      conversationId?: string | null;
      pageCount?: number;
      source?: "upload" | "scan";
      thumbnail?: Blob | null;
    }): Promise<UploadedChatFile | null> => {
      if (!user) return null;
      const ts = Date.now();
      const path = `${user.id}/${ts}-${opts.filename.replace(/[^a-z0-9._-]/gi, "_")}`;

      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(path, file, { contentType: opts.mimeType, upsert: false });
      if (upErr) {
        console.error("[useChatFiles] upload error", upErr);
        return null;
      }

      // Short-lived signed URL for the sender to embed; receivers re-sign on view.
      const { data: signed } = await supabase.storage
        .from("chat-files")
        .createSignedUrl(path, 60 * 60); // 1 hour
      const url = signed?.signedUrl ?? "";

      let thumbUrl: string | null = null;
      let thumbPath: string | null = null;
      if (opts.thumbnail) {
        thumbPath = `${user.id}/thumbs/${ts}-thumb.jpg`;
        const { error: tErr } = await supabase.storage
          .from("chat-files")
          .upload(thumbPath, opts.thumbnail, { contentType: "image/jpeg", upsert: false });
        if (!tErr) {
          const { data: tSigned } = await supabase.storage
            .from("chat-files")
            .createSignedUrl(thumbPath, 60 * 60 * 6); // 6 hours
          thumbUrl = tSigned?.signedUrl ?? null;
        }
      }

      const size = (file as File).size ?? (file as Blob).size ?? 0;
      // Persist storage paths (not signed URLs). Consumers mint fresh URLs on view.
      const { data: row, error: insErr } = await (supabase as any)
        .from("chat_files")
        .insert({
          user_id: user.id,
          conversation_id: opts.conversationId ?? null,
          storage_path: path,
          url: path, // legacy column — store path so it doesn't expire
          filename: opts.filename,
          mime_type: opts.mimeType,
          size,
          page_count: opts.pageCount ?? null,
          thumbnail_url: thumbPath,
          source: opts.source ?? "upload",
        })
        .select("id")
        .single();

      if (insErr) console.warn("[useChatFiles] metadata insert", insErr);

      return {
        id: row?.id ?? path,
        url,
        filename: opts.filename,
        mime_type: opts.mimeType,
        size,
        page_count: opts.pageCount ?? null,
        thumbnail_url: thumbUrl,
        source: opts.source ?? "upload",
      };
    },
    [user]
  );

  return { uploadFile };
}
