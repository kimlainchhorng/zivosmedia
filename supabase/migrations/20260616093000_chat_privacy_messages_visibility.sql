-- Who-can-message visibility for the chat privacy hub.
-- The privacy hub (ChatPrivacyHubPage) previously kept "Who can message me"
-- in localStorage only; this adds the matching server column so the choice
-- persists and syncs across devices alongside the rest of user_privacy_settings.
ALTER TABLE public.user_privacy_settings
  ADD COLUMN IF NOT EXISTS messages text NOT NULL DEFAULT 'everyone'
  CHECK (messages IN ('everyone', 'contacts', 'nobody'));
