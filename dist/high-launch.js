import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {highLaunchSection} from './water-motion.js';

// A separate, metre-scaled working launch. Gameplay owns the parent transform,
// rowing station and oars; this collection owns only its visible construction.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),TAU=Math.PI*2;
const hash=n=>{const x=Math.sin(n*127.1+43.17)*43758.5453;return x-Math.floor(x);};
export const launchSection=z=>highLaunchSection(z);
function geometry(p,uv,ix,c){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;}
function white(g){if(!g.attributes.color)g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));return g;}
function merge(parts){const flat=parts.map(g=>white(g.index?g.toNonIndexed():g.clone()));const g=mergeGeometries(flat,false);flat.forEach(p=>p.dispose());parts.forEach(p=>p.dispose());g.computeBoundingSphere();return g;}
function hullPoint(z,a,inset=0){const {width,top}=launchSection(z);return V(-Math.cos(a)*Math.max(.01,width-inset),top-Math.sin(a)*(1.45-inset),z);}

export function createLaunchHull(){
 const p=[],uv=[],ix=[],c=[],rows=160,strakes=14,profile=[0,.025,.07,.30,.50,.70,.93,.975,1];
 // Flush carvel planking, with a 2 mm caulk recess, not large black grooves.
 for(let plank=0;plank<strakes;plank++){
  const start=p.length/3,tone=.91+hash(plank+41)*.16;
  for(let row=0;row<=rows;row++)for(let j=0;j<profile.length;j++){
   const seam=j===0||j===profile.length-1,z=-7.5+14.6*row/rows,a=(plank+profile[j])/strakes*Math.PI,q=hullPoint(z,a,seam?.003:0);
   p.push(q.x,q.y,q.z);uv.push(a*.80,z*.33+hash(plank)*.37);const wet=T.MathUtils.smoothstep(q.y,-.1,.40),shade=tone*(.80+.20*wet)*(seam?.83:1);c.push(shade,shade,shade);
  }
  for(let row=0;row<rows;row++)for(let j=0;j<profile.length-1;j++){const a=start+row*profile.length+j,b=a+profile.length;ix.push(a,a+1,b,b,a+1,b+1);}
 }
 const exterior=geometry(p,uv,ix,c),inner=[],cap=[],transom=[];
 for(const side of [-1,1]){
  const q=[],u=[],ii=[],cc=[];
  for(let row=0;row<=rows;row++){
   const z=-7.5+row/rows*14.6,{width,top}=launchSection(z),w=Math.max(.01,width-.075);
   q.push(side*w,top,z,side*Math.max(.01,w-.065),.68,z);u.push(w*.30,z*.33,w*.30+.10,z*.33);cc.push(.87,.87,.87,.58,.58,.58);
  }
  for(let row=0;row<rows;row++){const a=row*2,b=a+2;ii.push(...(side>0?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
  inner.push(geometry(q,u,ii,cc));
  const curve=[];for(let row=0;row<=rows;row++){const z=-7.5+row/rows*14.6,{width,top}=launchSection(z);curve.push(V(side*(width-.012),top+.017,z));}
  const rail=new T.TubeGeometry(new T.CatmullRomCurve3(curve),180,.054,12,false);cap.push(rail);
 }
 // A curved, nearly double-ended stern closes on a narrow solid sternpost.
 // The former broad flat transom no longer fights the longitudinal hull loft.
 const shape=new T.Shape();for(let i=0;i<=40;i++){const q=hullPoint(7.1,i/40*Math.PI);if(i===0)shape.moveTo(q.x,q.y);else shape.lineTo(q.x,q.y);}shape.closePath();
 const stern=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.004,curveSegments:20});stern.translate(0,0,7.051);transom.push(stern);
 exterior.userData.hullStrakes=strakes;exterior.userData.length=14.6;
 return {exterior,interior:merge(inner),gunwale:merge(cap),transom:merge(transom)};
}

export function createLaunchDeck(){
 const p=[],uv=[],ix=[],c=[];let boards=0;
 const quad=(pts,uvs,shade)=>{const a=p.length/3;for(let i=0;i<4;i++){p.push(...pts[i]);uv.push(...uvs[i]);c.push(shade,shade,shade);}ix.push(a,a+1,a+2,a,a+2,a+3);};
 for(let column=-8;column<8;column++){
  const x0=column*.23+.0015,x1=(column+1)*.23-.0015,offset=hash(column+74)*2.5;
  for(let plank=-1;plank<5;plank++){
   const start=Math.max(-7.45,-7.5+plank*3.35+offset),end=Math.min(7.025,-7.5+(plank+1)*3.35+offset-.003);if(end<=start)continue;
   const tone=.88+hash(column*17+plank)*.24;let count=0;
   for(let z=start;z<end-.001;z+=.12){
    const next=Math.min(end,z+.12),half0=Math.max(.001,launchSection(z).width-.095),half1=Math.max(.001,launchSection(next).width-.095);
    const left0=Math.max(-half0,Math.min(half0,x0)),right0=Math.max(-half0,Math.min(half0,x1)),left1=Math.max(-half1,Math.min(half1,x0)),right1=Math.max(-half1,Math.min(half1,x1));if(right0-left0<.0001&&right1-left1<.0001)continue;
    quad([[left0,.73,z],[left1,.73,next],[right1,.73,next],[right0,.73,z]],[[left0*.5+hash(column)*.5,z*.33],[left1*.5+hash(column)*.5,next*.33],[right1*.5+hash(column)*.5,next*.33],[right0*.5+hash(column)*.5,z*.33]],tone);count++;
    // Narrow downward board edges create real contact at the joins.
    for(const side of [0,1]){const a=side?right0:left0,b=side?right1:left1;quad([[a,.708,z],[b,.708,next],[b,.73,next],[a,.73,z]],[[.354,z*.33],[.354,next*.33],[.365,next*.33],[.365,z*.33]],tone*.67);}
   }
   if(count)boards++;
  }
 }
 const g=geometry(p,uv,ix,c);g.userData.deckBoards=boards;return g;
}

export function createLaunchSole(){
 // Deck seams reveal the recessed timber sole, never the bright water below.
 // The exterior hull faces outward and is correctly culled from inside, so it
 // cannot close these gaps itself. A continuous inner surface is real joinery,
 // and also prevents subpixel water reflections from sparkling through joints.
 const p=[],uv=[],ix=[],c=[],rows=140;
 for(let i=0;i<=rows;i++){
  const z=-7.455+i/rows*14.485,half=Math.max(.002,launchSection(z).width-.090);
  for(const x of [-half,half]){p.push(x,.697,z);uv.push(x*.5,z*.33);c.push(.42,.42,.42);}
 }
 for(let i=0;i<rows;i++){const a=i*2,b=a+2;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=geometry(p,uv,ix,c);g.userData.continuousSole=true;return g;
}
export const CANOPY_RIBS=[-4.05,-1.80,.45,2.70];
export function launchCanopyY(x,z){
 const i=Math.max(0,Math.min(2,CANOPY_RIBS.findIndex((v,n)=>n<3&&z<=CANOPY_RIBS[n+1]))),u=T.MathUtils.clamp((z-CANOPY_RIBS[i])/(CANOPY_RIBS[i+1]-CANOPY_RIBS[i]),0,1),across=Math.max(0,1-(x/1.83)**2);
 return 2.89+.40*across-.065*Math.sin(Math.PI*u)*across+.004*Math.sin(x*13+z*2)*Math.sin(Math.PI*u);
}
export function createLaunchCanopy(){
 const p=[],uv=[],ix=[],c=[],nx=32,nz=54;
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=(i/nx-.5)*3.66,z=-4.05+j/nz*6.75;p.push(x,launchCanopyY(x,z),z);uv.push(x*2.5,z*2.5);const shade=.92+.04*Math.sin(z*.77+x);c.push(shade,shade,shade);}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const g=geometry(p,uv,ix,c);g.userData.canopy=true;return g;
}

export async function loadLaunchTextures(renderer){
 const loader=new T.TextureLoader(),names=['wood-color.jpg','wood-normal.jpg','wood-roughness.jpg','linen-color.jpg','linen-normal.jpg','linen-roughness.jpg'],loaded=await Promise.allSettled(names.map(name=>loader.loadAsync(new URL('./assets/high/launch/'+name,import.meta.url).href)));
 if(loaded.some(r=>r.status==='rejected')){for(const r of loaded)if(r.status==='fulfilled')r.value.dispose();throw new Error('The working launch timber textures could not load.');}
 const [wood,normal,roughness,cloth,clothNormal,clothRoughness]=loaded.map(r=>r.value);wood.colorSpace=cloth.colorSpace=T.SRGBColorSpace;
 for(const map of [wood,normal,roughness,cloth,clothNormal,clothRoughness]){map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 return {wood,normal,roughness,cloth,clothNormal,clothRoughness,dispose(){for(const t of [wood,normal,roughness,cloth,clothNormal,clothRoughness])t.dispose();}};
}
function timberMaterial(maps,color,paint=false){
 const m=new T.MeshPhysicalMaterial({color,map:maps.wood,normalMap:maps.normal,normalScale:new T.Vector2(paint?.19:.26,paint?.19:.26),roughnessMap:maps.roughness,roughness:paint?.94:.98,vertexColors:true,metalness:0,specularIntensity:paint?.23:.18,envMapIntensity:.28});
 m.userData.weatherSurface=paint?'paint':'wood';
 // The photographic sample is a polished table. Its dark roughness pixels
 // must describe relative fibre variation, not turn working timber into a
 // varnished mirror under an HDR sky. Remap them into a dry matte finish.
 m.onBeforeCompile=shader=>{
  if(!paint)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 launchWood=texture2D(map,vMapUv).rgb;
   float woodLuma=dot(launchWood,vec3(.2126,.7152,.0722));
   // The reference launch uses unvarnished, weathered timber rather than the
   // scan's dark polished walnut. Retain its real grain while neutralizing the
   // strong red stain and bringing dry wood into a plausible diffuse range.
   vec3 dryTimber=vec3(.027,.026,.024)+mix(vec3(woodLuma),launchWood,.36)*2.8;
   diffuseColor.rgb*=dryTimber;`);
  else{
   shader.vertexShader='attribute float launchSheer; varying vec3 vLaunchP; varying float vLaunchSheer;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLaunchP=position; vLaunchSheer=launchSheer;');
   shader.fragmentShader='varying vec3 vLaunchP; varying float vLaunchSheer;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 launchGrain=texture2D(map,vMapUv);
    float grain=dot(launchGrain.rgb,vec3(.2126,.7152,.0722));
    vec3 maintainedPaint=diffuseColor.rgb*(.88+grain*.63);
    float waterStain=exp(-pow((vLaunchP.y-.045)/.105,2.));
    maintainedPaint*=1.-waterStain*(.12+.055*sin(vLaunchP.z*1.71));
    float edgeWear=smoothstep(.66,.98,vLaunchP.y)*(.5+.5*sin(vLaunchP.z*6.1+grain*15.))*smoothstep(.03,.19,grain)*.18;
    diffuseColor.rgb=mix(maintainedPaint,launchGrain.rgb*1.1,edgeWear);
    float belowRim=vLaunchSheer-vLaunchP.y;
    float upperBand=smoothstep(.15,.17,belowRim)*(1.-smoothstep(.37,.40,belowRim));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.56,.53,.43)*(.87+grain*.36),upperBand*.84);`);
  }
  const range=paint?'(.76 + .20 * texelRoughness.g)':'(.81 + .17 * texelRoughness.g)';
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace('roughnessFactor *= texelRoughness.g;',`roughnessFactor *= ${range};`));
 };
 m.customProgramCacheKey=()=> 'launch-ph-working-timber-v4-'+paint;
 return m;
}

