import { cloneBoard, inBounds, opposite, pieceSide } from './board.js';

function move(fromRank, fromFile, toRank, toFile, piece, captured = null) {
  return { from: { rank: fromRank, file: fromFile }, to: { rank: toRank, file: toFile }, piece, captured };
}

function canLand(board, side, rank, file) {
  return inBounds(rank, file) && pieceSide(board[rank][file]) !== side;
}

function palaceContains(side, rank, file) {
  if (file < 3 || file > 5) return false;
  return side === 'red' ? rank >= 7 && rank <= 9 : rank >= 0 && rank <= 2;
}

function pushIfLandable(moves, board, side, fr, ff, tr, tf, piece) {
  if (!canLand(board, side, tr, tf)) return;
  moves.push(move(fr, ff, tr, tf, piece, board[tr][tf]));
}

function addRookMoves(moves, board, side, rank, file, piece) {
  for (const [dr, df] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    let r = rank + dr, f = file + df;
    while (inBounds(r,f)) {
      const target = board[r][f];
      if (!target) moves.push(move(rank,file,r,f,piece));
      else {
        if (pieceSide(target) !== side) moves.push(move(rank,file,r,f,piece,target));
        break;
      }
      r += dr; f += df;
    }
  }
}

function addCannonMoves(moves, board, side, rank, file, piece) {
  for (const [dr, df] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    let r = rank + dr, f = file + df, screened = false;
    while (inBounds(r,f)) {
      const target = board[r][f];
      if (!screened) {
        if (!target) moves.push(move(rank,file,r,f,piece));
        else screened = true;
      } else if (target) {
        if (pieceSide(target) !== side) moves.push(move(rank,file,r,f,piece,target));
        break;
      }
      r += dr; f += df;
    }
  }
}

function addHorseMoves(moves, board, side, rank, file, piece) {
  const specs = [
    [-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],
    [-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]
  ];
  for (const [dr,df,lr,lf] of specs) {
    const legR = rank + lr, legF = file + lf;
    if (!inBounds(legR,legF) || board[legR][legF]) continue;
    pushIfLandable(moves, board, side, rank,file,rank+dr,file+df,piece);
  }
}

function addElephantMoves(moves, board, side, rank, file, piece) {
  for (const [dr,df] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
    const tr = rank + dr, tf = file + df;
    if (!inBounds(tr,tf)) continue;
    if (side === 'red' && tr < 5) continue;
    if (side === 'black' && tr > 4) continue;
    if (board[rank + dr/2][file + df/2]) continue;
    pushIfLandable(moves,board,side,rank,file,tr,tf,piece);
  }
}

function addAdvisorMoves(moves, board, side, rank, file, piece) {
  for (const [dr,df] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const tr = rank+dr, tf=file+df;
    if (palaceContains(side,tr,tf)) pushIfLandable(moves,board,side,rank,file,tr,tf,piece);
  }
}

function addKingMoves(moves, board, side, rank, file, piece) {
  for (const [dr,df] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const tr=rank+dr, tf=file+df;
    if (palaceContains(side,tr,tf)) pushIfLandable(moves,board,side,rank,file,tr,tf,piece);
  }
  // Flying general attack/capture line, useful for check detection.
  const step = side === 'red' ? -1 : 1;
  for (let r = rank + step; inBounds(r,file); r += step) {
    const target = board[r][file];
    if (!target) continue;
    if ((side === 'red' && target === 'k') || (side === 'black' && target === 'K')) {
      moves.push(move(rank,file,r,file,piece,target));
    }
    break;
  }
}

function addPawnMoves(moves, board, side, rank, file, piece) {
  const forward = side === 'red' ? -1 : 1;
  pushIfLandable(moves,board,side,rank,file,rank+forward,file,piece);
  const crossed = side === 'red' ? rank <= 4 : rank >= 5;
  if (crossed) {
    pushIfLandable(moves,board,side,rank,file,rank,file-1,piece);
    pushIfLandable(moves,board,side,rank,file,rank,file+1,piece);
  }
}

export function generatePseudoLegalMoves(board, side) {
  const moves = [];
  for (let rank=0; rank<10; rank += 1) {
    for (let file=0; file<9; file += 1) {
      const piece = board[rank][file];
      if (!piece || pieceSide(piece) !== side) continue;
      switch (piece.toLowerCase()) {
        case 'r': addRookMoves(moves,board,side,rank,file,piece); break;
        case 'c': addCannonMoves(moves,board,side,rank,file,piece); break;
        case 'n': addHorseMoves(moves,board,side,rank,file,piece); break;
        case 'b': addElephantMoves(moves,board,side,rank,file,piece); break;
        case 'a': addAdvisorMoves(moves,board,side,rank,file,piece); break;
        case 'k': addKingMoves(moves,board,side,rank,file,piece); break;
        case 'p': addPawnMoves(moves,board,side,rank,file,piece); break;
      }
    }
  }
  return moves;
}

export function applyMove(board, m) {
  const next = cloneBoard(board);
  next[m.to.rank][m.to.file] = next[m.from.rank][m.from.file];
  next[m.from.rank][m.from.file] = null;
  return next;
}

export function findKing(board, side) {
  const target = side === 'red' ? 'K' : 'k';
  for (let rank=0; rank<10; rank += 1) for (let file=0; file<9; file += 1) {
    if (board[rank][file] === target) return {rank,file};
  }
  return null;
}

export function isInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true;
  const enemyMoves = generatePseudoLegalMoves(board, opposite(side));
  return enemyMoves.some(m => m.to.rank === king.rank && m.to.file === king.file);
}

export function generateLegalMoves(board, side) {
  return generatePseudoLegalMoves(board, side).filter(m => {
    if (m.captured && m.captured.toLowerCase() === 'k') return false;
    const next = applyMove(board,m);
    return !isInCheck(next, side);
  });
}

export function moveToIccs(m) {
  const fileChar = (file) => String.fromCharCode(97 + file);
  const rankChar = (rank) => String(9 - rank);
  return `${fileChar(m.from.file)}${rankChar(m.from.rank)}${fileChar(m.to.file)}${rankChar(m.to.rank)}`;
}
