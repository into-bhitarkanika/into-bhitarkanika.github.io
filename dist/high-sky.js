import * as T from 'three';

// One radiance description owns the visible sky, cached environment and key
// light. Preset indexes 0–2 intentionally preserve the original controls.
export const HIGH_SKY_PRESETS = [
 {name:'Golden hour',direction:[-.46,.32,-.83],top:'#689dbb',horizon:'#d6c5a4',ground:'#566d60',cloud:'#eadac1',cloudShade:'#7a8998',radiance:1.0,cloudCover:.46,cloudDepth:.85,sunRadiance:7,aureole:.095,environment:.55,
  sunColor:'#ffe2c0',sunPower:3.1,ambient:1.08,hemiSky:'#c1dcf0',hemiGround:'#718575',exposure:1.0,fog:'#a6bbbf',fogDensity:.00115,shaftStrength:.055,bloomStrength:.025,gradeWarmth:.08,moon:0,stars:0,water:'#48594d',waterLight:1.0},
 {name:'Morning mist',direction:[-.25,.40,-.70],top:'#92b9cc',horizon:'#dae2d1',ground:'#77887a',cloud:'#eee9d6',cloudShade:'#9ab4bb',radiance:1.18,cloudCover:.52,sunRadiance:6,aureole:.15,environment:.42,
  sunColor:'#f5f4ef',sunPower:2.25,ambient:1.05,hemiSky:'#c1dbe4',hemiGround:'#7b8b79',exposure:1.0,fog:'#b3c5c5',fogDensity:.00165,shaftStrength:.025,bloomStrength:.015,gradeWarmth:0,moon:0,stars:0,water:'#486059',waterLight:.95},
 {name:'Blue hour',direction:[-.5,.16,-.7],top:'#324c77',horizon:'#9b9aad',ground:'#42565d',cloud:'#969db5',cloudShade:'#566783',radiance:.95,cloudCover:.49,sunRadiance:0,aureole:0,environment:.67,
  sunColor:'#bacbe5',sunPower:.44,ambient:1.2,hemiSky:'#a8bddc',hemiGround:'#697b79',exposure:1.16,fog:'#6b8196',fogDensity:.0022,shaftStrength:0,bloomStrength:.035,gradeWarmth:0,moon:0,stars:.08,water:'#3c5866',waterLight:.67},
 {name:'Storm',direction:[-.36,.68,-.66],top:'#536372',horizon:'#9facac',ground:'#4a5d56',cloud:'#a9b7bc',cloudShade:'#445465',radiance:.95,cloudCover:.98,sunRadiance:0,aureole:0,environment:.60,
  sunColor:'#c1d6e3',sunPower:.86,ambient:1.2,hemiSky:'#bdcbd9',hemiGround:'#64776b',exposure:1.06,fog:'#819798',fogDensity:.00325,shaftStrength:0,bloomStrength:.025,gradeWarmth:0,moon:0,stars:0,water:'#3b5155',waterLight:.79},
 {name:'Moonlit Night',direction:[-.25,.115,-.96],top:'#101b2e',horizon:'#26394f',ground:'#1e2c37',cloud:'#536780',cloudShade:'#27374e',radiance:.45,cloudCover:.22,cloudDepth:.75,sunRadiance:2.6,aureole:.016,environment:.36,
  sunColor:'#c9dcf2',sunPower:.62,ambient:1.0,hemiSky:'#a4bed4',hemiGround:'#657c8a',exposure:1.05,fog:'#263e52',fogDensity:.0015,shaftStrength:.008,bloomStrength:.028,gradeWarmth:0,moon:1,stars:.72,water:'#263f4e',waterLight:.36}
];
const indexOf=index=>Math.max(0,Math.min(HIGH_SKY_PRESETS.length-1,index|0));

// Internal material-validation lighting. The review uses one shared neutral
// dome and environment for both builds; this is not a sixth weather option.
export function getNeutralLighting(){
 return {name:'Neutral daylight',neutral:true,direction:[.35,.82,-.45],sunColor:'#ffffff',sunPower:3,ambient:.8,hemiSky:'#d6e2e9',hemiGround:'#8b8d86',environment:.7,exposure:1,fog:'#bccbd1',fogDensity:0,shadowBias:-.000055,normalBias:.008,shaftStrength:0,bloomStrength:0,gradeWarmth:0,water:'#5b6250',waterColor:'#5b6250',waterLight:1,moon:0};
}

