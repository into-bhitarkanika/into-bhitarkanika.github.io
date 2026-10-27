// Development-only asset inspection. Both frozen and current builds receive
// precisely this light, sky, environment and direct, ungraded render path.
export function createNeutralReview(T,{scene,renderer,sky,highGraphics,sun,hemi,water}){
 const direction=new T.Vector3(.35,.82,-.45).normalize();
 const lighting={neutral:true,sunColor:'#ffffff',sunPower:3,ambient:.8,hemiSky:'#dae1e5',hemiGround:'#72776a',exposure:1,fog:'#c2ced0',fogDensity:0,direction:direction.toArray(),waterColor:'#485442',waterLight:1,shaftStrength:0,bloomStrength:0,gradeWarmth:0,shadowBias:-.000055,normalBias:.008};
 const geometry=new T.SphereGeometry(1600,24,12);
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sunDirection:{value:direction}},vertexShader:'varying vec3 viewDirection;void main(){viewDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 viewDirection;uniform vec3 sunDirection;
 void main(){vec3 d=normalize(viewDirection);vec3 color=mix(vec3(.58,.65,.69),vec3(.22,.38,.54),smoothstep(0.,.9,d.y));color=mix(vec3(.16,.18,.15),color,smoothstep(-.09,.04,d.y));float sun=smoothstep(.999985,.999991,dot(d,sunDirection));color+=vec3(22.)*sun;gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const dome=new T.Mesh(geometry,material);dome.name='Shared neutral daylight review';dome.frustumCulled=false;
 const capture=new T.Scene();capture.add(dome);const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(capture,0,.1,2000,{size:128});pmrem.dispose();scene.add(dome);dome.visible=false;
 let saved=null;
 return {lighting,
  enter(){
   if(saved)return lighting;
   const oldSky=scene.getObjectByName('High layered estuary sky');
   saved={fog:scene.fog,background:scene.background,environment:scene.environment,intensity:scene.environmentIntensity,oldSky,skyVisible:oldSky?.visible,render:highGraphics.render};
   scene.fog=null;scene.background=null;scene.environment=environment.texture;scene.environmentIntensity=.7;if(oldSky)oldSky.visible=false;dome.visible=true;
   highGraphics.setNeutral?.(true);
   sky.uniforms.sun.value.copy(direction);sun.color.set('#ffffff');sun.intensity=3;hemi.intensity=.8;hemi.color.set(lighting.hemiSky);hemi.groundColor.set(lighting.hemiGround);
   sun.shadow.bias=lighting.shadowBias;sun.shadow.normalBias=lighting.normalBias;renderer.toneMappingExposure=1;
   water.uniforms.sunColor.value.set('#ffffff');water.uniforms.sunDirection.value.copy(direction);water.setLighting(lighting);
   highGraphics.render=(world,camera)=>{dome.position.copy(camera.position);highGraphics.beginMainRender?.(camera);try{renderer.render(world,camera);}finally{highGraphics.endMainRender?.();}};
   return lighting;
  },
  exit(){if(!saved)return;highGraphics.setNeutral?.(false);highGraphics.render=saved.render;scene.fog=saved.fog;scene.background=saved.background;scene.environment=saved.environment;scene.environmentIntensity=saved.intensity;if(saved.oldSky)saved.oldSky.visible=saved.skyVisible;dome.visible=false;saved=null;},
  dispose(){this.exit();dome.removeFromParent();geometry.dispose();material.dispose();environment.dispose();}
 };
}
