import {firstVisit,rememberHelp,shouldFade} from './experience-policy.js';
export function installExperienceUI({state,openDialog,setMode,toggleAudio}){
  const $=id=>document.getElementById(id),body=document.body;
  let lastActivity=performance.now(),toastTimer;
  const touch=matchMedia('(pointer:coarse), (max-width:700px), (max-width:900px) and (max-height:500px)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
  function modality(){body.classList.toggle('touch-ui',touch.matches);body.classList.toggle('reduce-motion',motion.matches);}
  modality();touch.addEventListener('change',modality);motion.addEventListener('change',modality);
  function wake(){lastActivity=performance.now();body.classList.remove('hud-idle');}
  for(const type of ['pointermove','pointerdown','keydown','wheel'])addEventListener(type,wake,{passive:true});
  setInterval(()=>body.classList.toggle('hud-idle',shouldFade(performance.now(),lastActivity,{dialog:!!document.querySelector('dialog[open]'),menu:!$('more-panel').hidden,focused:!!document.activeElement?.closest('.ui'),moving:state.cruise})),500);
  $('quick-help').onclick=()=>openDialog('help-dialog');
  $('start-exploring').onclick=()=>$('help-dialog').close();
  $('help-dialog').addEventListener('close',()=>{rememberHelp(localStorage);wake();});
  $('motor-choice').onclick=()=>setMode('motor');$('row-choice').onclick=()=>setMode('row');
  $('sound-hint').onclick=toggleAudio;
  // Review fixtures explicitly opt out of onboarding; normal visits always get it.
  if(!document.documentElement.hasAttribute('data-review')&&firstVisit(localStorage))setTimeout(()=>{if(!document.querySelector('dialog[open]'))openDialog('help-dialog');},900);
  const icons=['☀','≋','◒','☂','☾'];
  return {wake,reducedMotion:()=>motion.matches,
    toast(text){$('notice').textContent=text;$('notice').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('notice').classList.remove('visible'),2400);wake();},
    sync(){
      $('motor-choice').setAttribute('aria-pressed',String(state.mode==='motor'));$('row-choice').setAttribute('aria-pressed',String(state.mode==='row'));
      $('cluster-mode').textContent=state.mode==='row'?'Row':'Motor';
      $('light-icon').textContent=icons[state.timeIndex];
      $('time-button').setAttribute('aria-label','Lighting: '+$('time-label').textContent+'. Change lighting');
      $('camera-button').setAttribute('aria-label','Camera: '+$('camera-label').textContent+'. Change camera');
      $('sound-hint').hidden=state.sound;$('sound-button').dataset.muted=String(!state.sound);
      $('high-detail-row').hidden=state.graphics!=='high';
    }};
}
