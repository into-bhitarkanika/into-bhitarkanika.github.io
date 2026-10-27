// Pure policies shared by the interface, render scheduler and tests.
export const HELP_KEY='bhitar-controls-v2';
export function shouldFade(now,lastActivity,{dialog=false,menu=false,focused=false,moving=false}={}){
  return !dialog&&!menu&&!focused&&!moving&&now-lastActivity>4500;
}
export function firstVisit(storage){try{return storage.getItem(HELP_KEY)!=='seen';}catch{return true;}}
export function rememberHelp(storage){try{storage.setItem(HELP_KEY,'seen');}catch{}}
export function detailPolicy(value='auto',slow=false){
  const performance=value==='performance'||(value==='auto'&&slow);
  return {name:performance?'performance':'quality',reflectionEvery:performance?3:2,shadowEvery:performance?3:2,bloom:!performance,particles:performance?36:72,rain:performance?420:840};
}
export const GRADES=Object.freeze([
  {shadow:[.91,1.015,1.045],highlight:[1.065,1.018,.94],saturation:.90,contrast:1.035},
  {shadow:[.94,1.005,1.055],highlight:[.985,1.01,1.035],saturation:.76,contrast:1.02},
  {shadow:[.93,.96,1.10],highlight:[1.045,1.01,.98],saturation:.88,contrast:1.04},
  {shadow:[.92,1.025,1.05],highlight:[.97,1.015,1.03],saturation:.73,contrast:1.045},
  {shadow:[.94,.985,1.09],highlight:[.985,1.015,1.06],saturation:.78,contrast:1.025},
]);
export function gradeFor(index){return GRADES[index]??GRADES[0];}
// A bounded gust travels across the creek every 23 seconds; smooth at both ends.
export function gustAt(time,x=0,z=0){const phase=((time-x*.018-z*.012)%23+23)%23;return phase<6?Math.sin(phase*Math.PI/6)**2:0;}
export function particleCap(detail,preset){return preset===3?0:detailPolicy(detail).particles;}
