import { Capacitor } from "@capacitor/core";
import { ActionSheet, ActionSheetButtonStyle } from "@capacitor/action-sheet";

export interface SheetAction {
  title: string;
  destructive?: boolean;
  cancel?: boolean;
}

export async function showActionSheet(
  title: string,
  actions: SheetAction[]
): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  const { index } = await ActionSheet.showActions({
    title,
    options: actions.map(a => ({
      title: a.title,
      style: a.destructive
        ? ActionSheetButtonStyle.Destructive
        : a.cancel
        ? ActionSheetButtonStyle.Cancel
        : ActionSheetButtonStyle.Default,
    })),
  });
  return index;
}
