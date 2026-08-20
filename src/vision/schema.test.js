import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVisionCandidate } from './schema.js';
import { START_FEN } from '../core/fen.js';

test('vision schema accepts valid candidate and normalizes defaults', () => {
  const x = parseVisionCandidate({ fen: START_FEN, sideToMove:'red', confidence:0.92, orientation:'red-bottom' });
  assert.equal(x.fen, START_FEN);
  assert.equal(x.confidence, 0.92);
  assert.equal(x.orientation, 'red-bottom');
});

test('vision schema rejects malformed JSON and impossible king counts', () => {
  assert.throws(() => parseVisionCandidate('{broken'), /JSON/);
  assert.throws(() => parseVisionCandidate({fen:'4k4/9/9/9/9/9/9/9/9/9 w',sideToMove:'red',confidence:.8}), /one king per side/);
});

test('vision schema clamps no values and rejects confidence outside range', () => {
  assert.throws(() => parseVisionCandidate({fen:START_FEN,sideToMove:'red',confidence:1.2}), /confidence/);
});
