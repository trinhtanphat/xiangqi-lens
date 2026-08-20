import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFen, serializeFen, START_FEN } from '../core/fen.js';
import { applyMove, generateLegalMoves, moveToIccs } from '../core/rules.js';
import { reconcileCandidate } from './reconcile.js';

test('reconcile accepts exactly one legal transition', () => {
  const {board,sideToMove}=parseFen(START_FEN);
  const move=generateLegalMoves(board,sideToMove).find(m=>moveToIccs(m)==='a0a1');
  assert.ok(move);
  const next=applyMove(board,move);
  const result=reconcileCandidate(board,next,sideToMove);
  assert.equal(result.status,'accepted');
  assert.equal(moveToIccs(result.move),'a0a1');
});

test('reconcile reports unchanged board without inventing a move', () => {
  const {board,sideToMove}=parseFen(START_FEN);
  const result=reconcileCandidate(board,board,sideToMove);
  assert.equal(result.status,'accepted');
  assert.equal(result.move,null);
  assert.equal(result.reason,'unchanged');
});

test('reconcile rejects a board that cannot follow by one legal move', () => {
  const {board,sideToMove}=parseFen(START_FEN);
  const bad=board.map(r=>r.slice());
  bad[9][0]=null; bad[0][0]=null;
  const result=reconcileCandidate(board,bad,sideToMove);
  assert.equal(result.status,'rejected');
});
