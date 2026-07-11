// Build the optimized deploy from the self-contained master (app.html).
// Externalizes embedded demo JPEGs to /img/*.jpg (dedup), keeps fonts inline.
const fs=require('fs');
const h=fs.readFileSync('app.html','utf8');
const outDir='deploy_studio', imgDir=outDir+'/img';
fs.mkdirSync(imgDir,{recursive:true});
fs.readdirSync(imgDir).forEach(f=>{ if(f.endsWith('.jpg')) fs.unlinkSync(imgDir+'/'+f); });
const map={}; let n=0, bytes=0;
const out=h.replace(/data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)/g,function(_,b64){
  if(map[b64]) return map[b64];
  const name='img/p'+(n++)+'.jpg';
  const buf=Buffer.from(b64,'base64'); bytes+=buf.length;
  fs.writeFileSync(outDir+'/'+name,buf);
  map[b64]=name; return name;
});
fs.writeFileSync(outDir+'/index.html',out);
// mirror to local serve dir for testing
fs.mkdirSync('serve/img',{recursive:true});
fs.readdirSync('serve/img').forEach(f=>{ if(f.endsWith('.jpg')) fs.unlinkSync('serve/img/'+f); });
fs.readdirSync(imgDir).forEach(f=>fs.copyFileSync(imgDir+'/'+f,'serve/img/'+f));
fs.writeFileSync('serve/index.html',out);
console.log('unique demo images:',n,'('+Math.round(bytes/1024)+'KB total, now separate files)');
console.log('index.html:',Math.round(Buffer.byteLength(out)/1024)+'KB (was 2745KB)');
