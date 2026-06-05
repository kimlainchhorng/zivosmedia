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
	readonly VITE_GOOGLE_ANALYTICS_ID?: string;
	readonly VITE_GOOGLE_ADS_ID?: string;
	readonly VITE_GOOGLE_ADS_OAUTH_READY?: string;
	readonly VITE_GOOGLE_ADSENSE_CLIENT?: string;
	readonly VITE_ADSENSE_SLOT_HOME_FEED?: string;
	readonly VITE_ADSENSE_SLOT_SEARCH_RESULTS?: string;
	readonly VITE_ADSENSE_SLOT_ARTICLE_INLINE?: string;
	readonly VITE_META_APP_ID?: string;
	readonly VITE_META_PIXEL_ID?: string;
	readonly VITE_TIKTOK_PIXEL_ID?: string;
	readonly VITE_X_PIXEL_ID?: string;
	readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
