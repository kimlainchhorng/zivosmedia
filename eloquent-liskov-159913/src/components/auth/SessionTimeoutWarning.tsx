import { Clock, RefreshCw, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface SessionTimeoutWarningProps {
  open: boolean;
  minutesRemaining: number | null;
  onStaySignedIn: () => Promise<boolean> | void;
  onSignOut: () => void;
  isRefreshing?: boolean;
}

export default function SessionTimeoutWarning({
  open,
  minutesRemaining,
  onStaySignedIn,
  onSignOut,
  isRefreshing = false,
}: SessionTimeoutWarningProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session will expire in{" "}
            <span className="font-bold text-foreground">
              {minutesRemaining} {minutesRemaining === 1 ? "minute" : "minutes"}
            </span>
            . Would you like to stay signed in?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground text-center">
          For your security, sessions expire after a period of inactivity.
          Click "Stay Signed In" to continue your session.
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onSignOut}
            disabled={isRefreshing}
            className="w-full sm:w-auto rounded-xl h-11 active:scale-95 transition-all duration-200 touch-manipulation"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          <Button
            onClick={() => onStaySignedIn()}
            disabled={isRefreshing}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-teal-400 text-primary-foreground rounded-xl h-11 shadow-md active:scale-95 transition-all duration-200 touch-manipulation"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Stay Signed In"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
