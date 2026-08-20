import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBoard } from './board.js';
import { generatePseudoLegalMoves, generateLegalMoves, isInCheck, applyMove } from './rules.js';

function baseBoard() {
  const b = createEmptyBoard();
  b[9][4] = 'K';
  b[0][4] = 'k';
  b[5][4] = 'P'; // prevent flying generals by default
  return b;
}

function hasMove(moves, fr, ff, tr, tf) {
  return moves.some(m => m.from.rank === fr && m.from.file === ff && m.to.rank === tr && m.to.file === tf);
}

test('rook slides orthogonally until blocked', () => {
  const b = baseBoard(); b[5][4] = 'R'; b[5][6] = 'P'; b[2][4] = 'p';
  const m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,5,4,5,5), true);
  assert.equal(hasMove(m,5,4,5,7), false);
  assert.equal(hasMove(m,5,4,2,4), true);
  assert.equal(hasMove(m,5,4,1,4), false);
});

test('cannon capture requires exactly one screen', () => {
  const b = baseBoard(); b[5][4] = null; b[4][4] = 'P'; b[5][0] = 'C'; b[5][2] = 'P'; b[5][5] = 'r';
  const m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,5,0,5,1), true);
  assert.equal(hasMove(m,5,0,5,5), true);
  b[5][3] = 'P';
  assert.equal(hasMove(generatePseudoLegalMoves(b,'red'),5,0,5,5), false);
});

test('horse leg blocking suppresses the two affected destinations', () => {
  const b = baseBoard(); b[5][4] = 'N'; b[4][4] = 'P';
  const m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,5,4,3,3), false);
  assert.equal(hasMove(m,5,4,3,5), false);
  assert.equal(hasMove(m,5,4,4,2), true);
});

test('red elephant cannot cross the river and needs clear eye', () => {
  const b = baseBoard(); b[9][2] = 'B';
  let m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,9,2,7,0), true);
  assert.equal(hasMove(m,9,2,7,4), true);
  b[8][3] = 'P';
  m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,9,2,7,4), false);
});

test('advisor and king remain inside palace', () => {
  const b = baseBoard(); b[9][3] = 'A';
  const m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,9,3,8,4), true);
  assert.equal(hasMove(m,9,3,8,2), false);
  const km = m.filter(x => x.piece === 'K');
  assert.equal(km.every(x => x.to.file >= 3 && x.to.file <= 5 && x.to.rank >= 7), true);
});

test('pawn gains sideways movement after crossing river', () => {
  const b = baseBoard(); b[5][4] = null; b[6][2] = 'P'; b[4][6] = 'P'; b[5][5] = 'P';
  const m = generatePseudoLegalMoves(b, 'red');
  assert.equal(hasMove(m,6,2,5,2), true);
  assert.equal(hasMove(m,6,2,6,1), false);
  assert.equal(hasMove(m,4,6,4,5), true);
  assert.equal(hasMove(m,4,6,3,6), true);
});

test('flying generals are detected as check', () => {
  const b = createEmptyBoard(); b[9][4] = 'K'; b[0][4] = 'k';
  assert.equal(isInCheck(b, 'red'), true);
  assert.equal(isInCheck(b, 'black'), true);
});

test('legal move filter rejects a move that exposes own king to rook', () => {
  const b = createEmptyBoard(); b[9][4] = 'K'; b[0][3] = 'k'; b[0][4] = 'r'; b[5][4] = 'R';
  const legal = generateLegalMoves(b, 'red');
  assert.equal(hasMove(legal,5,4,5,3), false);
  const blocking = legal.find(m => m.from.rank===5 && m.from.file===4 && m.to.rank===4 && m.to.file===4);
  assert.ok(blocking);
  assert.equal(isInCheck(applyMove(b, blocking), 'red'), false);
});
