-- Speed up mark-as-read: partial index on unread messages
CREATE INDEX IF NOT EXISTS idx_dm_unread
ON public.direct_messages (receiver_id, sender_id)
WHERE is_read = false;

-- Speed up call history lookup for conversations  
CREATE INDEX IF NOT EXISTS idx_call_history_conversation
ON public.call_history (LEAST(caller_id, callee_id), GREATEST(caller_id, callee_id), created_at DESC);