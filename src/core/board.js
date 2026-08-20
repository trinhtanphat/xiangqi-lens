export function createEmptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

export function cloneBoard(board) {
  return board.map((rank) => rank.slice());
}

export function pieceSide(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'red' : 'black';
}

export function opposite(side) {
  return side === 'red' ? 'black' : 'red';
}

export function countPieces(board) {
  let red = 0;
  let black = 0;
  for (const rank of board) {
    for (const piece of rank) {
      const side = pieceSide(piece);
      if (side === 'red') red += 1;
      if (side === 'black') black += 1;
    }
  }
  return { red, black };
}

export function stateKey(board, sideToMove) {
  return `${board.map((r) => r.map((p) => p || '.').join('')).join('/')}|${sideToMove}`;
}

export function inBounds(rank, file) {
  return rank >= 0 && rank < 10 && file >= 0 && file < 9;
}
