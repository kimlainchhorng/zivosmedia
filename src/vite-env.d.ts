/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_WEBRTC_TURN_URLS?: string;
	readonly VITE_WEBRTC_TURN_USERNAME?: string;
	readonly VITE_WEBRTC_TURN_CREDENTIAL?: string;
	readonly VITE_STICKER_ASSET_ORIGIN?: string;
	readonly VITE_PUBLIC_ORIGIN?: string;
	readonly VITE_ZIVO_ORIGIN?: string;
	readonly VITE_CHAT_ORIGINS?: string;
	readonly VITE_KHQR_STATIC_MERCHANT_QR?: string;
	readonly VITE_META_PIXEL_ID?: string;
	readonly VITE_META_GRAPH_VERSION?: string;
	readonly VITE_META_APP_ID?: string;
	readonly VITE_META_DOMAIN_VERIFICATION?: string;
	readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface Window {
	__zivoMetaLastPageView?: { path: string; at: number };
}
