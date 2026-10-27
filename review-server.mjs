import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const roots={before:path.join(base,'.sites-runtime/reconstruction-baseline-20260927/dist'),standard:path.join(base,'.sites-runtime/reconstruction-baseline-20260927/dist'),after:path.join(base,'dist'),live:path.join(base,'dist'),review:path.join(base,'artifacts/reconstruction-review')};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.hdr':'application/octet-stream','.bin':'application/octet-stream'};
// Local-only visible controls: equivalent cameras/weather/position for both
// versions. No review code is included in the deployed dist directory.
const fixture=`
const reviewBar=document.createElement('nav');reviewBar.className='ui';reviewBar.setAttribute('aria-label','Build review controls');reviewBar.style.cssText='position:fixed;top:106px;left:14px;right:14px;z-index:90;display:flex;flex-wrap:wrap;gap:4px;background:#163d35;padding:8px;border-radius:8px';document.body.append(reviewBar);
const reviewStyle=document.createElement('style');reviewStyle.textContent='.hidden-ui nav[aria-label="Build review controls"]{display:none!important}.hidden-ui #show-button{display:none!important}';document.head.append(reviewStyle);
let reviewIndex=0,reviewCamera=0,reviewZ=0,artTimes=[],artMeasuring=false,artLast=0;
function artFrame(now){requestAnimationFrame(artFrame);if(artMeasuring&&!document.hidden&&artLast){artTimes.push(now-artLast);if(artTimes.length%120===0){const sorted=[...artTimes].sort((a,b)=>a-b),total=artTimes.reduce((a,b)=>a+b,0);canvas.dataset.artTiming=JSON.stringify({frames:sorted.length,seconds:total/1000,fps:sorted.length*1000/total,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over50:sorted.filter(x=>x>50).length,over100:sorted.filter(x=>x>100).length,viewport:[innerWidth,innerHeight],render:[canvas.width,canvas.height]});}}artLast=now;}requestAnimationFrame(artFrame);
function lockReview(){
 const h=.55,fx=-Math.sin(.13),fz=-Math.cos(.13),x=center(reviewZ),z=reviewZ;
 const poses=[{p:[x+Math.sin(h)*26,3+Math.sin(.29)*26,z+Math.cos(h)*26],q:[x+fx*6,1.5,z+fz*6]},{p:[x+fx*7.75,2.55,z+fz*7.75],q:[x-Math.sin(h)*40,3.1,z-Math.cos(h)*40]},{p:[x+Math.sin(h)*33.8,42,z+Math.cos(h)*33.8],q:[x+fx*6,1.5,z+fz*6]}];
 artLock=poses[reviewCamera];canvas.dataset.artCamera=JSON.stringify(artLock);state.camera=reviewCamera;updateUI();
}
async function prepareReview(index){
 pixelRatio=1;renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.getDrawingBufferSize(drawingSize);highGraphics?.setSize(drawingSize.x,drawingSize.y);
 if(state.graphics!=='high'&&index>2)return;reviewIndex=index;setMode('motor');reset();state.timeIndex=index;applyLight();
 physics.x=center(reviewZ);physics.z=reviewZ;physics.heading=.13;physics.distance=Math.abs(reviewZ);physics.speed=0;accumulator=0;
 Object.assign(previousPose,{x:physics.x,z:reviewZ,heading:.13});Object.assign(motion,previousPose);boat.position.set(physics.x,0,reviewZ);boat.rotation.set(0,.13,0);
 if(state.graphics==='high')for(let i=0;i<1500;i++)highGraphics.advanceWeather(17+i/60,1/60,boat.position,camera);
 time=42;state.paused=true;lockReview();canvas.focus();canvas.dataset.artReview=JSON.stringify({index,time,boat:[physics.x,reviewZ,.13],viewport:[innerWidth,innerHeight]});
}
for(const [name,action] of [['Golden',()=>prepareReview(0)],['Morning',()=>prepareReview(1)],['Blue',()=>prepareReview(2)],['Storm',()=>prepareReview(3)],['Night',()=>prepareReview(4)],['Follow',()=>{reviewCamera=0;lockReview();}],['Bow',()=>{reviewCamera=1;lockReview();}],['Overhead',()=>{reviewCamera=2;lockReview();}],['Landing',()=>{reviewZ=0;prepareReview(reviewIndex);}],['Bend',()=>{reviewZ=-111;prepareReview(reviewIndex);}],['Tidal shelf',()=>{reviewZ=-234;prepareReview(reviewIndex);}],['Clearing',()=>{reviewZ=-417;prepareReview(reviewIndex);}],['Live',()=>{artLock=null;state.paused=false;canvas.focus();}],['Measure',()=>{artTimes=[];artMeasuring=true;artLast=0;if(typeof gpuProfile!=='undefined')gpuProfile.reset();canvas.focus();}]]){const b=document.createElement('button');b.textContent='Review '+name;b.onclick=action;b.style.cssText='padding:6px;border:0;border-radius:4px';reviewBar.append(b);}
const version=document.createElement('small');version.style.cssText='color:#fff;align-self:center;margin-left:8px';version.textContent=location.pathname.split('/')[1]+' · reconstruction 27 Sep';reviewBar.append(version);canvas.dataset.reviewBuild=version.textContent;
if(new URLSearchParams(location.search).get('graphics')==='high'){openDialog('graphics-dialog');selectGraphics('high');}
`;
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),parts=decodeURIComponent(url.pathname).split('/').filter(Boolean),variant=parts.shift(),root=roots[variant];
  if(!root){res.writeHead(302,{Location:'/review/'}).end();return;}
  const file=path.resolve(root,...(parts.length?parts:['index.html']));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const actual=(await stat(file)).isDirectory()?path.join(file,'index.html'):file;let body=await readFile(actual);
  if(actual.endsWith(path.sep+'main.js')&&variant==='live'){
   body=Buffer.from(body.toString()+"\nif(new URLSearchParams(location.search).get('graphics')==='high'){openDialog('graphics-dialog');selectGraphics('high');}\n");
  }else if(actual.endsWith(path.sep+'main.js')){
   let code=body.toString().replace('const state =','let artLock=null;\nconst state =');
   code=code.replace('// Quantize in light-space','if(artLock){camera.fov=48;camera.updateProjectionMatrix();camera.position.set(...artLock.p);cameraTarget.set(...artLock.q);camera.lookAt(cameraTarget);camera.updateMatrixWorld();}\n  // Quantize in light-space');
   code=code.replace("if(state.paused||/INPUT","if(state.paused&&event.code==='KeyH'){hideUI();return;}if(state.paused||/INPUT");body=Buffer.from(code+fixture);
  }
  res.writeHead(200,{'Content-Type':types[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
 }catch(error){console.log('Missing',req.url,error.code);res.writeHead(404).end('Not found');}
}).listen(4175,'127.0.0.1',()=>console.log('Reconstruction review: http://127.0.0.1:4175/review/ · current build /after/'));
