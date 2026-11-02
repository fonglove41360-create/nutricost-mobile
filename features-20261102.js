/* NutriCost additive UI release. Food storage and nutrition formulas remain in index.html. */
'use strict';
function ncMergeMealLines(lines){
 const map=new Map();
 for(const line of lines){
  const old=map.get(line.foodId);
  if(!old){map.set(line.foodId,{...line,qty:Number(line.qty),cost:Number(line.cost)||0,allocations:(line.allocations||[]).map(a=>({...a}))});continue}
  old.qty+=Number(line.qty);old.cost+=Number(line.cost)||0;
  for(const a of line.allocations||[]){
   const allocation=old.allocations.find(x=>x.lotId===a.lotId);
   if(allocation){allocation.qty+=Number(a.qty);if(a.cost!=null||allocation.cost!=null)allocation.cost=(Number(allocation.cost)||0)+(Number(a.cost)||0)}
   else old.allocations.push({...a});
  }
 }
 return [...map.values()];
}
(function(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const enabled=name=>!reduced.matches&&ncFeatureEnabled(name,true);
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>[...r.querySelectorAll(s)];
 let toastTimer,searchText='',mealQuery='',mealCategory='ทั้งหมด',chosenFood='',createOpen=false;
 function toast(message){
  let el=$('#nc-toast');if(!el){el=document.createElement('div');el.id='nc-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.append(el)}
  (document.querySelector('dialog[open]')||document.body).append(el);el.textContent=String(message);el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);
 }
 window.alert=toast;window.ncToast=toast;
 function applyEffects(){
  document.documentElement.dataset.motion=String(enabled('motion'));
  document.documentElement.dataset.rainbow=String(enabled('rainbow'));
  if(!enabled('motion')){$$('[data-nc-animate]').forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.removeAttribute('data-nc-animate')});$$('.nc-particle,.nc-tap-star').forEach(el=>el.remove())}
  if(!enabled('rainbow'))$$('.nc-tap-star').forEach(el=>el.remove());
 }
 applyEffects();reduced.addEventListener('change',()=>{applyEffects();if(tab==='settings')drawSettings()});
 const oldSettings=drawSettings;
 drawSettings=function(){
  oldSettings();
  const panel=document.createElement('div');panel.className='card nc-feature-settings';
  panel.innerHTML='<h2>การแสดงผล</h2>'+[['presets','แสดงมื้อประจำ','ซ่อนหรือแสดง โดยไม่ลบสูตรที่บันทึก'],['motion','แอนิเมชัน','การเคลื่อนไหว เมนู และการฉลอง'],['rainbow','เอฟเฟกต์สีรุ้ง','แสง ขอบการ์ด และประกายดาว']].map(([key,title,help])=>'<label class="nc-switch-row"><span><strong>'+title+'</strong><small>'+help+'</small></span><input type="checkbox" role="switch" data-feature="'+key+'" aria-label="'+title+'" '+((key==='presets'||!reduced.matches)&&ncFeatureEnabled(key,true)?'checked':'')+' '+(reduced.matches&&key!=='presets'?'disabled':'')+'></label>').join('')+(reduced.matches?'<p class="sub">ระบบเปิด Reduce Motion อยู่ แอนิเมชันและสีรุ้งจึงปิดอัตโนมัติ</p>':'');
  $('#settings').prepend(panel);
  $$('[data-feature]',panel).forEach(input=>input.onchange=()=>{
   try{localStorage.setItem('nutricost.ui.'+input.dataset.feature+'.v1',String(input.checked));applyEffects()}
   catch(e){input.checked=!input.checked;toast('บันทึกการตั้งค่าไม่สำเร็จ')}
  });
 };
 // Keep the original preset implementation and its storage key. Visibility is read at render time.
 const originalSaveIngredient=window.ncSaveIngredient;
 window.ncSaveIngredient=function(){const before=JSON.stringify(db.foods);originalSaveIngredient();if(before!==JSON.stringify(db.foods))$('#nc-food-dialog')?.close()};
 function closeFoodDialog(){
  const dialog=$('#nc-food-dialog');if(dialog?.open)dialog.close();
 }
 function openFood(f){
  closeFoodDialog();$('#nc-food-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='nc-food-dialog';dialog.className='nc-food-dialog';
  dialog.innerHTML='<div class="nc-dialog-title"><h2></h2><button type="button" class="btn secondary small" aria-label="ปิดรายละเอียด">ปิด ×</button></div><div class="nc-food-body"></div>';
  $('h2',dialog).textContent=f.name;$('.nc-dialog-title button',dialog).onclick=()=>dialog.close();
  const body=$('.nc-food-body',dialog);
  body.innerHTML='<p class="sub">'+esc(f.group)+' · ต่อ '+num(f.base)+' '+esc(unit(f))+'</p><div class="nc-detail-grid">'+[['พลังงาน',num(f.k)+' kcal'],['โปรตีน',num(f.p)+' g'],['คาร์บ',num(f.c)+' g'],['ไขมัน',num(f.f)+' g'],['น้ำตาล',f.sugar==null?'ยังไม่มีข้อมูล':num(f.sugar)+' g'],['โซเดียม',f.sodium==null?'ยังไม่มีข้อมูล':num(f.sodium)+' mg'],['ใยอาหาร',f.fiber==null?'ยังไม่มีข้อมูล':num(f.fiber)+' g'],['คงเหลือ',num(stock(f.id))+' '+esc(unit(f))]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>').join('')+'</div><button type="button" class="btn full nc-detail-edit">แก้ไขวัตถุดิบ</button>';
  $('.nc-detail-edit',body).onclick=()=>{
   const editor=window.ncOpenIngredient(f.id);
   if(!editor)return toast('เปิดแบบฟอร์มไม่สำเร็จ');
   body.replaceChildren(editor);editor.classList.add('nc-active-editor');
   const cancel=editor.querySelector('button[onclick="ncCloseIngredient()"]');
   if(cancel){cancel.className='btn secondary';cancel.onclick=()=>{window.ncCloseIngredient();dialog.close()}}
   $('h2',dialog).textContent='แก้ไข '+f.name;
  };
  document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});dialog.addEventListener('close',()=>window.ncCloseIngredient?.(),{once:true});dialog.showModal();
 }
 const oldCatalog=drawCatalog;
 drawCatalog=function(){
  oldCatalog();
  const root=$('#catalog'),list=$('.list',root),form=$('#newName',root)?.closest('.card');
  if(!list||!form)return;
  // Reuse the current form and handlers, moving it out of the old hidden drawer.
  const fold=document.createElement('details');fold.className='nc-create-fold';fold.open=createOpen;
  fold.innerHTML='<summary>＋ เพิ่มวัตถุดิบใหม่</summary>';
  fold.append(form);form.style.display='block';form.querySelectorAll('.nc-catalog-edit').forEach(el=>el.remove());
  root.append(fold);fold.ontoggle=()=>{createOpen=fold.open};
  const createAction=root.querySelector('[data-action="add"]');
  if(createAction)createAction.onclick=()=>{fold.open=!fold.open;createOpen=fold.open;$('.nc-manage-options',root).hidden=true;if(fold.open)$('#newName',fold).focus()};
  const editAction=root.querySelector('[data-action="edit"]');if(editAction)editAction.onclick=()=>{root.querySelector('.nc-manage-options').hidden=true;toast('แตะการ์ดวัตถุดิบ แล้วเลือกแก้ไขได้เลย');document.getElementById('nc-catalog-query')?.focus()};
  const search=document.createElement('div');search.className='nc-catalog-search';
  search.innerHTML='<label for="nc-catalog-query">ค้นหาวัตถุดิบ</label><input id="nc-catalog-query" type="search" autocomplete="off" placeholder="พิมพ์ชื่อ เช่น อกไก่"><div class="sub nc-result-count" aria-live="polite"></div>';
  list.before(search);
  const input=$('input',search);input.value=searchText;
  // IDs are attached by the original renderer; duplicate names cannot open the wrong food.
  const visibleIds=$$('.item',list).map(el=>el.dataset.foodId).filter(Boolean);
  function results(){
   const q=searchText.trim().toLocaleLowerCase('th');
   const foods=q?db.foods.filter(f=>f.name.toLocaleLowerCase('th').includes(q)):visibleIds.map(id=>food(id)).filter(Boolean);
   list.className='list nc-compact-grid';list.replaceChildren();
   $('.nc-result-count',search).textContent=foods.length+' รายการ';
   for(const f of foods){
    const b=document.createElement('button');b.type='button';b.className='nc-food-card';b.dataset.foodId=f.id;
    b.innerHTML='<span class="nc-card-category">'+esc(f.group)+'</span><strong>'+esc(f.name)+'</strong><span class="nc-card-numbers">'+num(f.k)+' <small>kcal</small><span>'+num(f.p)+' g โปรตีน</span></span><small>ต่อ '+num(f.base)+' '+esc(unit(f))+' · คงเหลือ '+num(stock(f.id))+'</small><span class="nc-card-more">รายละเอียด ↗</span>';
    b.onclick=()=>openFood(f);list.append(b);
   }
   if(!foods.length){
    const empty=document.createElement('div');empty.className='nc-search-empty';
    empty.innerHTML='<p>ไม่พบวัตถุดิบ</p><button type="button" class="btn"></button>';
    $('button',empty).textContent="เพิ่ม '"+searchText.trim()+"' เป็นวัตถุดิบใหม่";
    $('button',empty).onclick=()=>{fold.open=true;createOpen=true;$('#newName',fold).value=searchText.trim();$('#newName',fold).dispatchEvent(new Event('input',{bubbles:true}));$('#newName',fold).focus();fold.scrollIntoView({block:'nearest',behavior:enabled('motion')?'smooth':'auto'})};
    list.append(empty);
   }
   observeCards(list);
  }
  input.oninput=()=>{searchText=input.value;results()};results();
 };
 const originalAdd=addFood;
 addFood=function(){
  const count=db.foods.length;originalAdd();
  if(db.foods.length>count){createOpen=false;searchText='';drawCatalog();toast('เพิ่มวัตถุดิบแล้ว')}
 };
 // Compact inventory: replace tile contents, retaining the current category filtering.
 const oldInventory=drawInventory;
 drawInventory=function(){
  oldInventory();const root=$('#inventory'),grid=$('.nc-stock-grid',root);
  if(grid){
   const foods=db.foods.filter(f=>stock(f.id)>0);
   const tiles=$$('.nc-stock-tile',grid);
   tiles.forEach((tile,i)=>{
    const f=foods[i];if(!f)return;
    const button=document.createElement('button');button.type='button';button.className='nc-food-card';button.style.display=tile.style.display;button.dataset.foodId=f.id;
    const lots=db.lots.filter(l=>l.foodId===f.id&&remaining(l)>0),expiry=lots.map(l=>l.expiry).filter(Boolean).sort()[0];
    button.innerHTML='<span class="nc-card-category">'+esc(f.group)+'</span><strong>'+esc(f.name)+'</strong><span class="nc-card-numbers">'+num(stock(f.id))+' <small>'+esc(unit(f))+'</small></span><small>'+(expiry?'หมดอายุ '+esc(expiry):lots.length+' ล็อต')+'</small>';
    button.onclick=()=>openFood(f);tile.replaceWith(button);
   });grid.className='nc-compact-grid nc-inventory-grid';observeCards(grid);
  }
  const option=$('.nc-adjust-option',root);
  if(option){
   const trigger=document.createElement('button');trigger.type='button';trigger.className='btn secondary small nc-inventory-options';trigger.textContent='ตัวเลือก ⋯';trigger.setAttribute('aria-expanded','false');
   const menu=document.createElement('div');menu.className='nc-inventory-menu';menu.hidden=true;
   const action=document.createElement('button');action.type='button';action.className='btn secondary';action.textContent='ปรับยอดวัตถุดิบในคลัง';menu.append(action);
   option.before(menu);option.hidden=true;
   $('.nc-stock-header',root).append(trigger);
   trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden))};
   action.onclick=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');option.hidden=false;option.open=true;option.scrollIntoView({block:'nearest',behavior:enabled('motion')?'smooth':'auto'})};
   const close=document.createElement('button');close.type='button';close.className='btn secondary small';close.textContent='ปิดการปรับยอด';close.onclick=()=>{option.hidden=true;option.open=false};option.append(close);
  }
 };
 const oldMeals=drawMeals;
 drawMeals=function(){
  oldMeals();
  const root=$('#meals'),select=$('#addFood',root),qty=$('#eatQty',root);
  if(!select||!qty)return;
  select.hidden=true;
  const label=select.previousElementSibling;if(label?.tagName==='LABEL')label.textContent='ค้นหาและเลือกวัตถุดิบจากคลัง';
  const block=document.createElement('section');block.className='nc-meal-picker';
  block.innerHTML='<input id="nc-meal-query" type="search" aria-label="ค้นหาวัตถุดิบในคลัง" autocomplete="off" placeholder="ค้นหาชื่อวัตถุดิบ"><div class="nc-picker-groups" role="group" aria-label="หมวดที่มีในคลัง"></div><div class="nc-picker-results" aria-live="polite"></div><p class="sub nc-selected-food"></p>';
  select.after(block);
  const available=db.foods.filter(f=>stock(f.id)>0),categories=['ทั้งหมด',...new Set(available.map(f=>f.group))];
  if(!categories.includes(mealCategory))mealCategory='ทั้งหมด';
  if(!available.some(f=>f.id===chosenFood))chosenFood=available[0]?.id||'';
  select.value=chosenFood;select.dispatchEvent(new Event('change'));
  function chosenLabel(){const f=food(select.value);$('.nc-selected-food',block).textContent=f?'เลือก: '+f.name+' · ใส่ปริมาณเป็น '+unit(f):'ยังไม่มีวัตถุดิบในคลัง'}
  function results(){
   const items=available.filter(f=>(mealCategory==='ทั้งหมด'||f.group===mealCategory)&&f.name.toLocaleLowerCase('th').includes(mealQuery.trim().toLocaleLowerCase('th')));
   const list=$('.nc-picker-results',block);list.replaceChildren();
   for(const f of items){
    const b=document.createElement('button');b.type='button';b.className='nc-picker-food';b.setAttribute('aria-pressed',String(select.value===f.id));
    b.innerHTML='<span><strong>'+esc(f.name)+'</strong><small>'+esc(f.group)+' · '+num(f.k)+' kcal · โปรตีน '+num(f.p)+' g / '+num(f.base)+' '+esc(unit(f))+'</small></span><span>'+num(stock(f.id))+'<small>'+esc(unit(f))+' คงเหลือ</small></span>';
    b.onclick=()=>{chosenFood=f.id;select.value=f.id;select.dispatchEvent(new Event('change'));chosenLabel();results();qty.focus()};
    list.append(b);
   }
   if(!items.length)list.innerHTML='<p class="sub">ไม่พบวัตถุดิบที่มีของในคลัง</p>';
  }
  const groupRoot=$('.nc-picker-groups',block);
  function groups(){groupRoot.replaceChildren();categories.forEach(g=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=g;b.setAttribute('aria-pressed',String(g===mealCategory));b.onclick=()=>{mealCategory=g;groups();results()};groupRoot.append(b)})}
  const search=$('#nc-meal-query',block);search.value=mealQuery;search.oninput=()=>{mealQuery=search.value;results()};groups();results();chosenLabel();
  // Current forms include multiple legacy meal selectors; only the live fields drive the notice.
  const notice=document.createElement('div');notice.id='nc-merge-notice';notice.className='notice';notice.setAttribute('role','status');
  const saveButton=root.querySelector('button[onclick="commitMeal()"]');saveButton?.before(notice);
  function mergeNotice(){
   const name=$('#nc-custom-meal',root)?.value.trim()||mealName;
   const date=$('#mealDate',root)?.value||mealDate;
   const match=db.meals.some(m=>m.date===date&&m.name===name);
   notice.hidden=!match;notice.textContent='มี '+name+' ในวันที่ '+date+' แล้ว บันทึกครั้งนี้จะรวมเข้ามื้อเดิม และรวมวัตถุดิบที่ซ้ำกันอัตโนมัติ';
  }
  ['#mealName','#nc-custom-meal','#mealDate'].forEach(id=>{const field=$(id,root);field?.addEventListener('input',mergeNotice);field?.addEventListener('change',mergeNotice)});mergeNotice();
  const history=document.createElement('details');history.className='nc-meal-history';
  history.innerHTML='<summary>ประวัติมื้ออาหารและคืนสต็อก</summary><label for="nc-history-date">วันที่</label><input id="nc-history-date" type="date"><div class="list nc-history-list"></div>';
  root.append(history);const historyDate=$('input',history);historyDate.value=filterDate;
  function renderHistory(){
   filterDate=historyDate.value;const list=$('.nc-history-list',history);list.replaceChildren();
   for(const m of db.meals.filter(m=>m.date===filterDate)){
    const row=document.createElement('article');row.className='item';
    row.innerHTML='<strong>'+esc(m.name)+'</strong><p class="sub">'+num(totals(m.lines).k)+' kcal · '+money(totals(m.lines).cost)+'</p><div class="actions"><button type="button" class="btn secondary small">☆ รายการโปรด</button><button type="button" class="btn danger small">ลบและคืนสต็อก</button></div>';
    const buttons=$('button',row);buttons[0].onclick=()=>window.ncSaveFavorite(m.id);
    buttons[1].dataset.deleteMeal=m.id;buttons[1].onclick=()=>deleteMeal(m.id);list.append(row);
   }
   if(!list.children.length)list.innerHTML='<p class="sub">ไม่มีมื้ออาหารในวันที่เลือก</p>';
  }
  historyDate.onchange=renderHistory;renderHistory();

 };
 const previousCommit=commitMeal;
 commitMeal=function(){
  const before=JSON.stringify(db.meals);previousCommit();
  if(before!==JSON.stringify(db.meals)){mealQuery='';chosenFood='';show('dashboard');celebrate();toast('บันทึกมื้ออาหารแล้ว พร้อมปรับยอดคลัง')}
 };
 // Retain favorites and statistics on the latest home renderer.
 const oldDashboard=drawDashboard;
 drawDashboard=function(){
  oldDashboard();
  const root=$('#dashboard');root.insertAdjacentHTML('beforeend','<details class="nc-home-extras"><summary>สถิติและรายการโปรด</summary><div id="nc-stats"></div><div id="nc-favorites"></div></details>');
  window.ncRenderStats?.();window.ncRenderFavorites?.();
 };
 // Motion is decorative; model mutations stay synchronous and use the original actions.
 let observer;
 function observeCards(root=document){
  if(!observer)observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('nc-revealed');observer.unobserve(e.target)}},{threshold:.08});
  $$('.nc-food-card,.nc-home-hero,.nc-home-macro,.nc-home-meal',root).forEach((el,i)=>{el.style.setProperty('--nc-stagger',Math.min(i,8)*35+'ms');observer.observe(el)});
 }
 const oldRender=render;
 render=function(){oldRender();observeCards();animateProgress();};
 function animateProgress(){
  if(!enabled('motion'))return;
  $$('.progress span,.nc-stock-progress i',document.getElementById(tab)).forEach(el=>el.animate([{transform:'scaleX(0)',transformOrigin:'left'},{transform:'scaleX(1)',transformOrigin:'left'}],{duration:600,easing:'cubic-bezier(.2,.8,.2,1)'}));
  // Text-only numeric fields preserve their final value and accessibility label.
  $$('.nc-home-energy,.nc-home-macro b',document.getElementById(tab)).forEach(el=>{
   const node=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&/[0-9]/.test(n.textContent));if(!node)return;
   const final=node.textContent,value=Number(final.replace(/,/g,'').trim());if(!Number.isFinite(value))return;
   const begun=performance.now();el.setAttribute('aria-label',el.textContent);
   function step(now){if(!enabled('motion')||!el.isConnected){node.textContent=final;return}const t=Math.min(1,(now-begun)/650);node.textContent=t===1?final:num(value*(1-Math.pow(1-t,3)))+' ';if(t<1)requestAnimationFrame(step)}
   requestAnimationFrame(step);
  });
 }
 const originalShow=show;
 let transitionId=0;
 show=function(next){
  const previous=document.getElementById(tab),changing=tab!==next,id=++transitionId;
  if(changing&&enabled('motion')&&previous){
   // Clone only for the exit animation; hidden clone cannot submit actions or duplicate IDs.
   const ghost=previous.cloneNode(true);ghost.removeAttribute('id');$$('[id]',ghost).forEach(x=>x.removeAttribute('id'));ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.classList.add('nc-exit-ghost');ghost.classList.remove('hidden');
   const box=previous.getBoundingClientRect();Object.assign(ghost.style,{top:box.top+'px',left:box.left+'px',width:box.width+'px'});document.body.append(ghost);
   ghost.animate([{opacity:.65,transform:'translateX(0)'},{opacity:0,transform:'translateX(-28px)'}],{duration:180,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>ghost.remove());
  }
  originalShow(next);slideNav(next);
  if(changing&&enabled('motion')){const el=document.getElementById(next);el.dataset.ncAnimate='true';el.animate([{opacity:0,transform:'translateX(24px) scale(.985)'},{opacity:1,transform:'translateX(-3px) scale(1)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:430,easing:'cubic-bezier(.2,.8,.2,1)'});}
 };
 let navBlob;
 function slideNav(next){
  const nav=$('.tabs'),button=$('.tabs [data-tab="'+next+'"]');if(!nav||!button)return;
  if(!navBlob){navBlob=document.createElement('span');navBlob.className='nc-nav-blob';navBlob.setAttribute('aria-hidden','true');nav.prepend(navBlob)}
  const x=button.offsetLeft,width=button.offsetWidth;
  navBlob.style.width=width+'px';navBlob.style.transform='translateX('+x+'px)';
 }
 addEventListener('resize',()=>slideNav(tab));
 function burst(x,y,count,kind){
  if(kind==='nc-particle'?!enabled('motion'):!enabled('rainbow'))return;
  for(let i=0;i<count;i++){
   const el=document.createElement('span');el.className=kind;el.textContent=kind==='nc-tap-star'?'✦':'';el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--angle',i*360/count+'deg');el.style.setProperty('--hue',i*360/count);document.body.append(el);
   const a=i*2*Math.PI/count,d=kind==='nc-particle'?80+Math.random()*80:20+Math.random()*25;
   el.animate([{opacity:1,transform:'translate(0,0) rotate(0)'},{opacity:0,transform:'translate('+Math.cos(a)*d+'px,'+(Math.sin(a)*d+40)+'px) rotate(160deg)'}],{duration:kind==='nc-particle'?1000:600,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>el.remove());
  }
 }
 function celebrate(){burst(innerWidth/2,Math.min(innerHeight*.4,300),24,'nc-particle')}
 document.addEventListener('pointerdown',e=>burst(e.clientX,e.clientY,5,'nc-tap-star'),{passive:true});
 let scrollPending=false;
 addEventListener('scroll',()=>{
  if(scrollPending||!enabled('rainbow'))return;scrollPending=true;
  requestAnimationFrame(()=>{document.documentElement.style.setProperty('--nc-scroll-hue',Math.round(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)*160)+'deg');scrollPending=false})
 },{passive:true});
 // Animate deletion only after the original confirmation and successful mutation.
 const originalDelete=deleteMeal;
 deleteMeal=function(id){
  const before=db.meals.length;let ghost;
  const button=$('button[data-delete-meal],button[onclick^="deleteMeal("]').find(b=>b.dataset.deleteMeal===id||(b.getAttribute('onclick')||'').includes(id));
  if(enabled('motion')&&button){const row=button.closest('.item');if(row){ghost=row.cloneNode(true);const box=row.getBoundingClientRect();ghost.inert=true;ghost.classList.add('nc-exit-ghost');Object.assign(ghost.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px'});}}
  originalDelete(id);
  if(db.meals.length<before&&ghost){document.body.append(ghost);ghost.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'translateX(40px) scale(.95)'}],{duration:230}).finished.catch(()=>{}).finally(()=>ghost.remove())}
 };
 const oldAddDraft=addDraft;
 addDraft=function(){const count=draft.length;oldAddDraft();if(draft.length>count&&enabled('motion')){$$('.nc-easy-draft,.nc-meal-v3-line').slice(-1).forEach(el=>el.animate([{opacity:0,transform:'scale(.9) translateY(12px)'},{opacity:1,transform:'scale(1.02)'},{opacity:1,transform:'scale(1)'}],{duration:350}))}};
 show(tab);
})();
