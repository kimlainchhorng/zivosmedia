/**
 * GroupCreationErrorToast — compact error toast with collapsible details
 * Used by CreateGroupModal to surface Supabase error message/details/hint/code.
 */
import { useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

export interface GroupErrorDetails {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function GroupCreationErrorToast({
  title = "Failed to create group",
  summary,
  details,
}: {
  title?: string;
  summary: string;
  details: GroupErrorDetails;
}) {
  const [open, setOpen] = useState(false);
  const hasAny =
    !!(details.message || details.details || details.hint || details.code);

  return (
    <div className="w-full max-w-[340px]">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug break-words">
            {summary}
          </p>

          {hasAny && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {open ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide error details
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  View error details
                </>
              )}
            </button>
          )}

          {open && hasAny && (
            <div className="mt-1.5 rounded-lg bg-muted/60 border border-border/40 px-2 py-1.5 text-[11px] text-foreground/90 space-y-0.5 break-words">
              {details.message && (
                <div>
                  <span className="font-semibold">Message:</span>{" "}
                  {details.message}
                </div>
              )}
              {details.details && (
                <div>
                  <span className="font-semibold">Details:</span>{" "}
                  {details.details}
                </div>
              )}
              {details.hint && (
                <div>
                  <span className="font-semibold">Hint:</span> {details.hint}
                </div>
              )}
              {details.code && (
                <div>
                  <span className="font-semibold">Code:</span> {details.code}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
