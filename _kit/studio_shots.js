// studio_shots.js — capture representative beats for templates, for eyeballing.
// Usage: node studio_shots.js "grove,signal,column" [category=listing] [outdir=shots]
const CH='9379', SRV='http://127.0.0.1:8787';
const ids=(process.argv[2]||'').split(',').map(x=>x.trim()).filter(Boolean);
const CAT=process.argv[3]||'listing';
const OUT=process.argv[4]||'shots';
const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// which two beats best show a concept's skin (hero photo-treatment + data/price)
const BEATS={editorial:['cover','facts'],kinetic:['khook','kslam'],story:['shook','sprice'],numbers:['ntitle','nstat'],reveal:['rhero','rprice'],list:['ltitle','lreason'],spotlight:['sphero','spprice'],postcard:['pchero','pcprice'],mosaic:['mgrid','mprice']};
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 let list=await(await fetch(`http://127.0.0.1:${CH}/json`)).json();const tgt=list.find(t=>t.type==='page');
 const ws=new WebSocket(tgt.webSocketDebuggerUrl);const pend={};let _id=0;
 const send=(m,p={})=>{const id=++_id;ws.send(JSON.stringify({id,method:m,params:p}));return new Promise(r=>pend[id]=r);};
 await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id&&pend[d.id]){pend[d.id](d.result);delete pend[d.id];}};
 const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true});return r.result&&r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
 await send('Page.navigate',{url:SRV+'/?cb='+Date.now()});await sleep(2600);
 const F=`{address:"Watten Estate",price:"6800000",beds:"5",baths:"4",sqft:"4300",facing:"North-South",floor:"High / #21",tenure:"Freehold",h0:"Rare corner plot",h1:"Walk to Botanic Gardens MRT",h2:"Renovated in 2024",name:"Jordan Lee",cea:"R054321B",phone:"+65 8123 4567"}`;
 const P=`[{src:POOL[7].src,w:1,h:1,room:""},{src:POOL[13].src,w:1,h:1,room:"Living"},{src:POOL[18].src,w:1,h:1,room:"Kitchen"},{src:POOL[15].src,w:1,h:1,room:"Bedroom"}]`;
 for(const id of ids){
  const concept=await ev(`(TPL.filter(function(t){return t.id===${JSON.stringify(id)};})[0]||{}).concept`);
  if(!concept){console.log('skip unknown',id);continue;}
  await ev(`S.f={};S.format=${JSON.stringify(CAT)};S.template=${JSON.stringify(id)};openEditor();__loadPhotos(${P});__setFields(${F});1`);await sleep(500);
  for(const kind of (BEATS[concept]||['cover'])){
   const ok=await ev(`(function(){var bb=editR.st.beats.filter(function(x){return x.kind===${JSON.stringify(kind)};})[0];if(!bb)return false;editR.seek(bb.s+bb.dur*0.82);var pv=document.querySelector("#editReel .pov");if(pv)pv.style.display="none";document.getElementById("editReel").scrollIntoView({block:"center"});return true;})()`);
   if(!ok)continue;await sleep(420);
   const b=JSON.parse(await ev(`(function(){var r=document.querySelector("#editReel .reel").getBoundingClientRect();return JSON.stringify({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)});})()`));
   const s=await send('Page.captureScreenshot',{format:'png',clip:{x:Math.max(0,b.x-2),y:Math.max(0,b.y-2),width:b.w+4,height:b.h+4,scale:2}});
   fs.writeFileSync(`${OUT}/${id}_${kind}.png`,Buffer.from(s.data,'base64'));
  }
  console.log('shot',id,'('+concept+')');
 }
 ws.close();process.exit(0);
})();
