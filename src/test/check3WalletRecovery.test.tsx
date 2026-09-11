import {act,cleanup,render,renderHook,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn(),user:{id:'owner-a',last_sign_in_at:'visit-a'},language:'en'}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user,session:null})}));
vi.mock('@/hooks/useI18n',()=>({useI18n:()=>({currentLanguage:mock.language})}));
vi.mock('@/lib/security/errorReporting',()=>({reportBoundaryError:vi.fn()}));
import {useStripePaymentMethods} from '@/hooks/useStripePaymentMethods';
import {CardReadError,classifyCardReadError} from '@/lib/walletCardRead';
import {WalletReadRecovery} from '@/components/wallet/WalletReadRecovery';
import WalletRouteBoundary from '@/components/wallet/WalletRouteBoundary';

let client:QueryClient;
const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(()=>{client=new QueryClient();mock.invoke.mockReset();mock.user={id:'owner-a',last_sign_in_at:'visit-a'};mock.language='en';});
afterEach(()=>{cleanup();client.clear();vi.useRealTimers();vi.restoreAllMocks();});
describe('wallet read recovery and session cache',()=>{
  it('reuses a successful list on remount but fetches for a new session',async()=>{
    mock.invoke.mockResolvedValue({data:{ok:true,cards:[],customer_id:'cus_should_not_escape'},error:null});
    const first=renderHook(useStripePaymentMethods,{wrapper});await waitFor(()=>expect(first.result.current.isSuccess).toBe(true));first.unmount();
    const next=renderHook(useStripePaymentMethods,{wrapper});expect(next.result.current.data).toEqual([]);expect(mock.invoke).toHaveBeenCalledTimes(1);
    mock.user={...mock.user,last_sign_in_at:'visit-b'};next.rerender();await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(2));
  });
  it('never shows an old account response after account switching',async()=>{
    let finish:(value:unknown)=>void=()=>{};mock.invoke.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({data:{ok:true,cards:[]},error:null});
    const result=renderHook(useStripePaymentMethods,{wrapper});await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(1));mock.user={id:'owner-b',last_sign_in_at:'visit-b'};result.rerender();
    await waitFor(()=>expect(result.result.current.isSuccess).toBe(true));await act(async()=>finish({data:{ok:true,cards:[{id:'pm_private',brand:'visa',last4:'4242',exp_month:1,exp_year:2030}]},error:null}));
    expect(result.result.current.data).toEqual([]);
  });
  it('recognizes legacy throttling 403 without treating a genuine denial as retryable',async()=>{
    const limited=await classifyCardReadError({context:new Response(JSON.stringify({error:'Too many requests'}),{status:403,headers:{'Retry-After':'10'}})});
    const denied=await classifyCardReadError({context:new Response(JSON.stringify({error:'Forbidden'}),{status:403})});
    expect(limited.kind).toBe('rate-limited');expect(limited.retryAt).toBeGreaterThan(Date.now()+9000);expect(denied.kind).toBe('forbidden');expect(limited.message).not.toContain('Too many');
  });
  it('backs off repeated read failures and stops after two automatic retries',async()=>{
    vi.useFakeTimers();mock.invoke.mockResolvedValue({data:null,error:new Error('network fixture')});
    const hook=renderHook(useStripePaymentMethods,{wrapper});
    await act(async()=>vi.advanceTimersByTimeAsync(50));expect(mock.invoke).toHaveBeenCalledTimes(1);
    await act(async()=>vi.advanceTimersByTimeAsync(1000));expect(mock.invoke).toHaveBeenCalledTimes(1);
    await act(async()=>vi.advanceTimersByTimeAsync(1100));expect(mock.invoke).toHaveBeenCalledTimes(2);
    await act(async()=>vi.advanceTimersByTimeAsync(4100));expect(mock.invoke).toHaveBeenCalledTimes(3);
    await act(async()=>vi.advanceTimersByTimeAsync(60_000));expect(mock.invoke).toHaveBeenCalledTimes(3);expect(hook.result.current.isError).toBe(true);
  });
  it('keeps an exhausted read retry budget when the route remounts',async()=>{
    vi.useFakeTimers();mock.invoke.mockResolvedValue({data:null,error:new Error('network fixture')});
    const first=renderHook(useStripePaymentMethods,{wrapper});
    await act(async()=>vi.advanceTimersByTimeAsync(10_000));expect(first.result.current.isError).toBe(true);expect(mock.invoke).toHaveBeenCalledTimes(3);
    first.unmount();renderHook(useStripePaymentMethods,{wrapper});
    await act(async()=>vi.advanceTimersByTimeAsync(10_000));expect(mock.invoke).toHaveBeenCalledTimes(3);
  });
  it('renders Khmer cooldown and unlocks Retry after the deadline without exposing JSON',async()=>{
    vi.useFakeTimers();mock.language='km';const retry=vi.fn();const err=new CardReadError('rate-limited',Date.now()+2000);
    render(<WalletReadRecovery error={err} pending={false} retry={retry}/>);
    expect(screen.getByText('សូមរង់ចាំបន្តិច')).toBeInTheDocument();expect(screen.getByRole('button')).toBeDisabled();
    await act(async()=>vi.advanceTimersByTimeAsync(2500));expect(screen.getByRole('button')).toBeEnabled();expect(document.body.textContent).not.toContain('{');
  });
  it('keeps wallet heading and retry after a render error; raw response is never shown',()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    const Broken=()=>{throw Error('{"error":"Too many requests"}');};
    render(<WalletRouteBoundary><Broken/></WalletRouteBoundary>);
    expect(screen.getByRole('heading',{name:'Wallet'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Retry'})).toBeEnabled();expect(document.body.textContent).not.toContain('Too many requests');
  });
});
