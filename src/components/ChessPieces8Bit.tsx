/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChessPieceType, ChessColor } from '../types';

// Let's design 12x12 pixel grids for each piece type.
// '.' = empty, 'X' = primary fill, 'O' = outline / inset details.
const PIECES_PIXELS: Record<ChessPieceType, string[]> = {
  p: [
    "....OOOO....",
    "...OXXXXO...",
    "..OXXXXXXO..",
    "..OXXOOXXO..",
    "...OXXXXO...",
    "...OXXXXO...",
    "..OXXXXXXO..",
    ".OXXXXXXXXO.",
    "OXXXXXXXXXXO",
    "OOOOOOOOOOOO",
  ],
  r: [
    ".OO.OO.OO.O.",
    "OXXOXXOXXOXO",
    "OXXXXXXXXXXO",
    ".OXXXXXXXXO.",
    "..OXXXXXXO..",
    "..OXXXXXXO..",
    "..OXXXXXXO..",
    ".OXXXXXXXXO.",
    "OXXXXXXXXXXO",
    "OOOOOOOOOOOO",
  ],
  n: [
    "....OOOOO...",
    "...OXXXXXO..",
    "..OXXOOXXXO.",
    ".OXXO.OXXXXO",
    ".OXXXOOOOXXO",
    "..OXO...OXXO",
    "...O...OXXO.",
    "......OXXXXO",
    ".....OXXXXXO",
    ".....OOOOOOO",
  ],
  b: [
    ".....OO.....",
    "....OXXO....",
    "...OXXXXO...",
    "..OXXOOXXO..",
    "..OXXXXXXO..",
    "...OXXXXO...",
    "..OXXXXXXO..",
    ".OXXXXXXXXO.",
    "OXXXXXXXXXXO",
    "OOOOOOOOOOOO",
  ],
  q: [
    ".O...O...O..",
    "OXO.OXO.OXO.",
    "OXXXXXXXXXXO",
    "OXXOOXXOOXXO",
    ".OXXXXXXXXO.",
    "..OXXXXXXO..",
    "..OXXXXXXO..",
    ".OXXXXXXXXO.",
    "OXXXXXXXXXXO",
    "OOOOOOOOOOOO",
  ],
  k: [
    ".....OO.....",
    "....OXXO....",
    "..OOOOOOOO..",
    ".OXXXXXXXXO.",
    ".OXXOOXXOOO.",
    "..OXXXXXXO..",
    "..OXXXXXXO..",
    ".OXXXXXXXXO.",
    "OXXXXXXXXXXO",
    "OOOOOOOOOOOO",
  ],
};

interface ChessPiece8BitProps {
  type: ChessPieceType;
  color: ChessColor;
  size?: number;
}

export const ChessPiece8Bit: React.FC<ChessPiece8BitProps> = ({
  type,
  color,
  size = 48,
}) => {
  const pixelData = PIECES_PIXELS[type] || PIECES_PIXELS.p;
  
  // Retro, high-contrast palette pairing:
  // White pieces: White Ivory fill (#FFFFFF) with dark charcoal outline (#111111).
  // Black pieces: Glowing retro amber (#F59E0B) or hot cyber-purple (#EC4899) or deep dark obsidian (#1F2937),
  // with a bright white outline (#FFFFFF) or cyber blue (#06B6D4) so they POP on both chess squares!
  // Let's use ultra-authentic NES colors:
  // White pieces = Creamy White fills, Obsidian outlines.
  // Black pieces = Obsidian / Charcoal black fills, Creamy White outlines and details inside!
  
  // O = Outline/Contour color
  // X = Primary Fill color
  const outlineColor = color === 'w' ? '#0D0d0D' : '#F5F5FA';
  const fillColor = color === 'w' ? '#FBFBFA' : '#2A2A35';
  const accentColor = color === 'w' ? '#92929B' : '#E0E0E5'; // internal details ('O' inside piece)

  const rowsCount = pixelData.length;
  const colsCount = pixelData[0].length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${colsCount} ${rowsCount}`}
      style={{ imageRendering: 'pixelated' }}
      className="select-none pointer-events-none transition-transform duration-200"
      aria-label={`${color === 'w' ? 'White' : 'Black'} ${type}`}
    >
      {pixelData.map((rowText, rIndex) => {
        return rowText.split('').map((char, cIndex) => {
          if (char === '.') return null;

          // Determine color for this pixel
          let pixelColor = fillColor;
          if (char === 'O') {
            // Is it a boundary outline or an inner pixel?
            // If it's on any edge of the drawing or adjacent to empty space '.', it's outlineColor.
            // Under simpler rules, we use outlineColor for O!
            pixelColor = outlineColor;
          }

          return (
            <rect
              key={`${rIndex}-${cIndex}`}
              x={cIndex}
              y={rIndex}
              width={1.05} // slight overlap to prevent physical gaps in subpixel rendering
              height={1.05}
              fill={pixelColor}
            />
          );
        });
      })}
    </svg>
  );
};
