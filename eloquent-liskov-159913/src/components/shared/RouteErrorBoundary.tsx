/**
 * Route-level Error Boundary
 * Wraps individual route groups so a crash in one page doesn't take down the whole app.
 * Shows a compact recovery UI with navigation back to safety.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional label for the section (e.g., "Flights", "Hotels") */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[RouteError${this.props.section ? `:${this.props.section}` : ""}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-1.5">
              {this.props.section ? `${this.props.section} Error` : "Page Error"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              This page encountered an error. The rest of the app is still working.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted/50 rounded-xl p-3 mb-5 overflow-auto max-h-24 text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2.5 justify-center flex-wrap">
              <Button size="sm" onClick={this.handleRetry} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={this.handleGoBack} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Go Back
              </Button>
              <Button size="sm" variant="ghost" onClick={this.handleGoHome} className="gap-1.5">
                <Home className="w-3.5 h-3.5" />
                Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
