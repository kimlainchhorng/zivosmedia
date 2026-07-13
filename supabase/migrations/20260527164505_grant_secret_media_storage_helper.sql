-- storage.objects policies execute with the caller role. The secret-media
-- policies reference this helper, so authenticated uploads to any storage
-- bucket can fail if the role lacks EXECUTE.

grant execute on function public.is_secret_chat_participant_for_path(text) to authenticated;
