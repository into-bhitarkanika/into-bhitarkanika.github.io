import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const threeURL=new URL('./dist/vendor/three.module.js',import.meta.url).href;
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const three=source=>source.replaceAll("from 'three'",`from '${threeURL}'`);
const utilsURL=moduleURL(three(await readFile(new URL('./dist/vendor/BufferGeometryUtils.js',import.meta.url),'utf8')));
const assetsURL=moduleURL(three(await readFile(new URL('./dist/estuary-assets.js',import.meta.url),'utf8'))
  .replace("new URL('./assets/high/estuary/',import.meta.url)",`new URL('${new URL('./dist/assets/high/estuary/',import.meta.url).href}')`));
const source=three(await readFile(new URL('./dist/high-estuary.js',import.meta.url),'utf8'))
  .replace("'./vendor/BufferGeometryUtils.js'",`'${utilsURL}'`)
  .replace("'./channel.js'",`'${new URL('./dist/channel.js',import.meta.url).href}'`)
  .replace("'./estuary-assets.js'",`'${assetsURL}'`)
  .replace("new URL('./assets/high/forest/',import.meta.url)",`new URL('${new URL('./dist/assets/high/forest/',import.meta.url).href}')`);
const T=await import(threeURL);
const {createEstuaryTerrain,createEstuaryTree,estuaryGround,estuaryCharacter,buildHighForest}=await import(moduleURL(source));
const {center,width}=await import('./dist/channel.js');

test('independent estuary terrain has seamless positions and lighting, submerged channel edge, and distinct stretches',()=>{
  for(const side of [-1,1]){
    let previous=null;
    for(let chunk=-2;chunk<15;chunk++){
      const terrain=createEstuaryTerrain(chunk,side),p=terrain.attributes.position,n=terrain.attributes.normal;
      for(let i=0;i<p.count;i++){
        const z=p.getZ(i),d=side*(p.getX(i)-center(z))-width(z);
        assert.ok(d>-.00001,'terrain cannot enter navigable channel');assert.ok(n.getY(i)>.6);
        if(i%19===0)assert.ok(p.getY(i)<-.41,'the water edge stays underwater');
      }
      if(previous)for(let j=0;j<19;j++)for(let axis=0;axis<3;axis++){
        assert.equal(p.array[j*3+axis],previous.p.array[(previous.p.count-19+j)*3+axis]);
        assert.equal(n.array[j*3+axis],previous.n.array[(previous.n.count-19+j)*3+axis]);
      }
      previous={p,n};terrain.dispose();
    }
  }
  assert.ok(estuaryCharacter(-230,1).tidal>.99);
  assert.ok(estuaryCharacter(-410,-1).clearing>.99);
  assert.ok(estuaryCharacter(-110,1).overhang>.99);
  assert.ok(estuaryGround(-230,18,1)<estuaryGround(-80,18,1),'tidal shelf stays below rooted interior');
});

test('legacy comparison models retain valid branch anatomy and efficient LOD',()=>{
  const counts=new Set();
  for(let variant=0;variant<4;variant++){
    const tree=createEstuaryTree(variant);counts.add(tree.wood.attributes.position.count);
    assert.ok(tree.near.index.count>(variant===3?7000:12000),'anatomical leaves must have actual geometry');
    assert.ok(tree.mid.index.count<tree.near.index.count*.35);
    assert.ok(tree.far.index.count<tree.near.index.count*.12);
    assert.ok(tree.coarse.index.count<tree.wood.index.count*.22);
    tree.near.computeBoundingBox();tree.roots.computeBoundingBox();
    assert.ok(tree.near.boundingBox.max.y-tree.near.boundingBox.min.y>(variant===3?2:5),'the crown occupies varied heights');
    assert.ok(tree.roots.boundingBox.min.y<-.6);assert.ok(tree.roots.boundingBox.max.y>(variant===0?2:variant===3?.6:1));
    for(const geometry of Object.values(tree)){for(const value of geometry.attributes.position.array)assert.ok(Number.isFinite(value));geometry.dispose();}
  }
  assert.equal(counts.size,4);
});

