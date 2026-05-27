/**
 * ChatErrorBoundary
 * -----------------
 * Catches render-time exceptions inside chat thread / hub so a single bad
 * message (malformed metadata, bad sticker JSON, etc.) does not blank the
 * whole app. Shows a recoverable fallback with a "Reload" action and reports
 * the error to the console + telemetry pipeline (if `window.zivoLogError`
 * is registered).
 */
import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional override for the heading text. */
  title?: string;
  /** Called when the user clicks "Reload" after a crash. */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export default class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ChatErrorBoundary] render crash", error, info);
    try {
      const reporter = (window as any).zivoLogError;
      if (typeof reporter === "function") {
        reporter("chat_render_crash", { message: String(error), info });
      }
    } catch {
      /* noop */
    }
  }

  reset = () => {
    this.setState({ hasError: false, message: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-bold">{this.props.title ?? "Something went wrong"}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We hid a broken piece of this conversation so the app stays running.
            {this.state.message && (
              <span className="block mt-1 text-[11px] text-muted-foreground/70 font-mono break-all">
                {this.state.message.slice(0, 200)}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
        >
          <RotateCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
