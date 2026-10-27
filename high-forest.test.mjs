import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const threeURL = new URL('./dist/vendor/three.module.js', import.meta.url).href;
const moduleURL = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const resolveThree = source => source.replaceAll("from 'three'", `from '${threeURL}'`);
const utilsURL = moduleURL(resolveThree(await readFile(new URL('./dist/vendor/BufferGeometryUtils.js', import.meta.url), 'utf8')));
const forestSource = resolveThree(await readFile(new URL('./dist/high-forest.js', import.meta.url), 'utf8'))
  .replace("'./vendor/BufferGeometryUtils.js'", `'${utilsURL}'`)
  .replace("'./channel.js'", `'${new URL('./dist/channel.js', import.meta.url).href}'`)
  .replace("new URL('./assets/high/forest/', import.meta.url)", `new URL('${new URL('./dist/assets/high/forest/', import.meta.url).href}')`);
const T = await import(threeURL);
const {createForestLandGeometry, createForestStudyGeometry, createHighBankGeometry, groveCharacter, buildHighForest} = await import(moduleURL(forestSource));
const {createHighAtmosphere}=await import(moduleURL(resolveThree(await readFile(new URL('./dist/high-atmosphere.js',import.meta.url),'utf8'))));
const {center, width} = await import('./dist/channel.js');

test('continuous inland terrain joins every section and stays outside the established bank', () => {
  let previous = null;
  for (let chunk = -2; chunk < 15; chunk++) {
    const geometry = createForestLandGeometry(chunk), p = geometry.attributes.position, n = geometry.attributes.normal;
    assert.equal(geometry.index.count / 3, 576);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      assert.ok(Number.isFinite(x + y + z));
      assert.ok(Math.abs(x - center(z)) - width(z) > 111.99, 'land must not alter the shoreline or collision channel');
      assert.ok(y > 1.3 && y < 2.05, 'skirt must cover the horizon without becoming a mound');
      assert.ok(n.getY(i) > .99, 'land faces upward on both banks');
    }
    for (let side = 0; side < 2; side++) for (let j = 0; j < 10; j++) {
      const first = side * 170 + j;
      if (previous) for (let axis = 0; axis < 3; axis++) assert.equal(p.array[first * 3 + axis], previous.attributes.position.array[(side * 170 + 160 + j) * 3 + axis]);
    }
    previous?.dispose(); previous = geometry;
  }
  previous.dispose();
});

test('High bank profiles preserve the waterway and Standard buffers while correcting winding and adding tidal shelves',()=>{
  assert.ok(groveCharacter(-52,1).overhang>.95);assert.ok(groveCharacter(-196,1).tidal>.95);assert.ok(groveCharacter(-196,-1).tidal<.2);assert.ok(groveCharacter(-380,-1).clearing>.95);assert.ok(groveCharacter(-532,1).dense>.95);
  for(const side of [-1,1]){
    const original=new T.BufferGeometry(),p=[],c=[],idx=[],ds=[0,1,2.5,6.5,12,22,40],zs=[-184,-190,-196,-202];
    for(const z of zs)for(const d of ds){p.push(center(z)+side*(width(z)+d),d===0?-.7:Math.min(2.25,d*.16)-.25,z);c.push(.8,.8,.7);}
    for(let row=0;row<zs.length-1;row++)for(let j=0;j<ds.length-1;j++){const a=row*ds.length+j,b=a+ds.length;idx.push(a,b,a+1,b,b+1,a+1);}
    original.setAttribute('position',new T.Float32BufferAttribute(p,3));original.setAttribute('color',new T.Float32BufferAttribute(c,3));original.setIndex(idx);original.computeVertexNormals();
    const beforeP=original.attributes.position.array.slice(),beforeC=original.attributes.color.array.slice(),beforeI=original.index.array.slice();
    const high=createHighBankGeometry(original,side,[{x:center(-196)+side*(width(-196)+12),z:-196,radius:9,cover:.46}]);
    assert.deepEqual(original.attributes.position.array,beforeP);assert.deepEqual(original.attributes.color.array,beforeC);assert.deepEqual(original.index.array,beforeI);
    for(let i=0;i<high.attributes.position.count;i++){
      assert.equal(high.attributes.position.getX(i),original.attributes.position.getX(i));assert.equal(high.attributes.position.getZ(i),original.attributes.position.getZ(i));
      if(ds[i%ds.length]<=2.5)assert.ok(Math.abs(high.attributes.position.getY(i)-original.attributes.position.getY(i))<1e-6,'collision-side waterline stays fixed');
      assert.ok(high.attributes.normal.getY(i)>0,'both High banks have upward upper-surface normals');
    }
    if(side>0)assert.ok(high.attributes.position.getY(2*ds.length+4)<original.attributes.position.getY(2*ds.length+4)-.4,'right-bank tidal shelf is visibly lower and wider');
    assert.ok(high.attributes.color.getX(2*ds.length+4)<original.attributes.color.getX(2*ds.length+4)*.75,'canopy contact occlusion is baked into actual ground');
    high.dispose();original.dispose();
  }
});