test('photographed crown collection has finite geometry, intact atlas UVs, six silhouettes and meaningful LOD reductions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('./dist/assets/high/estuary/crowns.json',import.meta.url),'utf8'));
  assert.equal(manifest.models.length,6);const silhouettes=new Set();
  for(const model of manifest.models){
    const bytes=await readFile(new URL('./dist/assets/high/estuary/'+model.url,import.meta.url)),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    assert.equal(bytes.length,model.bytes);assert.ok(model.bytes<3_650_000);
    let lo=Infinity,hi=-Infinity;
    for(const [name,attrs]of Object.entries(model.geometries)){
      const p=new Float32Array(buffer,attrs.position.offset,attrs.position.count),uv=new Float32Array(buffer,attrs.uv.offset,attrs.uv.count),index=new Uint32Array(buffer,attrs.index.offset,attrs.index.count);
      for(const value of p)assert.ok(Number.isFinite(value));for(const value of uv)assert.ok(Number.isFinite(value));for(const i of index)assert.ok(i<p.length/3);
      if(name==='near'){for(let i=1;i<p.length;i+=3){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i]);}for(const v of uv)assert.ok(v>=0&&v<=1,'photographic atlas UVs stay intact');}
    }
    silhouettes.add([lo.toFixed(2),hi.toFixed(2)].join(':'));
    const g=model.geometries;assert.ok(g.mid.index.count<g.near.index.count*.35);assert.ok(g.far.index.count<g.near.index.count*.12);
    assert.ok(g.coarse.index.count+g.coarseBranch.index.count<(g.wood.index.count+g.branch.index.count)*.22,'far skeleton is actually simplified');
  }
  assert.equal(silhouettes.size,6);
});

