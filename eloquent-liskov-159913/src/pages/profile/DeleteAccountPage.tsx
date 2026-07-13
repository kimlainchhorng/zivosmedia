/**
 * Delete Account Page
 * Apple/Google App Store compliant account deletion flow
 */

import { useState } from 'react';
import { useNavigate , Link} from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const {
    deletionRequest,
    isLoading,
    hasPendingDeletion,
    daysRemaining,
    requestDeletion,
    cancelDeletion,
    isRequesting,
    isCancelling,
  } = useAccountDeletion();

  const [reason, setReason] = useState('');
  const [confirmations, setConfirmations] = useState({
    understand: false,
    dataLoss: false,
    noRefunds: false,
  });

  const allConfirmed = confirmations.understand && confirmations.dataLoss && confirmations.noRefunds;

  const handleRequestDeletion = async () => {
    await requestDeletion(reason || undefined);
  };

  const handleCancelDeletion = async () => {
    await cancelDeletion();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 bg-background border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Delete Account</h1>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container max-w-2xl mx-auto px-4 py-6 space-y-6"
      >
        {hasPendingDeletion ? (
          // Pending deletion view
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Deletion Scheduled</CardTitle>
                  <CardDescription>
                    Your account will be deleted on{' '}
                    {deletionRequest && format(new Date(deletionRequest.scheduled_for), 'MMMM d, yyyy')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">{daysRemaining} days remaining</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  You can cancel this request anytime before the scheduled date to keep your account.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">What happens next:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Your account will remain active until the scheduled date
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    You can continue to use ZIVO normally
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    On the deletion date, all your data will be permanently removed
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    Active bookings will remain valid but cannot be modified after deletion
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancelDeletion}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Keep My Account
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Request deletion view
          <>
            {/* Warning */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-destructive">Delete Your Account</CardTitle>
                    <CardDescription>
                      This action cannot be undone after the grace period
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* What will be deleted */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What will be deleted:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Your profile and personal information
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Booking history and saved trips
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    ZIVO Miles and rewards balance
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Saved payment methods
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    All preferences and saved locations
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Reason (optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Why are you leaving? (Optional)</CardTitle>
                <CardDescription>
                  Help us improve ZIVO by sharing your feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tell us why you want to delete your account..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Confirmations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirm you understand:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="understand"
                    checked={confirmations.understand}
                    onCheckedChange={(checked) =>
                      setConfirmations(prev => ({ ...prev, understand: !!checked }))
                    }
                  />
                  <Label htmlFor="understand" className="text-sm leading-relaxed cursor-pointer">
                    I understand that after the 30-day grace period, my account and all associated data
                    will be permanently deleted and cannot be recovered.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="dataLoss"
                    checked={confirmations.dataLoss}
                    onCheckedChange={(checked) =>
                      setConfirmations(prev => ({ ...prev, dataLoss: !!checked }))
                    }
                  />
                  <Label htmlFor="dataLoss" className="text-sm leading-relaxed cursor-pointer">
                    I understand that I will lose all my ZIVO Miles, credits, and any unused rewards.
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="noRefunds"
                    checked={confirmations.noRefunds}
                    onCheckedChange={(checked) =>
                      setConfirmations(prev => ({ ...prev, noRefunds: !!checked }))
                    }
                  />
                  <Label htmlFor="noRefunds" className="text-sm leading-relaxed cursor-pointer">
                    I understand that past transactions are final and this deletion does not entitle me
                    to any refunds.
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={!allConfirmed || isRequesting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Request Account Deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account will be scheduled for deletion in 30 days. You can cancel this
                    request at any time before the deletion date.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRequestDeletion}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isRequesting ? 'Requesting...' : 'Delete My Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Help link */}
            <p className="text-center text-sm text-muted-foreground">
              Having issues?{' '}
              <Link to="/contact" className="text-primary hover:underline">
                Contact support
              </Link>{' '}
              instead.
            </p>
          </>
        )}
      </motion.main>
    </div>
  );
}
