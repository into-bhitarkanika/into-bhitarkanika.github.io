// Whole-frame GPU execution time, independent from CPU submission and display
// FPS. Results are polled on later animation frames; never finish/flush/wait.
// Spec: https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/
export function createGPUProfile(renderer,{sampleEvery=30,windowSize=60}={}){
  const interval=Math.max(1,Math.floor(sampleEvery)),limit=Math.max(1,Math.min(120,Math.floor(windowSize)));
  let gl=null,extension=null,active=null,pending=[],free=[],history=[],frame=0;
  let disposed=false,lost=false,reason=null,skipped=0,disjoint=false;
  const valid=()=>gl&&!lost&&!gl.isContextLost?.();
  function releaseQueries(){
    if(valid()){
      if(active)gl.endQuery(extension.TIME_ELAPSED_EXT);
      for(const query of [...pending,...free,...(active?[active]:[])])gl.deleteQuery(query);
    }
    active=null;pending=[];free=[];
  }
  function reset(){releaseQueries();history=[];frame=0;skipped=0;disjoint=false;}
  function contextLost(){lost=true;active=null;pending=[];free=[];history=[];reason='WebGL context lost';}
  function rebind(){
    if(disposed)return;
    releaseQueries();history=[];frame=0;skipped=0;disjoint=false;lost=false;
    gl=renderer.getContext?.()??null;
    if(!gl||typeof gl.createQuery!=='function'){extension=null;reason='WebGL 2 timer queries unavailable';return;}
    if(gl.isContextLost?.()){contextLost();return;}
    extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    reason=extension?null:'EXT_disjoint_timer_query_webgl2 unavailable';
  }
  function poll(){
    if(gl.getParameter(extension.GPU_DISJOINT_EXT)){
      releaseQueries();history=[];disjoint=true;reason='GPU timer disjoint; invalid samples discarded';return false;
    }
    disjoint=false;reason=null;
    // At most four queries can be pending. A result is requested only after
    // QUERY_RESULT_AVAILABLE succeeds, never in the frame that issued it.
    for(let i=0;i<pending.length;){
      const query=pending[i];
      if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){i++;continue;}
      const milliseconds=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
      pending.splice(i,1);free.push(query);
      if(Number.isFinite(milliseconds)&&milliseconds>=0){history.push(milliseconds);if(history.length>limit)history.shift();}
    }
    return true;
  }
  rebind();
  return {
    begin(){
      if(disposed||lost||!extension||active)return false;
      if(gl.isContextLost?.()){contextLost();return false;}
      const sample=frame++%interval===0;
      if((pending.length||sample||disjoint)&&!poll())return false;
      if(!sample)return false;
      if(pending.length>=4){skipped++;return false;}
      // Do not interfere with a developer's other active timer query.
      if(gl.getQuery?.(extension.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){skipped++;return false;}
      const query=free.pop()??gl.createQuery();
      if(!query){reason='GPU timer query allocation failed';skipped++;return false;}
      gl.beginQuery(extension.TIME_ELAPSED_EXT,query);active=query;return true;
    },
    end(){
      if(!active||disposed)return;
      if(!valid()){contextLost();return;}
      gl.endQuery(extension.TIME_ELAPSED_EXT);pending.push(active);active=null;
    },
    reset(){if(!disposed){reset();if(extension&&!lost)reason=null;}},
    contextLost,
    rebind,
    getStats(){
      const sorted=history.slice().sort((a,b)=>a-b),count=sorted.length;
      return {supported:Boolean(extension)&&!disposed,available:count>0&&!lost&&!disjoint&&!disposed,
        reason:disposed?'GPU profiler disposed':reason??(count?null:'Waiting for completed GPU samples'),
        timing:'Whole-frame GPU execution; sampled asynchronously',samples:count,
        averageMs:count?+(history.reduce((a,b)=>a+b,0)/count).toFixed(2):null,
        p95Ms:count?+sorted[Math.ceil(count*.95)-1].toFixed(2):null,
        pending:pending.length+(active?1:0),sampleEvery:interval,skipped};
    },
    dispose(){if(disposed)return;releaseQueries();history=[];disposed=true;reason='GPU profiler disposed';}
  };
}
