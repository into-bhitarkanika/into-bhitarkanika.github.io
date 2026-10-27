import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {center,width} from './channel.js';
import {loadPhotographicEstuary} from './estuary-assets.js';

// High owns this entire landscape. Standard's banks and forest are retained,
// but none of their crowns, branch templates or terrain enter this assembly.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const clamp=T.MathUtils.clamp, smooth=T.MathUtils.smoothstep;
let sedimentRelief=null;
function sampleSediment(x,z){
  if(!sedimentRelief)return 0;
  const sample=(u0,v0)=>{const fx=((u0%1+1)%1)*128,fz=(1-(v0%1+1)%1)*128,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,v=fz-iz;const at=(a,b)=>sedimentRelief[(b&127)*128+(a&127)]/255;return T.MathUtils.lerp(T.MathUtils.lerp(at(ix,iz),at(ix+1,iz),u),T.MathUtils.lerp(at(ix,iz+1),at(ix+1,iz+1),u),v);};
  const blend=.5+.27*Math.sin(x*.13+Math.sin(z*.11))*Math.cos(z*.17-x*.035),a=sample(x/1.3,z/1.3),b=sample((.581683*x-.813416*z)*.89/1.3+17.2,(.813416*x+.581683*z)*.89/1.3+31.7);
  return (T.MathUtils.lerp(a,b,blend)-.5)*.11;
}
function surfaceHeight(x,z,side,photographic){const d=side*(x-center(z))-width(z);return estuaryGround(z,d,side)+(photographic?sampleSediment(x,z)*smooth(d,.4,1.5):0);}
function rng(seed){return(a=0,b=1)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return a+(b-a)*seed/4294967296;};}
function merge(parts){const result=mergeGeometries(parts);parts.forEach(part=>part.dispose());result.computeBoundingSphere();return result;}

export function estuaryCharacter(z,side){
  const bell=(at,spread)=>Math.exp(-Math.pow((z-at)/spread,2));
  const intimate=bell(10,83)+bell(-720,84);
  const overhang=bell(-111,72)+bell(-855,80);
  const tidal=side>0?Math.max(bell(-234,91),bell(-1080,98)):bell(-234,92)*.10;
  const clearing=side<0?Math.max(bell(-417,107),bell(-1320,100)):bell(-417,94)*.18;
  return {intimate,overhang,tidal,clearing,retreat:tidal*24+clearing*31};
}

// The waterward edge remains submerged at the exact gameplay channel boundary.
// The first 3.2 m retain a low basking margin for existing crocodile placement.
// Broad tidal shelves, rooted hummocks and incised rills are genuine geometry.
export function estuaryGround(z,d,side){
  const character=estuaryCharacter(z,side),rise=smooth(d,.2,4.6);
  const shelf=.10+.031*Math.max(d,0),interior=.31+1.25*smooth(d,4,38);
  const undulation=(Math.sin(z*.063+d*.127)*.18+Math.sin(z*.181-d*.32)*.07)*smooth(d,3,8);
  const runnel=Math.exp(-Math.pow(Math.sin(z*.113+Math.sin(d*.12)*1.2)*5.8,2))*.30*smooth(d,1.7,3.4)*(1-smooth(d,18,32));
  const rooted=.13*Math.sin(z*.23+Math.sin(d*.34))*smooth(d,4,9)*(1-character.tidal*.7);
  return T.MathUtils.lerp(-.42,T.MathUtils.lerp(interior,shelf,character.tidal*.82)+undulation+rooted-runnel,rise);
}

export function createEstuaryTerrain(chunk,side,photographic=false){
  const positions=[],uv=[],colors=[],indices=[],steps=photographic?140:56;
  const offsets=photographic?[0,.3,.6,1,1.4,1.9,2.5,3.2,4,4.8,5.6,6.4,7.2,8,8.8,9.6,10.4,11.2,12,13,14,15.5,17,19,22,26,31,38,47,60,77,102,137,180]:[0,.45,1,1.8,2.8,4,5.5,7.5,10,13,17,23,31,42,57,77,102,137,180];
  for(let i=0;i<=steps;i++){
    const z=225-chunk*112-i*112/steps,character=estuaryCharacter(z,side);
    for(const d of offsets){
      const x=center(z)+side*(width(z)+d),y=surfaceHeight(x,z,side,photographic);
      positions.push(x,y,z);uv.push(x/1.3,z/1.3);
      // Muted mineral silt, never a black painted strip. Large canopy contact is
      // localized around planted root hummocks; the shoreline stays sky-lit.
      const mineral=.93+.07*Math.sin(z*.163+d*.36),wet=1-smooth(y,-.2,.7);
      const shade=1-(1-character.tidal*.8)*smooth(d,6,15)*.12;
      if(photographic)colors.push(.96*mineral*shade,.96*mineral*shade,.96*mineral*shade);
      else colors.push((.72-wet*.06)*mineral*shade,(.68-wet*.035)*mineral*shade,(.59-wet*.005)*mineral*shade);
    }
  }
  const row=offsets.length;
  for(let i=0;i<steps;i++)for(let j=0;j<row-1;j++){
    const a=i*row+j,b=a+row;
    if(side<0)indices.push(a,b,a+1,b,b+1,a+1);else indices.push(a,a+1,b,b,a+1,b+1);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);
  // Evaluate the same height field on both sides of a chunk boundary, rather
  // than averaging a different half-neighborhood into either boundary normal.
  const normals=[],epsilon=.06,n=V();
  for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2],d=side*(x-center(z))-width(z);
    const dx=(surfaceHeight(x+epsilon,z,side,photographic)-surfaceHeight(x-epsilon,z,side,photographic))/(2*epsilon);
    const ahead=z+epsilon,behind=z-epsilon;
    const dz=(surfaceHeight(x,ahead,side,photographic)-surfaceHeight(x,behind,side,photographic))/(2*epsilon);
    n.set(-dx,1,-dz).normalize();normals.push(n.x,n.y,n.z);
  }
  geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();return geo;
}

