export type DirectMessageHit = {
  sourceType: "dm";
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
};

export type GroupMessageHit = {
  sourceType: "group";
  id: string;
  message: string;
  sender_id: string;
  group_id: string;
  group_name: string;
  created_at: string;
};

export type MessageHit = DirectMessageHit | GroupMessageHit;

export function mergeGlobalMessageHits(
  directHits: DirectMessageHit[],
  groupHits: GroupMessageHit[],
  limit = 10,
): MessageHit[] {
  return [...directHits, ...groupHits]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit);
}

export function buildGlobalMessageHitPath(hit: MessageHit, currentUserId: string) {
  if (hit.sourceType === "group") {
    return `/chat?group=${encodeURIComponent(hit.group_id)}&msg=${encodeURIComponent(hit.id)}`;
  }
  const partnerId = hit.sender_id === currentUserId ? hit.receiver_id : hit.sender_id;
  return `/chat?with=${encodeURIComponent(partnerId)}&msg=${encodeURIComponent(hit.id)}`;
}
