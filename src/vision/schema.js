import { countPieces } from '../core/board.js';
import { parseFen, serializeFen } from '../core/fen.js';

function extractJsonText(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  return first >= 0 && last > first ? trimmed.slice(first,last+1) : trimmed;
}

export function parseVisionCandidate(input) {
  let value = input;
  if (typeof input === 'string') {
    try { value = JSON.parse(extractJsonText(input)); }
    catch { throw new Error('Vision response is not valid JSON'); }
  }
  if (!value || typeof value !== 'object') throw new Error('Vision response must be an object');
  const { fen, sideToMove, confidence, orientation = 'unknown', boardCorners = null, notes = '' } = value;
  if (typeof fen !== 'string') throw new Error('Vision response fen is required');
  if (sideToMove !== 'red' && sideToMove !== 'black') throw new Error('Vision response sideToMove is invalid');
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) throw new Error('Vision response confidence must be between 0 and 1');
  const parsed = parseFen(fen);
  const counts = countPieces(parsed.board);
  if (counts.red > 16 || counts.black > 16) throw new Error('Vision response has impossible piece count');
  let redKings = 0, blackKings = 0;
  for (const rank of parsed.board) for (const p of rank) {
    if (p === 'K') redKings += 1;
    if (p === 'k') blackKings += 1;
  }
  if (redKings !== 1 || blackKings !== 1) throw new Error('Vision response must contain exactly one king per side');
  if (boardCorners !== null) {
    if (!Array.isArray(boardCorners) || boardCorners.length !== 4 || boardCorners.some(p => !p || typeof p.x !== 'number' || typeof p.y !== 'number')) {
      throw new Error('Vision response boardCorners must contain four points');
    }
  }
  return {
    fen: serializeFen(parsed.board, sideToMove),
    sideToMove,
    confidence,
    orientation: typeof orientation === 'string' ? orientation : 'unknown',
    boardCorners,
    notes: typeof notes === 'string' ? notes : ''
  };
}