test('hero tree geometry keeps bounded medium clusters and buried tapered roots', () => {
  const shapes=new Set(),habits=new Set();
  for (let variant = 0; variant < 3; variant++) {
    const tree = createForestStudyGeometry(variant);
    assert.ok(tree.near.index.count / 3 >= 288 && tree.near.index.count / 3 <= 336);
    assert.ok(tree.mid.index.count / 3 >= 128 && tree.mid.index.count / 3 <= 152);
    for (const geometry of Object.values(tree)) {
      for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value));
      assert.ok(geometry.boundingSphere.radius < 13);
    }
    tree.roots.computeBoundingBox(); tree.core.computeBoundingBox(); tree.near.computeBoundingBox();
    tree.trunk.computeBoundingBox();habits.add(tree.trunk.userData.growthHabit);shapes.add(tree.trunk.attributes.position.count);
    assert.ok(tree.near.boundingBox.max.y-tree.near.boundingBox.min.y>4.5,'crowns must occupy multiple levels rather than a flat umbrella');
    assert.ok(tree.roots.boundingBox.min.y < -.50, 'root forks must continue below the bank');
    assert.ok(tree.roots.boundingBox.max.y > 1.8,'aerial roots remain visibly connected to the lower trunk');
    assert.ok(tree.core.boundingBox.max.y < tree.near.boundingBox.max.y, 'tiny support stays within textured crown height');
    assert.ok(tree.core.boundingBox.min.y > tree.near.boundingBox.min.y, 'no solid underside exposed');
    Object.values(tree).forEach(geometry => geometry.dispose());
  }
  assert.equal(shapes.size,3,'three genuinely different stem/branch topologies');assert.equal(habits.size,3);
});

function fakeCanvas() {
  const gradient = {addColorStop(){}};
  const context = new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient}, {get:(object,key)=>key in object?object[key]:()=>{}});
  return {getContext:()=>context};
}

