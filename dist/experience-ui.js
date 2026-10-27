import {firstVisit,rememberHelp,shouldFade} from './experience-policy.js';
export function installExperienceUI({state,openDialog,setMode,toggleAudio,isInteracting=()=>false}){
  const $=id=>document.getElementById(id),body=document.body;
  let lastActivity=performance.now(),toastTimer,storage;try{storage=localStorage;}catch{}
  const touch=matchMedia('(pointer:coarse), (max-width:700px), (max-width:900px) and (max-height:500px)'),motion=matchMedia('(prefers-reduced-motion:reduce)');
  function modality(){body.classList.toggle('touch-ui',touch.matches);body.classList.toggle('reduce-motion',motion.matches);$('scene').setAttribute('aria-label',touch.matches?'3D riverboat. Use the touch arrows to move and steer. Drag to look and pinch to zoom.':'3D riverboat. W and S move, A and D steer. R switches rowing. Space rows or slows the boat.');}
  modality();touch.addEventListener('change',modality);motion.addEventListener('change',modality);
  function wake(){lastActivity=performance.now();body.classList.remove('hud-idle');}
  for(const type of ['pointermove','pointerdown','keydown','wheel'])addEventListener(type,wake,{passive:true});
  setInterval(()=>body.classList.toggle('hud-idle',shouldFade(performance.now(),lastActivity,{dialog:!!document.querySelector('dialog[open]'),menu:!$('more-panel').hidden,focused:!!document.activeElement?.closest('.ui'),moving:state.cruise||isInteracting()})),500);
  $('quick-help').onclick=()=>openDialog('help-dialog');
  $('start-exploring').onclick=()=>$('help-dialog').close();
  $('help-dialog').addEventListener('close',()=>{rememberHelp(storage);wake();});
  $('motor-choice').onclick=()=>setMode('motor');$('row-choice').onclick=()=>setMode('row');
  $('sound-hint').onclick=toggleAudio;
  // Review fixtures explicitly opt out of onboarding; normal visits always get it.
  if(!document.documentElement.hasAttribute('data-review')&&firstVisit(storage))setTimeout(()=>{if(!document.querySelector('dialog[open]'))openDialog('help-dialog');},900);
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
