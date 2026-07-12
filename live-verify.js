const {chromium}=require('/private/tmp/claude-502/-Users-ZY/2ee2f7b8-7f2f-48f9-a64b-8f61bda15d76/scratchpad/exporttest/node_modules/playwright-core');
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CF=`window.__lum=function(c){var m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(parseFloat);var a=p[3]===undefined?1:p[3];if(a<0.99)return null;var f=p.slice(0,3).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*f[0]+.7152*f[1]+.0722*f[2];};window.__bgOf=function(el){while(el){var b=getComputedStyle(el).backgroundColor;var l=window.__lum(b);if(l!==null)return b;el=el.parentElement;}return 'rgb(255,255,255)';};window.__r=function(sel){var el=document.querySelector(sel);if(!el)return null;var lf=window.__lum(getComputedStyle(el).color),lb=window.__lum(window.__bgOf(el));if(lf==null||lb==null)return null;var hi=Math.max(lf,lb),lo=Math.min(lf,lb);return Math.round((hi+.05)/(lo+.05)*100)/100;};`;
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,headless:true});
 const pg=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('c:'+m.text());});
 await pg.goto('https://studio.propsight.sg/?cb='+Date.now(),{waitUntil:'load'});
 await pg.waitForFunction("window.TPL",{timeout:20000});
 await pg.addScriptTag({content:CF});
 await pg.waitForTimeout(800);
 const contrast=await pg.evaluate(()=>({lede:window.__r('.lede'),caps:window.__r('.caps'),cardDesc:window.__r('.meta span')}));
 // real export via a template with sample photos
 const exp=await pg.evaluate(async()=>{
   const h=document.createElement('div');h.id='__x';h.style.cssText='position:fixed;left:0;top:0;width:360px;height:640px;z-index:99999';document.body.appendChild(h);
   const r=window.Reel(h,{template:'folio',autoplay:false,spec:window.previewSpec(2,'listing')});h._reel=r;r.build&&r.build();
   await new Promise(x=>setTimeout(x,150));
   const beats=r.st.beats.length;
   window.__mp4=null;window.__err=null;
   try{await window.exportReelFast('__x',{fps:24,maxSecs:3,width:360,height:640});}catch(e){window.__err=String(e);}
   const b64=window.__mp4;return {beats, ok:!!(b64&&atob(b64).length>3000), bytes:b64?atob(b64).length:0, err:window.__err};
 });
 // mobile overflow
 const mp=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const merr=[];mp.on('pageerror',e=>merr.push(e.message));
 await mp.goto('https://studio.propsight.sg/?cb='+Date.now(),{waitUntil:'load'});
 await mp.waitForFunction("window.TPL",{timeout:20000});await mp.waitForTimeout(600);
 const mov=await mp.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 console.log(JSON.stringify({contrast, export:exp, desktopErrors:errs, mobileOverflow:mov, mobileErrors:merr},null,1));
 await b.close();
})();
