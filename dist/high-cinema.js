import * as T from 'three';
import {gustAt} from './experience-policy.js';
import {center,width} from './channel.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Small procedural pools. Shared wind advects both layers; nothing is spawned
// during play. Flags permit independent A/B measurements in the review build.
export function createHighCinema({scene,waterHeight}){
  const root=new T.Group();root.name='Creek pollen and drifting leaves';root.visible=false;scene.add(root);
  const flags={particles:true,leaves:true,banks:true};
  const count=72,positions=new Float32Array(count*3),seeds=new Float32Array(count*4);
  let seed=7921;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<seeds.length;i++)seeds[i]=random();
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
  const material=new T.PointsMaterial({color:0xe3d5a7,size:.045,transparent:true,opacity:.42,depthWrite:false,sizeAttenuation:true,fog:true});
  const pollen=new T.Points(geometry,material);pollen.frustumCulled=false;root.add(pollen);
  const leafGeo=new T.CircleGeometry(.065,5),leafMat=new T.MeshStandardMaterial({color:0x80652d,roughness:.6,side:T.DoubleSide});
  const leaves=new T.InstancedMesh(leafGeo,leafMat,18);leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);leaves.frustumCulled=false;root.add(leaves);
  const reedVertices=[];
  for(let i=0;i<3;i++){const a=i*2.399,x=Math.cos(a)*.035,z=Math.sin(a)*.035,h=.4+i*.13;reedVertices.push(x,0,z,x+.035,0,z,x+.08,h,z+.04);}
  const reedGeo=new T.BufferGeometry();reedGeo.setAttribute('position',new T.Float32BufferAttribute(reedVertices,3));reedGeo.computeVertexNormals();
  const reedMat=new T.MeshStandardMaterial({color:0x737544,roughness:.86,side:T.DoubleSide});
  const breeze={value:0},windVector={value:new T.Vector2()},reedClock={value:0};
  reedMat.onBeforeCompile=shader=>{shader.uniforms.creekBreeze=breeze;shader.uniforms.creekWind=windVector;shader.uniforms.creekClock=reedClock;shader.vertexShader='uniform float creekBreeze,creekClock;uniform vec2 creekWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 anchor=(instanceMatrix*vec4(position,1.)).xyz;float bend=position.y*position.y*(.18+creekBreeze*.35)*(1.+.35*sin(anchor.x*.17+anchor.z*.11-creekClock*1.7));transformed.xz+=creekWind*bend;');};
  const reeds=new T.InstancedMesh(reedGeo,reedMat,96);reeds.name='Tidal reeds';root.add(reeds);
  const shellGeo=new T.SphereGeometry(.06,6,4),shellMat=new T.MeshStandardMaterial({color:0xb1aa89,roughness:.65});
  const shells=new T.InstancedMesh(shellGeo,shellMat,16);shells.name='Sparse tidal shells';root.add(shells);
  const crabParts=[new T.SphereGeometry(.055,7,4).scale(1,.45,.75)];
  for(const sign of [-1,1])for(let i=0;i<4;i++){const leg=new T.CylinderGeometry(.006,.004,.10,3);leg.rotateZ(sign*.9);leg.translate(sign*.06,.005,(i-1.5)*.025);crabParts.push(leg);}
  const crabGeo=mergeGeometries(crabParts);crabParts.forEach(g=>g.dispose());const crabMat=new T.MeshStandardMaterial({color:0x71563c,roughness:.58});
  const crabs=new T.InstancedMesh(crabGeo,crabMat,6);crabs.name='Sparse small shore crabs';root.add(crabs);
  let bankOrigin=Infinity;
  const dummy=new T.Object3D();let enabled=false,cap=count,preset=0,reflection=false,cpu=0,samples=0,reduced=false;
  return {flags,
    setEnabled(value){enabled=value;root.visible=value;},
    setLighting(index){preset=index;material.color.set(index===2||index===4?0xb5cbd7:0xe3d5a7);material.opacity=index===1?.20:.35;},
    setDetail(policy){cap=Math.min(count,policy.particles);geometry.setDrawRange(0,cap);leaves.count=Math.max(6,Math.floor(cap/4));},
    setReducedMotion(value){reduced=value;},
    beginReflection(){reflection=true;root.visible=false;},endReflection(){reflection=false;root.visible=enabled;},
    update(time,dt,boat,camera,climate){
      if(!enabled)return;const start=performance.now(),wind=climate?.wind,t=reduced?0:time;
      root.visible=!reflection;pollen.visible=flags.particles&&preset!==3;leaves.visible=flags.leaves;
      reeds.visible=shells.visible=crabs.visible=flags.banks;
      const wx=wind?.x??.6,wz=wind?.z??.8,gust=gustAt(t,boat.x,boat.z),speed=.22+(wind?.strength??.2)*.7;
      breeze.value=wind?.strength??.2;windVector.value.set(wx,wz);reedClock.value=t;
      if(flags.banks&&Math.abs(boat.z-bankOrigin)>70&&climate?.groundHeight){bankOrigin=boat.z;
        for(const mesh of [reeds,shells,crabs]){for(let i=0;i<mesh.count;i++){const k=(i%count)*4,side=i%2?1:-1,z=boat.z-85+seeds[k]*170,x=center(z)+side*(width(z)+1.8+seeds[k+1]*3);dummy.position.set(x,climate.groundHeight(x,z)+.02,z);dummy.rotation.set(0,seeds[k+2]*6,0);dummy.scale.setScalar(mesh===reeds?.8+seeds[k+3]:1);if(mesh===shells)dummy.scale.y=.3;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
      }
      if(pollen.visible){for(let i=0;i<cap;i++){const k=i*4,j=i*3;positions[j]=boat.x+((seeds[k]*60+t*wx*speed)%60+60)%60-30;positions[j+2]=boat.z+((seeds[k+1]*60+t*wz*speed)%60+60)%60-30;positions[j+1]=.7+seeds[k+2]*9+Math.sin(t*.3+seeds[k+3]*6)*(.2+gust*.3);}geometry.attributes.position.needsUpdate=true;}
      if(leaves.visible){for(let i=0;i<leaves.count;i++){const k=i*4,x=boat.x+((seeds[k]*30+t*wx*.12)%30+30)%30-15,z=boat.z+((seeds[k+1]*50+t*wz*.12)%50+50)%50-25;dummy.position.set(x,waterHeight(x,z,time)+.025,z);dummy.rotation.set(-Math.PI/2,0,seeds[k+2]*6+t*.025);dummy.scale.set(1,1.8,1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}leaves.instanceMatrix.needsUpdate=true;}
      cpu+=(performance.now()-start);samples++;
    },
    getStats(){return {flags:{...flags},particles:pollen.visible?cap:0,leaves:leaves.visible?leaves.count:0,bankInstances:flags.banks?118:0,drawCalls:Number(pollen.visible)+Number(leaves.visible)+(flags.banks?3:0),cpuMs:samples?+(cpu/samples).toFixed(3):0};},
    dispose(){root.removeFromParent();for(const item of [geometry,material,leafGeo,leafMat,reedGeo,reedMat,shellGeo,shellMat,crabGeo,crabMat])item.dispose();}
  };
}
