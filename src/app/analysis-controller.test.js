import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisController } from './analysis-controller.js';
import { START_FEN, parseFen, serializeFen } from '../core/fen.js';
import { applyMove, generateLegalMoves, moveToIccs } from '../core/rules.js';

function nextFen(iccs){
  const {board,sideToMove}=parseFen(START_FEN);
  const m=generateLegalMoves(board,sideToMove).find(x=>moveToIccs(x)===iccs);
  return serializeFen(applyMove(board,m),'black');
}

test('unchanged frame hash skips recognition', async()=>{
  let calls=0;
  const c=new AnalysisController({recognizer:async()=>{calls++;return {fen:START_FEN,sideToMove:'red',confidence:.9};},engine:()=>[] ,hashFrame:async()=> 'same'});
  await c.analyzeFrame('frame1',0);
  const r=await c.analyzeFrame('frame2',1);
  assert.equal(r.status,'skipped'); assert.equal(calls,1);
});

test('unique legal transition advances trusted board state', async()=>{
  const candidates=[{fen:START_FEN,sideToMove:'red',confidence:.9},{fen:nextFen('a0a1'),sideToMove:'black',confidence:.9}];
  const c=new AnalysisController({recognizer:async()=>candidates.shift(),engine:()=>[],hashFrame:async f=>String(f)});
  await c.analyzeFrame('a',0);
  const r=await c.analyzeFrame('b',2);
  assert.equal(r.status,'accepted'); assert.equal(moveToIccs(r.move),'a0a1');
  assert.equal(c.sideToMove,'black');
});

test('illegal transition is rejected and does not replace trusted state', async()=>{
  const bad='1nbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/1NBAKABNR b';
  const candidates=[{fen:START_FEN,sideToMove:'red',confidence:.9},{fen:bad,sideToMove:'black',confidence:.9}];
  const c=new AnalysisController({recognizer:async()=>candidates.shift(),engine:()=>[],hashFrame:async f=>String(f)});
  await c.analyzeFrame('a',0); const before=c.fen;
  const r=await c.analyzeFrame('b',2);
  assert.equal(r.status,'rejected'); assert.equal(c.fen,before);
});

test('engine analysis is cached by board state and settings', async()=>{
  let engineCalls=0;
  const c=new AnalysisController({recognizer:async()=>({fen:START_FEN,sideToMove:'red',confidence:.9}),engine:()=>{engineCalls++;return [{score:1}]},hashFrame:async f=>String(f)});
  await c.analyzeFrame('a',0);
  await c.analyzeFrame('b',1); // same recognized state, different image hash
  assert.equal(engineCalls,1);
});
