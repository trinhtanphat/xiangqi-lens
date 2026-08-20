import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiHandler } from './http.js';
import { START_FEN } from '../core/fen.js';

function req(path, init={}) { return new Request(`https://x.test${path}`, init); }

test('health reports worker and AI capability', async () => {
  const h=createApiHandler({aiRunner:null,buildId:'test-build'});
  const r=await h(req('/api/health'));
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true,service:'xiangqi-lens',buildId:'test-build',ai:false});
});

test('recognize rejects non POST and malformed payload', async () => {
  const h=createApiHandler({aiRunner:{recognize:async()=>({})}});
  assert.equal((await h(req('/api/recognize'))).status,405);
  const r=await h(req('/api/recognize',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
  assert.equal(r.status,400);
});

test('recognize rejects oversized data URL before AI call', async () => {
  let called=false;
  const h=createApiHandler({aiRunner:{recognize:async()=>{called=true;}} ,maxImageChars:100});
  const r=await h(req('/api/recognize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl:'data:image/jpeg;base64,'+'x'.repeat(101)})}));
  assert.equal(r.status,413); assert.equal(called,false);
});

test('recognize returns 503 when AI binding is unavailable', async () => {
  const h=createApiHandler({aiRunner:null});
  const r=await h(req('/api/recognize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl:'data:image/jpeg;base64,abc'})}));
  assert.equal(r.status,503);
});

test('recognize normalizes successful AI response through strict schema', async () => {
  const h=createApiHandler({aiRunner:{recognize:async()=>({fen:START_FEN,sideToMove:'red',confidence:.88,orientation:'red-bottom'})}});
  const r=await h(req('/api/recognize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({imageDataUrl:'data:image/jpeg;base64,abc'})}));
  assert.equal(r.status,200);
  const data=await r.json(); assert.equal(data.candidate.fen,START_FEN); assert.equal(data.candidate.confidence,.88);
});
