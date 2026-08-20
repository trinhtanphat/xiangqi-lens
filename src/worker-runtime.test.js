import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker-runtime.js';

const basic=(username,password)=>`Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

test('worker serves health and embedded static assets', async()=>{
  globalThis.__XIANGQI_ASSETS__={'/':{body:'<h1>XiangqiLens</h1>',type:'text/html; charset=utf-8'},'/app.js':{body:'console.log(1)',type:'text/javascript; charset=utf-8'}};
  const health=await worker.fetch(new Request('https://x.test/api/health'),{BUILD_ID:'unit'},{});
  assert.equal(health.status,200); const h=await health.json(); assert.equal(h.buildId,'unit'); assert.equal(h.ai,false);
  const home=await worker.fetch(new Request('https://x.test/'),{BUILD_ID:'unit'},{});
  assert.equal(home.status,200); assert.match(await home.text(),/XiangqiLens/);
});

test('admin API fails closed without credentials and challenges unauthenticated clients', async()=>{
  const env={BUILD_ID:'unit',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'correct-horse-battery-staple'};
  const res=await worker.fetch(new Request('https://x.test/api/admin/health'),env,{});
  assert.equal(res.status,401);
  assert.equal(res.headers.get('www-authenticate'),'Basic realm="XiangqiLens Admin", charset="UTF-8"');
  const body=await res.json();
  assert.equal(body.error,'unauthorized');
});

test('admin API accepts configured Basic credentials and rejects invalid passwords', async()=>{
  const env={BUILD_ID:'unit',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'correct-horse-battery-staple'};
  const ok=await worker.fetch(new Request('https://x.test/api/admin/health',{headers:{authorization:basic('admin','correct-horse-battery-staple')}}),env,{});
  assert.equal(ok.status,200);
  const payload=await ok.json();
  assert.equal(payload.ok,true);
  assert.equal(payload.role,'admin');
  assert.equal(payload.buildId,'unit');

  const bad=await worker.fetch(new Request('https://x.test/api/admin/health',{headers:{authorization:basic('admin','wrong')}}),env,{});
  assert.equal(bad.status,401);
});

test('admin page is protected and served only after authentication', async()=>{
  globalThis.__XIANGQI_ASSETS__={'/admin':{body:'<h1>XiangqiLens Admin</h1>',type:'text/html; charset=utf-8'}};
  const env={ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'correct-horse-battery-staple'};
  const denied=await worker.fetch(new Request('https://x.test/admin'),env,{});
  assert.equal(denied.status,401);
  const allowed=await worker.fetch(new Request('https://x.test/admin',{headers:{authorization:basic('admin','correct-horse-battery-staple')}}),env,{});
  assert.equal(allowed.status,200);
  assert.match(await allowed.text(),/XiangqiLens Admin/);
});
