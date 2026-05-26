/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_WEBRTC_TURN_URLS?: string;
	readonly VITE_WEBRTC_TURN_USERNAME?: string;
	readonly VITE_WEBRTC_TURN_CREDENTIAL?: string;
	readonly VITE_STICKER_ASSET_ORIGIN?: string;
	readonly VITE_PUBLIC_ORIGIN?: string;
	readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
