const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const baseline=execFileSync('git',['show','c56760bef62a3dca21ccbba258ede549320c99ab:index.html'],{encoding:'utf8'});
const fixture={foods:[{id:'chicken',name:'อกไก่',group:'เนื้อสัตว์',unit:'g',base:100,k:120,p:23,c:0,f:2.6},{id:'eggs',name:'ไข่ไก่',group:'ไข่',unit:'ฟอง',base:1,k:72,p:6.3,c:.4,f:4.8},{id:'empty',name:'ผักไม่มีสต็อก',group:'ผัก',unit:'g',base:100,k:25,p:2,c:3,f:.1}],lots:[{id:'a',foodId:'chicken',qty:200,used:50,price:40,created:'2026-01-01',expiry:'2026-12-01'},{id:'b',foodId:'chicken',qty:500,used:0,price:150,created:'2026-01-02',expiry:'2027-01-01'},{id:'egg-lot',foodId:'eggs',qty:12,used:0,price:60,created:'2026-01-02',expiry:'2027-01-01'}],meals:[],goals:{k:2200,p:150,c:220,f:70},version:1,stockAdjustments:[],customUnknownField:{preserved:true}};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
fixture.meals=[{id:'old',date:today(),name:'มื้อ 1',lines:[{foodId:'chicken',qty:50,cost:10,allocations:[{lotId:'a',qty:50,cost:10}]}]}];
const stored={
 'nutricost.v1':JSON.stringify(fixture,null,2),
 'nutricost.appearance.v2':'{ "theme": "forest", "accent": "#6be3b3", "font": "system", "compact": false }',
 'nutricost.sound.enabled.v1':'false',
 'nutricost.favorites.v1':JSON.stringify([{id:'fav1',name:'โปรดเดิม',lines:[{foodId:'chicken',qty:30}]}],null,2),
 'nutricost.meal.presets.v1':JSON.stringify([{id:'preset1',name:'สูตรเดิม',lines:[{foodId:'eggs',qty:1}]}],null,2),
 'nutricost.lastSeenRelease':'2026.11.01.1',
 'nutricost.inventory.adjustment.enabled.v1':'true',
 'unknown-user-key':'keep every byte  ภาษาไทย  '
};
(async()=>{
 const server=http.createServer((req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/baseline'){res.setHeader('content-type','text/html; charset=utf-8');return res.end(baseline)}
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(file.includes('..'))throw Error('path');
  const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html; charset=utf-8';res.setHeader('content-type',type);res.end(fs.readFileSync(file));
 }catch(e){res.statusCode=404;res.end('Not found')}}).listen(8137);
 const browser=await chromium.launch({headless:true});const consoleErrors=[];let activePage;
 async function pageFor(reduceMotion='no-preference'){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:reduceMotion,timezoneId:'Asia/Bangkok'});
  await context.addInitScript(data=>{if(!sessionStorage.getItem('fixture-loaded')){for(const [k,v] of Object.entries(data))localStorage.setItem(k,v);sessionStorage.setItem('fixture-loaded','true')}},stored);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  const page=await context.newPage();page.on('pageerror',e=>consoleErrors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});page.on('dialog',dialog=>dialog.accept());
  activePage=page;return page;
 }
 async function navigate(p,tab){await p.locator('.tabs [data-tab="'+tab+'"]').click();await p.waitForTimeout(500)}
 function snapshot(p){return p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))}
 async function noOverflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow')}
 try{
  const oldPage=await pageFor();await oldPage.goto('http://localhost:8137/baseline');const originalTotals=await oldPage.evaluate(()=>totals(db.meals.flatMap(m=>m.lines)));await oldPage.context().close();
  const p=await pageFor();await p.goto(process.env.NUTRICOST_URL||'http://localhost:8137/');await p.waitForFunction(()=>typeof ncMergeMealLines==='function');
  // No key that existed before upgrading may change, even whitespace or unknown keys.
  const loaded=await snapshot(p);for(const [k,v] of Object.entries(stored))assert.equal(loaded[k],v,'storage byte changed: '+k);
  assert.deepEqual(await p.evaluate(()=>totals(db.meals.flatMap(m=>m.lines))),originalTotals);
  await p.evaluate(()=>document.getElementById('nc-release-overlay').hidden=true);
  assert.equal(await p.locator('#nc-favorites [data-load]').count(),1,'favorites retained');
  assert.equal(await p.locator('#nc-period').count(),1,'statistics retained');
  await navigate(p,'settings');assert.equal(await p.locator('#nc-sound-switch').count(),1);assert.equal(await p.locator('.nc-theme-button').count(),1);
  await p.locator('[data-feature=presets]').uncheck();await navigate(p,'meals');assert.equal(await p.locator('#nc-presets').count(),0);assert.equal((await snapshot(p))['nutricost.meal.presets.v1'],stored['nutricost.meal.presets.v1']);
  await navigate(p,'settings');await p.locator('[data-feature=presets]').check();await navigate(p,'meals');assert.equal(await p.locator('#nc-presets').count(),1);await p.locator('[data-meal-tab="0"]').click();
  // Picker searches immediately, and only in-stock categories appear.
  assert(!(await p.locator('.nc-picker-groups').innerText()).includes('ผัก'));
  await p.locator('#nc-meal-query').fill('ไข่');assert.equal(await p.locator('.nc-picker-food').count(),1);await p.locator('.nc-picker-food').click();assert.equal(await p.locator('#eatQty').evaluate(el=>el===document.activeElement),true);assert((await p.locator('.nc-selected-food').innerText()).includes('ฟอง'));
  await p.locator('#nc-meal-query').fill('อกไก่');await p.locator('.nc-picker-food').click();await p.locator('#eatQty').fill('200');await p.locator('button[onclick="addDraft()"]').first().click();assert.equal(await p.evaluate(()=>draft.length),1);assert.equal(await p.locator('#nc-merge-notice').isVisible(),true);
  await p.locator('button[onclick="commitMeal()"]').first().click();await p.waitForTimeout(700);
  const merged=await p.evaluate(()=>({count:db.meals.length,lines:db.meals[0].lines,stock:stock('chicken'),totals:totals(db.meals[0].lines)}));
  assert.equal(merged.count,1);assert.equal(merged.lines.length,1);assert.equal(merged.lines[0].qty,250);assert.equal(merged.totals.cost,55);assert.equal(merged.totals.k,300);assert.equal(merged.totals.p,57.5);assert.equal(merged.stock,450);assert.equal(merged.lines[0].allocations.reduce((s,x)=>s+x.qty,0),250);
  await navigate(p,'meals');await p.locator('.nc-meal-history > summary').click();await p.locator('[data-delete-meal=old]').click();assert.equal(await p.evaluate(()=>stock('chicken')),700);assert.equal(await p.evaluate(()=>db.meals.length),0);
  // Different names and different dates remain separate; duplicate draft lines coalesce.
  await p.evaluate(()=>{mealName='มื้อ 2';mealDate=localDate();draft=[{foodId:'chicken',qty:10},{foodId:'chicken',qty:20}];show('meals');commitMeal()});
  assert.equal(await p.evaluate(()=>db.meals[0].lines.length),1);assert.equal(await p.evaluate(()=>db.meals[0].lines[0].qty),30);
  await p.evaluate(()=>{mealName='มื้อ 3';draft=[{foodId:'chicken',qty:10}];show('meals');commitMeal()});assert.equal(await p.evaluate(()=>db.meals.length),2);
  await p.evaluate(()=>{mealDate='2026-01-01';mealName='มื้อ 2';draft=[{foodId:'chicken',qty:10}];show('meals');commitMeal()});assert.equal(await p.evaluate(()=>db.meals.length),3);
  await p.evaluate(()=>{for(const m of [...db.meals])deleteMeal(m.id)});assert.equal(await p.evaluate(()=>stock('chicken')),700);
  await navigate(p,'catalog');assert.equal(await p.locator('.nc-create-fold').getAttribute('open'),null);await noOverflow(p);
  await p.locator('#nc-catalog-query').fill('วัตถุดิบใหม่ทดสอบ');assert.equal(await p.locator('.nc-food-card').count(),0);await p.locator('.nc-search-empty button').click();assert.equal(await p.locator('#newName').inputValue(),'วัตถุดิบใหม่ทดสอบ');assert.equal(await p.locator('.nc-create-fold').evaluate(el=>el.open),true);
  const count=await p.evaluate(()=>db.foods.length);await p.locator('button[onclick="addFood()"]').click();assert.equal(await p.evaluate(()=>db.foods.length),count+1);assert.equal(await p.locator('.nc-create-fold').evaluate(el=>el.open),false);
  await p.locator('#nc-catalog-query').fill('อกไก่');await p.locator('.nc-food-card[data-food-id=chicken]').click();await p.locator('.nc-detail-edit').click();await p.locator('#nc-edit-name').fill('อกไก่แก้ชื่อ');await p.locator('button[onclick="ncSaveIngredient()"]').click();assert.equal(await p.evaluate(()=>food('chicken').name),'อกไก่แก้ชื่อ');
  assert.equal(await p.locator('#nc-food-dialog').evaluate(el=>el.open),false);await p.waitForTimeout(250);assert.equal(await p.locator('.nc-create-fold').evaluate(el=>el.open),false,'create form stays folded after editing');
  await p.locator('#nc-catalog-query').fill('');await p.waitForTimeout(700);await noOverflow(p);fs.mkdirSync('test-results',{recursive:true});await p.screenshot({path:'test-results/catalog-390.png',fullPage:true});
  await navigate(p,'inventory');assert.equal(await p.locator('.nc-adjust-option').isVisible(),false);await p.locator('.nc-inventory-options').click();await p.locator('.nc-inventory-menu button').click();assert.equal(await p.locator('#nc-stock-adjust-food').isVisible(),true);
  await p.locator('#nc-stock-adjust-food').selectOption('chicken');await p.locator('#nc-stock-adjust-qty').fill('10');await p.locator('#nc-stock-adjust-save').click();assert.equal(await p.evaluate(()=>stock('chicken')),690);assert.equal(await p.locator('.nc-adjust-option').isVisible(),false);await noOverflow(p);await p.waitForTimeout(700);
  await p.screenshot({path:'test-results/inventory-390.png',fullPage:true});
  const foodBytes=(await snapshot(p))['nutricost.v1'];await navigate(p,'settings');
  await p.locator('[data-feature=motion]').uncheck();assert.equal(await p.locator('html').getAttribute('data-motion'),'false');assert.equal(await p.locator('html').getAttribute('data-rainbow'),'true');await p.locator('[data-feature=rainbow]').uncheck();assert.equal(await p.locator('html').getAttribute('data-rainbow'),'false');assert.equal((await snapshot(p))['nutricost.v1'],foodBytes);
  await p.reload();await p.evaluate(()=>document.getElementById('nc-release-overlay').hidden=true);assert.equal(await p.locator('html').getAttribute('data-motion'),'false');assert.equal((await snapshot(p))['nutricost.v1'],foodBytes);
  await navigate(p,'settings');await p.locator('[data-feature=motion]').check();await p.locator('[data-feature=rainbow]').check();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.documentElement.dataset.motion==='false');assert.equal(await p.locator('html').getAttribute('data-motion'),'false');assert.equal(await p.locator('html').getAttribute('data-rainbow'),'false');assert.equal(await p.locator('[data-feature=motion]').isDisabled(),true);assert.equal(await p.locator('[data-feature=rainbow]').isChecked(),false);
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>document.documentElement.dataset.motion==='true');assert.equal(await p.locator('html').getAttribute('data-motion'),'true');await navigate(p,'dashboard');await p.screenshot({path:'test-results/home-390.png',fullPage:true});
  for(const tab of ['meals','catalog','inventory','settings']){await navigate(p,tab);await noOverflow(p)}
  await navigate(p,'meals');await p.screenshot({path:'test-results/meals-390.png',fullPage:true});
  assert.deepEqual(consoleErrors,[],'console/page errors');
  for(const name of ['home','catalog','inventory','meals'])console.log('REVIEW_'+name+':'+fs.readFileSync('test-results/'+name+'-390.png').toString('base64'));
  console.log('PASS: original storage byte preservation; baseline nutrition/cost; presets and favorites; search and create fold; card details/edit; picker units/categories; merge allocations and cross-lot cost; deletion fully restores stock; inventory adjustment; independent effect preferences; Reduce Motion; 390px layout; zero console errors.');
 }catch(error){if(activePage&&!activePage.isClosed()){fs.mkdirSync('test-results',{recursive:true});const shot=await activePage.screenshot({path:'test-results/failure.png',fullPage:true});console.log('SCREENSHOT_BASE64:'+shot.toString('base64'));console.log('STATE:'+JSON.stringify(await activePage.evaluate(()=>({tab,mealName,mealDate,merge:document.getElementById('nc-merge-notice')?.outerHTML}))));}throw error}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
