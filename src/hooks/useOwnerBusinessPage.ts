import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export const BUSINESS_PAGE_SIZE = 6;
export async function fetchOwnerBusinessPage(userId: string, search: string, page: number) {
  if (!userId || !Number.isSafeInteger(page) || page < 0) throw new Error('Business list unavailable');
  let query = supabase.from('store_profiles')
    .select('id, name, category, logo_url, setup_complete', { count: 'exact' })
    .eq('owner_id', userId);
  const term = search.trim().slice(0, 80).replace(/[\\%_]/g, '\\$&');
  if (term) query = query.ilike('name', `%${term}%`);
  const { data, error, count } = await query.order('name').order('id').range(page * BUSINESS_PAGE_SIZE, (page + 1) * BUSINESS_PAGE_SIZE - 1);
  if (error || !Array.isArray(data) || count === null) throw error || new Error('Business list unavailable');
  return { rows: data, total: count };
}
export function useOwnerBusinessPage(userId: string | undefined, search: string, page: number) {
  return useQuery({ queryKey: ['owner-business-page', userId, search.trim(), page],
    queryFn: () => fetchOwnerBusinessPage(userId!, search, page), enabled: !!userId, retry: false, staleTime: 30_000 });
}
