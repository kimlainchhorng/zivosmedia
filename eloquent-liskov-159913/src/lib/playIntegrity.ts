import { registerPlugin, Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface PlayIntegrityPlugin {
  requestToken(options: { nonce: string }): Promise<{ token: string }>;
}

const PlayIntegrity = registerPlugin<PlayIntegrityPlugin>('PlayIntegrity');

function generateNonce(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export async function verifyAppIntegrity(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const nonce = generateNonce();
    const { token } = await PlayIntegrity.requestToken({ nonce });

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('verify-play-integrity', {
      body: { token, nonce },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    return res.data?.passed === true;
  } catch {
    return false;
  }
}