test('representative section, wind, reflection LOD and Standard restoration keep exact resources', async t => {
  const oldDocument = globalThis.document, oldPath = globalThis.Path2D, oldLoad = T.TextureLoader.prototype.loadAsync;
  globalThis.document = {createElement:()=>fakeCanvas()};
  globalThis.Path2D = class {moveTo(){}bezierCurveTo(){}};
  T.TextureLoader.prototype.loadAsync = async () => new T.Texture();
  const scene = new T.Scene(), renderer = {capabilities:{getMaxAnisotropy:()=>8},shadowMap:{needsUpdate:false}};
  let high = false, bank = 'original';
  const world = {setHighDetail:value=>{high=value;},setHighBankMaterial:value=>{bank=value??'original';}};
  let forest;
  try {
    forest = await buildHighForest({scene,world,renderer,reviewSection:2});
    assert.equal(forest.getStats().treatedSections,17,'review retains the existing cohesive forest elsewhere');
    assert.equal(forest.getStats().artDirectedSections,1);
    assert.equal(forest.getStats().supportingTrees,1224);
    forest.setEnabled(true);
    forest.update(4,{z:0},{wind:{x:.6,z:.8,strength:1.4,gust:.7}});
    assert.equal(high,true); assert.notEqual(bank,'original');
    const mud=bank,originalMudCompile=mud.onBeforeCompile,originalMudKey=mud.customProgramCacheKey,weather=createHighAtmosphere({scene});
    weather.setEnabled(true);weather.setWeather({wetness:.72,wind:{x:.6,z:.8,strength:.7},time:8});
    const mudShader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader};
    mud.onBeforeCompile(mudShader,renderer);
    assert.ok(mudShader.fragmentShader.includes('float dampPocket='),'the real tidal-mud shader survives weather chaining');
    assert.ok(mudShader.fragmentShader.includes('bhitarWetness*'),'mud retains weather-driven darkening/roughness');
    assert.equal(mudShader.uniforms.bhitarWetness.value,.72);
    assert.ok(mudShader.fragmentShader.includes('#include <fog_fragment>'),'mud retains ordinary scene-distance fog, like water');
    assert.ok(!mudShader.fragmentShader.includes('float creekHaze='),'no unmatched extra low-bank haze ribbon');
    const leafMaterial=scene.getObjectByName('Overlapping supporting crowns').material,leafShader={uniforms:{},vertexShader:T.ShaderLib.lambert.vertexShader,fragmentShader:T.ShaderLib.lambert.fragmentShader};
    leafMaterial.onBeforeCompile(leafShader,renderer);assert.ok(leafShader.fragmentShader.includes('float creekHaze='),'foliage still receives the existing spatial haze');
    weather.dispose();assert.equal(mud.onBeforeCompile,originalMudCompile);assert.equal(mud.customProgramCacheKey,originalMudKey);
    assert.deepEqual(forest.getStats().wind,[.6,.8,1.4,.7]);
    const group = scene.getObjectByName('Mangrove section 2 — cohesive');
    assert.ok(group?.visible);
    assert.ok(group.getObjectByName('Continuous land behind bank'));
    assert.ok(group.getObjectByName('Grounded forest understorey'));
    assert.ok(group.getObjectByName('Partially buried tidal branches'));
    const shoreline=group.getObjectByName('Irregular leafy shoreline patches'),placement=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion();
    let nearPatches=0,raisedPatches=0;
    for(let i=0;i<shoreline.count;i++){
      shoreline.getMatrixAt(i,placement);placement.decompose(position,rotation,scale);
      const offset=Math.abs(position.x-center(position.z))-width(position.z);
      assert.ok(offset>3,'leafy patch centers stay outside the navigation bank');
      const side=position.x>center(position.z)?1:-1,leaf=new T.Vector3();
      for(let vertex=0;vertex<shoreline.geometry.attributes.position.count;vertex++){
        leaf.fromBufferAttribute(shoreline.geometry.attributes.position,vertex).applyMatrix4(placement);
        assert.ok(side*(leaf.x-center(leaf.z))-width(leaf.z)>.349,'the entire rotated foliage envelope stays outside water');
      }
      if(offset<7)nearPatches++;if(position.y+scale.y*2.5>3.5)raisedPatches++;
    }
    assert.ok(nearPatches>=20,'shoreline cover must reach the otherwise bare foreground bank');
    assert.ok(raisedPatches>=20,'patches must rise into the visible midstory instead of lying under terrain');
    let waterMin=Infinity,corridorMin=Infinity,overhangPoints=0;
    const vertex=new T.Vector3(),transform=new T.Matrix4();
    for(const mesh of group.children){
      if(!mesh.isInstancedMesh||mesh.userData.variant===undefined&&!['Supporting mangrove stems','Overlapping supporting crowns'].includes(mesh.name))continue;
      if(mesh.name.startsWith('Curved roots'))continue;
      const positions=mesh.geometry.attributes.position;
      for(let instance=0;instance<mesh.count;instance++){
        mesh.getMatrixAt(instance,transform);
        for(let i=0;i<positions.count;i++){
          vertex.fromBufferAttribute(positions,i).applyMatrix4(transform);
          const clearance=Math.abs(vertex.x-center(vertex.z))-width(vertex.z);
          if(clearance<0){waterMin=Math.min(waterMin,vertex.y);overhangPoints++;}
          if(clearance< -3.5)corridorMin=Math.min(corridorMin,vertex.y);
        }
      }
    }
    assert.ok(waterMin>4.29,'rigid/folliage overhang must clear the3.9m boat canopy');
    assert.ok(corridorMin>7.29,'overhang must clear the6.6m Follow camera inside its bank clamp');
    t.diagnostic(`Representative overhang samples ${overhangPoints}: water minimum ${waterMin.toFixed(2)}m, camera corridor minimum ${corridorMin.toFixed(2)}m`);
    const meshes = []; scene.traverse(object=>{if(object.isMesh)meshes.push(object);});
    const snapshot = meshes.map(mesh=>[mesh.geometry,mesh.material,mesh.visible]);
    for (let i=0;i<20;i++) {
      forest.beginReflection();assert.equal(forest.getStats().reflectionPass,true);
      assert.equal(group.getObjectByName('Partially buried tidal branches').visible,false);
      forest.endReflection();
      meshes.forEach((mesh,j)=>assert.deepEqual([mesh.geometry,mesh.material,mesh.visible],snapshot[j]));
    }
    forest.beginReflection();forest.setEnabled(false);
    assert.equal(high,false);assert.equal(bank,'original');assert.equal(forest.getStats().reflectionPass,false);
    assert.equal(scene.children[0].visible,false);
    forest.setEnabled(true);forest.update(20,{z:-300});
    assert.equal(group.getObjectByName('Overlapping supporting crowns').material.isMeshLambertMaterial,true);
    assert.equal(group.getObjectByName('Supporting mangrove stems').visible,true);
    forest.update(21,{z:-480});
    assert.equal(group.getObjectByName('Supporting mangrove stems').visible,true, 'distant stems must not disappear beneath visible crowns');
    forest.dispose();assert.equal(scene.children.length,0);assert.equal(high,false);assert.equal(bank,'original');
    forest = await buildHighForest({scene,world,renderer});
    forest.setEnabled(true); forest.update(15,{z:0});
    assert.equal(forest.getStats().treatedSections,17);
    const routeSections=scene.children[0].children.filter(group=>group.userData.centerZ!==undefined),routePoint=new T.Vector3(),routeMatrix=new T.Matrix4();
    let routeWaterMin=Infinity,routeCorridorMin=Infinity,rootChecks=0,groundedRoots=0,clearanceChecks=0;
    for(const section of routeSections){
      forest.update(15,{z:section.userData.centerZ});
      for(const mesh of section.children){
        const hero=mesh.userData.variant!==undefined,support=['Supporting mangrove stems','Overlapping supporting crowns'].includes(mesh.name),shrubs=mesh.name==='Irregular leafy shoreline patches';
        if(!mesh.isInstancedMesh||!hero&&!support&&!shrubs)continue;
        const roots=mesh.name.startsWith('Curved roots'),positions=mesh.geometry.attributes.position;
        for(let instance=0;instance<mesh.count;instance++){
          mesh.getMatrixAt(instance,routeMatrix);let lowest=Infinity;
          for(let vertex=0;vertex<positions.count;vertex++){
            routePoint.fromBufferAttribute(positions,vertex).applyMatrix4(routeMatrix);
            const clearance=Math.abs(routePoint.x-center(routePoint.z))-width(routePoint.z);clearanceChecks++;
            assert.ok(Number.isFinite(routePoint.x+routePoint.y+routePoint.z));
            lowest=Math.min(lowest,routePoint.y);
            if(roots)assert.ok(clearance>.099,'all prop roots stay outside collision channel');
            else if(shrubs)assert.ok(clearance>.349,'all shoreline patches remain on land');
            else{if(clearance<0)routeWaterMin=Math.min(routeWaterMin,routePoint.y);if(clearance< -3.5)routeCorridorMin=Math.min(routeCorridorMin,routePoint.y);}
          }
          if(roots){rootChecks++;if(lowest<1.1)groundedRoots++;}
        }
      }
    }
    assert.equal(rootChecks,816);assert.equal(groundedRoots,rootChecks,'each tree has roots reaching below the low bank surface');
    assert.ok(routeWaterMin>4.29,`full-route boat clearance ${routeWaterMin}`);assert.ok(routeCorridorMin>7.29,`full-route camera clearance ${routeCorridorMin}`);
    t.diagnostic(`Full route: ${routeSections.length} sections, ${clearanceChecks} vertex samples, ${groundedRoots} grounded root systems; water minimum ${routeWaterMin.toFixed(2)}m, camera corridor minimum ${routeCorridorMin.toFixed(2)}m`);
    forest.update(15,{z:0});
    const budget=()=>{const b={triangles:0,draws:0,shadowTriangles:0,shadowDraws:0};scene.traverseVisible(mesh=>{if(!mesh.isMesh)return;const triangles=mesh.geometry.index.count/3*(mesh.count??1);b.triangles+=triangles;b.draws++;if(mesh.castShadow){b.shadowTriangles+=triangles;b.shadowDraws++;}});return b;};
    const main=budget();forest.beginReflection();const reflection=budget();forest.endReflection();
    assert.ok(reflection.triangles<main.triangles*.78,'reflection must use cheaper geometry than the visible forest');
    assert.ok(reflection.draws<main.draws);
    t.diagnostic(`Visible scene budget before frustum culling, z=0: ${JSON.stringify({main,reflection})}`);
    scene.updateMatrixWorld(true);
    const originals=[];scene.traverse(mesh=>{if(mesh.isInstancedMesh) originals.push({mesh,matrix:mesh.instanceMatrix.array.slice(),color:mesh.instanceColor?.array.slice(),visible:mesh.visible,geometry:mesh.geometry,material:mesh.material});});
    const camera = new T.PerspectiveCamera(55,16/9,.1,750);camera.up.set(0,-1,0);
    for (const [name,position,target] of [['Follow',[0,-8,24],[0,-2,-20]],['Bow',[0,-3,2],[0,-3,-80]],['Overhead',[0,-72,0],[0,0,0]]]) {
      camera.position.fromArray(position);camera.lookAt(...target);camera.updateMatrixWorld(true);
      forest.beginReflection({camera});
      const compact=budget(), instances=forest.getStats().reflectionInstances;
      assert.equal(instances.considered,instances.submitted+instances.culled);
      assert.equal(instances.consideredTriangles,instances.submittedTriangles+instances.savedTriangles);
      assert.ok(instances.culled>0,`${name} should remove invisible instances`);
      assert.ok(compact.triangles<reflection.triangles*.8,`${name} should save actual geometry`);
      const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const transform=new T.Matrix4(),worldTransform=new T.Matrix4(),sphere=new T.Sphere();
      for(const {mesh} of originals){
        const clone=mesh.parent.children.find(candidate=>candidate.userData.sourceForestId===mesh.uuid);
        if(!clone?.visible)continue;
        let expected=0;
        for(let i=0;i<mesh.count;i++){
          transform.fromArray(mesh.instanceMatrix.array,i*16);worldTransform.multiplyMatrices(mesh.matrixWorld,transform);
          sphere.copy(mesh.geometry.boundingSphere);sphere.radius+=.65;sphere.applyMatrix4(worldTransform);
          if(frustum.intersectsSphere(sphere))expected++;
        }
        assert.equal(clone.count,expected,'no intersecting crown, stem or root may be omitted');
        for(let i=0;i<clone.count;i++){
          transform.fromArray(clone.instanceMatrix.array,i*16);worldTransform.multiplyMatrices(clone.matrixWorld,transform);
          sphere.copy(clone.geometry.boundingSphere);sphere.radius+=.65;sphere.applyMatrix4(worldTransform);
          assert.ok(frustum.intersectsSphere(sphere),'every retained instance intersects the conservative reflected view');
        }
      }
      t.diagnostic(`${name} reflected budget: ${JSON.stringify({compact,instances})}`);
      forest.endReflection();
      for(const {mesh,matrix,color,visible,geometry,material} of originals){
        assert.deepEqual(mesh.instanceMatrix.array,matrix);if(color)assert.deepEqual(mesh.instanceColor.array,color);
        assert.equal(mesh.visible,visible);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);
      }
      scene.traverse(mesh=>{if(mesh.userData.reflectionOnly)assert.equal(mesh.visible,false);});
    }
    forest.beginReflection({camera});forest.setEnabled(false);
    scene.traverse(mesh=>{if(mesh.userData.reflectionOnly)assert.equal(mesh.visible,false);});
  } finally {
    forest?.dispose(); globalThis.document=oldDocument;globalThis.Path2D=oldPath;T.TextureLoader.prototype.loadAsync=oldLoad;
  }
});
