import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBoard } from '../core/board.js';
import { generateLegalMoves, moveToIccs } from '../core/rules.js';
import { analyzePosition } from './search.js';

function tacticalBoard() {
  const b = createEmptyBoard();
  b[9][4] = 'K';
  b[0][3] = 'k';
  b[7][0] = 'R';
  b[3][0] = 'c';
  b[4][4] = 'P';
  return b;
}

test('engine prefers capturing a free high-value piece', () => {
  const lines = analyzePosition(tacticalBoard(), 'red', { depth: 2, multiPv: 3, maxNodes: 20000 });
  assert.equal(moveToIccs(lines[0].move), 'a2a6');
  assert.ok(lines[0].score > lines[1].score);
});

test('engine returns sorted top N legal moves only', () => {
  const board = tacticalBoard();
  const lines = analyzePosition(board, 'red', { depth: 2, multiPv: 3, maxNodes: 20000 });
  assert.equal(lines.length, 3);
  for (let i=1;i<lines.length;i++) assert.ok(lines[i-1].score >= lines[i].score);
  const legal = new Set(generateLegalMoves(board,'red').map(moveToIccs));
  for (const line of lines) {
    assert.equal(legal.has(moveToIccs(line.move)), true);
    assert.ok(Array.isArray(line.pv));
    assert.ok(line.nodes > 0);
  }
});

test('engine ordering is deterministic for identical input', () => {
  const a = analyzePosition(tacticalBoard(),'red',{depth:2,multiPv:4,maxNodes:20000});
  const b = analyzePosition(tacticalBoard(),'red',{depth:2,multiPv:4,maxNodes:20000});
  assert.deepEqual(a.map(x => [moveToIccs(x.move),x.score]), b.map(x => [moveToIccs(x.move),x.score]));
});