function taperedCurve(points,radius,endRadius,segments=8,sides=7){
  const curve=new T.CatmullRomCurve3(points),geo=new T.TubeGeometry(curve,segments,1,sides,false),p=geo.attributes.position,uv=geo.attributes.uv;
  const axes=Array.from({length:segments+1},(_,i)=>curve.getPointAt(i/segments));
  const length=curve.getLength();
  for(let i=0;i<p.count;i++){
    const t=Math.floor(i/(sides+1))/segments,c=axes[Math.floor(i/(sides+1))];
    const radiusAt=T.MathUtils.lerp(radius,endRadius,Math.pow(t,.77));
    const irregular=1+.055*Math.sin(i% (sides+1)*3.2+t*7);
    p.setXYZ(i,c.x+(p.getX(i)-c.x)*radiusAt*irregular,c.y+(p.getY(i)-c.y)*radiusAt*irregular,c.z+(p.getZ(i)-c.z)*radiusAt*irregular);
    uv.setXY(i,uv.getY(i)*Math.max(.45,radius*8),t*length*.5);
  }
  geo.computeVertexNormals();return geo;
}

function leafGeometry(leaves,lod){
  const p=[],uv=[],colors=[],indices=[],q=new T.Quaternion(),axis=V(0,1,0),point=V();
  const stride=[1,3,9][lod],enlarge=[1,1.52,2.4][lod];
  const template=[[0,0,0],[-.25,.46,0],[0,.48,.074],[.25,.46,0],[0,1,-.018]];
  for(let i=0;i<leaves.length;i+=stride){
    const leaf=leaves[i],base=p.length/3;q.setFromUnitVectors(axis,leaf.direction);
    for(let j=0;j<template.length;j++){
      point.fromArray(template[j]).multiplyScalar(leaf.length*enlarge).applyQuaternion(q).add(leaf.at);
      p.push(point.x,point.y,point.z);uv.push(j===1?0:j===3?1:.5,j===0?0:j===4?1:.48);
      const faceTone=j===2?1.035:.97,light=leaf.tone*faceTone;colors.push(light,light,light*.99);
    }
    for(const n of [0,1,2,0,2,3,1,4,2,2,4,3])indices.push(base+n);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}

// Three separately authored growth architectures. Every leaf terminates on a
// slender shoot, every shoot on a secondary branch, every bough on the trunk.
// There are no sphere cores, opaque leaf blobs or flat crown cards at any LOD.
export function createEstuaryTree(variant=0){
  const random=rng(69219+variant*1951),wood=[],coarse=[],roots=[],leaves=[];
  const height=[14.8,17.8,10.8,5.1][variant],lean=[4.6,1.6,2.2,.82][variant],trunkRadius=[.43,.47,.22,.11][variant];
  const spine=[V(0,-.36,0),V(-.24,height*.15,.15),V(lean*.27,height*.35,-.24),V(lean*.66,height*.57,.45),V(lean,height*.84,.18),V(lean-.5,height,-.45)];
  wood.push(taperedCurve(spine,trunkRadius,.028,16,9));coarse.push(taperedCurve(spine,trunkRadius,.03,9,6));
  const branchCount=[13,15,10,7][variant];
  for(let b=0;b<branchCount;b++){
    const proportion=(b+.4)/branchCount,angle=b*2.399+random(-.36,.36);
    const startY=height*((variant===3?.21:.40)+proportion*.40),start=V(lean*startY/height,startY,.12);
    const reach=random(3.5,6.9)*(variant===3?.44:1)*(1-proportion*.28),rise=random(.8,3.4)*(variant===3?.35:1);
    const end=start.clone().add(V(Math.cos(angle)*reach,rise,Math.sin(angle)*reach));
    const elbow=start.clone().lerp(end,.48).add(V(random(-.5,.5),random(-.55,.24),random(-.5,.5)));
    const primary=[start,elbow,end],thickness=(1-proportion*.58)*random(.10,.16);
    wood.push(taperedCurve(primary,thickness*(variant===3?.35:1),.010,6,5));coarse.push(taperedCurve(primary,thickness*(variant===3?.35:1),.012,3,4));
    for(let s=0;s<5;s++){
      const t=.40+s*.13,base=start.clone().lerp(end,t),yaw=angle+(s%2?-1:1)*random(.55,1.12),extent=random(1.4,2.8)*(variant===3?.45:1);
      const tip=base.clone().add(V(Math.cos(yaw)*extent,random(.2,1.55),Math.sin(yaw)*extent));
      const mid=base.clone().lerp(tip,.6).add(V(0,.18,0));
      wood.push(taperedCurve([base,mid,tip],.029*(variant===3?.5:1),.005,3,3));
      for(let shoot=0;shoot<(variant===3?3:4);shoot++){
        const shot=base.clone().lerp(tip,.35+shoot*.2),turn=yaw+(shoot%2?1:-1)*.96;
        const shootEnd=shot.clone().add(V(Math.cos(turn)*random(.50,1.14),random(.18,.48),Math.sin(turn)*random(.50,1.14)));
        if(shoot%3===0)wood.push(taperedCurve([shot,shot.clone().lerp(shootEnd,.55).add(V(0,.05,0)),shootEnd],.008,.002,2,3));
        for(let pair=0;pair<3;pair++)for(const side of [-1,1]){
          const at=shot.clone().lerp(shootEnd,.25+pair*.30),leafYaw=turn+side*random(.60,1.1);
          const direction=V(Math.cos(leafYaw),random(-.3,.5),Math.sin(leafYaw)).normalize();
          leaves.push({at,direction,length:random(.38,.67)*(variant===3?.8:1),tone:random(.76,1.08)});
        }
        leaves.push({at:shootEnd,direction:V(Math.cos(turn),random(-.1,.4),Math.sin(turn)).normalize(),length:random(.40,.62),tone:random(.84,1.09)});
      }
    }
  }
  // A leafy terminal leader prevents a bare pole from protruding through every
  // crown. It grows along the actual end of the spine, not a floating tuft.
  for(let i=0;i<28;i++){
    const a=i*2.399,at=spine[5].clone().add(V(Math.cos(a)*.12,-.72+(i%7)*.105,Math.sin(a)*.12));
    leaves.push({at,direction:V(Math.cos(a),.34,Math.sin(a)).normalize(),length:random(.48,.82),tone:random(.83,1.05)});
  }
  for(let i=0;i<[13,7,7,5][variant];i++){
    const angle=i*2.399+random(-.24,.24),extent=random(2.0,4.3)*(variant===0?1:variant===1?.69:variant===2?.64:.35),high=random(1.55,3.3)*(variant===0?1:variant===1?.42:variant===2?.6:.27);
    const p=[V(lean*.10,high,0),V(Math.cos(angle)*extent*.37,high*.67,Math.sin(angle)*extent*.30),V(Math.cos(angle)*extent*.83,.20,Math.sin(angle)*extent*.76),V(Math.cos(angle)*extent,-.62,Math.sin(angle)*extent)];
    roots.push(taperedCurve(p,random(.11,.21)*(variant===1?1.25:variant===3?.42:1),.022,7,5));
    if(i%2===0){const fork=p[1].clone(),tip=p[3].clone().add(V(Math.sin(angle)*.64,0,-Math.cos(angle)*.64));roots.push(taperedCurve([fork,fork.clone().lerp(tip,.57).add(V(0,-.22,0)),tip],.059,.012,5,5));}
  }
  const model={wood:merge(wood),coarse:merge(coarse),roots:merge(roots),near:leafGeometry(leaves,0),mid:leafGeometry(leaves,1),far:leafGeometry(leaves,2)};
  model.wood.userData.growthHabit=['Leaning creek veteran','Buttressed tall estuary tree','Young forked mangrove','Recruiting creek thicket'][variant];
  const leafShadow=model.far.clone();leafShadow.deleteAttribute('color');model.shadow=merge([model.coarse.clone(),leafShadow]);
  return model;
}

function leafTexture(anisotropy){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const g=canvas.getContext('2d');
  const gradient=g.createLinearGradient(0,0,256,70);gradient.addColorStop(0,'#50683c');gradient.addColorStop(.45,'#7c9155');gradient.addColorStop(.51,'#92a466');gradient.addColorStop(1,'#536c40');g.fillStyle=gradient;g.fillRect(0,0,256,256);
  g.strokeStyle='#cad28c38';g.lineWidth=1.2;g.beginPath();g.moveTo(128,0);g.lineTo(128,256);g.stroke();g.lineWidth=.6;
  for(let i=0;i<11;i++)for(const side of [-1,1]){g.beginPath();g.moveTo(128,25+i*20);g.quadraticCurveTo(128+side*30,35+i*20,128+side*115,60+i*20);g.stroke();}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;return map;
}

function mudMaterial(resources,maps=null){
  const material=new T.MeshPhysicalMaterial({color:maps?0xffffff:0xaaa396,vertexColors:true,roughness:.95,specularIntensity:.12,envMapIntensity:.10,...(maps?{map:maps['sediment-color.jpg'],normalMap:maps['sediment-normal.jpg'],normalScale:new T.Vector2(.64,.64),roughnessMap:maps['sediment-roughness.jpg'],aoMap:maps['sediment-ao.jpg'],aoMapIntensity:.35}: {})});
  material.name='Mineral estuary silt';material.userData.weatherSurface='mud';
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 estuaryGroundPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nestuaryGroundPosition=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=`varying vec3 estuaryGroundPosition;
      float estuaryHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float estuaryNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(estuaryHash(i),estuaryHash(i+vec2(1,0)),f.x),mix(estuaryHash(i+vec2(0,1)),estuaryHash(i+1.),f.x),f.y);}
      `+shader.fragmentShader;
    if(maps){
      // Two continuous, differently oriented samples break the scan's tile
      // signature. The same blend and coordinates also drive CPU relief.
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec2 siltUV=estuaryGroundPosition.xz/1.3;
        mat2 siltRotation=mat2(.581683,.813416,-.813416,.581683);
        vec2 siltUVB=siltRotation*siltUV*.89+vec2(17.2,31.7);
        float siltBlend=.5+.27*sin(estuaryGroundPosition.x*.13+sin(estuaryGroundPosition.z*.11))*cos(estuaryGroundPosition.z*.17-estuaryGroundPosition.x*.035);
        diffuseColor*=mix(texture2D(map,siltUV),texture2D(map,siltUVB),siltBlend);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )','mix(texture2D(roughnessMap,siltUV),texture2D(roughnessMap,siltUVB),siltBlend)'));
      shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',T.ShaderChunk.aomap_fragment.replace('texture2D( aoMap, vAoMapUv )','mix(texture2D(aoMap,siltUV),texture2D(aoMap,siltUVB),siltBlend)'));
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',`vec3 siltNA=texture2D(normalMap,siltUV).xyz*2.-1.;
        vec3 siltNB=texture2D(normalMap,siltUVB).xyz*2.-1.;
        siltNB.xy=vec2(dot(vec2(.581683,.813416),siltNB.xy),dot(vec2(-.813416,.581683),siltNB.xy));
        vec3 mapN=normalize(mix(siltNA,siltNB,siltBlend));`));
    }
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float siltMacro=estuaryNoise(estuaryGroundPosition.xz*.31);
      float siltFine=estuaryNoise(estuaryGroundPosition.xz*5.7);
      float siltWet=1.-smoothstep(-.05,.64,estuaryGroundPosition.y+siltMacro*.17);
      diffuseColor.rgb*=.87+siltMacro*.14+siltFine*.025;
      diffuseColor.rgb*=mix(vec3(1.),vec3(.80,.87,.88),siltWet);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*mix(1.,.75,siltWet),.55,.98);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3((siltFine-.5)*.055,(siltMacro-.5)*.035,0.));');
  };
  material.customProgramCacheKey=()=> maps?'photographic-estuary-silt-v2':'independent-estuary-silt-v1';resources.add(material);return material;
}

function animateLeaves(material,time,wind){
  material.onBeforeCompile=shader=>{
    shader.uniforms.estuaryTime=time;shader.uniforms.estuaryWind=wind;
    shader.vertexShader='uniform float estuaryTime;uniform vec4 estuaryWind;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 leafAnchor=(instanceMatrix*vec4(position,1.)).xyz;
      float heightFlex=smoothstep(3.,15.,position.y);
      float canopyBend=(sin(leafAnchor.x*.17+leafAnchor.z*.11+estuaryTime*.57)+.36*sin(leafAnchor.z*.29-estuaryTime*1.13))*heightFlex*(.065+estuaryWind.z*.10);
      transformed.x+=canopyBend*estuaryWind.x;
      transformed.z+=canopyBend*estuaryWind.y;
      transformed.y+=sin(position.x*5.+position.z*3.+estuaryTime*2.6)*.018*heightFlex;`);
  };
  material.customProgramCacheKey=()=> 'estuary-whole-branch-breeze-v1';
}

