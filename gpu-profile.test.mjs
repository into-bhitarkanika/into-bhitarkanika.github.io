import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGPUProfile} from './dist/gpu-profile.js';

function fixture(options={}){
  const extension={TIME_ELAPSED_EXT:35007,GPU_DISJOINT_EXT:36795};
  const records=[],deleted=[],reads=[];let active=null,disjoint=false,lost=false,supported=true;
  const gl={QUERY_RESULT_AVAILABLE:34919,QUERY_RESULT:34918,CURRENT_QUERY:34917,
    getExtension(name){assert.equal(name,'EXT_disjoint_timer_query_webgl2');return supported?extension:null;},
    isContextLost(){return lost;},
    getParameter(name){assert.equal(name,extension.GPU_DISJOINT_EXT);return disjoint;},
    createQuery(){const query={id:records.length,ready:false,nanoseconds:0};records.push(query);return query;},
    deleteQuery(query){assert.ok(!deleted.includes(query),'queries must be released once');deleted.push(query);},
    beginQuery(target,query){assert.equal(target,extension.TIME_ELAPSED_EXT);assert.equal(active,null);active=query;},
    endQuery(target){assert.equal(target,extension.TIME_ELAPSED_EXT);assert.ok(active);active=null;},
    getQuery(target,pname){assert.equal(target,extension.TIME_ELAPSED_EXT);assert.equal(pname,gl.CURRENT_QUERY);return active;},
    getQueryParameter(query,pname){
      if(pname===gl.QUERY_RESULT_AVAILABLE)return query.ready;
      assert.equal(pname,gl.QUERY_RESULT);assert.equal(query.ready,true,'pending results cannot be synchronously read');reads.push(query);return query.nanoseconds;
    },
    finish(){assert.fail('GPU profiling cannot synchronously wait');},
    flush(){assert.fail('profiling must not change normal frame submission');},
    clientWaitSync(){assert.fail('GPU profiling cannot synchronously wait');}
  };
  const renderer={getContext:()=>gl},profile=createGPUProfile(renderer,options);
  return {gl,renderer,profile,records,deleted,reads,
    frame(){const started=profile.begin();profile.end();return started;},
    ready(ms=8){for(const query of records){query.ready=true;query.nanoseconds=ms*1e6;}},
    disjoint(value){disjoint=value;},lost(value){lost=value;if(value)active=null;},supported(value){supported=value;},
    external(value){active=value;}
  };
}

test('GPU query results are read only on later frames after availability and reported in milliseconds',()=>{
  const f=fixture();assert.equal(f.profile.getStats().available,false);
  assert.equal(f.frame(),true);assert.equal(f.reads.length,0);assert.equal(f.records.length,1);
  for(let i=0;i<7;i++){f.frame();assert.equal(f.reads.length,0);}
  f.ready(12.75);assert.equal(f.frame(),false);
  const stats=f.profile.getStats();assert.equal(stats.averageMs,12.75);assert.equal(stats.p95Ms,12.75);assert.equal(stats.samples,1);assert.equal(stats.pending,0);assert.equal(stats.available,true);assert.equal(stats.reason,null);
  assert.equal(f.reads.length,1);assert.match(stats.timing,/GPU/);
  f.profile.dispose();assert.equal(f.deleted.length,1);
});

test('default cadence samples one frame in thirty and reuses query objects',()=>{
  const f=fixture();let starts=0;
  for(let i=0;i<91;i++){starts+=Number(f.frame());f.ready(4);}
  assert.equal(starts,4);assert.equal(f.records.length,1);assert.equal(f.profile.getStats().samples,3);
  f.profile.dispose();
});

test('a slow GPU keeps no more than four pending queries and rendering never waits for it',()=>{
  const f=fixture({sampleEvery:1});
  for(let i=0;i<100;i++)f.frame();
  assert.equal(f.records.length,4);assert.equal(f.profile.getStats().pending,4);assert.equal(f.profile.getStats().skipped,96);assert.equal(f.reads.length,0);
  f.ready(19);f.frame();assert.equal(f.profile.getStats().samples,4);assert.equal(f.records.length,4,'completed queries are reused');
  f.profile.dispose();assert.equal(f.deleted.length,4);
});

test('disjoint events invalidate pending results and statistics, then sampling can recover',()=>{
  const f=fixture({sampleEvery:1});f.frame();f.ready(6);f.frame();
  assert.equal(f.profile.getStats().samples,1);f.disjoint(true);f.ready(9000);assert.equal(f.frame(),false);
  assert.equal(f.profile.getStats().samples,0);assert.equal(f.profile.getStats().averageMs,null);assert.match(f.profile.getStats().reason,/disjoint/);assert.equal(f.reads.length,1);assert.equal(f.deleted.length,1);
  assert.equal(f.frame(),false);f.disjoint(false);assert.equal(f.frame(),true);f.ready(7.25);f.frame();
  assert.equal(f.profile.getStats().averageMs,7.25);assert.equal(f.profile.getStats().samples,1);f.profile.dispose();
});

test('context loss invalidates handles without GL reads and rebind obtains a fresh context',()=>{
  const f=fixture();f.frame();f.lost(true);f.profile.contextLost();
  assert.equal(f.frame(),false);assert.equal(f.profile.getStats().samples,0);assert.match(f.profile.getStats().reason,/context lost/);assert.equal(f.deleted.length,0);
  const replacement=fixture();replacement.profile.dispose();f.renderer.getContext=()=>replacement.gl;
  f.profile.rebind();assert.equal(f.frame(),true);replacement.ready(11);f.frame();assert.equal(f.profile.getStats().averageMs,11);assert.equal(replacement.records.length,1);
  f.profile.dispose();assert.equal(replacement.deleted.length,1);assert.equal(f.deleted.length,0);
});

test('reset and dispose close an active query and delete all owned resources exactly once',()=>{
  const f=fixture({sampleEvery:1});f.frame();assert.equal(f.profile.begin(),true);
  f.profile.reset();assert.equal(f.deleted.length,2);assert.equal(f.profile.getStats().pending,0);f.profile.end();
  assert.equal(f.profile.begin(),true);f.profile.dispose();assert.equal(f.deleted.length,3);f.profile.end();f.profile.dispose();f.profile.rebind();assert.equal(f.frame(),false);assert.equal(f.deleted.length,3);assert.match(f.profile.getStats().reason,/disposed/);
});

test('rolling GPU timing statistics retain the requested window and do not absorb external queries',()=>{
  const f=fixture({sampleEvery:1,windowSize:4});
  for(let i=1;i<=8;i++){f.frame();f.ready(i);}
  f.external({id:'another-profiler'});assert.equal(f.frame(),false);
  const stats=f.profile.getStats();assert.equal(stats.samples,4);assert.equal(stats.averageMs,6.5);assert.equal(stats.p95Ms,8);assert.equal(stats.skipped,1);
  f.external(null);f.profile.dispose();
});

test('unsupported contexts provide explicit unavailable results rather than invented GPU time',()=>{
  const f=fixture();f.supported(false);f.profile.rebind();
  assert.equal(f.frame(),false);assert.equal(f.records.length,0);assert.equal(f.profile.getStats().supported,false);assert.equal(f.profile.getStats().averageMs,null);assert.match(f.profile.getStats().reason,/EXT_disjoint_timer_query_webgl2 unavailable/);
  const missing=createGPUProfile({getContext:()=>({})});assert.equal(missing.begin(),false);assert.match(missing.getStats().reason,/WebGL 2/);missing.dispose();f.profile.dispose();
});
