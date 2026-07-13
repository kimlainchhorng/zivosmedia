/**
 * useSecretChat — orchestrates an E2E encrypted 1:1 conversation:
 *  - Publishes our own public key to `device_keys` on first use.
 *  - Looks up (or creates) a `secret_chats` row with the partner.
 *  - Subscribes to realtime ciphertext inserts and decrypts them locally.
 *  - Sends: encrypts with the partner's public key, inserts the blob.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  computeSafetyNumber,
  decryptBlob,
  decryptMessage,
  encryptBlob,
  encryptMessage,
  getOrCreateIdentity,
  resetIdentity,
} from "@/lib/secretChat/crypto";

const FP_KEY = "zivo_device_fp";
function getDeviceFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

export type MediaKind = "image" | "video" | "audio" | "file";

export interface SecretMessage {
  id: string;
  sender_id: string;
  plaintext: string;
  created_at: string;
  expires_at: string | null;
  failed?: boolean;
  // Media metadata (when message carries an attachment)
  media?: {
    type: MediaKind;
    storage_path: string;
    iv: string;            // blob IV
    wrapped_key: string;   // "<wrapIv>:<wrappedKey>" both base64
    mime: string | null;
    size: number | null;
    file_name: string | null;
    sender_public_key_jwk: JsonWebKey;
  };
}

export function useSecretChat(partnerId: string | null) {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const [partnerKey, setPartnerKey] = useState<JsonWebKey | null>(null);
  const [myKey, setMyKey] = useState<JsonWebKey | null>(null);
  const [messages, setMessages] = useState<SecretMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ttlSeconds, setTtlSeconds] = useState<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Bootstrap: identity, partner key, chat row.
  useEffect(() => {
    let cancelled = false;
    if (!user || !partnerId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Local identity + publish public key.
        const self = await getOrCreateIdentity();
        if (cancelled) return;
        setMyKey(self.publicKeyJwk);

        await supabase.from("device_keys").upsert(
          {
            user_id: user.id,
            device_fingerprint: getDeviceFingerprint(),
            public_key_jwk: self.publicKeyJwk as never,
          },
          { onConflict: "user_id,device_fingerprint" },
        );

        // 2. Look up partner's most recent device key.
        const { data: keyRows, error: keyErr } = await supabase
          .from("device_keys")
          .select("public_key_jwk, created_at")
          .eq("user_id", partnerId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (keyErr) throw keyErr;
        if (!keyRows || keyRows.length === 0) {
          throw new Error("This contact hasn't enabled Secret Chat yet. Ask them to open one with you.");
        }
        if (cancelled) return;
        setPartnerKey(keyRows[0].public_key_jwk as unknown as JsonWebKey);

        // 3. Find or create the secret_chats row (ordered pair).
        const [a, b] = [user.id, partnerId].sort();
        let { data: chatRow, error: chatErr } = await supabase
          .from("secret_chats")
          .select("id, ttl_seconds")
          .eq("user_a", a)
          .eq("user_b", b)
          .maybeSingle();
        if (chatErr) throw chatErr;
        if (!chatRow) {
          const { data: created, error: createErr } = await supabase
            .from("secret_chats")
            .insert({ user_a: a, user_b: b, created_by: user.id })
            .select("id, ttl_seconds")
            .single();
          if (createErr) throw createErr;
          chatRow = created;
        }
        if (cancelled || !chatRow) return;
        setChatId(chatRow.id);
        setTtlSeconds(chatRow.ttl_seconds);

        // 4. Backfill messages.
        const { data: msgRows, error: msgErr } = await supabase
          .from("secret_messages")
          .select("*")
          .eq("chat_id", chatRow.id)
          .order("created_at", { ascending: true })
          .limit(200);
        if (msgErr) throw msgErr;

        const decoded: SecretMessage[] = [];
        for (const row of msgRows ?? []) {
          decoded.push(await rowToMessage(row, chatRow.id));
        }
        if (!cancelled) setMessages(decoded);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, partnerId]);

  // Realtime
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`secret-${chatId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "secret_messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const row = payload.new as Parameters<typeof rowToMessage>[0];
          // Skip our own optimistic message — it's already in state.
          if (user && row.sender_id === user.id && messagesIncludesId(row.id)) return;
          const built = await rowToMessage(row, chatId);
          setMessages((prev) => (prev.find((m) => m.id === row.id) ? prev : [...prev, built]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "secret_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, user?.id]);

  // closure helper that always sees the latest messages list
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  function messagesIncludesId(id: string) {
    return messagesRef.current.some((m) => m.id === id);
  }

  const send = useCallback(
    async (plaintext: string) => {
      if (!chatId || !partnerKey || !user) return;
      const trimmed = plaintext.trim();
      if (!trimmed) return;
      const expiresAt =
        ttlSeconds && ttlSeconds > 0
          ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
          : null;
      try {
        const payload = await encryptMessage({
          plaintext: trimmed,
          chatId,
          recipientPublicKeyJwk: partnerKey,
        });
        const { data, error } = await supabase
          .from("secret_messages")
          .insert({
            chat_id: chatId,
            sender_id: user.id,
            sender_public_key_jwk: payload.senderPublicKeyJwk as never,
            iv: payload.iv,
            ciphertext: payload.ciphertext,
            expires_at: expiresAt,
          })
          .select("id, created_at")
          .single();
        if (error) throw error;
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender_id: user.id,
            plaintext: trimmed,
            created_at: data.created_at,
            expires_at: expiresAt,
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Could not send: ${msg}`);
      }
    },
    [chatId, partnerKey, user, ttlSeconds],
  );

  const setTtl = useCallback(
    async (seconds: number | null) => {
      if (!chatId) return;
      const { error } = await supabase
        .from("secret_chats")
        .update({ ttl_seconds: seconds })
        .eq("id", chatId);
      if (error) {
        toast.error("Could not change disappearing timer");
        return;
      }
      setTtlSeconds(seconds);
      toast.success(
        seconds ? `Messages will disappear after ${formatTtl(seconds)}` : "Disappearing messages off",
      );
    },
    [chatId],
  );

  const safetyNumber = useMemo(() => {
    if (!myKey || !partnerKey || !user || !partnerId) return null;
    // Sort so both sides compute the same value.
    const [first, second] =
      user.id < partnerId ? [myKey, partnerKey] : [partnerKey, myKey];
    return { first, second };
  }, [myKey, partnerKey, user, partnerId]);

  const getSafetyNumber = useCallback(async (): Promise<string | null> => {
    if (!safetyNumber) return null;
    return computeSafetyNumber({ jwkA: safetyNumber.first, jwkB: safetyNumber.second });
  }, [safetyNumber]);

  const resetKeys = useCallback(async () => {
    await resetIdentity();
    if (user) {
      await supabase
        .from("device_keys")
        .delete()
        .eq("user_id", user.id)
        .eq("device_fingerprint", getDeviceFingerprint());
    }
    toast.success("Encryption keys reset. Reload to start fresh.");
  }, [user]);

  const deleteMessage = useCallback(async (id: string) => {
    // Best-effort: remove storage object too. RLS allows owner-only delete.
    const msg = messagesRef.current.find((m) => m.id === id);
    if (msg?.media?.storage_path) {
      void supabase.storage.from("secret-media").remove([msg.media.storage_path]);
    }
    const { error } = await supabase.from("secret_messages").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete message");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /** Encrypts a file client-side, uploads ciphertext to `secret-media`, then inserts a row. */
  const sendMedia = useCallback(
    async (file: File): Promise<void> => {
      if (!chatId || !partnerKey || !user) return;
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File too large (max 50 MB)");
        return;
      }
      const kind: MediaKind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : "file";
      try {
        const buf = await file.arrayBuffer();
        const enc = await encryptBlob({
          data: buf,
          chatId,
          recipientPublicKeyJwk: partnerKey,
        });
        // Pre-allocate the message id so we know the storage path.
        const messageId = crypto.randomUUID();
        const storagePath = `${chatId}/${messageId}.bin`;
        const { error: upErr } = await supabase.storage
          .from("secret-media")
          .upload(storagePath, new Blob([enc.ciphertext], { type: "application/octet-stream" }), {
            contentType: "application/octet-stream",
            upsert: false,
          });
        if (upErr) throw upErr;

        // Tiny placeholder ciphertext for the text column (still encrypted)
        const placeholder = await encryptMessage({
          plaintext: `[${kind}]`,
          chatId,
          recipientPublicKeyJwk: partnerKey,
        });

        const expiresAt =
          ttlSeconds && ttlSeconds > 0
            ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
            : null;

        const { data, error: insErr } = await supabase
          .from("secret_messages")
          .insert({
            id: messageId,
            chat_id: chatId,
            sender_id: user.id,
            sender_public_key_jwk: enc.senderPublicKeyJwk as never,
            iv: placeholder.iv,
            ciphertext: placeholder.ciphertext,
            media_type: kind,
            storage_path: storagePath,
            media_iv: enc.iv,
            // Pack wrapIv:wrappedKey so we don't need an extra column.
            media_key_wrapped: `${enc.wrapIv}:${enc.wrappedKey}`,
            mime: file.type || null,
            size_bytes: file.size,
            file_name: file.name,
            expires_at: expiresAt,
          })
          .select("id, created_at")
          .single();
        if (insErr) throw insErr;

        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender_id: user.id,
            plaintext: `[${kind}]`,
            created_at: data.created_at,
            expires_at: expiresAt,
            media: {
              type: kind,
              storage_path: storagePath,
              iv: enc.iv,
              wrapped_key: `${enc.wrapIv}:${enc.wrappedKey}`,
              mime: file.type || null,
              size: file.size,
              file_name: file.name,
              sender_public_key_jwk: enc.senderPublicKeyJwk,
            },
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Could not send: ${msg}`);
      }
    },
    [chatId, partnerKey, user, ttlSeconds],
  );

  /** Downloads & decrypts a media message → object URL ready for <img>/<video>/<audio>/<a>. */
  const decryptMedia = useCallback(
    async (m: SecretMessage): Promise<string | null> => {
      if (!m.media || !chatId) return null;
      try {
        const { data, error } = await supabase.storage
          .from("secret-media")
          .download(m.media.storage_path);
        if (error || !data) throw error ?? new Error("Download failed");
        const cipherBuf = await data.arrayBuffer();
        const [wrapIv, wrappedKey] = m.media.wrapped_key.split(":");
        const plain = await decryptBlob({
          ciphertext: cipherBuf,
          iv: m.media.iv,
          wrapIv,
          wrappedKey,
          senderPublicKeyJwk: m.media.sender_public_key_jwk,
          chatId,
        });
        const blob = new Blob([plain], { type: m.media.mime ?? "application/octet-stream" });
        return URL.createObjectURL(blob);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Could not load media: ${msg}`);
        return null;
      }
    },
    [chatId],
  );

  // Helper used by backfill + realtime to map a DB row → SecretMessage.
  // Defined inside the hook so it can call decryptMessage with the right chatId.
  async function rowToMessage(
    row: {
      id: string;
      sender_id: string;
      iv: string;
      ciphertext: string;
      sender_public_key_jwk: unknown;
      created_at: string;
      expires_at: string | null;
      media_type?: string | null;
      storage_path?: string | null;
      media_iv?: string | null;
      media_key_wrapped?: string | null;
      mime?: string | null;
      size_bytes?: number | null;
      file_name?: string | null;
    },
    cid: string,
  ): Promise<SecretMessage> {
    const senderPub = row.sender_public_key_jwk as JsonWebKey;
    let plaintext = "";
    let failed = false;
    try {
      plaintext = await decryptMessage({
        payload: { iv: row.iv, ciphertext: row.ciphertext, senderPublicKeyJwk: senderPub },
        chatId: cid,
      });
    } catch {
      plaintext = "[Cannot decrypt — keys may have been reset]";
      failed = true;
    }
    const base: SecretMessage = {
      id: row.id,
      sender_id: row.sender_id,
      plaintext,
      created_at: row.created_at,
      expires_at: row.expires_at,
      failed: failed || undefined,
    };
    if (row.media_type && row.storage_path && row.media_iv && row.media_key_wrapped) {
      base.media = {
        type: row.media_type as MediaKind,
        storage_path: row.storage_path,
        iv: row.media_iv,
        wrapped_key: row.media_key_wrapped,
        mime: row.mime ?? null,
        size: row.size_bytes ?? null,
        file_name: row.file_name ?? null,
        sender_public_key_jwk: senderPub,
      };
    }
    return base;
  }

  return {
    chatId,
    loading,
    error,
    messages,
    send,
    sendMedia,
    decryptMedia,
    ttlSeconds,
    setTtl,
    getSafetyNumber,
    resetKeys,
    deleteMessage,
  };
}

function formatTtl(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}
