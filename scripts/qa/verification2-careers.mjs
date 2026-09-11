import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const origin=process.env.VERIFICATION2_URL || 'http://127.0.0.1:5202';
if(!['http://127.0.0.1:5202','https://zivosmedia.com'].includes(origin))throw Error('Unexpected verification origin');
const b=await chromium.launch({headless:true});
try {for(const [viewport,width,height] of [['desktop',1366,900],['mobile',390,844]])for(const language of ['en','km']){
  const context=await b.newContext({viewport:{width,height},serviceWorkers:'block'});const page=await context.newPage();const stripe=[],warnings=[],errors=[];let calls=0,firstId;
  page.on('request',r=>{if(/^https:\/\/(?:js|m)\.stripe\.com\//.test(r.url()))stripe.push('stripe');});
  page.on('console',m=>{if(/permissions policy.*payment|payment.*not allowed/i.test(m.text()))warnings.push('payment');});page.on('pageerror',e=>errors.push(e.name));
  // A form fixture verifies UI recovery without storing an application or notifying anyone.
  await page.route('**/functions/v1/media-operations',async route=>{const body=route.request().postDataJSON();calls++;if(calls===1){firstId=body.id;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Fixture failure'})});}else{assert.equal(body.id,firstId);await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({accepted:true,id:body.id})});}});
  await page.goto(origin+'/jobs?lang='+language,{waitUntil:'domcontentloaded'});
  const km=language==='km';await page.getByRole('heading',{level:1,name:km?'ចូលរួមជាមួយក្រុម ZIVO':'Build your future with ZIVO'}).waitFor({timeout:45000});
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.getByRole('link',{name:km?'ដាក់ពាក្យតាម Telegram':'Apply on Telegram'}).getAttribute('href'),'https://t.me/Zivo_Media');
  await page.screenshot({path:`artifacts/verification-2/careers-${viewport}-${language}.png`,fullPage:true});
  await page.locator('[name=full_name]').fill('Fixture Applicant');await page.locator('[name=contact]').fill('fixture@example.invalid');await page.locator('[name=availability]').fill('Next month');await page.locator('[name=consent]').check();
  await page.getByRole('button',{name:km?'ផ្ញើពាក្យស្នើសុំ':'Send application',exact:true}).click();await page.getByRole('alert').filter({hasText:km?'មិនទាន់អាចបញ្ជាក់':'We could not confirm'}).waitFor();assert.equal(await page.locator('[name=full_name]').inputValue(),'Fixture Applicant');
  await page.getByRole('button',{name:km?'ផ្ញើពាក្យស្នើសុំ':'Send application',exact:true}).click();await page.getByText(km?'ពាក្យស្នើសុំរបស់អ្នកត្រូវបានទទួល។':'Your application has been received.',{exact:true}).waitFor();
  assert.equal(calls,2);assert.deepEqual(stripe,[]);assert.deepEqual(warnings,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({viewport,language,overflow:false,stripeRequests:0,paymentWarnings:0,formRecovery:'passed',fixtureOnly:true}));await context.close();
}}finally{await b.close();}
