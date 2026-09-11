import { beforeEach,describe,it,expect,vi } from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
const m=vi.hoisted(()=>({invoke:vi.fn(),from:vi.fn(),language:'en'}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:m.invoke},from:m.from}}));
vi.mock('@/hooks/useI18n',()=>({useI18n:()=>({currentLanguage:m.language})}));
vi.mock('@/components/Header',()=>({default:()=>null}));
vi.mock('@/components/Footer',()=>({default:()=>null}));
vi.mock('@/components/SEOHead',()=>({default:()=>null}));
import Careers from '@/pages/Careers';
import {fetchOwnerBusinessPage,useOwnerBusinessPage} from '@/hooks/useOwnerBusinessPage';
function setup(){render(<MemoryRouter><Careers/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Full name'),{target:{value:'Fixture Applicant'}});fireEvent.change(screen.getByLabelText('Email, phone number, or @Telegram username'),{target:{value:'fixture@example.invalid'}});fireEvent.change(screen.getByLabelText('When can you start, and what hours are you available?'),{target:{value:'Next month'}});fireEvent.click(screen.getByRole('checkbox'));}
beforeEach(()=>{cleanup();vi.clearAllMocks();m.language='en';});
describe('careers persistence and recovery',()=>{
  it('retains the draft/reference on unconfirmed save and confirms an idempotent retry',async()=>{
    m.invoke.mockResolvedValueOnce({data:null,error:new Error('temporary')}).mockImplementationOnce((_name,{body})=>Promise.resolve({data:{accepted:true,id:body.id},error:null}));
    setup();fireEvent.click(screen.getByRole('button',{name:'Send application'}));await screen.findByRole('alert');expect(screen.getByLabelText('Full name')).toHaveValue('Fixture Applicant');
    const first=m.invoke.mock.calls[0][1].body.id;fireEvent.click(screen.getByRole('button',{name:'Send application'}));await screen.findByText('Your application has been received.');expect(m.invoke.mock.calls[1][1].body.id).toBe(first);
  });
  it('does not accept a false success or duplicate an in-flight submission',async()=>{
    let finish:(v:unknown)=>void=()=>{};m.invoke.mockReturnValue(new Promise(resolve=>{finish=resolve}));setup();const button=screen.getByRole('button',{name:'Send application'});fireEvent.click(button);fireEvent.click(button);expect(m.invoke).toHaveBeenCalledTimes(1);finish({data:{accepted:true,id:'wrong-reference'},error:null});await screen.findByRole('alert');
  });
  it('shows supplied Khmer hiring facts and the exact Telegram destination',()=>{
    m.language='km';render(<MemoryRouter><Careers/></MemoryRouter>);expect(screen.getByRole('link',{name:'ដាក់ពាក្យតាម Telegram'})).toHaveAttribute('href','https://t.me/Zivo_Media');expect(screen.getByText('ប្រាក់ខែ $250 ក្នុងមួយខែ')).toBeVisible();
  });
});
describe('owner business page reads',()=>{
  it('uses owner restriction, literal search, bounded pages and stable ordering',async()=>{
    const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),ilike:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:[],error:null,count:267})};m.from.mockReturnValue(q);
    expect((await fetchOwnerBusinessPage('owner','10%_',2)).total).toBe(267);expect(q.eq).toHaveBeenCalledWith('owner_id','owner');expect(q.range).toHaveBeenCalledWith(12,17);expect(q.ilike).toHaveBeenCalledWith('name','%10\\%\\_%');expect(q.order.mock.calls).toEqual([['name'],['id']]);
  });
  it('does not treat a failed page as confirmed empty',async()=>{
    const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:null,error:new Error('denied'),count:null})};m.from.mockReturnValue(q);await expect(fetchOwnerBusinessPage('owner','',0)).rejects.toThrow('denied');
  });
  it('keeps a held old-account result outside the new-account page',async()=>{
    let resolveOld:(x:unknown)=>void=()=>{};let calls=0;const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockImplementation(()=>++calls===1?new Promise(r=>resolveOld=r):Promise.resolve({data:[{id:'new',name:'Current'}],error:null,count:1}))};m.from.mockReturnValue(q);
    const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});function Page({user}:{user:string}){const {data}=useOwnerBusinessPage(user,'',0);return <div>{data?.rows[0]?.name||'Loading'}</div>;}const ui=(user:string)=><QueryClientProvider client={qc}><Page user={user}/></QueryClientProvider>;
    const view=render(ui('old'));await waitFor(()=>expect(q.range).toHaveBeenCalledTimes(1));view.rerender(ui('new'));await screen.findByText('Current');resolveOld({data:[{id:'old',name:'Old private page'}],error:null,count:1});await waitFor(()=>expect(qc.getQueryData(['owner-business-page','old','',0])).toBeDefined());expect(screen.getByText('Current')).toBeVisible();expect(screen.queryByText('Old private page')).toBeNull();
  });
});
