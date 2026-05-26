import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Credit {
  id: string;
  user_id: string;
  amount: number;
  credit_type: 'referral_earned' | 'referral_bonus' | 'first_booking' | 'cross_sell' | 'promo' | 'refund' | 'manual';
  source_service: 'flights' | 'cars' | 'rides' | 'eats' | 'move' | 'global' | null;
  usable_on: string[];
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  expires_at: string | null;
  used_amount: number;
  used_at: string | null;
  used_on_service: string | null;
  is_expired: boolean;
  created_at: string;
}

export interface CreditSummary {
  totalBalance: number;
  available: number;
  pending: number;
  expiringSoon: number;
  byService: Record<string, number>;
}

export const useCredits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all credits
  const { data: credits, isLoading } = useQuery({
    queryKey: ['credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('zivo_credits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Credit[];
    },
    enabled: !!user?.id,
  });

  // Calculate summary
  const getSummary = (): CreditSummary => {
    if (!credits) {
      return { totalBalance: 0, available: 0, pending: 0, expiringSoon: 0, byService: {} };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let available = 0;
    let expiringSoon = 0;
    const byService: Record<string, number> = {
      flights: 0,
      cars: 0,
      rides: 0,
      eats: 0,
      move: 0,
    };

    for (const credit of credits) {
      const remaining = credit.amount - credit.used_amount;
      
      if (remaining <= 0) continue;
      if (credit.is_expired) continue;
      if (credit.expires_at && new Date(credit.expires_at) < now) continue;

      available += remaining;

      // Check if expiring soon
      if (credit.expires_at && new Date(credit.expires_at) < thirtyDaysFromNow) {
        expiringSoon += remaining;
      }

      // Add to service-specific balances
      if (credit.usable_on) {
        for (const service of credit.usable_on) {
          if (byService[service] !== undefined) {
            byService[service] += remaining;
          }
        }
      }
    }

    return {
      totalBalance: available,
      available,
      pending: 0,
      expiringSoon,
      byService,
    };
  };

  // Get balance for specific service
  const getBalanceForService = (service: string): number => {
    if (!credits) return 0;
    
    const now = new Date();
    let balance = 0;

    for (const credit of credits) {
      const remaining = credit.amount - credit.used_amount;
      
      if (remaining <= 0) continue;
      if (credit.is_expired) continue;
      if (credit.expires_at && new Date(credit.expires_at) < now) continue;
      if (!credit.usable_on?.includes(service)) continue;

      balance += remaining;
    }

    return balance;
  };

  // Get credits expiring soon
  const getExpiringCredits = (days: number = 30): Credit[] => {
    if (!credits) return [];
    
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return credits.filter(credit => {
      const remaining = credit.amount - credit.used_amount;
      if (remaining <= 0) return false;
      if (credit.is_expired) return false;
      if (!credit.expires_at) return false;
      
      const expiresAt = new Date(credit.expires_at);
      return expiresAt > now && expiresAt < cutoff;
    });
  };

  // Use credits on a booking
  const useCredits = useMutation({
    mutationFn: async ({ 
      amount, 
      service, 
      bookingId 
    }: { 
      amount: number; 
      service: string; 
      bookingId: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get available credits for this service
      const availableCredits = credits?.filter(c => {
        const remaining = c.amount - c.used_amount;
        if (remaining <= 0) return false;
        if (c.is_expired) return false;
        if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
        return c.usable_on?.includes(service);
      }).sort((a, b) => {
        // Prioritize expiring credits
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      }) || [];

      let remainingToUse = amount;
      const updates: { id: string; used_amount: number }[] = [];

      for (const credit of availableCredits) {
        if (remainingToUse <= 0) break;
        
        const available = credit.amount - credit.used_amount;
        const toUse = Math.min(available, remainingToUse);
        
        updates.push({
          id: credit.id,
          used_amount: credit.used_amount + toUse,
        });
        
        remainingToUse -= toUse;
      }

      if (remainingToUse > 0) {
        throw new Error('Insufficient credits');
      }

      // Apply updates
      for (const update of updates) {
        const { error } = await supabase
          .from('zivo_credits')
          .update({
            used_amount: update.used_amount,
            used_at: new Date().toISOString(),
            used_on_service: service,
            used_on_booking_id: bookingId,
          })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      return { applied: amount };
    },
    onSuccess: (data) => {
      toast.success(`Applied $${data.applied.toFixed(2)} in credits`);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    credits,
    isLoading,
    summary: getSummary(),
    getBalanceForService,
    getExpiringCredits,
    useCredits,
  };
};
