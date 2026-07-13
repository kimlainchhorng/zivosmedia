/* Deterministic, local, fictional fixtures for the Review build.
 * No real accounts, media, contacts, phone numbers, or data. No network, no imports. */
window.__FIXTURES__ = {
  users: {
    maya: { name: "Maya Chen", handle: "@maya.creates" },
    dara: { name: "Dara Sok", handle: "@darasok" },
    nita: { name: "Nita R.", handle: "@nita.rides" },
    vibol: { name: "Vibol", handle: "@vibol.eats" }
  },
  snapshots: [
    { id: "media-feed", group: "Media", label: "Feed" },
    { id: "media-profile", group: "Media", label: "Profile" },
    { id: "media-notifications", group: "Media", label: "Notifications" },
    { id: "chat-conversations", group: "Chat", label: "Conversations" },
    { id: "chat-direct", group: "Chat", label: "Direct message" },
    { id: "chat-payment-link", group: "Chat", label: "Payment link" }
  ],
  feed: [
    { user: "maya", caption: "Golden hour by the river 🌅 #phnompenh", likes: "1,204", comments: "86" },
    { user: "vibol", caption: "Best noodle stall in town, hands down.", likes: "642", comments: "41" }
  ],
  notifications: [
    { user: "dara", text: "started following you", when: "2h" },
    { user: "nita", text: "liked your post", when: "5h" },
    { user: "vibol", text: "mentioned you in a comment", when: "1d" }
  ],
  conversations: [
    { user: "dara", preview: "See you at 6 👍", when: "2h" },
    { user: "nita", preview: "📷 Photo", when: "1d" }
  ],
  direct: [
    { me: false, text: "Are we still on for tonight?" },
    { me: true, text: "Yes! See you at 6 👍" },
    { me: false, text: "Perfect 🙌" }
  ],
  paymentLink: {
    from: "dara",
    line: "Splitting lunch — here's your share",
    amount: "$8.75",
    status: "Processing",
    id: "pay_8ae4…10c"
  }
};
