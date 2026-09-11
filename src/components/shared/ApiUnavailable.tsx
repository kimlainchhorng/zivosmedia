import { useI18n } from "@/hooks/useI18n";

/** A failed read is not evidence that an account has no records. */
export function ApiUnavailable({ area, retry, busy = false }: {
  area: "stories" | "orders"; retry: () => void; busy?: boolean;
}) {
  const { currentLanguage: language } = useI18n();
  const km = language === "km";
  return <div role="alert" className="mx-3 my-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
    <span>{area === "stories"
      ? km ? "មិនអាចផ្ទុករឿងបាន។ សូមព្យាយាមម្ដងទៀត។" : "Stories could not load. Please try again."
      : km ? "មិនអាចផ្ទុកប្រវត្តិការបញ្ជាទិញបាន។" : "Order history could not load."}</span>
    <button type="button" onClick={retry} disabled={busy} className="min-h-11 shrink-0 px-3 font-semibold underline disabled:opacity-50">{km ? "ព្យាយាមម្ដងទៀត" : "Retry"}</button>
  </div>;
}
