import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getPublicOrigin } from '@/lib/getPublicOrigin';
import { REFERRAL_REWARDS, SHARE_MESSAGES } from '@/config/referralProgram';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  total_referrals: number;
  total_earnings: number;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  status: 'pending' | 'qualified' | 'credited' | 'expired';
  referrer_credit_amount: number;
  referee_credit_amount: number;
  first_booking_service: string | null;
  first_booking_at: string | null;
  credited_at: string | null;
  created_at: string;
}

export interface ReferralTier {
  id: string;
  tier_name: string;
  min_referrals: number;
  referrer_reward: number;
  referee_reward: number;
  is_active: boolean;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's referral code
  const { data: referralCode, isLoading: codeLoading } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get existing code
      const { data: existing } = await supabase
        .from('zivo_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existing) return existing as ReferralCode;
      
      // Generate new code via RPC
      const { data: newCode, error } = await supabase
        .rpc('get_or_create_referral_code', { p_user_id: user.id });
      
      if (error) throw error;
      
      // Fetch the created record
      const { data: created } = await supabase
        .from('zivo_referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      return created as ReferralCode;
    },
    enabled: !!user?.id,
  });

  // Get user's referrals (as referrer)
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('zivo_referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user?.id,
  });

  // Get referral tiers
  const { data: tiers } = useQuery({
    queryKey: ['referral-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zivo_referral_tiers')
        .select('*')
        .eq('is_active', true)
        .order('min_referrals', { ascending: true });
      
      if (error) throw error;
      return data as ReferralTier[];
    },
  });

  // Apply referral code (for new users)
  const applyReferralCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .rpc('process_referral_signup', { 
          p_referee_id: user.id, 
          p_referral_code: code.toUpperCase() 
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; credit_earned?: number };
      if (!result.success) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (data) => {
      toast.success(`Referral applied! You earned $${data.credit_earned} in credits`);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply referral code');
    },
  });

  // Get current tier based on referral count
  const getCurrentTier = () => {
    if (!tiers || !referralCode) return tiers?.[0];
    
    const count = referralCode.total_referrals || 0;
    let currentTier = tiers[0];
    
    for (const tier of tiers) {
      if (count >= tier.min_referrals) {
        currentTier = tier;
      }
    }
    
    return currentTier;
  };

  // Get next tier
  const getNextTier = () => {
    if (!tiers || !referralCode) return null;
    
    const count = referralCode.total_referrals || 0;
    
    for (const tier of tiers) {
      if (count < tier.min_referrals) {
        return tier;
      }
    }
    
    return null; // Already at max tier
  };

  // Generate share URL
  const getShareUrl = () => {
    if (!referralCode?.code) return '';
    return `${getPublicOrigin()}/signup?ref=${referralCode.code}`;
  };

  const writeClipboard = async (value: string) => {
    if (!value) return false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Some in-app browsers expose the API but still block it; fall back below.
      }
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (!copied) throw new Error('Copy command failed');
    return copied;
  };

  // Copy referral link
  const copyReferralLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    
    try {
      await writeClipboard(url);
      toast.success('Referral link copied!');
    } catch {
      toast.info('Referral link ready to share', {
        description: referralCode?.code
          ? `Copy code ${referralCode.code} from the invite card if your browser blocks clipboard access.`
          : url,
      });
    }
  };

  // Share via native share API
  const shareReferral = async () => {
    const url = getShareUrl();
    if (!url) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ZIVO',
          text: `${SHARE_MESSAGES.default} ${referralCode?.code}. New members get ${REFERRAL_REWARDS.newUser.points.toLocaleString()} ZIVO Points.`,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await copyReferralLink();
    }
  };

  return {
    referralCode,
    referrals,
    tiers,
    isLoading: codeLoading || referralsLoading,
    applyReferralCode,
    getCurrentTier,
    getNextTier,
    getShareUrl,
    copyReferralLink,
    shareReferral,
  };
};
