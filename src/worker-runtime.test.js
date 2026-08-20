import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker-runtime.js';

test('worker serves health and embedded static assets', async()=>{
  globalThis.__XIANGQI_ASSETS__={'/':{body:'<h1>XiangqiLens</h1>',type:'text/html; charset=utf-8'},'/app.js':{body:'console.log(1)',type:'text/javascript; charset=utf-8'}};
  const health=await worker.fetch(new Request('https://x.test/api/health'),{BUILD_ID:'unit'},{});
  assert.equal(health.status,200); const h=await health.json(); assert.equal(h.buildId,'unit'); assert.equal(h.ai,false);
  const home=await worker.fetch(new Request('https://x.test/'),{BUILD_ID:'unit'},{});
  assert.equal(home.status,200); assert.match(await home.text(),/XiangqiLens/);
});
