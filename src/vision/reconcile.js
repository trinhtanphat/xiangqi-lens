import { opposite } from '../core/board.js';
import { serializePlacement } from '../core/fen.js';
import { applyMove, generateLegalMoves } from '../core/rules.js';

export function reconcileCandidate(previousBoard, candidateBoard, sideToMove) {
  const target = serializePlacement(candidateBoard);
  if (serializePlacement(previousBoard) === target) {
    return { status:'accepted', move:null, nextSide:sideToMove, reason:'unchanged', matches:[] };
  }
  const matches = [];
  for (const move of generateLegalMoves(previousBoard, sideToMove)) {
    const next = applyMove(previousBoard, move);
    if (serializePlacement(next) === target) matches.push(move);
  }
  if (matches.length === 1) return { status:'accepted', move:matches[0], nextSide:opposite(sideToMove), reason:'unique-legal-transition', matches };
  if (matches.length > 1) return { status:'ambiguous', move:null, nextSide:sideToMove, reason:'multiple-legal-transitions', matches };
  return { status:'rejected', move:null, nextSide:sideToMove, reason:'no-legal-transition', matches:[] };
}