function safePlacement(model,dummy,side,z){
  const point=V();for(let pass=0;pass<3;pass++){let retreat=0;
  for(const [geometry,isRoot] of [[model.wood,false],[model.near,false],[model.roots,true]]){
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      point.fromBufferAttribute(p,i).applyMatrix4(dummy.matrix);
      const edge=side*(point.x-center(point.z))-width(point.z);
      const required=isRoot?.12:point.y<5.2?.20:point.y<8.3?-3.0:-Infinity;
      retreat=Math.max(retreat,required-edge);
    }
  }
  if(retreat>.0001){dummy.position.x+=side*(retreat+.012);const d=side*(dummy.position.x-center(z))-width(z);dummy.position.y=estuaryGround(z,d,side)-.03;dummy.updateMatrix();}else break;
  }
}

export async function buildHighForest({scene,world,renderer,onProgress=()=>{},reviewSection=null,loadAssets=loadPhotographicEstuary}){
  const root=new T.Group();root.name='Reconstructed Bhitarkanika estuary';root.visible=false;
  const resources=new Set(),sections=[],time={value:0},wind={value:new T.Vector4(.87,.49,.35,0)};
  const anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  const oldBanks=(world.getBankMeshes?.()??[]).map(mesh=>({mesh,visible:mesh.visible}));
  let enabled=false,disposed=false,reflectionRestore=null,mainActive=false,visibleSections=0,totalTrees=0;
  const reflectedMeshes=new Map(),frustum=new T.Frustum(),viewProjection=new T.Matrix4(),instanceTransform=new T.Matrix4(),worldTransform=new T.Matrix4(),sphere=new T.Sphere();
  const mainMeshes=new Map(),drawStates=new Map(),mainReflectionRestore=[];
  let mainInstances={considered:0,submitted:0,culled:0,consideredTriangles:0,submittedTriangles:0,savedTriangles:0};
  let reflectionInstances={considered:0,submitted:0,culled:0,consideredTriangles:0,submittedTriangles:0,savedTriangles:0};
  const release=()=>{scene.remove(root);root.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();});resources.forEach(resource=>resource.dispose());};
  try{
    onProgress('Loading the estuary material library',.04);
    const loader=new T.TextureLoader(),base=new URL('./assets/high/forest/',import.meta.url);
    const textures=await Promise.allSettled(['bark-color.jpg','bark-normal.jpg','bark-roughness.jpg'].map(async(file,i)=>{const map=await loader.loadAsync(new URL(file,base).href);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=anisotropy;if(i===0)map.colorSpace=T.SRGBColorSpace;resources.add(map);return map;}));
    const failed=textures.find(result=>result.status==='rejected');if(failed)throw failed.reason;
    const maps=textures.map(result=>result.value),bark=new T.MeshStandardMaterial({color:0xb8b4a1,map:maps[0],normalMap:maps[1],roughnessMap:maps[2],normalScale:new T.Vector2(.43,.43),roughness:.94});
    bark.name='Weathered estuary bark';bark.userData.weatherSurface='bark';resources.add(bark);
    const map=leafTexture(anisotropy);resources.add(map);
    const foliage=new T.MeshLambertMaterial({map,vertexColors:true,side:T.DoubleSide});foliage.name='Living mangrove leaves';foliage.userData.weatherSurface='leaf';animateLeaves(foliage,time,wind);resources.add(foliage);
    const leafDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});animateLeaves(leafDepth,time,wind);resources.add(leafDepth);
    const shadowOnly=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:T.DoubleSide});resources.add(shadowOnly);
    const mud=mudMaterial(resources),legacyModels=[];
    for(let v=0;v<4;v++){const model=createEstuaryTree(v);Object.values(model).forEach(geometry=>resources.add(geometry));legacyModels.push(model);await pause();}
    const photographic=await loadAssets({resources,anisotropy,onProgress}),photoMaps=photographic.maps,photoModels=photographic.models;sedimentRelief=photographic.relief;
    const photoMud=mudMaterial(resources,photoMaps),photoBark=new T.MeshStandardMaterial({color:0xd8cbb9,map:photoMaps['trunk-color.jpg'],normalMap:photoMaps['trunk-normal.jpg'],normalScale:new T.Vector2(.55,.55),roughnessMap:photoMaps['trunk-arm.jpg'],roughness:.94,envMapIntensity:.32});photoBark.name='Photographed coastal trunk';photoBark.userData.weatherSurface='bark';
    photoBark.onBeforeCompile=shader=>{shader.vertexShader='varying float estuaryTrunkHeight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nestuaryTrunkHeight=position.y;');shader.fragmentShader='varying float estuaryTrunkHeight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.59,.58,.51),vec3(1.),smoothstep(.0,2.1,estuaryTrunkHeight));');};photoBark.customProgramCacheKey=()=> 'estuary-damp-trunk-v1';resources.add(photoBark);
    const photoLeaves=new T.MeshPhysicalMaterial({map:photoMaps['leaf-color.jpg'],alphaMap:photoMaps['leaf-alpha.png'],alphaTest:.18,alphaToCoverage:true,normalMap:photoMaps['leaf-normal.jpg'],normalScale:new T.Vector2(.22,.22),roughnessMap:photoMaps['leaf-arm.jpg'],roughness:1,specularIntensity:.10,envMapIntensity:.24,side:T.DoubleSide});photoLeaves.name='Photographed broadleaf surfaces';photoLeaves.userData.weatherSurface='leaf';animateLeaves(photoLeaves,time,wind);resources.add(photoLeaves);
    const photoDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,alphaMap:photoMaps['leaf-alpha.png'],alphaTest:.18,side:T.DoubleSide});animateLeaves(photoDepth,time,wind);resources.add(photoDepth);
    for(let i=0;i<photoModels.length;i++){
      const model=photoModels[i],name=model.wood.userData.growthHabit;
      // Separate material groups keep the photographed scan UVs on the trunk
      // and metre-scaled tiling bark on the secondary branch skeleton.
      const prepareBranch=geometry=>{const copy=geometry.clone(),uv=copy.attributes.uv;for(let n=0;n<uv.count;n++)uv.setXY(n,uv.getX(n)*15,uv.getY(n)*3.4-2.4);resources.add(copy);return copy;};
      model.wood=mergeGeometries([model.wood,prepareBranch(model.branch)],true);model.coarse=mergeGeometries([model.coarse,prepareBranch(model.coarseBranch)],true);model.wood.userData.growthHabit=name;model.wood.computeBoundingSphere();model.coarse.computeBoundingSphere();resources.add(model.wood);resources.add(model.coarse);
      model.roots=legacyModels[i===3?3:i%3].roots.clone();resources.add(model.roots);model.shadow=model.far.clone();resources.add(model.shadow);model.photographic=true;
    }
    const breathingRoot=new T.CylinderGeometry(.005,.032,1,4);breathingRoot.translate(0,.5,0);resources.add(breathingRoot);
    const driftwood=taperedCurve([V(-1.5,0,-.15),V(-.4,.10,.05),V(.9,.05,.24),V(1.7,.14,.31)],.085,.029,7,5);resources.add(driftwood);
    const dummy=new T.Object3D(),color=new T.Color();
    for(let chunk=-2;chunk<15;chunk++){
      const group=new T.Group();group.name=`Independent estuary reach ${chunk}`;group.userData.centerZ=169-chunk*112;
      const treated=reviewSection===null||Math.abs(chunk-reviewSection)<=1;
      const models=treated?photoModels:legacyModels,leafSurface=treated?photoLeaves:foliage,woodSurface=treated?[photoBark,bark]:bark,depthSurface=treated?photoDepth:leafDepth;
      group.userData.photographic=treated;
      const random=rng(35947+(chunk+4)*7217);let treeMeshes=[];const fine=[];
      for(const side of [-1,1]){const geometry=createEstuaryTerrain(chunk,side,treated);resources.add(geometry);const bank=new T.Mesh(geometry,treated?photoMud:mud);bank.name='Contoured tidal ground';bank.receiveShadow=true;group.add(bank);}
      for(const variant of treated?[0,1,2,4,5]:[0,1,2]){
        const model=models[variant],count=treated?12:variant===2?42:30;
        const trunks=new T.InstancedMesh(model.wood,woodSurface,count),leaves=new T.InstancedMesh(model.near,leafSurface,count),roots=new T.InstancedMesh(model.roots,bark,count);
        trunks.name=`Independent trunks ${variant}`;leaves.name=`Individual leaves ${variant}`;roots.name=`Intertwined prop roots ${variant}`;
        for(let i=0;i<count;i++){
          const side=(i+variant+chunk)%2?1:-1,row=Math.floor(i/2)%(treated?2:4);
          const z=225-(chunk+(Math.floor(i/(treated?4:8))+random(.03,.98))/Math.ceil(count/(treated?4:8)))*112;
          const character=estuaryCharacter(z,side);
          let d=(treated?[4.4,21]:variant===2?[2.7,9,21,42]:[3.0,17,38,68])[row]+random(-1,5)+character.retreat*(row<2?1:.6);
          d+=Math.sin(z*.093+row)*2.7;
          if(row===0&&character.overhang>.25)d-=1.4;
          const tall=treated?random(.86,1.18):variant===1?random(.91,1.40):variant===0?random(.76,1.18):random(.36,.91);
          dummy.position.set(center(z)+side*(width(z)+d),estuaryGround(z,d,side)-.03,z);
          // Leaning veterans face the creek; other ages break that orientation.
          dummy.rotation.set(random(-.025,.025),variant===0?(side>0?Math.PI:0)+random(-.68,.68):random(0,6.28),random(-.026,.026));
          const spread=random(.77,1.25);dummy.scale.set(spread,tall,spread*random(.86,1.12));dummy.updateMatrix();
          safePlacement(model,dummy,side,z);
          trunks.setMatrixAt(i,dummy.matrix);leaves.setMatrixAt(i,dummy.matrix);roots.setMatrixAt(i,dummy.matrix);
          const tone=random(.79,1.11);color.setRGB(tone,tone*random(.97,1.025),tone*.96);leaves.setColorAt(i,color);
        }
        for(const mesh of [trunks,leaves,roots]){mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
        leaves.customDepthMaterial=depthSurface;treeMeshes.push({trunks,leaves,roots,model});totalTrees+=count;
      }
      // Connected, fully three-dimensional trees fill the forest interior.
      // Their coarse anatomy is sufficient at 100–180 m lateral distance and
      // keeps the tree line from ending at a floating row of canopy spheres.
      for(let variant=0;variant<2;variant++){
        const model=models[treated?(variant===0?4:5):variant],count=24,trunks=new T.InstancedMesh(model.coarse,woodSurface,count),leaves=new T.InstancedMesh(model.far,leafSurface,count),roots=new T.InstancedMesh(model.roots,bark,0);
        trunks.name='Layered interior stems';leaves.name='Layered interior leaves';roots.visible=false;
        for(let i=0;i<count;i++){
          const side=i%2?1:-1,row=Math.floor(i/2)%3,z=225-(chunk+(Math.floor(i/6)+random(.04,.96))/4)*112,d=(treated?[30,55,96]:[94,133,165])[row]+random(-7,9);
          dummy.position.set(center(z)+side*(width(z)+d),estuaryGround(z,d,side)-.05,z);dummy.rotation.set(0,random(0,6.28),0);dummy.scale.set(random(1.25,1.8),treated?random(.88,2.03):random(1.1,1.55),random(1.25,1.8));dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);leaves.setMatrixAt(i,dummy.matrix);
          color.setScalar(random(.76,.98));leaves.setColorAt(i,color);
        }
        trunks.receiveShadow=leaves.receiveShadow=true;trunks.computeBoundingSphere();leaves.computeBoundingSphere();group.add(trunks,leaves,roots);treeMeshes.push({trunks,leaves,roots,model,background:true});totalTrees+=count;
      }
      {
        const model=models[3],placements=[];
        // Recruitment is clustered into shaded root hummocks. One bank frames
        // the entrance densely; tidal shelves and the clearing retain open mud.
        for(let patch=0;patch<16;patch++){
          const side=patch%2?1:-1,z=225-(chunk+(Math.floor(patch/2)+random(.2,.8))/8)*112,character=estuaryCharacter(z,side);
          if(character.tidal>.40||character.clearing>.50)continue;
          const intimate=character.intimate*(side<0?1:.35),members=(treated?6:3)+Math.round(intimate*3);
          for(let member=0;member<members;member++){
            const along=z+random(-5,5),d=3.6+(member%3)*2.1+Math.floor(member/3)*4+random(-.8,1.5)+character.retreat*.7;
            dummy.position.set(center(along)+side*(width(along)+d),estuaryGround(along,d,side)-.02,along);
            dummy.rotation.set(0,random(0,6.28),random(-.04,.04));dummy.scale.set(random(.65,1.1),random(.42,.91),random(.66,1.2));dummy.updateMatrix();safePlacement(model,dummy,side,along);placements.push(dummy.matrix.clone());
          }
        }
        const trunks=new T.InstancedMesh(treated?model.coarse:model.wood,woodSurface,placements.length),leaves=new T.InstancedMesh(treated?model.mid:model.near,leafSurface,placements.length),roots=new T.InstancedMesh(model.roots,bark,placements.length);
        trunks.name='Recruiting mangrove stems';leaves.name='Young creek thickets';roots.name='Young intertwined roots';
        placements.forEach((matrix,i)=>{for(const mesh of [trunks,leaves,roots])mesh.setMatrixAt(i,matrix);color.setScalar(random(.84,1.08));leaves.setColorAt(i,color);});
        for(const mesh of [trunks,leaves,roots]){mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}leaves.customDepthMaterial=depthSurface;treeMeshes.push({trunks,leaves,roots,model,young:true});totalTrees+=placements.length;
      }
      // A batch crossing both banks has a huge bounding sphere and submits
      // the invisible bank in every camera. Each bank now culls independently.
      const separated=[];
      for(const batch of treeMeshes){
        for(const side of [-1,1])for(const interior of treated&&!batch.young?[false,true]:[false]){
          const ids=[];for(let i=0;i<batch.trunks.count;i++){batch.trunks.getMatrixAt(i,dummy.matrix);const x=dummy.matrix.elements[12],z=dummy.matrix.elements[14],inner=treated&&!batch.young&&Math.abs(x-center(z))-width(z)>(batch.background?70:18);if((x>center(z)?1:-1)===side&&inner===interior)ids.push(i);}
          if(!ids.length)continue;
          const output={model:batch.model,background:batch.background,young:batch.young,interior};
          for(const key of ['trunks','leaves','roots']){
            const source=batch[key],mesh=new T.InstancedMesh(source.geometry,source.material,key==='roots'&&batch.background?0:ids.length);mesh.name=source.name;mesh.receiveShadow=true;mesh.customDepthMaterial=source.customDepthMaterial;
            for(let i=0;i<mesh.count;i++){source.getMatrixAt(ids[i],dummy.matrix);mesh.setMatrixAt(i,dummy.matrix);if(source.instanceColor){source.getColorAt(ids[i],color);mesh.setColorAt(i,color);}}
            mesh.computeBoundingSphere();group.add(mesh);output[key]=mesh;
          }
          const shadow=new T.InstancedMesh(batch.model.shadow,shadowOnly,ids.length);shadow.name='Coarse canopy shadow';shadow.customDepthMaterial=depthSurface;
          for(let i=0;i<ids.length;i++){batch.trunks.getMatrixAt(ids[i],dummy.matrix);shadow.setMatrixAt(i,dummy.matrix);}shadow.computeBoundingSphere();group.add(shadow);output.shadow=shadow;separated.push(output);
          installDrawSuppression(shadow,true);
        }
        for(const key of ['trunks','leaves','roots']){group.remove(batch[key]);batch[key].dispose();}
      }
      treeMeshes=separated;
      const breaths=new T.InstancedMesh(breathingRoot,bark,420);
      for(let i=0;i<breaths.count;i++){
        const side=i%2?1:-1,patch=Math.floor(i/14),z=225-(chunk+(Math.floor(patch/2)+.5)/15)*112+random(-2.4,2.4);
        const d=2.4+(patch%4)*2.1+random(-1.3,1.5);dummy.position.set(center(z)+side*(width(z)+d),estuaryGround(z,d,side)-.04,z);
        dummy.rotation.set(random(-.2,.2),random(0,6.28),random(-.2,.2));dummy.scale.set(random(.7,1.2),random(.13,.6),random(.7,1.2));dummy.updateMatrix();breaths.setMatrixAt(i,dummy.matrix);
      }
      breaths.name='Patchy breathing roots';breaths.receiveShadow=true;breaths.computeBoundingSphere();group.add(breaths);fine.push(breaths);
      const debris=new T.InstancedMesh(driftwood,bark,22);
      for(let i=0;i<debris.count;i++){
        const side=i%2?1:-1,z=225-(chunk+random())*112,d=random(3.3,13);dummy.position.set(center(z)+side*(width(z)+d),estuaryGround(z,d,side)-.022,z);dummy.rotation.set(random(-.08,.08),random(0,6.28),random(-.07,.07));dummy.scale.setScalar(random(.5,1.0));dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);
      }
      debris.name='Half-buried tidal driftwood';debris.receiveShadow=true;debris.computeBoundingSphere();group.add(debris);fine.push(debris);
      root.add(group);sections.push({group,treeMeshes,fine,treated,distance:Infinity});onProgress('Composing creek, bend, tidal shelf and clearing',.31+(chunk+3)/17*.67);await pause();
    }
    function compactReflection(mesh){
      if(!mesh.visible||!mesh.count)return;
      let reflected=reflectedMeshes.get(mesh);
      if(!reflected){
        reflected=new T.InstancedMesh(mesh.geometry,mesh.material,mesh.instanceMatrix.count);reflected.name='Estuary reflection instances';reflected.userData.reflectionOnly=true;reflected.userData.sourceForestId=mesh.uuid;
        reflected.instanceMatrix.setUsage(T.DynamicDrawUsage);if(mesh.instanceColor)reflected.instanceColor=new T.InstancedBufferAttribute(new Float32Array(mesh.instanceColor.array.length),3).setUsage(T.DynamicDrawUsage);
        reflected.matrixAutoUpdate=false;reflected.frustumCulled=false;mesh.parent.add(reflected);reflectedMeshes.set(mesh,reflected);
      }
      reflected.geometry=mesh.geometry;reflected.material=mesh.material;reflected.receiveShadow=mesh.receiveShadow;reflected.matrix.copy(mesh.matrix);reflected.matrixWorld.copy(mesh.matrixWorld);
      const source=mesh.instanceMatrix.array,target=reflected.instanceMatrix.array,sourceColor=mesh.instanceColor?.array,targetColor=reflected.instanceColor?.array;
      let count=0;
      for(let i=0;i<mesh.count;i++){
        instanceTransform.fromArray(source,i*16);worldTransform.multiplyMatrices(mesh.matrixWorld,instanceTransform);sphere.copy(mesh.geometry.boundingSphere);sphere.radius+=.6;sphere.applyMatrix4(worldTransform);
        if(!frustum.intersectsSphere(sphere))continue;
        for(let j=0;j<16;j++)target[count*16+j]=source[i*16+j];if(sourceColor&&targetColor)for(let j=0;j<3;j++)targetColor[count*3+j]=sourceColor[i*3+j];count++;
      }
      const triangles=mesh.geometry.index.count/3;reflectionInstances.considered+=mesh.count;reflectionInstances.submitted+=count;reflectionInstances.culled+=mesh.count-count;reflectionInstances.consideredTriangles+=triangles*mesh.count;reflectionInstances.submittedTriangles+=triangles*count;reflectionInstances.savedTriangles+=triangles*(mesh.count-count);
      reflected.count=count;reflected.visible=count>0;if(count){reflected.instanceMatrix.needsUpdate=true;if(reflected.instanceColor)reflected.instanceColor.needsUpdate=true;}mesh.visible=false;
    }
    // Three performs its shadow pass before calling onBeforeRender. Suppress
    // the color-pass draw only, keeping the complete shadow source untouched.
    // Zero-instance draws are skipped by Three's indexed buffer renderer.
    function installDrawSuppression(mesh,shadowOnly=false){
      if(drawStates.has(mesh))return;
      const state={savedCount:null,hidden:false,shadowOnly,indices:new Uint32Array(mesh.instanceMatrix.count),before:mesh.onBeforeRender,after:mesh.onAfterRender};drawStates.set(mesh,state);
      mesh.onBeforeRender=function(...args){state.before.apply(this,args);if(state.shadowOnly||(mainActive&&!reflectionRestore&&state.hidden)){state.savedCount=this.count;this.count=0;}};
      mesh.onAfterRender=function(...args){if(state.savedCount!==null){this.count=state.savedCount;state.savedCount=null;}state.after.apply(this,args);};
    }
    function compactMain(mesh){
      if(!mesh.visible||!mesh.count)return;installDrawSuppression(mesh);
      const state=drawStates.get(mesh),visible=state.indices,source=mesh.instanceMatrix.array;let count=0;
      for(let i=0;i<mesh.count;i++){
        instanceTransform.fromArray(source,i*16);worldTransform.multiplyMatrices(mesh.matrixWorld,instanceTransform);sphere.copy(mesh.geometry.boundingSphere);sphere.radius+=.6;sphere.applyMatrix4(worldTransform);
        if(frustum.intersectsSphere(sphere))visible[count++]=i;
      }
      const triangles=mesh.geometry.index.count/3;
      mainInstances.considered+=mesh.count;mainInstances.submitted+=count;mainInstances.culled+=mesh.count-count;mainInstances.consideredTriangles+=triangles*mesh.count;mainInstances.submittedTriangles+=triangles*count;mainInstances.savedTriangles+=triangles*(mesh.count-count);
      drawStates.get(mesh).hidden=count!==mesh.count;if(count===mesh.count||!count)return;
      let compact=mainMeshes.get(mesh);
      if(!compact){
        compact=new T.InstancedMesh(mesh.geometry,mesh.material,mesh.instanceMatrix.count);compact.name='Estuary main view instances';compact.userData.mainOnly=true;compact.userData.sourceForestId=mesh.uuid;
        compact.instanceMatrix.setUsage(T.DynamicDrawUsage);if(mesh.instanceColor)compact.instanceColor=new T.InstancedBufferAttribute(new Float32Array(mesh.instanceColor.array.length),3).setUsage(T.DynamicDrawUsage);
        compact.matrixAutoUpdate=false;compact.frustumCulled=false;mesh.parent.add(compact);mainMeshes.set(mesh,compact);
      }
      compact.geometry=mesh.geometry;compact.material=mesh.material;compact.receiveShadow=mesh.receiveShadow;compact.castShadow=false;compact.matrix.copy(mesh.matrix);compact.matrixWorld.copy(mesh.matrixWorld);
      const target=compact.instanceMatrix.array,sourceColor=mesh.instanceColor?.array,targetColor=compact.instanceColor?.array;
      for(let i=0;i<count;i++){const id=visible[i];for(let j=0;j<16;j++)target[i*16+j]=source[id*16+j];if(sourceColor&&targetColor)for(let j=0;j<3;j++)targetColor[i*3+j]=sourceColor[id*3+j];}
      compact.count=count;compact.visible=true;compact.instanceMatrix.needsUpdate=true;if(compact.instanceColor)compact.instanceColor.needsUpdate=true;
    }
    function endMainRender(){mainActive=false;for(const mesh of mainMeshes.values())mesh.visible=false;for(const [mesh,state]of drawStates){state.hidden=false;if(state.savedCount!==null){mesh.count=state.savedCount;state.savedCount=null;}}}
    function endReflection(){if(!reflectionRestore)return;for(const mesh of reflectedMeshes.values())mesh.visible=false;for(const [mesh,geometry,visible] of reflectionRestore){mesh.geometry=geometry;mesh.visible=visible;}reflectionRestore=null;for(const [mesh,visible]of mainReflectionRestore)mesh.visible=visible;mainReflectionRestore.length=0;}
    scene.add(root);
    const api={
      groundHeight(x,z){const side=x>=center(z)?1:-1,chunk=Math.floor((225-z)/112);return surfaceHeight(x,z,side,reviewSection===null||Math.abs(chunk-reviewSection)<=1);},
      setEnabled(value){if(disposed)return;endReflection();endMainRender();enabled=Boolean(value);root.visible=enabled;world.setHighDetail?.(enabled);world.setHighSceneEnabled?.(enabled);for(const {mesh,visible} of oldBanks)mesh.visible=enabled?false:visible;renderer.shadowMap.needsUpdate=true;},
      update(value,boatPosition,climate){
        if(!enabled||disposed)return;endReflection();endMainRender();time.value=value;visibleSections=0;
        if(climate?.wind){const w=climate.wind,length=Math.hypot(w.x,w.z)||1;wind.value.set(w.x/length,w.z/length,clamp(w.strength??.35,0,3),clamp(w.gust??0,0,1));}
        for(const section of sections){
          const distance=Math.abs(section.group.userData.centerZ-boatPosition.z);section.distance=distance;section.group.visible=distance<565;if(!section.group.visible)continue;visibleSections++;
          for(const {trunks,leaves,roots,shadow,model,background,young,interior} of section.treeMeshes){
            trunks.geometry=!background&&!young&&!interior&&distance<100?model.wood:model.coarse;trunks.castShadow=Boolean(model.photographic)&&!background&&!interior&&!young&&distance<80;trunks.visible=!young||distance<170;
            leaves.geometry=background?(model.photographic&&!interior&&distance<130?model.mid:model.far):distance<95?((young||interior)&&model.photographic?model.mid:model.near):!young&&distance<220?model.mid:model.far;leaves.castShadow=false;leaves.visible=trunks.visible;
            roots.visible=!background&&distance<(young?100:160);roots.castShadow=!background&&distance<70;
            shadow.visible=!background&&distance<95;shadow.castShadow=shadow.visible;
          }
          for(const detail of section.fine)detail.visible=distance<125;
        }
      },
      beginMainRender({camera}={}){
        if(!enabled||disposed||!camera)return;endMainRender();mainActive=true;root.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
        frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
        mainInstances={considered:0,submitted:0,culled:0,consideredTriangles:0,submittedTriangles:0,savedTriangles:0};
        for(const section of sections){if(!section.group.visible)continue;for(const {trunks,leaves,roots}of section.treeMeshes)for(const mesh of [trunks,leaves,roots])compactMain(mesh);for(const mesh of section.fine)compactMain(mesh);}
      },endMainRender,
      beginReflection(context){
        if(!enabled||disposed||reflectionRestore)return;reflectionRestore=[];
        for(const mesh of mainMeshes.values()){mainReflectionRestore.push([mesh,mesh.visible]);mesh.visible=false;}
        reflectionInstances={considered:0,submitted:0,culled:0,consideredTriangles:0,submittedTriangles:0,savedTriangles:0};
        if(context?.camera)frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(context.camera.projectionMatrix,context.camera.matrixWorldInverse));
        for(const section of sections){if(!section.group.visible)continue;
          for(const {trunks,leaves,roots,shadow,model,background,young,interior} of section.treeMeshes){for(const mesh of [trunks,leaves,roots,shadow])reflectionRestore.push([mesh,mesh.geometry,mesh.visible]);trunks.geometry=model.coarse;leaves.geometry=!background&&!young&&!interior&&section.distance<95?model.mid:model.far;roots.visible=roots.visible&&!young&&section.distance<80;shadow.visible=false;}
          for(const mesh of section.fine){reflectionRestore.push([mesh,mesh.geometry,mesh.visible]);mesh.visible=false;}
          if(context?.camera)for(const {trunks,leaves,roots} of section.treeMeshes)for(const mesh of [trunks,leaves,roots])compactReflection(mesh);
        }
      },endReflection,
      getStats(){return {enabled,independentScene:true,individualLeafMeshes:true,detailedTrees:totalTrees,supportingTrees:0,treatedSections:sections.length,photographicSections:sections.filter(section=>section.treated).length,modelAssetBytes:photographic.bytes,artDirectedSections:sections.length,activeSections:visibleSections,growthHabits:photoModels.map(model=>model.wood.userData.growthHabit),wind:wind.value.toArray(),reviewSection,mainPass:mainActive,mainInstances:{...mainInstances},reflectionPass:Boolean(reflectionRestore),reflectionInstances:{...reflectionInstances}};},
      dispose(){if(disposed)return;api.setEnabled(false);disposed=true;release();}
    };
    onProgress('Independent estuary ready',1);return api;
  }catch(error){release();throw error;}
}
