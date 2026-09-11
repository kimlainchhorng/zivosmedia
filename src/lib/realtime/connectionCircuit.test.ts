import {describe,it,expect,vi} from 'vitest';
import {createClient} from '@supabase/supabase-js';
import {installRealtimeCircuit,liveUpdateSnapshot,retryLiveUpdates,setRealtimeRouteActive} from './connectionCircuit';
import {routeNeedsRealtime} from './routePolicy';

describe('Realtime circuit with the installed SDK transport',()=>{
  it('automatically retries five times, pauses static routes, preserves the cap and recovers explicitly',async()=>{
    vi.useFakeTimers();
    let attempts=0,fail=true;
    class Transport {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        attempts++;
        setTimeout(()=>{if(fail){this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);}
          else{this.readyState=1;this.onopen?.(new Event('open'));}},10);
      }
      send(raw:string){
        const m=JSON.parse(raw);
        if(m[3]==='phx_join'||m[3]==='phx_leave')queueMicrotask(()=>this.onmessage?.({data:JSON.stringify([m[0],m[1],m[2],'phx_reply',{status:'ok',response:{postgres_changes:[]}}])} as MessageEvent));
      }
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Transport as never}});
    installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
    client.channel('transport-health').subscribe();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(attempts).toBe(5);expect(liveUpdateSnapshot()).toBe('unavailable');
    client.realtime.connect();expect(attempts).toBe(5);
    setRealtimeRouteActive(false);expect(liveUpdateSnapshot()).toBe('idle');
    client.channel('static-registration').subscribe();await vi.advanceTimersByTimeAsync(1000);expect(attempts).toBe(5);
    setRealtimeRouteActive(true);await vi.advanceTimersByTimeAsync(1000);expect(attempts).toBe(5);expect(liveUpdateSnapshot()).toBe('unavailable');
    fail=false;retryLiveUpdates();await vi.advanceTimersByTimeAsync(100);
    expect(attempts).toBe(6);expect(liveUpdateSnapshot()).toBe('connected');
    setRealtimeRouteActive(false);await vi.advanceTimersByTimeAsync(100);expect(liveUpdateSnapshot()).toBe('idle');
    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });
  it('makes one attempt per page load, not a burst, while the endpoint is failing',async()=>{
    // The report was "the feed makes 5 attempts per load". Five is the whole
    // budget, spent over ~15s of exponential spacing -- but that is only true if
    // exactly one attempt is ever in flight. A burst would spend the budget
    // instantly and raise the banner in the first second. Pin the spacing.
    vi.useFakeTimers();
    let attempts=0;
    class Failing {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        attempts++;
        setTimeout(()=>{this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);},10);
      }
      send(){}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Failing as never}});
    installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
    client.channel('burst-check').subscribe();

    // First backoff is 1s, so nothing may retry inside it.
    await vi.advanceTimersByTimeAsync(900);
    expect(attempts,'a failing endpoint must not be retried inside the first backoff').toBe(1);
    // Second attempt lands after 1s, and still only one at a time.
    await vi.advanceTimersByTimeAsync(1_200);
    expect(attempts).toBe(2);
    // The budget is spent over seconds, not at once.
    await vi.advanceTimersByTimeAsync(40_000);
    expect(attempts).toBe(5);

    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });

  it('spends the whole failure budget on one exponential ladder, never a burst',async()=>{
    // The existing count-based assertions above are weaker than they look: the
    // guards in connectionCircuit.ts overlap, so several of them can be deleted
    // one at a time while every count still lands on 5. A mutation run proved it
    // -- dropping the (now < nextAttemptAt) reschedule, the reconnectAfterMs
    // override, the reconnectTimer.reset() in onClose, or the single-retryTimer
    // guard each left this file green. That is how "5 attempts, then 1, then 5
    // again" regressed twice without a test noticing.
    //
    // So pin the whole timeline, not two samples of a counter. Every attempt is
    // recorded with the moment the socket was constructed; the ladder below is
    // 1s/2s/4s/8s of backoff plus the 10ms each attempt takes to fail. Any burst,
    // any early retry, any second timer running alongside the circuit's own
    // moves one of these numbers.
    //
    // The expected offsets are written out literally on purpose. Deriving them
    // from realtimeBackoff() would make this test follow the ladder wherever it
    // went -- including to zero -- which is exactly what it exists to prevent.
    vi.useFakeTimers();
    const startedAt:number[]=[];const t0=Date.now();
    class Failing {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        startedAt.push(Date.now()-t0);
        setTimeout(()=>{this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);},10);
      }
      send(){}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Failing as never}});
    installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
    client.channel('ladder-check').subscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(startedAt,'a failing endpoint must be retried on the 1s/2s/4s/8s ladder -- one attempt per step, and no attempt before its backoff has elapsed').toEqual([0,1_010,3_020,7_030,15_040]);
    // Restated as the invariant the ladder exists to enforce, so a failure here
    // reads as "it bursted" rather than as an arithmetic mismatch.
    const gaps=startedAt.slice(1).map((at,index)=>at-startedAt[index]);
    expect(Math.min(...gaps),'two connection attempts landed inside one backoff window -- that is the burst this test exists to catch').toBeGreaterThanOrEqual(1_000);
    expect(gaps,'each retry must wait twice as long as the one before it').toEqual([...gaps].sort((a,b)=>a-b));
    expect(liveUpdateSnapshot()).toBe('unavailable');

    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });

  it('holds the ladder when several channels mount while the socket is down',async()=>{
    // This is the case that hid the bug. With a SINGLE channel every guard in
    // the circuit looks redundant -- delete any one of them and the ladder is
    // unchanged, so a one-channel test cannot tell a real guard from dead code.
    //
    // A real page is not one channel. The feed mounts several as their queries
    // resolve, and each subscribe() calls connect(). What stops the second and
    // third from connecting immediately is the (now < nextAttemptAt) reschedule
    // in socket.connect. Delete it with one channel: ladder unchanged. Delete it
    // with three: [0, 300, 600, 4610, 12620] -- three attempts inside the first
    // backoff window, which is the burst the banner flickers on.
    //
    // So the channels here mount staggered, like the page does.
    vi.useFakeTimers();
    const startedAt:number[]=[];const t0=Date.now();
    class Failing {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        startedAt.push(Date.now()-t0);
        setTimeout(()=>{this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);},10);
      }
      send(){}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Failing as never}});
    installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
    client.channel('feed-posts').subscribe();
    await vi.advanceTimersByTimeAsync(300);client.channel('feed-reactions').subscribe();
    await vi.advanceTimersByTimeAsync(300);client.channel('feed-presence').subscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(startedAt,'each channel that mounts during a backoff window must wait for the pending attempt, not start one of its own').toEqual([0,1_010,3_020,7_030,15_040]);
    // Stated again as the property, so a regression names itself.
    const insideFirstBackoff=startedAt.filter(at=>at>0&&at<1_000);
    expect(insideFirstBackoff,'channels mounting at 300ms and 600ms each opened a socket -- this is the burst').toEqual([]);
    expect(liveUpdateSnapshot()).toBe('unavailable');

    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });

  it('does not spend an extra attempt on every route change',async()=>{
    // Requirement, stated verbatim in the work order: "stop after N failures
    // rather than reconnecting on every route change". Navigating between two
    // realtime-active pages toggles routeActive off and on, which runs
    // activate() -> scheduleRetry() each time. If the failure budget or the
    // pending timer were reset by that, a user tapping between Feed and Chat
    // would re-open the socket on every tap and the banner would flicker with
    // it -- the "appearing and disappearing" symptom in the report.
    vi.useFakeTimers();
    const startedAt:number[]=[];const t0=Date.now();
    class Failing {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        startedAt.push(Date.now()-t0);
        setTimeout(()=>{this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);},10);
      }
      send(){}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Failing as never}});
    installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
    client.channel('route-churn').subscribe();
    for(let change=0;change<12;change++){
      await vi.advanceTimersByTimeAsync(300);
      setRealtimeRouteActive(false);setRealtimeRouteActive(true);
    }
    await vi.advanceTimersByTimeAsync(60_000);

    // Identical to the undisturbed ladder: twelve navigations bought nothing.
    expect(startedAt,'route changes must not buy extra connection attempts -- the budget is per page load, not per navigation').toEqual([0,1_010,3_020,7_030,15_040]);
    expect(liveUpdateSnapshot()).toBe('unavailable');

    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });

  it('opens no socket at all on a page that subscribes to nothing',async()=>{
    // Acceptance criterion: Hotels and Flights must never show "Live updates
    // unavailable". The banner is driven by circuit state, so the guarantee has
    // to be that a static route constructs zero sockets -- not that it opens one
    // and then tears it down, which would still flash the banner on the way.
    vi.useFakeTimers();
    let attempts=0;
    class Failing {
      static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
      readyState=0;binaryType='';onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;
      onclose:((e:CloseEvent)=>void)|null=null;onmessage:((e:MessageEvent)=>void)|null=null;
      constructor(){
        attempts++;
        setTimeout(()=>{this.readyState=3;this.onerror?.(new Event('error'));this.onclose?.({code:1011,wasClean:false} as CloseEvent);},10);
      }
      send(){}
      close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true} as CloseEvent));}
    }
    const client=createClient('https://example.supabase.co','public-key',{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:Failing as never}});
    installRealtimeCircuit(client.realtime);
    // routeNeedsRealtime('/hotels') is false, so this is the state the circuit is
    // in while that page is open.
    expect(routeNeedsRealtime('/hotels')).toBe(false);
    setRealtimeRouteActive(false);
    client.channel('hotels-should-not-connect').subscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(attempts,'a route that needs no live data must not construct a WebSocket, even once').toBe(0);
    expect(liveUpdateSnapshot(),'a static route must stay idle, so the "Live updates unavailable" banner never renders there').toBe('idle');

    const removed=client.removeAllChannels();await vi.advanceTimersByTimeAsync(35_000);await removed;
    vi.useRealTimers();
  });

  it('keeps live workflow routes enabled while static travel pages need no socket',()=>{
    for(const path of ['/flights','/hotels','/jobs','/contact','/legal/privacy','/login'])expect(routeNeedsRealtime(path)).toBe(false);
    for(const path of ['/feed','/chat','/wallet','/eats/orders/123','/hotels/booking/123'])expect(routeNeedsRealtime(path)).toBe(true);
  });
});
