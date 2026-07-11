// studio_qa.js — MASTER audit. Runs every dimension in one command and prints a
// single consolidated verdict. Usage: node studio_qa.js [target]
//   target default https://studio.propsight.sg  (use http://127.0.0.1:8787 for local)
const {execFileSync}=require('child_process');
const TARGET=process.argv[2]||'https://studio.propsight.sg';
const CH='9379';
const IMG='/private/tmp/claude-502/-Users-ZY/e568c7c4-aa69-47fc-9357-f9c3a10f4afe/scratchpad/deploy_studio/img';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RESULTS=[];
function rec(dim,name,ok,note){RESULTS.push({dim,name,ok:!!ok,note:note||''});}

(async()=>{
 // ---- Dimensions 1 & 2: run the layout + logic modules as children ----
 for(const [dim,file,args] of [['1 layout/fit','studio_fit.js',[TARGET]],['2 content-logic','studio_audit.js',[CH,TARGET]]]){
  try{const out=execFileSync('node',[file,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
      const clean=/ALL SCREENS FIT|AUDIT CLEAN/.test(out);rec(dim,file,clean,clean?'':out.split('\n').filter(l=>/FAIL|=>|overflow/.test(l)).slice(-4).join(' | '));
  }catch(e){const out=(e.stdout||'')+(e.stderr||'');rec(dim,file,false,out.split('\n').filter(l=>/FAIL|=>|overflow/.test(l)).slice(-4).join(' | ')||'exited '+e.status);}
 }
 // ---- Dimensions 3-9: functional / playback / console / nav / robustness (inline) ----
 let list=await(await fetch(`http://127.0.0.1:${CH}/json`)).json();const tgt=list.find(t=>t.type==='page');
 const ws=new WebSocket(tgt.webSocketDebuggerUrl);const pend={};let _id=0;const errs=[];
 const send=(m,p={})=>{const id=++_id;ws.send(JSON.stringify({id,method:m,params:p}));return new Promise(r=>pend[id]=r);};
 await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id&&pend[d.id]){pend[d.id](d.result);delete pend[d.id];}
  if(d.method==='Runtime.exceptionThrown')errs.push('EXC:'+((d.params.exceptionDetails.exception||{}).description||'').slice(0,90));
  if(d.method==='Log.entryAdded'&&d.params.entry.level==='error'&&!/favicon/.test(d.params.entry.url||''))errs.push('LOG:'+d.params.entry.text.slice(0,60));};
 const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value;};
 const top=async()=>await ev(`Math.round(Math.max(document.body.scrollTop,document.documentElement.scrollTop,window.scrollY))`);
 async function upload(files){const o=(await send('Runtime.evaluate',{expression:`document.getElementById("file")`})).result.objectId;await send('DOM.setFileInputFiles',{files:files,objectId:o});await sleep(1500);}
 async function realtap(sel){const b=JSON.parse(await ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView&&e.scrollIntoView({block:"center"});var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});})()`)||'null');if(!b)return false;await send('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x,y:b.y,button:'left',clickCount:1});await sleep(60);await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1});return true;}

 await send('Runtime.enable');await send('Page.enable');await send('Log.enable');await send('DOM.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 try{await send('Emulation.setFocusEmulationEnabled',{enabled:true});}catch(e){}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:TARGET+'/?cb='+Date.now()});await send('Page.bringToFront');await sleep(3600);
 rec('4 playback','page visible for rAF', (await ev(`document.visibilityState`))==='visible');

 // D3 functional journey (real input)
 rec('3 functional','home renders', await ev(`!!document.querySelector("#formats .fcard")`));
 await realtap('#formats .fcard');await sleep(800);
 rec('3 functional','category -> gallery', (await ev(`currentView`))==='gallery');
 await realtap('#tmpls .tcard');await sleep(800);
 rec('3 functional','template -> editor', (await ev(`currentView`))==='editor');
 rec('7 nav/state','Save disabled with 0 photos', await ev(`el("toPresent").disabled===true`));
 await upload([IMG+'/p7.jpg',IMG+'/p13.jpg',IMG+'/p18.jpg']);
 rec('3 functional','real photo upload builds reel', (await ev(`S.photos.length>=3 && editR.st.beats.length>0`)));
 rec('7 nav/state','Save enabled after upload', await ev(`el("toPresent").disabled===false`));
 // D4 live update as you type
 const before=await ev(`JSON.stringify(editR.st.fields).indexOf("QATOWN")>=0`);
 await ev(`var f=el("f_address");f.value="QATOWN";f.dispatchEvent(new Event("input",{bubbles:true}));`);await sleep(700);
 rec('4 playback','reel updates live as you type', !before && await ev(`JSON.stringify(editR.st.fields).indexOf("QATOWN")>=0`));
 // D3 photo sheet (real tap on pointer thumb)
 await realtap('.thumbs .thumb');await sleep(700);
 rec('3 functional','photo sheet opens (real tap)', await ev(`!el("sheet").hidden`));
 await ev(`if(document.querySelector("#rooms button,#rooms .room"))document.querySelector("#rooms button,#rooms .room").click();`);await sleep(200);
 await ev(`el("sDone").click()`);await sleep(300);
 rec('3 functional','room label applied', await ev(`S.photos.some(function(p){return p.room;})`));
 // D8 robustness: 15-photo cap
 await upload(Array.from({length:16},(_,i)=>IMG+'/p'+((i%20))+'.jpg'));
 rec('8 robustness','photo count capped (<=15)', await ev(`S.photos.length<=15 && S.photos.length>=3`));
 // D3 agent photo + crop
 const ao=(await send('Runtime.evaluate',{expression:`document.getElementById("apFile")`})).result.objectId;
 await send('DOM.setFileInputFiles',{files:[IMG+'/p15.jpg'],objectId:ao});await sleep(1200);
 rec('3 functional','agent-photo crop opens', await ev(`el("cropov")?!el("cropov").hidden:false`));
 await ev(`el("cropUse").click()`);await sleep(400);
 rec('3 functional','agent photo saved', await ev(`!!(S.f.agentPhoto&&S.f.agentPhoto.src)`));
 // D4 full record flow to Done
 await ev(`el("toPresent").click()`);await sleep(600);
 rec('3 functional','Present opens with content', await ev(`!el("present").hidden && presentR && presentR.st.beats.length>0`));
 const tot=await ev(`presentR?presentR.st.total:14`);
 await ev(`el("pStart").click()`);await sleep(2500);
 rec('4 playback','recording hides back button', await ev(`getComputedStyle(el("pExit")).display==="none"`));
 let done=false,w=0;while(w<tot*1000+9000){await sleep(1000);w+=1000;if(await ev(`!el("pDone").hidden`)){done=true;break;}}
 rec('4 playback','record plays to Done screen', done);
 rec('3 functional','Done shows back options', await ev(`getComputedStyle(el("pExit")).display!=="none" && !!el("pDoneBack")`));
 await ev(`el("pDoneBack").click()`);await sleep(400);
 rec('3 functional','exit Present -> editor', await ev(`el("present").hidden && currentView==="editor"`));
 // D7 scroll resets on nav
 await ev(`document.body.scrollTop=99999;document.documentElement.scrollTop=99999;`);await sleep(150);
 await ev(`document.getElementById("back").click()`);await sleep(600);
 rec('7 nav/state','scroll resets to top on view change', (await top())<5);
 // D8 remove-all -> empty state (no crash)
 await ev(`__go("editor");S.format="listing";S.f={};S.photos=[];openEditor();1`);await sleep(500);
 rec('8 robustness','empty (0 photos) shows guard, no crash', await ev(`el("toPresent").disabled===true && !!document.querySelector("#editReel")`));
 // D6 menu + modals
 await ev(`el("menuBtn").click()`);await sleep(300);
 rec('3 functional','menu opens', await ev(`!document.getElementById("menu").classList.contains("hidden")`));
 await ev(`var a=[].slice.call(document.querySelectorAll(".menuov a")).find(function(x){return /How it works/.test(x.textContent);});if(a)a.click();`);await sleep(400);
 rec('3 functional','How-to modal opens', await ev(`!el("howtoModal").hidden`));
 await ev(`document.querySelector("#howtoModal [data-close]").click()`);await sleep(200);
 rec('3 functional','modal closes', await ev(`el("howtoModal").hidden`));
 // D9 perf: gallery caps live reels
 await ev(`__go("gallery");S.format="listing";openGallery();1`);await sleep(1500);
 const liveReels=await ev(`(window.tmplReels||[]).filter(function(r){return r&&r.st&&r.st.playing;}).length`);
 rec('9 perf/heat','gallery caps live reels (<=12)', liveReels<=12, 'live='+liveReels);
 // D5 console errors overall
 rec('5 console','zero JS errors across all flows', errs.length===0, errs.slice(0,4).join(' | '));

 ws.close();
 // ---- consolidated report ----
 const fails=RESULTS.filter(r=>!r.ok);
 console.log('\n================ STUDIO QA — '+TARGET+' ================');
 RESULTS.forEach(r=>console.log((r.ok?'PASS':'FAIL').padEnd(5)+'D'+r.dim.padEnd(16)+r.name+(r.note?('  ['+r.note+']'):'')));
 console.log('\n'+(fails.length?('*** '+fails.length+' FAILURE(S) ***'):'ALL '+RESULTS.length+' CHECKS PASSED ACROSS ALL 9 DIMENSIONS.'));
 process.exit(fails.length?1:0);
})();
