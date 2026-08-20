import { opposite } from '../core/board.js';
import { applyMove, generateLegalMoves, isInCheck, moveToIccs } from '../core/rules.js';
import { evaluateBoard, PIECE_VALUE } from './evaluate.js';

const MATE = 1_000_000;

function orderedMoves(board, side) {
  return generateLegalMoves(board,side).sort((a,b) => {
    const av = a.captured ? (PIECE_VALUE[a.captured.toLowerCase()] || 0) : 0;
    const bv = b.captured ? (PIECE_VALUE[b.captured.toLowerCase()] || 0) : 0;
    if (bv !== av) return bv-av;
    return moveToIccs(a).localeCompare(moveToIccs(b));
  });
}

function negamax(board, side, depth, alpha, beta, ctx, ply) {
  ctx.nodes += 1;
  if (ctx.nodes >= ctx.maxNodes || depth <= 0) return { score: evaluateBoard(board,side), pv: [] };
  const moves = orderedMoves(board,side);
  if (!moves.length) return { score: isInCheck(board,side) ? -MATE + ply : 0, pv: [] };
  let bestScore = -Infinity;
  let bestPv = [];
  for (const m of moves) {
    const child = negamax(applyMove(board,m), opposite(side), depth-1, -beta, -alpha, ctx, ply+1);
    const score = -child.score;
    if (score > bestScore) { bestScore = score; bestPv = [m, ...child.pv]; }
    if (score > alpha) alpha = score;
    if (alpha >= beta || ctx.nodes >= ctx.maxNodes) break;
  }
  return { score: bestScore, pv: bestPv };
}

export function analyzePosition(board, side, options = {}) {
  const depth = Math.max(1, Math.min(5, Number(options.depth || 2)));
  const multiPv = Math.max(1, Math.min(8, Number(options.multiPv || 3)));
  const maxNodes = Math.max(100, Number(options.maxNodes || 50000));
  const roots = orderedMoves(board,side);
  const lines = [];
  for (const m of roots) {
    const ctx = { nodes: 0, maxNodes };
    const child = negamax(applyMove(board,m), opposite(side), depth-1, -Infinity, Infinity, ctx, 1);
    lines.push({ move: m, score: -child.score, pv: [m, ...child.pv], depth, nodes: ctx.nodes });
  }
  lines.sort((a,b) => b.score-a.score || moveToIccs(a.move).localeCompare(moveToIccs(b.move)));
  return lines.slice(0,multiPv);
}
