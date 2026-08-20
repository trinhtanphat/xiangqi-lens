import { pieceSide } from '../core/board.js';

export const PIECE_VALUE = Object.freeze({ k: 100000, r: 900, c: 450, n: 400, b: 220, a: 220, p: 100 });

export function evaluateBoard(board, perspective) {
  let redScore = 0;
  for (let rank=0; rank<10; rank += 1) {
    for (let file=0; file<9; file += 1) {
      const piece = board[rank][file];
      if (!piece) continue;
      const side = pieceSide(piece);
      let value = PIECE_VALUE[piece.toLowerCase()] || 0;
      if (piece.toLowerCase() === 'p') {
        const crossed = side === 'red' ? rank <= 4 : rank >= 5;
        if (crossed) value += 35;
        value += Math.max(0, 4 - Math.abs(4-file)) * 3;
      }
      if (piece.toLowerCase() === 'r' || piece.toLowerCase() === 'c' || piece.toLowerCase() === 'n') {
        value += Math.max(0, 4 - Math.abs(4-file)) * 2;
      }
      redScore += side === 'red' ? value : -value;
    }
  }
  return perspective === 'red' ? redScore : -redScore;
}
