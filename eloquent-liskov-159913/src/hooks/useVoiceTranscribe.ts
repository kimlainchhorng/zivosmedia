/**
 * useVoiceTranscribe — Triggers AI transcription for a voice note
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVoiceTranscribe() {
  const transcribe = useCallback(async (voiceNoteId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-voice", {
        body: { voice_note_id: voiceNoteId },
      });
      if (error) throw error;
      return data?.transcript as string | undefined;
    } catch (e) {
      console.warn("transcribe failed", e);
      return undefined;
    }
  }, []);

  return { transcribe };
}
