import * as T from 'three';

// The six crown assets are optimized offline from the credited coastal scan.
// Geometry is loaded, not regenerated into a procedural tree at runtime.
export async function loadPhotographicEstuary({resources,anisotropy=8,onProgress=()=>{}}){
  const base=new URL('./assets/high/estuary/',import.meta.url),loader=new T.TextureLoader();
  const names=['trunk-color.jpg','trunk-normal.jpg','trunk-arm.jpg','leaf-color.jpg','leaf-normal.jpg','leaf-arm.jpg','leaf-alpha.png','sediment-color.jpg','sediment-normal.jpg','sediment-roughness.jpg','sediment-ao.jpg'];
  const jobs=names.map(async name=>{
    const map=await loader.loadAsync(new URL(name,base).href);resources.add(map);map.anisotropy=Math.min(anisotropy,8);map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;
    if(name.includes('color'))map.colorSpace=T.SRGBColorSpace;
    if(!name.startsWith('sediment'))map.flipY=false;else map.wrapS=map.wrapT=T.RepeatWrapping;
    return [name,map];
  });
  const manifestJob=fetch(new URL('crowns.json',base)).then(async response=>{if(!response.ok)throw new Error('The photographic mangrove collection could not load.');return response.json();});
  const results=await Promise.allSettled([...jobs,manifestJob]);const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  const maps=Object.fromEntries(results.slice(0,-1).map(result=>result.value)),manifest=results.at(-1).value;
  const modelResults=await Promise.allSettled(manifest.models.map(async(spec,index)=>{
    const response=await fetch(new URL(spec.url,base));if(!response.ok)throw new Error('A mangrove model failed to load.');const buffer=await response.arrayBuffer();
    if(buffer.byteLength!==spec.bytes)throw new Error('A mangrove model download was incomplete.');
    const model={};for(const [name,attributes]of Object.entries(spec.geometries)){
      const geometry=new T.BufferGeometry();
      for(const [key,attribute]of Object.entries(attributes)){
        const data=key==='index'?new Uint32Array(buffer,attribute.offset,attribute.count):new Float32Array(buffer,attribute.offset,attribute.count);
        if(key==='index')geometry.setIndex(new T.BufferAttribute(data,1));else geometry.setAttribute(key,new T.BufferAttribute(data,attribute.itemSize));
      }
      geometry.computeBoundingSphere();geometry.userData.assetName=spec.name;geometry.userData.growthHabit=spec.name;resources.add(geometry);model[name]=geometry;
    }
    onProgress('Loading photographed crowns and bark',.12+index*.02);return model;
  }));
  const modelFailure=modelResults.find(result=>result.status==='rejected');if(modelFailure)throw modelFailure.reason;
  const reliefResponse=await fetch(new URL('sediment-relief.bin',base));if(!reliefResponse.ok)throw new Error('The scanned sediment relief could not load.');const relief=new Uint8Array(await reliefResponse.arrayBuffer());if(relief.length!==128*128)throw new Error('The scanned sediment relief was incomplete.');
  return {models:modelResults.map(result=>result.value),maps,relief,bytes:manifest.models.reduce((sum,model)=>sum+model.bytes,0)};
}
