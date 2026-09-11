import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook, waitFor } from "@testing-library/react";
const mock = vi.hoisted(() => ({ from: vi.fn(), language: "en" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mock.from } }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ currentLanguage: mock.language }) }));
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchRecentEatsOrders, useRecentEatsOrders } from "@/hooks/useRecentEatsOrders";
import { ApiUnavailable } from "@/components/shared/ApiUnavailable";
afterEach(() => { cleanup(); vi.clearAllMocks(); mock.language = "en"; });
function result(data: unknown, error: unknown = null) {
 const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
 chain.select.mockReturnValue(chain);chain.eq.mockReturnValue(chain);chain.order.mockReturnValue(chain);chain.limit.mockResolvedValue({data,error});mock.from.mockReturnValue(chain);return chain;
}
it('uses live restaurant ownership and skips missing/duplicate restaurants', async () => {
 const chain = result([{restaurant_id:'r1',restaurants:{name:'One',cuisine_type:'Khmer'}},{restaurant_id:'r1',restaurants:{name:'One',cuisine_type:'Khmer'}},{restaurant_id:'r2',restaurants:null}]);
 expect(await fetchRecentEatsOrders('owner-a')).toEqual([{store_id:'r1',store_name:'One',cuisine:'Khmer'}]);
 expect(chain.eq).toHaveBeenCalledWith('customer_id','owner-a');
 expect(chain.select).toHaveBeenCalledWith('restaurant_id, restaurants!food_orders_restaurant_id_fkey(name, cuisine_type)');
});
it('failed history does not become a successful empty result', async () => {
 result(null,{code:'42501'});await expect(fetchRecentEatsOrders('owner-b')).rejects.toEqual({code:'42501'});
});
it.each(['en','km'])('shows a retryable error rather than zero orders in %s', lang => {
 mock.language=lang;const retry=vi.fn();render(<ApiUnavailable area="orders" retry={retry}/>);
 expect(screen.getByRole('alert')).toBeVisible();fireEvent.click(screen.getByRole('button'));expect(retry).toHaveBeenCalledOnce();
});
it('blocks duplicate retries while a request is pending',()=>{
 const retry=vi.fn();render(<ApiUnavailable area="stories" retry={retry} busy/>);fireEvent.click(screen.getByRole('button'));expect(retry).not.toHaveBeenCalled();
});

it('a late previous-account response cannot replace current-account history', async () => {
 let resolveOld!: (value: unknown) => void;
 const old = new Promise(resolve => { resolveOld = resolve; });
 const chain = result([]);
 chain.limit.mockImplementationOnce(() => old).mockResolvedValueOnce({data:[{restaurant_id:'new',restaurants:{name:'Current',cuisine_type:'Khmer'}}],error:null});
 const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
 const wrapper = ({children}:{children:ReactNode}) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
 const hook = renderHook(({id})=>useRecentEatsOrders(id),{initialProps:{id:'old-owner'},wrapper});
 await waitFor(()=>expect(chain.limit).toHaveBeenCalledTimes(1));
 hook.rerender({id:'current-owner'});
 await waitFor(()=>expect(hook.result.current.data?.[0]?.store_name).toBe('Current'));
 resolveOld({data:[{restaurant_id:'old',restaurants:{name:'Previous private history',cuisine_type:''}}],error:null});
 await waitFor(()=>expect(client.getQueryData(['eats-recent-orders','old-owner'])).toBeDefined());
 expect(hook.result.current.data?.[0]?.store_name).toBe('Current');
 hook.unmount();client.clear();
});
