// studio_audit.js — one-command logic + render audit for PropSight Studio.
// Usage: node studio_audit.js [chromePort=9379] [serve=http://127.0.0.1:8787]
// Auto-discovers every category (FORMATS) and every template (TPL), renders them
// across full / sparse / torture-price / long-address inputs, and reports every
// failure class we've ever hit. Exit 0 = clean, exit 1 = problems.
const CH=process.argv[2]||'9379', SRV=process.argv[3]||'http://127.0.0.1:8787';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let list=await(await fetch(`http://127.0.0.1:${CH}/json`)).json();const tgt=list.find(t=>t.type==='page');
 const ws=new WebSocket(tgt.webSocketDebuggerUrl);const pend={};let _id=0;
 const send=(m,p={})=>{const id=++_id;ws.send(JSON.stringify({id,method:m,params:p}));return new Promise(r=>pend[id]=r);};
 await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id&&pend[d.id]){pend[d.id](d.result);delete pend[d.id];}};
 const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:SRV+'/?cb='+Date.now()});await sleep(2600);
 const cats=await ev(`FORMATS.filter(function(f){return f.active;}).map(function(f){return f.id;})`);
 const tpls=await ev(`TPL.map(function(t){return {id:t.id,concept:t.concept};})`);
 // one representative template per concept for the deep logic scan
 const reps={};tpls.forEach(t=>{if(!reps[t.concept])reps[t.concept]=t.id;});
 const repList=Object.values(reps);
 const LONG='The Continuum @ Thiam Siew Avenue, Tower 2 #14-05';
 // datasets per category (full / sparse / torture-price / long-address)
 function data(cat){
  const base={listing:{beds:'3',baths:'2',sqft:'1109',facing:'North',floor:'High / #12',tenure:'99-yr'},
   sold:{askprice:'1450000',beds:'3',sqft:'1109',days:'9'},launch:{district:'District 15',tenure:'Freehold',top:'2028',units:'816'},
   openhouse:{ohdate:'Sat 18 Jul',ohtime:'2-4pm',beds:'3',baths:'2',sqft:'1109',facing:'North'},
   pricedrop:{wasprice:'1380000',beds:'3',baths:'2',sqft:'1109'},rent:{beds:'3',baths:'2',sqft:'1109',furnishing:'Fully furnished',available:'1 Aug'},
   rented:{beds:'3',sqft:'1109',days:'7'},comingsoon:{launchdate:'Aug 2026',beds:'3',sqft:'1109'}}[cat]||{};
  const price=(cat==='rent'||cat==='rented')?'4500':'1380000';
  const full=Object.assign({address:'Bishan St 22',price:price,h0:'Renovated',h1:'Near MRT',h2:'Bright'},base);
  return {
   full:full,
   sparse:{address:'Bishan St 22',price:(cat==='rented'||cat==='comingsoon')?'':price},
   torture:Object.assign({},base,{address:'Bishan St 22',price:(cat==='rent'||cat==='rented')?'4,500/month':'1.38M'}),
   longaddr:Object.assign({},full,{address:LONG})
  };
 }
 function flags(cat,label,txt){const f=[];const low=txt.toLowerCase();
  if(/undefined|\bnan\b|\bnull\b/.test(low))f.push('undefined/NaN/null');
  if(/\$0(\b|[^0-9])/.test(txt))f.push('$0');
  if(/\$\s|\$·|from\s+·|from\s*$/i.test(txt))f.push('empty $/From');
  if(/·\s*·|·\s*$|^\s*·/.test(txt))f.push('empty middot');
  if((cat==='rent'||cat==='rented')&&/\bpsf\b/i.test(txt))f.push('psf on rental');
  if((cat==='rent'||cat==='rented')&&/tenure/i.test(txt))f.push('tenure on rental');
  if(!(cat==='rent'||cat==='rented')&&/\/mo\b/i.test(txt))f.push('/mo on non-rental');
  if(/\b0 reasons\b/.test(txt))f.push('0 reasons');
  if(/\b1 reasons\b/.test(txt))f.push('bad plural (1 reasons)');
  return f.length?(label+' => '+f.join(', ')+'  ['+txt.slice(0,150)+']'):null;
 }
 async function dumpSeek(tp,cat,fields){
  await ev(`S.f={};S.format=${JSON.stringify(cat)};S.template=${JSON.stringify(tp)};openEditor();__loadPhotos([{src:POOL[7].src,w:1,h:1,room:""},{src:POOL[13].src,w:1,h:1,room:"L"},{src:POOL[18].src,w:1,h:1,room:"K"}]);__setFields(${JSON.stringify(fields)});1`);await sleep(260);
  const bs=await ev(`editR.st.beats.map(function(b){return b.kind;})`);let out=[];
  for(let i=0;i<bs.length;i++){const tx=await ev(`(function(){var b=editR.st.beats[${i}];editR.seek(b.s+b.dur*0.92);var el=document.querySelectorAll("#editReel .beat")[${i}];return el?el.innerText.replace(/\\s+/g," ").trim():"";})()`);if(tx)out.push(tx);}
  return {n:bs.length,txt:out.join(' ')};
 }
 let problems=[],checks=0;
 // 1) DEEP LOGIC SCAN: every category x concept-rep x 4 datasets
 for(const cat of cats){const D=data(cat);
  for(const tp of repList){for(const ds of ['full','sparse','torture','longaddr']){
   const r=await dumpSeek(tp,cat,D[ds]);checks++;
   const fl=flags(cat,cat+'/'+tp+'/'+ds,r.txt);if(fl)problems.push('LOGIC '+fl);
   if(r.n===0)problems.push('LOGIC '+cat+'/'+tp+'/'+ds+' => EMPTY reel (0 beats)');
  }}
 }
 // 2) RENDER SMOKE TEST: every template renders (listing, full)
 for(const t of tpls){
  const r=await dumpSeek(t.id,'listing',data('listing').full);checks++;
  if(r.n===0)problems.push('RENDER '+t.id+' => EMPTY (0 beats)');
  else if(/undefined|\bnan\b|\bnull\b/i.test(r.txt))problems.push('RENDER '+t.id+' => undefined/NaN in output');
 }
 console.log('checks run:',checks,' | categories:',cats.length,' | templates:',tpls.length);
 if(problems.length){console.log('\n=== '+problems.length+' PROBLEM(S) ===\n'+problems.join('\n'));process.exitCode=1;}
 else console.log('\nAUDIT CLEAN — no logic or render problems.');
 ws.close();process.exit(problems.length?1:0);
})();