function fakeCanvas(){const gradient={addColorStop(){}};const context=new Proxy({createLinearGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});return{getContext:()=>context};}
test('High owns its terrain and vegetation, restores Standard exactly, and leaves the navigation envelope clear',async t=>{
  const oldDocument=globalThis.document,oldLoad=T.TextureLoader.prototype.loadAsync,oldFetch=globalThis.fetch;globalThis.document={createElement:()=>fakeCanvas()};T.TextureLoader.prototype.loadAsync=async()=>new T.Texture();
  globalThis.fetch=async url=>{const data=await readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(data.toString()),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
  const scene=new T.Scene(),renderer={capabilities:{getMaxAnisotropy:()=>8},shadowMap:{needsUpdate:false}};
  const banks=[new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial()),new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial())];banks[1].visible=false;scene.add(...banks);
  const original=banks.map(bank=>[bank.geometry,bank.material,bank.visible]);let high=false,independent=false,forest;
  const world={getBankMeshes:()=>banks,setHighDetail:v=>high=v,setHighSceneEnabled:v=>independent=v};
  try{
    forest=await buildHighForest({scene,world,renderer});forest.setEnabled(true);forest.update(12,{z:0},{wind:{x:.6,z:.8,strength:1.2,gust:.4}});
    assert.ok(high&&independent);assert.ok(banks.every(bank=>!bank.visible));assert.deepEqual(forest.getStats().wind,[.6,.8,1.2,.4]);
    assert.equal(forest.getStats().treatedSections,17);assert.equal(forest.getStats().independentScene,true);
    assert.equal(forest.getStats().photographicSections,17);assert.equal(forest.getStats().reviewSection,null);assert.ok(forest.getStats().modelAssetBytes<22_000_000);
    for(const side of [-1,1]){
      const a=createEstuaryTerrain(2,side,true),b=createEstuaryTerrain(3,side,true),row=34;
      for(const key of ['position','normal'])for(let j=0;j<row;j++)for(let axis=0;axis<3;axis++)assert.equal(a.attributes[key].array[(a.attributes[key].count-row+j)*3+axis],b.attributes[key].array[j*3+axis],'photographed relief and normals join at chunk boundaries');
      const p=a.attributes.position;for(let i=0;i<p.count;i+=17)assert.ok(Math.abs(p.getY(i)-forest.groundHeight(p.getX(i),p.getZ(i)))<.0001,'wildlife grounding samples the active sediment surface');
      a.dispose();b.dispose();
    }
    const group=scene.getObjectByName('Independent estuary reach 2'),point=new T.Vector3(),matrix=new T.Matrix4();let overhang=0,minimumWater=Infinity,minimumCorridor=Infinity;
    const shader={vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader,uniforms:{}};group.getObjectByName('Contoured tidal ground').material.onBeforeCompile(shader);
    assert.match(shader.fragmentShader,/siltUVB=siltRotation\*siltUV/);assert.match(shader.fragmentShader,/siltNB.xy=vec2\(dot/,'rotated normal is transformed into the base tangent frame');
    assert.match(shader.fragmentShader,/mix\(texture2D\(roughnessMap,siltUV\)/);assert.match(shader.fragmentShader,/mix\(texture2D\(aoMap,siltUV\)/);
    for(const mesh of group.children){
      if(!mesh.isInstancedMesh||!/^Independent trunks|^Individual leaves|^Intertwined prop roots|^Recruiting mangrove|^Young creek|^Young intertwined/.test(mesh.name))continue;
      const roots=/^Intertwined|^Young intertwined/.test(mesh.name),p=mesh.geometry.attributes.position;
      for(let instance=0;instance<mesh.count;instance++){
        mesh.getMatrixAt(instance,matrix);
        for(let i=0;i<p.count;i++){
          point.fromBufferAttribute(p,i).applyMatrix4(matrix);const d=Math.abs(point.x-center(point.z))-width(point.z);
          if(roots)assert.ok(d>.099,'prop roots remain on the land side');
          else{if(d<0){minimumWater=Math.min(minimumWater,point.y);overhang++;}if(d< -3.05)minimumCorridor=Math.min(minimumCorridor,point.y);}
        }
      }
    }
    assert.ok(overhang>0,'the creek must have a real overhead canopy');assert.ok(minimumWater>5.1,`water clearance ${minimumWater}`);assert.ok(minimumCorridor>8.2,`camera clearance ${minimumCorridor}`);
    t.diagnostic(`Connected overhang: ${overhang} vertices, water clearance ${minimumWater.toFixed(2)} m, camera clearance ${minimumCorridor.toFixed(2)} m`);
    const meshes=[];scene.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});const snapshot=meshes.map(mesh=>[mesh.geometry,mesh.material,mesh.visible]);
    const budget=()=>{let triangles=0,draws=0;scene.traverseVisible(mesh=>{if(mesh.isMesh){triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.count??1);draws++;}});return{triangles,draws};};
    const main=budget();forest.beginReflection();const reflection=budget();assert.equal(forest.getStats().reflectionPass,true);assert.ok(reflection.triangles<main.triangles*.58);forest.endReflection();
    meshes.forEach((mesh,i)=>assert.deepEqual([mesh.geometry,mesh.material,mesh.visible],snapshot[i]));
    t.diagnostic(`Scene before frustum culling ${JSON.stringify({main,reflection})}`);
    scene.updateMatrixWorld(true);const camera=new T.PerspectiveCamera(55,16/9,.1,750);camera.position.set(0,-8,24);camera.up.set(0,-1,0);camera.lookAt(0,-2,-20);camera.updateMatrixWorld(true);
    const buffers=meshes.filter(mesh=>mesh.isInstancedMesh).map(mesh=>({mesh,matrix:mesh.instanceMatrix.array.slice(),color:mesh.instanceColor?.array.slice()}));
    forest.beginReflection({camera});const reflected=forest.getStats().reflectionInstances;
    assert.equal(reflected.considered,reflected.submitted+reflected.culled);assert.equal(reflected.consideredTriangles,reflected.submittedTriangles+reflected.savedTriangles);assert.ok(reflected.savedTriangles>reflected.consideredTriangles*.25);
    const compact=budget();assert.ok(compact.triangles<reflection.triangles*.75);forest.endReflection();
    for(const {mesh,matrix,color} of buffers){assert.deepEqual(mesh.instanceMatrix.array,matrix);if(color)assert.deepEqual(mesh.instanceColor.array,color);}
    scene.traverse(mesh=>{if(mesh.userData.reflectionOnly)assert.equal(mesh.visible,false);});
    t.diagnostic(`Reflected view ${JSON.stringify({compact,reflected})}`);
    const mainCamera=new T.PerspectiveCamera(55,16/9,.1,750);mainCamera.position.set(0,8,24);mainCamera.lookAt(0,2,-20);mainCamera.updateMatrixWorld(true);
    const sourceCounts=new Map(meshes.filter(mesh=>mesh.isInstancedMesh).map(mesh=>[mesh,mesh.count]));
    forest.beginMainRender({camera:mainCamera});const mainCulling=forest.getStats().mainInstances;
    assert.ok(forest.getStats().mainPass);assert.equal(mainCulling.considered,mainCulling.submitted+mainCulling.culled);assert.ok(mainCulling.savedTriangles>mainCulling.consideredTriangles*.20);
    const mainVisible=[];scene.traverse(mesh=>{if(mesh.userData.mainOnly){mainVisible.push([mesh,mesh.visible]);assert.equal(mesh.castShadow,false);}});
    assert.ok(mainVisible.some(([mesh,visible])=>visible));
    for(const [mesh,count]of sourceCounts)assert.equal(mesh.count,count,'all shadow source counts remain intact before color rendering');
    forest.beginReflection({camera});scene.traverse(mesh=>{if(mesh.userData.mainOnly)assert.equal(mesh.visible,false,'main proxies do not duplicate reflected geometry');});forest.endReflection();
    for(const [mesh,visible]of mainVisible)assert.equal(mesh.visible,visible,'nested reflection restores the main proxy visibility');
    for(const mesh of meshes){if(!mesh.isInstancedMesh)continue;const count=mesh.count;mesh.onBeforeRender(renderer,scene,mainCamera,mesh.geometry,mesh.material,null);assert.ok(mesh.count===0||mesh.count===count);if(mesh.name==='Coarse canopy shadow')assert.equal(mesh.count,0,'shadow proxy submits no main triangles');mesh.onAfterRender(renderer,scene,mainCamera,mesh.geometry,mesh.material,null);assert.equal(mesh.count,count);}
    forest.endMainRender();assert.equal(forest.getStats().mainPass,false);scene.traverse(mesh=>{if(mesh.userData.mainOnly)assert.equal(mesh.visible,false);});
    for(const {mesh,matrix,color}of buffers){assert.deepEqual(mesh.instanceMatrix.array,matrix);if(color)assert.deepEqual(mesh.instanceColor.array,color);}
    t.diagnostic(`Main view instance compaction ${JSON.stringify(mainCulling)}`);
    forest.beginReflection();forest.setEnabled(false);assert.equal(forest.getStats().reflectionPass,false);assert.ok(!high&&!independent);
    banks.forEach((bank,i)=>assert.deepEqual([bank.geometry,bank.material,bank.visible],original[i]));
    for(let i=0;i<3;i++){forest.setEnabled(true);forest.update(i,{z:-600});forest.setEnabled(false);banks.forEach((bank,j)=>assert.deepEqual([bank.geometry,bank.material,bank.visible],original[j]));}
    forest.dispose();assert.equal(scene.children.length,2);
  }finally{forest?.dispose();globalThis.document=oldDocument;globalThis.fetch=oldFetch;T.TextureLoader.prototype.loadAsync=oldLoad;for(const bank of banks){bank.geometry.dispose();bank.material.dispose();}}
});
