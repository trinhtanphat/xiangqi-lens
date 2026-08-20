import { createEmptyBoard } from './board.js';

export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

const ALIASES = new Map([
  ['h', 'n'], ['H', 'N'], ['e', 'b'], ['E', 'B']
]);
const PIECES = new Set('kabnrcpKABNRCP'.split(''));

export function parseFen(fen) {
  if (typeof fen !== 'string' || !fen.trim()) throw new Error('FEN must be a non-empty string');
  const [placement, turn = 'w'] = fen.trim().split(/\s+/);
  const ranks = placement.split('/');
  if (ranks.length !== 10) throw new Error('FEN must contain 10 ranks');
  const board = createEmptyBoard();
  for (let rank = 0; rank < 10; rank += 1) {
    let file = 0;
    for (const token of ranks[rank]) {
      if (/\d/.test(token)) {
        const n = Number(token);
        if (n < 1 || n > 9) throw new Error('FEN rank contains invalid empty count');
        file += n;
        continue;
      }
      const piece = ALIASES.get(token) || token;
      if (!PIECES.has(piece)) throw new Error(`FEN contains invalid piece: ${token}`);
      if (file >= 9) throw new Error('FEN rank must contain 9 files');
      board[rank][file] = piece;
      file += 1;
    }
    if (file !== 9) throw new Error('FEN rank must contain 9 files');
  }
  const sideToMove = turn === 'b' ? 'black' : 'red';
  return { board, sideToMove };
}

export function serializePlacement(board) {
  return board.map((rank) => {
    let out = '';
    let empty = 0;
    for (const piece of rank) {
      if (!piece) {
        empty += 1;
      } else {
        if (empty) out += String(empty);
        out += piece;
        empty = 0;
      }
    }
    if (empty) out += String(empty);
    return out;
  }).join('/');
}

export function serializeFen(board, sideToMove = 'red') {
  return `${serializePlacement(board)} ${sideToMove === 'black' ? 'b' : 'w'}`;
}
