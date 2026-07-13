/* Deterministic, local, fictional fixtures for the safe Media Review build.
 * No real accounts, media, contacts, phone numbers, or data. No network, no imports. */
window.__FIXTURES__ = {
  users: {
    maya: { name: "Maya Chen", handle: "@maya.creates" },
    dara: { name: "Dara Sok", handle: "@darasok" },
    nita: { name: "Nita R.", handle: "@nita.rides" },
    vibol: { name: "Vibol", handle: "@vibol.eats" }
  },
  snapshots: [
    { id: "feed", label: "Feed" },
    { id: "post", label: "Post" },
    { id: "profile", label: "Profile" },
    { id: "private-profile", label: "Private profile" },
    { id: "search", label: "Search" },
    { id: "discovery", label: "Discovery" },
    { id: "notifications", label: "Notifications" },
    { id: "privacy", label: "Privacy" },
    { id: "block", label: "Block" },
    { id: "mute", label: "Mute" },
    { id: "report", label: "Report" },
    { id: "empty", label: "Empty" },
    { id: "offline", label: "Offline" },
    { id: "error", label: "Error" }
  ],
  feed: [
    { user: "maya", caption: "Golden hour by the river 🌅 #phnompenh", likes: "1,204", comments: "86" },
    { user: "vibol", caption: "Best noodle stall in town, hands down.", likes: "642", comments: "41" }
  ],
  post: {
    user: "maya", caption: "Golden hour by the river 🌅 #phnompenh", likes: "1,204", comments: "86",
    comments_list: [
      { user: "dara", text: "This is stunning ✨" },
      { user: "nita", text: "Where is this?" }
    ]
  },
  profile: { user: "maya", posts: "128", followers: "24.1k", following: "310", tiles: 9 },
  privateProfile: { user: "nita", followers: "5,902" },
  search: ["maya", "dara", "nita", "vibol"],
  discovery: 12,
  notifications: [
    { user: "dara", text: "started following you", when: "2h" },
    { user: "nita", text: "liked your post", when: "5h" },
    { user: "vibol", text: "mentioned you in a comment", when: "1d" }
  ],
  privacy: [
    { label: "Private account", sub: "Only approved followers see your posts", state: "Off" },
    { label: "Show phone number", sub: "Never shown to others", state: "Hidden" },
    { label: "Message requests", sub: "From people you don't follow", state: "Filtered" },
    { label: "Activity status", sub: "Show when you're active", state: "Off" }
  ],
  report: ["Spam", "Nudity or sexual content", "Hate speech or symbols", "Violence", "Scam or fraud", "I just don't like it"]
};
