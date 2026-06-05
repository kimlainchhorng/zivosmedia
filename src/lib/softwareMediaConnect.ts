import { ZIVO_SOFTWARE_AUTH_REDIRECT_PATH } from "@/config/autoRepairDomain";

export const SOFTWARE_MEDIA_CONNECT_STATE_KEY = "zivo:software-media-connect:state";
export const SOFTWARE_MEDIA_CONNECT_REDIRECT_KEY = "zivo:software-media-connect:redirect";

const SOFTWARE_MEDIA_CONNECT_URL = "https://zivosmedia.com/connect/software";
const SOFTWARE_MEDIA_CALLBACK_URL = "https://zivosoftware.com/connect/media";

export function createSoftwareMediaConnectState() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function rememberSoftwareMediaConnect(state: string, redirect?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SOFTWARE_MEDIA_CONNECT_STATE_KEY, state);
    window.sessionStorage.setItem(
      SOFTWARE_MEDIA_CONNECT_REDIRECT_KEY,
      redirect || ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
    );
  } catch {
    // Session storage can be unavailable in locked-down browsers; the callback
    // still refuses mismatched state when storage is available.
  }
}

export function getRememberedSoftwareMediaConnect() {
  if (typeof window === "undefined") {
    return { state: null, redirect: null };
  }

  try {
    return {
      state: window.sessionStorage.getItem(SOFTWARE_MEDIA_CONNECT_STATE_KEY),
      redirect: window.sessionStorage.getItem(SOFTWARE_MEDIA_CONNECT_REDIRECT_KEY),
    };
  } catch {
    return { state: null, redirect: null };
  }
}

export function clearRememberedSoftwareMediaConnect() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SOFTWARE_MEDIA_CONNECT_STATE_KEY);
    window.sessionStorage.removeItem(SOFTWARE_MEDIA_CONNECT_REDIRECT_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function buildSoftwareMediaConnectHref({
  redirect,
  state,
}: {
  redirect?: string | null;
  state: string;
}) {
  const connect = new URL(SOFTWARE_MEDIA_CONNECT_URL);
  connect.searchParams.set("return", SOFTWARE_MEDIA_CALLBACK_URL);
  connect.searchParams.set("redirect", redirect || ZIVO_SOFTWARE_AUTH_REDIRECT_PATH);
  connect.searchParams.set("state", state);
  return connect.toString();
}
