import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const owner='00000000-0000-4000-8000-000000000001',friend='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
create function public.has_role(uuid,text) returns boolean language sql stable as $$select false$$;
create function public.is_admin(uuid) returns boolean language sql stable as $$select false$$;
create table public.user_posts(id integer primary key,user_id uuid,visibility text,visibility_hidden_from uuid[],is_published boolean,hidden_at timestamptz);
alter table public.user_posts enable row level security;grant select on public.user_posts to anon,authenticated;
create policy old_permissive on public.user_posts for select using(true);
create table public.friendships(user_id uuid,friend_id uuid,status text);alter table public.friendships enable row level security;grant select on public.friendships to anon,authenticated;
create policy participants on public.friendships for select using(auth.uid() in(user_id,friend_id));
create table public.stories(id integer primary key);create table public.story_views(id integer primary key);create publication supabase_realtime;
insert into public.friendships values('${owner}','${friend}','accepted');
insert into public.user_posts values
(1,'${owner}','everyone','{}',true,null),(2,'${owner}','public','{}',true,null),
(3,'${owner}','friends','{}',true,null),(4,'${owner}','onlyme','{}',true,null),
(5,'${owner}','everyone','{}',false,null),(6,'${owner}','everyone','{}',true,now()),
(7,'${owner}','everyone',array['${friend}']::uuid[],true,null);`);
for(const name of ['20260909005356_media_operations_hiring_and_monitor.sql','20260909005359_media_social_realtime_visibility.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
async function as(role,id,query){await db.exec(`begin;set local role ${role};select set_config('request.jwt.claim.sub','${id || ''}',true);`);try{return(await db.query(query)).rows;}finally{await db.exec('rollback');}}
assert.deepEqual((await as('anon','', 'select id from user_posts order by id')).map(x=>x.id),[1,2,7]);
assert.deepEqual((await as('authenticated',friend,'select id from user_posts order by id')).map(x=>x.id),[1,2,3]);
assert.deepEqual((await as('authenticated',other,'select id from user_posts order by id')).map(x=>x.id),[1,2,7]);
assert.equal((await as('authenticated',owner,'select id from user_posts')).length,7);
await db.exec(`insert into public.zivo_hiring_applications(id,full_name,contact,employment_type,availability,experience,consent_version) values('${owner}','Fixture only','fixture@example.invalid','full-time','Next month','','2026-09-09');`);
assert.deepEqual(await as('authenticated',other,'select id from zivo_hiring_applications'),[]);
await assert.rejects(()=>as('anon','','select id from zivo_hiring_applications'),e=>e.code==='42501');
await assert.rejects(()=>as('authenticated',owner,`insert into zivo_hiring_applications(id,full_name,contact,employment_type,availability,consent_version) values('${friend}','Forged','fake@example.invalid','full-time','Now','2026-09-09')`),e=>e.code==='42501');
await assert.rejects(()=>as('anon','','select claim_media_operations_tick()'),e=>e.code==='42501');
await db.exec('begin;set local role service_role;');
assert.equal((await db.query('select claim_media_operations_tick() as claimed')).rows[0].claimed,true);
assert.equal((await db.query('select claim_media_operations_tick() as claimed')).rows[0].claimed,false);
await db.exec('rollback');await db.close();
console.log('Post visibility, private hiring intake, denied writes, and exclusive monitoring lease passed with isolated PostgreSQL fixtures.');
