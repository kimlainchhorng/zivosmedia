import {assertEquals,assertThrows} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {parseApplication} from './validation.ts';
const valid={id:'00000000-0000-4000-8000-000000000001',full_name:'Fixture Applicant',contact:'@fixture_user',employment_type:'full-time',availability:'Next month',experience:'',consent:true};
Deno.test('valid application normalizes only expected fields and records consent',()=>{
  const value=parseApplication({...valid,full_name:'  Fixture Applicant  ',notified_at:'forged',owner_id:'forged'});
  assertEquals(value.full_name,'Fixture Applicant');assertEquals(value.consent_version,'2026-09-09');assertEquals('notified_at' in value,false);
});
Deno.test('rejects missing consent, unknown work type, invalid contact and oversized content',()=>{
  for(const bad of [{consent:false},{employment_type:'invented'},{contact:'nonsense'},{id:'not-a-uuid'},{experience:'x'.repeat(1501)},{website:'spam'}])assertThrows(()=>parseApplication({...valid,...bad}));
});
