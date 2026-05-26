/**
 * Live page feature flags.
 *
 * Each flag gates a section of the Live tab. Set to `true` only when the
 * underlying backend (table + write path) has shipped — never to show mock
 * placeholder content to real users.
 *
 * To enable a section: ship the data backend first, then flip the flag here.
 */
export const LIVE_FEATURE_FLAGS = {
  // ── Wired to real data ──────────────────────────────────────────────
  recentlyWatched: true,   // live_viewers + live_streams
  topGifters: true,        // live_gift_displays aggregated

  // ── No backend yet — hidden until data sources exist ────────────────
  // Top-of-page widgets
  newsTicker: false,
  liveNowStories: false,
  followingTicker: false,
  countryPicker: false,
  dailyRewards: false,

  // Battles & rooms
  pkBattlesGrid: false,
  trendingHashtags: false,
  voiceRoomsGrid: false,

  // Discover row
  liveEvents: false,
  miniGames: false,
  liveShopping: false,
  newFaces: false,

  // Community row
  karaokeRooms: false,
  birthdayCelebrations: false,
  replays: false,

  // Battles & studio
  pkSeasonRanking: false,
  agencySpotlight: false,
  arStudio: false,
  datingLive: false,
  becomeHostPromo: false,
  auctions: false,
  studyRooms: false,

  // Daily
  dailyMissions: false,
  upcomingScheduled: false,

  // Categories
  gameHub: false,
  petLive: false,
  travelLive: false,
  hotNews: false,
  sportsLive: false,
  zodiacLive: false,
  djMixRooms: false,
  comedyLive: false,
  quizLive: false,

  // Spotlight
  creatorOfDay: false,
  risingStars: false,
  cosplayLive: false,
  asmrRooms: false,
  cryptoLive: false,
  magicLive: false,

  // Footer-ish
  coinRechargePromo: false,
  categoriesGrid: false,
  topCreatorsBoard: false,
  multiGuestRecommended: false,

  // Legacy names kept so existing references keep compiling
  pkBattles: false,
  voiceRooms: false,
  spotlight: false,
  awards: false,
  highlights: false,
  dailyPicks: false,
  events: false,
  zodiac: false,
  diamondShowers: false,
  scheduledStreams: false,
  newHosts: false,
} as const;

export type LiveFeatureFlag = keyof typeof LIVE_FEATURE_FLAGS;
