import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useBackgroundToolsUnavailable } from "@/lib/connectionDeferred";

export default function BackgroundToolsRecoveryNotice() {
  const unavailable = useBackgroundToolsUnavailable();
  const online = useOnlineStatus();
  const { locale } = useI18n();
  const khmer = locale === "km";
  if (!unavailable) return null;

  return (
    <aside
      data-no-auto-translate
      role="status"
      aria-live="polite"
      aria-labelledby="background-tools-recovery-title"
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] inset-x-4 z-[110] mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-lg"
    >
      <p id="background-tools-recovery-title" className="text-sm font-semibold">
        {khmer ? "មុខងារខ្លះមិនអាចផ្ទុកបាន" : "Some app tools couldn't load"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {online
          ? khmer
            ? "ផ្ទុកកម្មវិធីឡើងវិញដើម្បីសាកល្បងម្តងទៀត។ ការងារដែលមិនបានរក្សាទុកអាចបាត់បង់។"
            : "Reload to try again. Unsaved work may be lost."
          : khmer
            ? "សូមភ្ជាប់អ៊ីនធឺណិតវិញ។ រក្សាទំព័រនេះឱ្យនៅបើក ដើម្បីរក្សាការងាររបស់អ្នក។"
            : "Reconnect first. Keep this page open to preserve your work."}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={!online}
        onClick={() => {
          if (navigator.onLine) window.location.reload();
        }}
        className="mt-3 min-h-11 h-auto w-full gap-2 whitespace-normal py-2"
      >
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
        {khmer ? "ផ្ទុក ZIVO ឡើងវិញ" : "Reload ZIVO"}
      </Button>
    </aside>
  );
}
