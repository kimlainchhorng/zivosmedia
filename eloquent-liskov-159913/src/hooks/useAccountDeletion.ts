/**
 * Account Deletion Hook
 * Handles account deletion requests (Apple/Google App Store requirement)
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays } from 'date-fns';

interface DeletionRequest {
  id: string;
  user_id: string;
  reason: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  scheduled_for: string;
  created_at: string;
}

export function useAccountDeletion() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch existing deletion request
  const { data: deletionRequest, isLoading } = useQuery({
    queryKey: ['account-deletion', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle() as any;

      if (error) throw error;
      return data as DeletionRequest | null;
    },
    enabled: !!user,
  });

  // Request account deletion
  const requestDeletion = useMutation({
    mutationFn: async (reason?: string) => {
      if (!user) throw new Error('Not authenticated');

      // Schedule deletion for 30 days from now (grace period)
      const scheduledFor = addDays(new Date(), 30);

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          reason: reason || null,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString(),
        })
        .select()
        .single() as any;

      if (error) throw error;
      return data as DeletionRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-deletion'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to request deletion');
    },
  });

  // Cancel deletion request
  const cancelDeletion = useMutation({
    mutationFn: async () => {
      if (!user || !deletionRequest) throw new Error('No deletion request found');

      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', deletionRequest.id) as any;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-deletion'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to cancel deletion');
    },
  });

  // Immediately delete account (dangerous - for testing/admin use)
  const deleteNow = useCallback(async () => {
    if (!user) return;

    try {
      // In production, this would:
      // 1. Cancel active subscriptions
      // 2. Delete user data across all tables
      // 3. Delete auth user

      // For now, sign out and mark as completed
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }, [user, signOut]);

  return {
    deletionRequest,
    isLoading,
    error,
    hasPendingDeletion: !!deletionRequest,
    daysRemaining: deletionRequest
      ? Math.max(0, Math.ceil((new Date(deletionRequest.scheduled_for).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null,
    requestDeletion: requestDeletion.mutateAsync,
    cancelDeletion: cancelDeletion.mutateAsync,
    deleteNow,
    isRequesting: requestDeletion.isPending,
    isCancelling: cancelDeletion.isPending,
  };
}