// Traffic keeps its inexpensive geometry and routes. These replacements are
// owned by High and reference the already loaded launch maps; Standard's shared
// materials and the passenger LOD's independent geometry swaps stay untouched.
export function createHighTrafficMaterials(traffic,maps){
 const swaps=[],materials=new Map();let enabled=false;
 function replacement(source){
  if(materials.has(source))return materials.get(source);
  if(!source?.isMeshStandardMaterial||source.map||source.emissive?.getHex())return null;
  const color=source.color.getHex(),kind=color===0x755239?'wood':color===0xcac3a0?'cloth':color===0x355966?'glass':color===0xe3dfc8||color===0x254c5e||source.roughness===.62?'paint':null;
  if(!kind)return null;
  let material;
  if(kind==='wood'){
   material=timberMaterial(maps,0xd9c4ab);material.vertexColors=false;material.normalMap=null;
   const prepare=material.onBeforeCompile;
   material.onBeforeCompile=shader=>{prepare(shader);shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=vec2(position.x*.50+position.y*.75,position.z*.33);\nvRoughnessMapUv=vMapUv;');};
   material.customProgramCacheKey=()=> 'traffic-working-timber-v1';
  }else if(kind==='cloth'){
   material=new T.MeshPhysicalMaterial({color:0xd9d0b7,map:maps.cloth,roughnessMap:maps.clothRoughness??null,roughness:.98,sheen:.22,sheenRoughness:.9,sheenColor:0xb7b6ab,specularIntensity:.16});
   material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=position.xz*2.5;\n#ifdef USE_ROUGHNESSMAP\nvRoughnessMapUv=vMapUv;\n#endif');shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','vec3 linen=texture2D(map,vMapUv).rgb;diffuseColor.rgb*=dot(linen,vec3(.2126,.7152,.0722))*1.60;');};
   material.customProgramCacheKey=()=> 'traffic-scanned-linen-v1';
  }else if(kind==='glass'){
   // The cabin is opaque inside. Reflection gives glass its surface response
   // without transmission exposing the simplified, unmodelled interior.
   material=new T.MeshPhysicalMaterial({color:0x485552,metalness:0,roughness:.16,ior:1.5,specularIntensity:1,envMapIntensity:1.15,clearcoat:.12,clearcoatRoughness:.13});
  }else{
   material=new T.MeshPhysicalMaterial({color:source.color,roughness:source.roughness===.62?.68:.76,metalness:0,specularIntensity:.38,envMapIntensity:.65,clearcoat:.045,clearcoatRoughness:.72});
   material.color.multiplyScalar(.94);
  }
  material.side=source.side;material.shadowSide=source.shadowSide;material.userData.weatherSurface=kind==='glass'?'glass':kind;materials.set(source,material);return material;
 }
 for(const vessel of traffic?.vessels||[])for(const mesh of vessel.group.children){
  // Only original boat batches are direct children; High people have a holder.
  if(!mesh.isMesh||Array.isArray(mesh.material))continue;
  const high=replacement(mesh.material);if(high)swaps.push({mesh,standard:mesh.material,high});
 }
 return {setEnabled(value){enabled=Boolean(value);for(const swap of swaps)swap.mesh.material=enabled?swap.high:swap.standard;},getStats(){return {materialSwaps:swaps.length,materials:materials.size};},dispose(){this.setEnabled(false);for(const material of materials.values())material.dispose();materials.clear();}};
}

export async function createHighBoat({craft,traffic,renderer,onProgress=()=>{},loadTextures=loadLaunchTextures}){
 onProgress('Building the working timber launch');const maps=await loadTextures(renderer),owned=new Set(),root=new T.Group();root.name='High independent working launch';root.visible=false;
 const material=(type,params)=>{const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,...params});m.userData.weatherSurface=type;owned.add(m);return m;};
 const wood=timberMaterial(maps,0xd9c4ab),paint=timberMaterial(maps,0x32625d,true);owned.add(wood);owned.add(paint);
 const cloth=new T.MeshPhysicalMaterial({color:0xd9d0b7,map:maps.cloth,normalMap:maps.clothNormal??null,normalScale:new T.Vector2(.22,.22),roughnessMap:maps.clothRoughness??null,roughness:.98,sheen:.28,sheenRoughness:.88,sheenColor:0xb7b6ab,specularIntensity:.16,vertexColors:true,side:T.DoubleSide,shadowSide:T.FrontSide});cloth.userData.weatherSurface='cloth';owned.add(cloth);
 cloth.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vLaunchCloth;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLaunchCloth=position;');shader.fragmentShader='varying vec3 vLaunchCloth;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 launchCloth=texture2D(map,vMapUv);float linenLuma=dot(launchCloth.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=linenLuma*1.60;
   float ribDistance=min(min(abs(vLaunchCloth.z+4.05),abs(vLaunchCloth.z+1.80)),min(abs(vLaunchCloth.z-.45),abs(vLaunchCloth.z-2.70)));
   float seam=1.-smoothstep(.010,.024+fwidth(vLaunchCloth.z),ribDistance);float ridgeSeam=1.-smoothstep(.009,.020+fwidth(vLaunchCloth.x),abs(vLaunchCloth.x));
   diffuseColor.rgb*=1.-seam*.105-ridgeSeam*.045;`);};cloth.customProgramCacheKey=()=> 'launch-scanned-sewn-linen-v1';
 const metal=material('paint',{color:0x787a70,metalness:.63,roughness:.64}),rope=material('rope',{color:0xb3a487,roughness:.99}),rubber=material('rubber',{color:0x242925,roughness:.96}),cream=material('paint',{color:0xb9b5a1,roughness:.91}),red=material('paint',{color:0xb84d31,roughness:.90});
 const buckets=new Map(),add=(g,m)=>{if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);};
 const box=(size,point,m=wood)=>{const g=new T.BoxGeometry(...size);g.translate(...point);add(g,m);};
 const tube=(points,radius,m=wood,segments=24,radial=8)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,radius,radial,false),m);
 const rod=(a,b,r,m=metal)=>{const d=b.clone().sub(a),g=new T.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(g,m);};
 const hull=createLaunchHull();add(hull.exterior,paint);add(hull.interior,wood);add(hull.gunwale,wood);add(hull.transom,paint);const deck=createLaunchDeck();add(deck,wood);add(createLaunchSole(),wood);const deckBoards=deck.userData.deckBoards;
 // Bent frames rise from the sole into the inner topsides, every 70 cm.
 let frames=0;
 for(let z=-6.4;z<=6.65;z+=.72){const {width,top}=launchSection(z);for(const s of [-1,1]){rod(V(s*(width-.20),.735,z),V(s*(width-.097),top-.026,z),.031,wood);box([.16,.043,.075],[s*(width-.18),.757,z]);}frames++;}
 // Longitudinal seat slats and mortised low legs; keep the stern station clear.
 for(const s of [-1,1]){
  for(let strip=0;strip<3;strip++)box([.125,.058,6.34],[s*(1.14+strip*.133),1.16,-.54]);
  for(const z of [-3.20,-.64,1.95]){box([.067,.38,.075],[s*1.27,.92,z]);box([.34,.055,.11],[s*1.27,1.11,z]);}
  for(const z of CANOPY_RIBS){const width=launchSection(z).width;rod(V(s*(width-.12),.83,z),V(s*1.77,2.89,z),.024,metal);rod(V(s*1.77,2.45,z),V(s*1.55,3.0,z+s*.29),.012,metal);}
  tube(CANOPY_RIBS.map(z=>V(s*1.77,2.875,z)),.023,metal,36);
  // Sewn bindings and cord attach the cloth to every upright.
  tube(Array.from({length:50},(_,i)=>{const z=-4.05+i/49*6.75;return V(s*1.827,launchCanopyY(s*1.827,z),z);}),.016,cloth,70);
  for(const z of CANOPY_RIBS){tube([V(s*1.82,2.895,z),V(s*1.77,2.81,z+.02),V(s*1.74,2.84,z-.035)],.007,rope,10,5);}
  // A narrow, maintained topside line is attached to the planks, not a thick rail.
  tube(Array.from({length:80},(_,i)=>{const z=-7.2+i/79*14.1,{width,top}=launchSection(z);return V(s*width*.996,top-.17,z);}),.014,cream,88,5);
  for(const z of [-3.4,.8,4.4]){const w=launchSection(z).width,tyre=new T.TorusGeometry(.24,.062,12,30);tyre.rotateY(Math.PI/2);tyre.translate(s*(w+.06),.49,z);add(tyre,rubber);tube([V(s*w,.91,z),V(s*(w+.08),.70,z+.05),V(s*(w+.08),.49,z)],.012,rope,12,5);}
 }
 for(const z of CANOPY_RIBS){const pts=[];for(let i=0;i<=28;i++){const x=(i/28-.5)*3.56;pts.push(V(x,launchCanopyY(x,z)-.029,z));}tube(pts,.022,metal,34);}
 // Compact forward console supports the retained animated helm position.
 box([.62,.72,.43],[0,1.12,-4.93],paint);box([.69,.045,.48],[0,1.50,-4.93]);
 for(const z of [-6.7,6.66]){rod(V(0,.78,z),V(0,1.01,z),.031,metal);rod(V(-.17,1.0,z),V(.17,1.0,z),.03,metal);}
 for(let i=0;i<6;i++){const g=new T.TorusGeometry(.17+i*.027,.012,6,44);g.rotateX(Math.PI/2);g.translate(.47,.749+i*.001,-5.60);add(g,rope);}
 // Two low storage hatches sit flush with the walking deck.
 for(const z of [-5.9,3.77]){box([.73,.025,.65],[0,.743,z]);box([.14,.018,.035],[0,.766,z-.22],metal);}
 for(const z of [-2.7,1.45]){const ring=new T.TorusGeometry(.265,.082,12,40);ring.rotateY(Math.PI/2);ring.translate(1.56,1.50,z);add(ring,red);for(const a of [0,Math.PI]){const g=new T.TorusGeometry(.265,.084,8,9,a,.28);g.rotateY(Math.PI/2);g.translate(1.56,1.50,z);add(g,cream);}}
 for(const [m,parts] of buckets){const g=merge(parts);if(m===paint){const p=g.attributes.position,values=new Float32Array(p.count);for(let i=0;i<p.count;i++)values[i]=launchSection(p.getZ(i)).top;g.setAttribute('launchSheer',new T.BufferAttribute(values,1));}const mesh=new T.Mesh(g,m);mesh.name='Launch '+(m===wood?'timber construction':m===paint?'painted hull':m===cloth?'canvas bindings':m===metal?'metal fittings':m===rope?'cordage':m===rubber?'fenders':'markings');mesh.castShadow=m!==rope;mesh.receiveShadow=true;root.add(mesh);}
 const canopyGeometry=createLaunchCanopy(),canopyRest=new Float32Array(canopyGeometry.attributes.position.array),canopy=new T.Mesh(canopyGeometry,cloth);canopy.name='Short tensioned canvas shelter';canopy.castShadow=canopy.receiveShadow=true;root.add(canopy);
 // The original wheel remains the gameplay state; its independent visual reads it.
 const helm=new T.Group();helm.name='High working helm';helm.position.copy(craft.wheel.position);root.add(helm);
 const wheelRing=new T.Mesh(new T.TorusGeometry(.27,.021,10,40),wood);helm.add(wheelRing);
 for(let i=0;i<6;i++){const a=i*TAU/6,g=new T.CylinderGeometry(.011,.011,.48,8),m=new T.Mesh(g,metal);m.rotation.z=a;helm.add(m);}
 const light=new T.PointLight(0xffce93,0,9,2);light.name='Working launch cabin lamp';light.position.set(0,2.91,2.30);root.add(light);
 const lensMaterial=material('paint',{color:0xe2d8b8,emissive:0xffc784,emissiveIntensity:.02});const lamp=new T.Mesh(new T.SphereGeometry(.074,16,12),lensMaterial);lamp.position.copy(light.position);root.add(lamp);
 const original=craft.boat.children.filter(o=>!o.userData.rowingVisual&&o!==craft.person).map(o=>({o,visible:o.visible}));craft.boat.add(root);
 const trafficMaterials=createHighTrafficMaterials(traffic,maps);
 let enabled=false,disposed=false,reflection=null,lastCanopyTime=-Infinity;
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 return {
  canopyHeight(x,z){return Math.abs(x)<=1.83&&z>=-4.05&&z<=2.70?launchCanopyY(x,z):-Infinity;},
  setEnabled(value){if(disposed)return;this.endReflection();enabled=Boolean(value);root.visible=enabled;trafficMaterials.setEnabled(enabled);for(const item of original)item.o.visible=enabled?false:item.visible;if(!enabled)light.intensity=0;},
  update(time,dt,climate={}){
   if(!enabled)return;helm.quaternion.copy(craft.wheel.quaternion);light.intensity=climate.preset===4?8:climate.preset===2?1.3:0;lensMaterial.emissiveIntensity=.03+light.intensity*.15;
   if(!dt||time-lastCanopyTime<1/30)return;lastCanopyTime=time;
   const p=canopyGeometry.attributes.position,wind=Math.min(1,climate.wind?.strength??.25);
   for(let i=0;i<p.count;i++){const x=canopyRest[i*3],y=canopyRest[i*3+1],z=canopyRest[i*3+2],n=Math.max(0,Math.min(2,CANOPY_RIBS.findIndex((v,j)=>j<3&&z<=CANOPY_RIBS[j+1]))),u=(z-CANOPY_RIBS[n])/(CANOPY_RIBS[n+1]-CANOPY_RIBS[n]),slack=Math.sin(u*Math.PI)**2*Math.max(0,1-(x/1.83)**2);p.setY(i,y+slack*Math.sin(time*2.05+z*.9+x)*wind*.012);}
   p.needsUpdate=true;canopyGeometry.computeVertexNormals();
  },
  beginReflection(){if(!enabled||reflection)return;reflection=meshes.filter(o=>o.material===rope||o.parent===helm).map(o=>[o,o.visible]);for(const [o] of reflection)o.visible=false;},
  endReflection(){if(!reflection)return;for(const [o,visible] of reflection)o.visible=visible;reflection=null;},
  getStats(){return {independentAssembly:true,length:14.6,hullStrakes:14,deckBoards,structuralFrames:frames,canopyTriangles:canopyGeometry.index.count/3,detailDraws:meshes.length,detailShadowDraws:meshes.filter(o=>o.castShadow).length,detailReflectionDraws:meshes.filter(o=>o.material!==rope&&o.parent!==helm).length,lampIntensity:light.intensity};},
  dispose(){if(disposed)return;this.setEnabled(false);disposed=true;trafficMaterials.dispose();root.removeFromParent();for(const mesh of meshes)mesh.geometry.dispose();for(const m of owned)m.dispose();maps.dispose();light.dispose();}
 };
}
