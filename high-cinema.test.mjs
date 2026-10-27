import {test} from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const threeURL=new URL('./dist/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(specifier,context,next){return next(specifier==='three'?threeURL:specifier,context);}});
const T=await import(threeURL),{createHighCinema}=await import('./dist/high-cinema.js');
test('cinematic pools stay bounded, skip pollen in storms and restore visibility after reflections',()=>{
 const scene=new T.Scene(),fx=createHighCinema({scene,waterHeight:()=>.1}),boat=new T.Vector3(),camera=new T.PerspectiveCamera();
 const climate={groundHeight:()=>.2,wind:{x:.6,z:.8,strength:.4}};fx.setEnabled(true);fx.setDetail({particles:36});
 for(let i=0;i<100;i++)fx.update(i,.016,boat,camera,climate);
 const objects=[];scene.traverse(o=>objects.push(o.uuid));assert.equal(fx.getStats().particles,36);assert.equal(fx.getStats().leaves,9);
 fx.setLighting(3);fx.update(101,.016,boat,camera,climate);assert.equal(fx.getStats().particles,0);
 fx.beginReflection();assert.equal(scene.children[0].visible,false);fx.endReflection();assert.equal(scene.children[0].visible,true);
 const after=[];scene.traverse(o=>after.push(o.uuid));assert.deepEqual(after,objects);fx.setEnabled(false);assert.equal(scene.children[0].visible,false);fx.dispose();assert.equal(scene.children.length,0);
});
