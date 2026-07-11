// studio_fit.js — mobile viewport-fit audit. Flags any screen wider than the
// phone (horizontal overflow / zoom-out). Checks home, gallery, editor(every
// category), present + menu, across phone widths.
const CH='9379', SRV=process.argv[2]||'http://127.0.0.1:8787';
const IMG='/private/tmp/claude-502/-Users-ZY/e568c7c4-aa69-47fc-9357-f9c3a10f4afe/scratchpad/deploy_studio/img';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let list=await(await fetch(`http://127.0.0.1:${CH}/json`)).json();const tgt=list.find(t=>t.type==='page');
 const ws=new WebSocket(tgt.webSocketDebuggerUrl);const pend={};let _id=0;
 const send=(m,p={})=>{const id=++_id;ws.send(JSON.stringify({id,method:m,params:p}));return new Promise(r=>pend[id]=r);};
 await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id&&pend[d.id]){pend[d.id](d.result);delete pend[d.id];}};
 const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('DOM.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 // report: max element right-edge and body/doc scrollWidth vs viewport
 async function fit(label,vw){
  const r=await ev(`(function(){var vw=${vw};var worst={w:0,el:""};[].slice.call(document.querySelectorAll("body *")).forEach(function(e){var b=e.getBoundingClientRect();if(b.width>2&&b.width<3000&&b.right>worst.w){worst={w:Math.round(b.right),el:e.tagName+"."+((e.className&&e.className.toString&&e.className.toString().trim().split(" ")[0])||"")};}});return JSON.stringify({body:document.body.scrollWidth,doc:document.documentElement.scrollWidth,worst:worst.w,el:worst.el});})()`);
  const d=JSON.parse(r);const over=Math.max(d.body,d.doc)-vw;
  return {label,vw,over,detail:d};
 }
 const cats=await ev(`FORMATS.filter(function(f){return f.active;}).map(function(f){return f.id;})`);
 let flags=[];
 for(const vw of [360,390]){
  await send('Emulation.setDeviceMetricsOverride',{width:vw,height:820,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:SRV+'/?cb='+Date.now()});await sleep(2600);
  let f=await fit('home',vw);if(f.over>2)flags.push(f);console.log(`w${vw} home        over=${f.over}  (${f.detail.el})`);
  // gallery
  await ev(`__go("gallery");S.format="listing";openGallery();1`);await sleep(700);
  f=await fit('gallery',vw);if(f.over>2)flags.push(f);console.log(`w${vw} gallery     over=${f.over}  (${f.detail.el})`);
  // editor for every category
  for(const cat of cats){
   await ev(`S.f={};S.format=${JSON.stringify(cat)};S.template="folio";openEditor();1`);await sleep(450);
   f=await fit('editor:'+cat,vw);if(f.over>2)flags.push(f);console.log(`w${vw} editor/${cat.padEnd(10)} over=${f.over}  (${f.detail.el})`);
  }
  // present (needs photos)
  await ev(`S.f={};S.format="listing";S.template="folio";openEditor();1`);await sleep(300);
  const oid=(await send('Runtime.evaluate',{expression:`document.getElementById("file")`})).result.objectId;
  await send('DOM.setFileInputFiles',{files:[IMG+'/p7.jpg',IMG+'/p13.jpg',IMG+'/p18.jpg'],objectId:oid});await sleep(1400);
  await ev(`el("toPresent").click()`);await sleep(600);
  f=await fit('present',vw);if(f.over>2)flags.push(f);console.log(`w${vw} present     over=${f.over}  (${f.detail.el})`);
  await ev(`el("pExit").click()`);await sleep(200);
  // menu open
  await ev(`el("menuBtn").click()`);await sleep(300);
  f=await fit('menu',vw);if(f.over>2)flags.push(f);console.log(`w${vw} menu        over=${f.over}  (${f.detail.el})`);
 }
 console.log('\n'+(flags.length?('VIEWPORT-FIT FAILS ('+flags.length+'):\n'+flags.map(x=>`  ${x.label} @${x.vw}: overflows by ${x.over}px via ${x.detail.el} (body.scrollW=${x.detail.body})`).join('\n')):'ALL SCREENS FIT THE VIEWPORT (no horizontal overflow).'));
 ws.close();process.exit(flags.length?1:0);
})();