export function getHighLighting(index){
 const p=HIGH_SKY_PRESETS[indexOf(index)];
 return {name:p.name,sunColor:p.sunColor,sunPower:p.sunPower,ambient:p.ambient,hemiSky:p.hemiSky,hemiGround:p.hemiGround,exposure:p.exposure,fog:p.fog,fogDensity:p.fogDensity,
  direction:[...p.direction],shadowBias:-.000055,normalBias:.008,shaftStrength:p.shaftStrength,bloomStrength:p.bloomStrength,gradeWarmth:p.gradeWarmth??0,water:p.water,waterColor:p.water,waterLight:p.waterLight,moon:p.moon};
}
export function skyUniforms(index){
 const p=HIGH_SKY_PRESETS[indexOf(index)];
 return {top:{value:new T.Color(p.top)},horizon:{value:new T.Color(p.horizon)},ground:{value:new T.Color(p.ground)},cloud:{value:new T.Color(p.cloud)},cloudShade:{value:new T.Color(p.cloudShade)},sunColor:{value:new T.Color(p.sunColor)},sun:{value:new T.Vector3(...p.direction).normalize()},radiance:{value:p.radiance},cloudCover:{value:p.cloudCover},cloudDepth:{value:p.cloudDepth??(index===3?1.55:.88)},sunRadiance:{value:p.sunRadiance},aureole:{value:p.aureole},moon:{value:p.moon},stars:{value:p.stars},drift:{value:new T.Vector2()},flash:{value:0}};
}

// The photograph supplies irregular cloud structure and radiance; one shared
// key direction still controls the visible sun, reflections and scene lighting.
function photographUniforms(index,texture,sunAzimuth){
 const direction=new T.Vector3(...HIGH_SKY_PRESETS[index].direction).normalize();
 return {skyPhotograph:{value:texture},photoSourceSun:{value:texture.userData.sourceSun.clone()},photoYaw:{value:sunAzimuth-Math.atan2(direction.z,direction.x)},photoAmount:{value:[.91,.90,.72,.34,.25][index]},photoExposure:{value:index===0?texture.userData.radianceScale:[.36,.29,.065,.23,.014][index]},photoTint:{value:new T.Color().setRGB(...[[1.00,1.02,1.05],[.97,1.02,1.04],[.81,.91,1.14],[.91,.98,1.08],[.57,.74,1.12]][index])}};
}

