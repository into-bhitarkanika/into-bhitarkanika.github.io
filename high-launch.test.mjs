import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const threeURL=new URL('./dist/vendor/three.module.js',import.meta.url).href,T=await import(threeURL);
registerHooks({resolve(specifier,context,next){return next(specifier==='three'?threeURL:specifier,context);}});
const {createHighBoat,createHighTrafficMaterials,createLaunchHull,createLaunchDeck,createLaunchSole,createLaunchCanopy,launchSection,launchCanopyY,CANOPY_RIBS}=await import('./dist/high-launch.js');
const {createTraffic}=await import('./dist/traffic.js');
const {buildBoat}=await import('./dist/boat.js');
const {RowingCycle}=await import('./dist/rowing.js');
const {highLaunchWaterline}=await import('./dist/water-motion.js');
const noop=()=>{},context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(object,key)=>object[key]??noop,set:(object,key,value)=>(object[key]=value,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const finite=g=>Object.values(g.attributes).every(a=>a.array.every(Number.isFinite));
const fakeMaps=async()=>({wood:new T.Texture(),normal:new T.Texture(),roughness:new T.Texture(),cloth:new T.Texture(),dispose(){for(const k of ['wood','normal','roughness','cloth'])this[k].dispose();}});

test('High traffic materials preserve source materials, shared maps, geometry and navigation through quality switches',async()=>{
 const traffic=createTraffic(new T.Scene()),maps=await fakeMaps(),saved=[];
 for(const vessel of traffic.vessels)vessel.group.traverse(mesh=>{if(mesh.isMesh)saved.push({mesh,geometry:mesh.geometry,material:mesh.material,color:mesh.material.color.clone(),roughness:mesh.material.roughness});});
 const navigation=traffic.vessels.map(v=>[v.x,v.z,v.heading,v.speed]),high=createHighTrafficMaterials(traffic,maps);
 assert.ok(high.getStats().materialSwaps>12);const disposed=new Set(),swapped=new Set();let mapsDisposed=0;
 for(const map of [maps.wood,maps.normal,maps.roughness,maps.cloth])map.addEventListener('dispose',()=>mapsDisposed++);
 for(let i=0;i<6;i++){
  high.setEnabled(true);
  for(const item of saved){assert.equal(item.mesh.geometry,item.geometry);assert.ok(item.material.color.equals(item.color));assert.equal(item.material.roughness,item.roughness);
   if(item.mesh.material!==item.material){assert.ok(item.mesh.material.isMeshPhysicalMaterial);if(!swapped.has(item.mesh.material)){const material=item.mesh.material;swapped.add(material);material.addEventListener('dispose',()=>disposed.add(material));}}
  }
  high.setEnabled(false);for(const item of saved)assert.equal(item.mesh.material,item.material);
 }
 assert.deepEqual(traffic.vessels.map(v=>[v.x,v.z,v.heading,v.speed]),navigation);
 high.setEnabled(true);high.dispose();for(const item of saved)assert.equal(item.mesh.material,item.material);
 assert.equal(disposed.size,swapped.size);assert.equal(mapsDisposed,0,'cached maps remain owned by the launch');maps.dispose();
});

test('independent launch has curved joined strakes, a rounded sternpost and deck in the shared navigation envelope',()=>{
 const pieces=createLaunchHull();assert.equal(pieces.exterior.userData.hullStrakes,14);
 for(const g of Object.values(pieces)){assert.ok(finite(g));g.computeBoundingBox();assert.ok(g.boundingBox.min.z>=-7.57&&g.boundingBox.max.z<7.17);assert.ok(g.boundingBox.min.x>-1.88&&g.boundingBox.max.x<1.88);}
 const p=pieces.exterior.attributes.position,n=pieces.exterior.attributes.normal,per=161*9;
 for(let plank=0;plank<13;plank++)for(let row=0;row<161;row++)for(let a=0;a<3;a++)assert.equal(p.array[(plank*per+row*9+8)*3+a],p.array[((plank+1)*per+row*9)*3+a]);
 for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))<1&&p.getY(i)<-.53)assert.ok(n.getY(i)<-.8,'bilge normals face outward');
 const deck=createLaunchDeck();assert.ok(finite(deck));assert.ok(deck.userData.deckBoards>40);const d=deck.attributes.position;
 for(let i=0;i<d.count;i++){assert.ok(Math.abs(d.getX(i))<=Math.max(.0011,launchSection(d.getZ(i)).width-.092));assert.ok(d.getY(i)>=.7079&&d.getY(i)<=.7301);}
 Object.values(pieces).forEach(g=>g.dispose());deck.dispose();
});

