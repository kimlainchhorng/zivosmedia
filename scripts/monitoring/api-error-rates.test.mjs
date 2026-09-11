import {test} from 'node:test';import assert from 'node:assert/strict';
import {assessRates,collectRates,endpoints,rateSql} from './api-error-rates.mjs';
test('alerts require enough 4xx and a 5% rate; no traffic is unknown',()=>{
 const rows=assessRates([{endpoint:endpoints[0],requests:60,errors4xx:3},{endpoint:endpoints[1],requests:100,errors4xx:3}]);
 assert.equal(rows[0].alert,true);assert.equal(rows[1].alert,false);assert.equal(rows[2].rate,null);
 assert.equal(assessRates([{endpoint:endpoints[0],requests:2,errors4xx:2}])[0].alert,false);
});
test('rejects malformed and duplicate metrics rather than declaring healthy',()=>{
 for(const rows of [null,[{endpoint:'/private',requests:1,errors4xx:1}],[{endpoint:endpoints[0],requests:1,errors4xx:2}]])assert.throws(()=>assessRates(rows));
});
test('reads aggregate allowlisted paths only, and treats query errors as unavailable',async()=>{
 assert.match(rateSql,/group by endpoint/);assert.doesNotMatch(rateSql,/authorization|email|user_id|event_message/i);
 await assert.rejects(()=>collectRates('test',async()=>new Response(JSON.stringify({error:'private diagnostic'}))),/Monitoring query failed/);
 await assert.rejects(()=>collectRates('test',async()=>new Response('',{status:403})),/HTTP 403/);
});
