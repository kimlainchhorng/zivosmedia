-- storage.objects policies execute helper functions as the caller role. Grant
-- the call-recording path helper used by call-recordings bucket policies.

grant execute on function public.is_video_call_recording_host_for_path(text) to authenticated;