function photoSolarAzimuth(texture){
 const {data,width,height}=texture.image;let brightest=0,bestX=0,bestY=0,total=0,count=0;
 // Ignore the horizon and lower hemisphere. HDR samples are half floats.
 for(let y=0;y<height*.47;y+=2)for(let x=0;x<width;x+=2){const i=(y*width+x)*4,l=T.DataUtils.fromHalfFloat(data[i])*.2126+T.DataUtils.fromHalfFloat(data[i+1])*.7152+T.DataUtils.fromHalfFloat(data[i+2])*.0722;total+=Math.min(l,4);count++;if(l>brightest){brightest=l;bestX=x;bestY=y;}}
 texture.userData.radianceScale=.32/Math.max(.02,total/count);
 texture.userData.sourceSun=new T.Vector3(bestX/width,1-bestY/height,Math.max(.1,Math.sin(bestY/height*Math.PI)));
 return (bestX/width-.5)*Math.PI*2;
}
export const highSkyFragment=`
 varying vec3 direction;
 uniform vec3 top,horizon,ground,cloud,cloudShade,sunColor,sun;
 uniform float radiance,cloudCover,cloudDepth,sunRadiance,aureole,moon,stars,flash;
 uniform vec2 drift;
 uniform sampler2D skyPhotograph;uniform float photoYaw,photoAmount,photoExposure;uniform vec3 photoTint,photoSourceSun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float cloudNoise(vec2 p){float n=noise(p)*.54;p=mat2(1.66,1.19,-1.19,1.66)*p+4.2;n+=noise(p)*.28;p=mat2(1.77,1.08,-1.08,1.77)*p+7.1;n+=noise(p)*.13;n+=noise(p*2.1)*.05;return n;}
 void main(){
  vec3 d=normalize(direction);float altitude=max(d.y,0.);
  float optical=1.-exp(-altitude*3.7);vec3 color=mix(horizon,top,optical)*radiance;
  float mu=max(dot(d,sun),0.),above=smoothstep(-.025,.045,d.y);
  color+=sunColor*aureole*(pow(mu,19.)+.16*pow(mu,3.))*above;
  // Two projected decks have distinct scale, shape, drift and optical depth.
  // Density samples toward the real key direction shade interiors, while thin
  // edges remain backlit. This replaces the old nearly uniform cloud sheet.
  vec2 lowerPlane=d.xz/max(d.y+.075,.075),upperPlane=d.xz/max(d.y+.20,.20);
  vec2 uv=lowerPlane*vec2(.39,.56)+vec2(3.8,-2.4)+drift;
  float formation=cloudNoise(uv*.32+vec2(7.7,-4.8));
  uv+=vec2(noise(uv*.71),noise(uv*.71+5.2))*.38;
  float field=cloudNoise(uv),edge=.59-cloudCover*.25+(formation-.48)*.18;
  float density=max(0.,field-edge)*7.5*cloudDepth;
  float lower=(1.-exp(-density*2.7))*smoothstep(.006,.105,d.y);
  float towardKey=max(0.,cloudNoise(uv+sun.xz*.28)-edge)*5.8;
  float selfShade=1.-exp(-(density*.65+towardKey*.50));
  float rim=pow(max(0.,1.-density),3.)*smoothstep(.02,.17,density)*pow(mu,7.);
  vec3 cloudLight=mix(cloud,cloudShade,selfShade*.84)*radiance;
  cloudLight+=sunColor*(aureole*.62*rim+.018*pow(mu,4.))*(1.-moon*.85);
  // Far cloud decks soften toward the horizon without obscuring the nearby
  // lower billows. Clear intervals retain a cooler blue sky above warm light.
  float upper=cloudNoise(upperPlane*vec2(.27,.12)+vec2(-8.1,7.3)+drift*.34);
  float veil=smoothstep(.53-cloudCover*.13,.73,upper)*.39*smoothstep(.00,.12,d.y);
  vec3 upperLight=mix(cloud,cloudShade,.23)*radiance;
  color=mix(color,upperLight,veil);
  float horizonVeil=(1.-smoothstep(.015,.19,d.y))*.25;
  cloudLight=mix(cloudLight,horizon*radiance,horizonVeil);
  color=mix(color,cloudLight,lower);
  // Local photographic HDR clouds replace the broad procedural sheets. Their
  // luminance is softly compressed before mixing to avoid a second bright disk.
  vec2 photographUV=vec2(fract(atan(d.z,d.x)*.159154943+.5+photoYaw*.159154943+drift.x*.015),asin(clamp(d.y,-1.,1.))*.318309886+.5);
  vec3 photographed=texture2D(skyPhotograph,photographUV).rgb;
  // The source HDR's baked sun is at a different elevation. Remove that tiny
  // disk with neighboring sky radiance, so visible light, PMREM, reflection and
  // scene shadows have exactly one shared sun direction rather than two suns.
  vec2 sunOffset=photographUV-photoSourceSun.xy;sunOffset.x=fract(sunOffset.x+.5)-.5;
  float sourceDisk=1.-smoothstep(.003,.008,length(sunOffset*vec2(photoSourceSun.z*2.,1.)));
  if(sourceDisk>.001){vec2 shift=vec2(.014/(photoSourceSun.z*2.),0.);
   vec3 adjacent=(texture2D(skyPhotograph,photographUV+shift).rgb+texture2D(skyPhotograph,photographUV-shift).rgb)*.5;
   photographed=mix(photographed,adjacent,sourceDisk);
  }
  photographed*=photoExposure;
  photographed=photographed/(1.+max(0.,dot(photographed,vec3(.2126,.7152,.0722))-1.5)*.33);
  float photographSky=smoothstep(-.015,.10,d.y);
  color=mix(color,photographed*photoTint,photoAmount*photographSky);
  float coverage=lower+(1.-lower)*veil;
  if(stars>.001){
   vec2 angles=vec2(atan(d.z,d.x)*.15915494,asin(clamp(d.y,-1.,1.))*.31830989),grid=angles*vec2(1100.,550.);
   vec2 cell=floor(grid),offset=fract(grid)-vec2(.18+.64*hash(cell+3.),.18+.64*hash(cell+7.));
   float star=1.-smoothstep(.025,.19,length(offset)),selected=step(.996,hash(cell));
   color+=vec3(.62,.74,1.)*star*selected*stars*smoothstep(.12,.65,d.y)*(1.-coverage)*1.7;
  }
  float disk=smoothstep(.99989,.999955,dot(d,sun));
  if(moon>.5){
   vec3 right=normalize(cross(sun,vec3(0.,1.,0.))),up=normalize(cross(right,sun));
   vec2 lunar=vec2(dot(d,right),dot(d,up))*180.;
   disk*=.79+.12*noise(lunar*4.+2.)+.09*noise(lunar*9.-3.);
  }
  color+=sunColor*sunRadiance*disk*above*(1.-coverage*.91);
  color+=vec3(.54,.64,.79)*flash*(.14+.72*coverage)*above;
  color=mix(ground*radiance*.55,color,smoothstep(-.065,.012,d.y));
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

export async function buildHighSky({scene,renderer,sky,onProgress=()=>{}}){
 const geometry=new T.SphereGeometry(1800,32,16),materials=[],environments=[];
 const {HDRLoader}=await import('./vendor/HDRLoader.js');
 onProgress('Loading photographed cloud radiance');
 const loaded=await Promise.allSettled(['kloofendal-clouds-2k.hdr','qwantani-sunset-2k.hdr'].map(file=>new HDRLoader().loadAsync(new URL('./assets/high/sky/'+file,import.meta.url).href)));
 if(loaded.some(result=>result.status==='rejected')){for(const result of loaded)if(result.status==='fulfilled')result.value.dispose();geometry.dispose();throw new Error('Photographic skies could not load.');}
 const [photograph,sunset]=loaded.map(result=>result.value);
 for(const map of [photograph,sunset]){map.wrapS=T.RepeatWrapping;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;}
 const photographAzimuth=photoSolarAzimuth(photograph),sunsetAzimuth=photoSolarAzimuth(sunset);
 const capture=new T.Scene(),probe=new T.Mesh(geometry);probe.frustumCulled=false;capture.add(probe);
 const pmrem=new T.PMREMGenerator(renderer);
 try{
  for(let index=0;index<HIGH_SKY_PRESETS.length;index++){
   onProgress(`Preparing ${HIGH_SKY_PRESETS[index].name.toLowerCase()} light`);
   const material=new T.ShaderMaterial({name:`High ${HIGH_SKY_PRESETS[index].name} sky`,side:T.BackSide,depthWrite:false,fog:false,uniforms:{...skyUniforms(index),...photographUniforms(index,index===0?sunset:photograph,index===0?sunsetAzimuth:photographAzimuth)},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:highSkyFragment});
   materials.push(material);probe.material=material;
   // All five environments are cached once; cloud drift never regenerates PMREM.
   environments.push(pmrem.fromScene(capture,0,.1,2200,{size:128}));
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }catch(error){materials.forEach(m=>m.dispose());environments.forEach(e=>e.dispose());geometry.dispose();photograph.dispose();sunset.dispose();throw error;}
 finally{pmrem.dispose();}
 const dome=new T.Mesh(geometry,materials[0]);dome.name='High layered estuary sky';dome.frustumCulled=false;dome.visible=false;dome.renderOrder=100;scene.add(dome);
 let enabled=false,original=null,lightingIndex=0,disposed=false,weather=null,lastTime=0;
 const applyEnvironment=()=>{dome.material=materials[lightingIndex];if(enabled){scene.environment=environments[lightingIndex].texture;scene.environmentIntensity=HIGH_SKY_PRESETS[lightingIndex].environment;scene.environmentRotation.set(0,0,0);}};
 return {
  setEnabled(value){
   if(disposed)return;value=Boolean(value);if(value===enabled)return;enabled=value;dome.visible=value;
   if(value){original={visible:sky.sky.visible,environment:scene.environment,intensity:scene.environmentIntensity,rotation:scene.environmentRotation.clone()};sky.sky.visible=false;applyEnvironment();}
   else if(original){sky.sky.visible=original.visible;scene.environment=original.environment;scene.environmentIntensity=original.intensity;scene.environmentRotation.copy(original.rotation);original=null;}
  },
  setLighting(index){lightingIndex=indexOf(index);applyEnvironment();},
  setWeather(value){weather=value;},
  update(t,camera){
   dome.position.copy(camera.position);const dt=Math.max(0,Math.min(.1,t-lastTime));lastTime=t;
   if(!enabled)return;const u=dome.material.uniforms,w=weather?.wind;
   u.drift.value.x+=dt*(w?.x??.6)*(.0012+(w?.strength??.3)*.0018);
   u.drift.value.y+=dt*(w?.z??.8)*(.0012+(w?.strength??.3)*.0018);
   u.flash.value=weather?.flash??0;
  },
  getStats(){return {type:'photographic HDR + dynamic weather',preset:HIGH_SKY_PRESETS[lightingIndex].name,cachedEnvironments:environments.length,cubeFaceSize:128,photograph:[2048,1024]};},
  dispose(){if(disposed)return;this.setEnabled(false);disposed=true;dome.removeFromParent();geometry.dispose();photograph.dispose();sunset.dispose();materials.forEach(m=>m.dispose());environments.forEach(e=>e.dispose());}
 };
}
