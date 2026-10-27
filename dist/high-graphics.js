import {createHighCinema} from './high-cinema.js';
import {gradeFor} from './experience-policy.js';
import {buildHighSky,getHighLighting,getNeutralLighting} from './high-sky.js';
import {buildHighForest} from './high-estuary.js';
import {createHighFauna} from './high-fauna.js';
import {createHighBoat} from './high-launch.js';
import {createHighAtmosphere} from './high-atmosphere.js';
import {createHighWeather} from './high-weather.js';
import {createHighPost} from './high-post.js';

export async function loadHighGraphics(context){
  const {onProgress=()=>{}}=context,parts=[];
  const current=()=>{if(context.isCurrent&&!context.isCurrent())throw new Error('Graphics preparation was interrupted.');};
  try{
    onProgress('Loading sky and natural light',.12);
    const sky=await buildHighSky({...context,onProgress:message=>onProgress(message,.2)});parts.push(sky);current();
    // Yield between geometry stages so loading status and cancel remain responsive.
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const forest=await buildHighForest({...context,onProgress:message=>onProgress(message,.45)});parts.push(forest);current();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const fauna=await createHighFauna({...context,onProgress:message=>onProgress(message,.72)});parts.push(fauna);current();
    const boat=await createHighBoat({...context,onProgress:message=>onProgress(message,.84)});parts.push(boat);current();
    const atmosphere=createHighAtmosphere(context);parts.push(atmosphere);
    const weather=createHighWeather({...context,canopyHeight:boat.canopyHeight});parts.push(weather);
    const post=createHighPost(context.renderer),cinema=createHighCinema(context);parts.push(cinema);
    let enabled=false,reducedMotion=false,climate=weather.getState(),lightingIndex=0;
    onProgress('Preparing reflections and materials',.94);
    return {
      setEnabled(value){enabled=value;for(const part of parts)part.setEnabled(value);},
      getLighting:getHighLighting,
      setNeutral(value){atmosphere.setNeutral(value);post.setLighting(value?getNeutralLighting():getHighLighting(lightingIndex));},
      setLighting(...args){lightingIndex=args[0];sky.setLighting(...args);atmosphere.setLighting(...args);weather.setLighting(args[0]);post.setLighting({...getHighLighting(args[0],args[1]),grade:gradeFor(args[0])});cinema.setLighting(args[0]);},
      advanceWeather(time,dt,boatPosition,camera){weather.update(time,dt,boatPosition,camera);climate=weather.getState();climate.waterHeight=context.waterHeight;climate.groundHeight=forest.groundHeight;sky.setWeather?.(climate);atmosphere.setWeather?.(climate);return climate;},
      getWeather(){return climate;},
      setSize(w,h){post.setSize(w,h);},
      setDetail(value){post.setDetail?.(value);weather.setDetail?.(value);cinema.setDetail(value);},
      setCinematic(value){post.setCinematic?.(value);},
      setReducedMotion(value){reducedMotion=Boolean(value);cinema.setReducedMotion(value);},
      setEffects(value){for(const key of ['particles','leaves','banks'])if(key in value)cinema.flags[key]=Boolean(value[key]);if('grade' in value)post.setArtEnabled(value.grade);},
      beginMainRender(camera){if(enabled)forest.beginMainRender?.({camera});},
      endMainRender(){forest.endMainRender?.();},
      render(scene,camera,direction,profile){
        if(!enabled){context.renderer.render(scene,camera);return;}
        forest.beginMainRender?.({camera});
        try{post.render(scene,camera,direction,profile);}finally{forest.endMainRender?.();}
      },
      beginReflection(context){cinema.beginReflection();forest.beginReflection?.(context);fauna.beginReflection?.();boat.beginReflection?.();weather.beginReflection?.();},
      endReflection(){cinema.endReflection();weather.endReflection?.();boat.endReflection?.();fauna.endReflection?.();forest.endReflection?.();},
      update(time,dt,boatPosition,camera){const visualTime=reducedMotion?0:time;sky.update(visualTime,camera);forest.update(visualTime,boatPosition,climate);fauna.update(time,dt,climate);boat.update?.(visualTime,dt,climate);atmosphere.update(visualTime,camera);cinema.update(time,dt,boatPosition,camera,climate);},
      getStats(){return {forest:forest.getStats?.(),fauna:fauna.getStats?.(),sky:sky.getStats?.(),boat:boat.getStats?.(),post:post.getStats?.(),cinema:cinema.getStats(),weather:weather.getStats()};},
      dispose(){post.dispose();for(const part of [...parts].reverse()){part.setEnabled(false);part.dispose?.();}}
    };
  }catch(error){for(const part of parts.reverse()){part.setEnabled(false);part.dispose?.();}throw error;}
}
