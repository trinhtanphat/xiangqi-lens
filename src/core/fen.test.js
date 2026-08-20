import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFen, serializeFen, START_FEN } from './fen.js';
import { countPieces } from './board.js';

test('FEN round trip preserves the canonical starting position', () => {
  const { board, sideToMove } = parseFen(START_FEN);
  assert.equal(serializeFen(board, sideToMove), START_FEN);
});

test('starting FEN contains 16 pieces per side', () => {
  const { board } = parseFen(START_FEN);
  assert.deepEqual(countPieces(board), { red: 16, black: 16 });
});

test('invalid FEN is rejected', () => {
  assert.throws(() => parseFen('9/9/9 w'), /10 ranks/);
  assert.throws(() => parseFen('9/9/9/9/9/9/9/9/9/91 w'), /9 files/);
});