test('open deck joints reveal a continuous recessed timber sole and edge UVs have valid area',()=>{
 const sole=createLaunchSole(),material=new T.MeshBasicMaterial(),mesh=new T.Mesh(sole,material),ray=new T.Raycaster(),deck=createLaunchDeck(),uv=deck.attributes.uv,ix=deck.index,p=deck.attributes.position;
 assert.ok(finite(sole));mesh.updateMatrixWorld(true);
 for(const x of [-.92,-.46,0,.46,.92])for(const z of [-3,-1,1,3,5]){ray.set(new T.Vector3(x,1,z),new T.Vector3(0,-1,0));const hits=ray.intersectObject(mesh);assert.ok(hits.length>0);assert.ok(Math.abs(hits[0].point.y-.697)<1e-6);}
 for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2),edge=[a,b,c].some(j=>p.getY(j)<.72);if(!edge)continue;
  const area=Math.abs((uv.getX(b)-uv.getX(a))*(uv.getY(c)-uv.getY(a))-(uv.getY(b)-uv.getY(a))*(uv.getX(c)-uv.getX(a)));assert.ok(area>1e-9,'side-edge tangent UVs cannot collapse onto a line');
 }
 sole.dispose();deck.dispose();material.dispose();
});

test('short lower canopy is tensioned onto supports and exposes the complete stern rowing station',()=>{
 const g=createLaunchCanopy();assert.ok(finite(g));g.computeBoundingBox();assert.ok(g.boundingBox.max.z<2.71&&g.boundingBox.min.z>-4.06);assert.ok(g.boundingBox.max.y<3.30&&g.boundingBox.min.y>2.88);
 for(const z of CANOPY_RIBS)assert.ok(Math.abs(launchCanopyY(0,z)-3.29)<1e-9);
 assert.ok(launchCanopyY(0,-2.925)<launchCanopyY(0,-1.8)-.06);g.dispose();
});

test('High water-contact profile meets the rebuilt hull at the actual water plane',()=>{
 const pieces=createLaunchHull(),p=pieces.exterior.attributes.position,per=161*9;
 let worst=0;
 for(let row=0;row<161;row++){
  let waterline=0;
  for(let plank=0;plank<14;plank++)for(let j=0;j<8;j++){
   const a=plank*per+row*9+j,b=a+1,ay=p.getY(a),by=p.getY(b);
   if(ay*by>0||ay===by)continue;
   const t=-ay/(by-ay);waterline=Math.max(waterline,Math.abs(p.getX(a)+(p.getX(b)-p.getX(a))*t));
  }
  const z=p.getZ(row*9),difference=Math.abs(waterline-highLaunchWaterline(z));worst=Math.max(worst,difference);
  assert.ok(difference<.018,`waterline differs from hull by ${difference} m at z=${z}`);
 }
 assert.ok(worst>.0001,'test must include actual polygonal water-plane intersections');
 assert.ok(highLaunchWaterline(7.1)<.04&&highLaunchWaterline(5.65)>.80&&highLaunchWaterline(-7.5)<.02,'rounded stern tapers beyond the occupied rowing station');
 Object.values(pieces).forEach(g=>g.dispose());
});

test('High assembly cycles without mutating Standard resources, working oars, or journey transforms',async()=>{
 const craft=buildBoat(new T.Scene()),saved=[];craft.boat.traverse(o=>saved.push({o,geometry:o.geometry,material:o.material,visible:o.visible}));
 const high=await createHighBoat({craft,renderer:{},loadTextures:fakeMaps}),root=craft.boat.getObjectByName('High independent working launch');
 assert.ok(root);assert.equal(root.visible,false);assert.equal(high.getStats().independentAssembly,true);assert.ok(high.getStats().detailDraws<=18);
 const timber=root.getObjectByName('Launch timber construction').material,shader={fragmentShader:'#include <map_fragment>\n#include <roughnessmap_fragment>'};timber.onBeforeCompile(shader);
 assert.ok(shader.fragmentShader.includes('(.81 + .17 * texelRoughness.g)'),'photographic table roughness is remapped to matte working timber');
 assert.ok(timber.roughness*.81>.79&&timber.specularIntensity<=.18&&timber.envMapIntensity<=.28);
 craft.boat.position.set(11,.12,-530);craft.boat.rotation.set(.01,.25,-.02);const position=craft.boat.position.clone(),quaternion=craft.boat.quaternion.clone();
 const row=new RowingCycle();
 for(let cycle=0;cycle<12;cycle++){
  high.setEnabled(true);assert.equal(root.visible,true);assert.equal(craft.rowingVisual.group.visible,true);assert.equal(craft.person.visible,true);
  for(let i=0;i<90;i++){row.step(1/60,{rowBoth:true});craft.rowingVisual.update({time:cycle*1.5+i/60,dt:1/60,mode:'row',rowing:row,high:true,waterHeight:()=>0});high.update(i/60,1/60,{preset:4,wind:{strength:1}});}
  assert.ok(craft.rowingVisual.pose.blend>.999);assert.equal(high.getStats().lampIntensity,8);
  high.beginReflection();high.endReflection();high.setEnabled(false);
  for(const {o,geometry,material,visible} of saved){assert.equal(o.geometry,geometry);assert.equal(o.material,material);if(o.parent===craft.boat&&!o.userData.rowingVisual)assert.equal(o.visible,visible);}
  assert.ok(craft.boat.position.equals(position));assert.ok(craft.boat.quaternion.equals(quaternion));
 }
 high.dispose();high.dispose();assert.equal(craft.boat.getObjectByName(root.name),undefined);
});

