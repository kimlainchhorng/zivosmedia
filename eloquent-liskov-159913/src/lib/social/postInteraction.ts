export const isLocalDraftPostId = (postId: string) => postId.startsWith("post-");

export const toUserPostInteractionId = (postId: string) =>
  postId.startsWith("u-") ? postId : `u-${postId}`;