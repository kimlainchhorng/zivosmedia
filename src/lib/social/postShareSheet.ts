export interface PostShareSheetTarget {
  postId: string;
  url: string;
  title?: string;
  text?: string;
  imageUrl?: string | null;
  /** Called when an in-app DM share is selected. */
  onSendToFriend?: () => void;
  /** Called after any successful share so the parent can bump shares_count. */
  onShared?: (channel: string) => void;
}

type SetPostShareSheetTarget = (target: PostShareSheetTarget | null) => void;

let setSheetTarget: SetPostShareSheetTarget | null = null;

/** Imperative open: call from anywhere after the global sheet has mounted. */
export function openPostShareSheet(target: PostShareSheetTarget) {
  if (setSheetTarget) setSheetTarget(target);
}

export function registerPostShareSheetTargetSetter(setter: SetPostShareSheetTarget) {
  setSheetTarget = setter;
  return () => {
    if (setSheetTarget === setter) setSheetTarget = null;
  };
}
