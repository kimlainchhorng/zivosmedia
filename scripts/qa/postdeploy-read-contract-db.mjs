// Offline PostgreSQL security test. No connection to Supabase or payment providers.
// Install @electric-sql/pglite@0.5.8 in a temporary prefix; point PGLITE_MODULE
// at its dist/index.js. This is test-only and never imported by the website.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
if (!process.env.PGLITE_MODULE) throw new Error('PGLITE_MODULE must point to the isolated test dependency');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
const a='00000000-0000-0000-0000-00000000000a', b='00000000-0000-0000-0000-00000000000b', store='00000000-0000-0000-0000-00000000000c';
try {
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 create table public.stories(id uuid primary key,user_id uuid references auth.users(id),expires_at timestamptz);
 alter table public.stories enable row level security;
 grant select on public.stories to anon,authenticated;
 create policy active_stories on public.stories for select using(expires_at>now());
 create table public.customer_payout_methods(id uuid primary key,user_id uuid references auth.users(id),store_id uuid,method_type text,rail text,label text,bank_name text,account_holder_name text,account_number text,aba_account_id text,country_code text,is_default boolean,is_verified boolean,verification_status text,verification_note text,created_at timestamptz default now(),updated_at timestamptz default now());
 alter table public.customer_payout_methods enable row level security;
 insert into auth.users values('${a}'),('${b}');
 insert into customer_payout_methods(id,user_id,store_id,method_type,account_number,verification_note) values
 ('00000000-0000-0000-0000-000000000001','${a}',null,'bank_transfer','ACCOUNT-FIRST-1234','Private finance evidence'),
 ('00000000-0000-0000-0000-000000000002','${b}','${store}','bank_transfer','ACCOUNT-SECOND-5678','Other evidence');`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20260908225412_postdeploy_story_payout_read_contract.sql',import.meta.url),'utf8'));
 await db.exec(`insert into stories(id,user_id,expires_at,hidden_at) values
 ('00000000-0000-0000-0000-000000000010','${b}',now()+interval '1 day',now());
 set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
 const own=(await db.query("select * from list_own_customer_payout_methods('all',null)")).rows;
 assert.equal(own.length,1);assert.equal(own[0].user_id,a);assert.equal(own[0].destination_last4,'1234');
 assert.equal(own[0].verification_note,null);assert.equal(own[0].verified_at,null);
 assert.equal('account_number' in own[0],false);assert.equal('aba_account_id' in own[0],false);
 assert.equal((await db.query("select * from list_own_customer_payout_methods('store',$1)",[store])).rows.length,0);
 assert.equal((await db.query('select * from stories')).rows.length,0);
 await assert.rejects(db.query("select * from list_own_customer_payout_methods(null,null)"),error=>error.code==='22023');
 await assert.rejects(db.query("select * from list_own_customer_payout_methods('store',null)"),error=>error.code==='22023');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
 const other=(await db.query("select * from list_own_customer_payout_methods('all',null)")).rows;
 assert.equal(other.length,1);assert.equal(other[0].destination_last4,'5678');assert.equal(other[0].user_id,b);
 assert.equal((await db.query("select * from list_own_customer_payout_methods('account',null)")).rows.length,0);
 assert.equal((await db.query('select * from stories')).rows.length,1);
 await db.exec("select set_config('request.jwt.claim.sub','',false)");
 await assert.rejects(db.query("select * from list_own_customer_payout_methods('all',null)"),error=>error.code==='42501');
 await db.exec('reset role; set role anon;');
 await assert.rejects(db.query("select * from list_own_customer_payout_methods('all',null)"),error=>error.code==='42501');
 assert.equal((await db.query('select * from stories')).rows.length,0);
 console.log('Offline PostgreSQL: owner separation, masking, scopes, anonymous/no-identity denial and hidden-story policy passed.');
} finally { await db.close(); }
