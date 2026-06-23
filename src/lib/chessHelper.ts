/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess, Square } from 'chess.js';
import { CapturedPieces, PieceInfo } from '../types';

// Values of each piece type to aid heuristic evaluation
export const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900,
};

// Map column index to letters
export const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Counts captured pieces for both White and Black.
 */
export function calculateCapturedPieces(chess: Chess): { w: CapturedPieces; b: CapturedPieces } {
  const initialCounts = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const currentCounts = {
    w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
    b: { p: 0, r: 0, n: 0, b: 0, q: 0 },
  };

  // Traversal of active pieces
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type !== 'k') {
        const type = piece.type as keyof CapturedPieces;
        const color = piece.color as 'w' | 'b';
        currentCounts[color][type]++;
      }
    }
  }

  // Captured pieces are initial count minus current count
  return {
    w: {
      p: Math.max(0, initialCounts.p - currentCounts.w.p),
      r: Math.max(0, initialCounts.r - currentCounts.w.r),
      n: Math.max(0, initialCounts.n - currentCounts.w.n),
      b: Math.max(0, initialCounts.b - currentCounts.b.b), // chess.js lists b as bishop
      q: Math.max(0, initialCounts.q - currentCounts.w.q),
    },
    b: {
      p: Math.max(0, initialCounts.p - currentCounts.b.p),
      r: Math.max(0, initialCounts.r - currentCounts.b.r),
      n: Math.max(0, initialCounts.n - currentCounts.b.n),
      b: Math.max(0, initialCounts.b - currentCounts.w.b),
      q: Math.max(0, initialCounts.q - currentCounts.b.q),
    },
  };
}

/**
 * Smart diagnostic/greedy computer chess move chooser.
 * Decides standard chess moves using chess piece capturing logic,
 * checkmate scanning, and target state evaluation.
 */
export function getSmartLocalMove(chess: Chess, chaoticFactor: number = 0.15, frozenSquares: string[] = []): string {
  let legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return '';

  // Filter out moves starting from frozen squares
  const nonFrozenMoves = legalMoves.filter((m) => !frozenSquares.includes(m.from));
  if (nonFrozenMoves.length > 0) {
    legalMoves = nonFrozenMoves;
  }

  // 1. Scan for immediate checkmates (Depth 1 checkmate)
  for (const move of legalMoves) {
    const tempChess = new Chess(chess.fen());
    tempChess.move(move.lan);
    if (tempChess.isCheckmate()) {
      return move.lan;
    }
  }

  // Rank other moves
  const ratedMoves = legalMoves.map((move) => {
    let score = 0;

    // A. Capture points (Heuristic)
    if (move.captured) {
      const capturedVal = PIECE_VALUES[move.captured] || 10;
      score += capturedVal * 15; // Higher priority for higher pieces
      
      // Captured by lower piece gets bonus
      const attackerVal = PIECE_VALUES[move.piece] || 10;
      if (attackerVal < capturedVal) {
        score += (capturedVal - attackerVal) * 5;
      }
    }

    // B. Promotion bonus
    if (move.promotion) {
      score += 80;
    }

    // C. Check opponent bonus
    const tempChess = new Chess(chess.fen());
    tempChess.move(move.lan);
    if (tempChess.inCheck()) {
      score += 15;
    }

    // D. Control center bonus (d4, d5, e4, e5 squares)
    const isCenterSquare = ['d4', 'd5', 'e4', 'e5'].includes(move.to);
    if (isCenterSquare) {
      score += 6;
    }

    // E. Castling is good for defensive alignment
    if (move.san.includes('O-O')) {
      score += 25;
    }

    // F. Avoid moving into immediately hanging squares if possible
    // (Check if opponent can capture at the target square on the next move)
    const opponentMoves = tempChess.moves({ verbose: true });
    const isTargetDefended = opponentMoves.some((oppMove) => oppMove.to === move.to);
    if (isTargetDefended) {
      const pieceVal = PIECE_VALUES[move.piece] || 10;
      score -= pieceVal * 12; // Deduct heavily if we move into danger
    }

    // Add tiny noise for gameplay variety (Chaotic factor)
    score += (Math.random() - 0.5) * chaoticFactor * 40;

    return { move: move.lan, score };
  });

  // Sort by score descending
  ratedMoves.sort((a, b) => b.score - a.score);

  return ratedMoves[0]?.move || legalMoves[0]?.lan;
}
