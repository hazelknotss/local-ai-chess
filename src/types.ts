/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppSettings {
  lmStudioUrl: string;
  modelName: string;
  connectionMode: 'direct' | 'proxy';
  fallbackToRandom: boolean;
  engineDelayMs: number;
  showThoughtProcess: boolean;
  persistMoveHistory?: boolean;
}

export interface GameLogEntry {
  id: string;
  timestamp: string;
  type: 'player' | 'ai' | 'system' | 'error' | 'stdout';
  message: string;
  move?: string;
  thought?: string;
}

export interface CapturedPieces {
  p: number; // Pawns
  r: number; // Rooks
  n: number; // Knights
  b: number; // Bishops
  q: number; // Queens
}

export type ChessColor = 'w' | 'b';
export type ChessPieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

export interface PieceInfo {
  type: ChessPieceType;
  color: ChessColor;
}
