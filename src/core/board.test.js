import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBoard, cloneBoard, pieceSide, stateKey } from './board.js';

test('cloneBoard makes an independent board copy', () => {
  const board = createEmptyBoard();
  board[9][4] = 'K';
  const clone = cloneBoard(board);
  clone[9][4] = null;
  assert.equal(board[9][4], 'K');
});

test('pieceSide maps uppercase to red and lowercase to black', () => {
  assert.equal(pieceSide('R'), 'red');
  assert.equal(pieceSide('c'), 'black');
  assert.equal(pieceSide(null), null);
});

test('stateKey is deterministic', () => {
  const board = createEmptyBoard();
  board[9][4] = 'K';
  assert.equal(stateKey(board, 'red'), stateKey(cloneBoard(board), 'red'));
  assert.notEqual(stateKey(board, 'red'), stateKey(board, 'black'));
});
