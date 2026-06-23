/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { AppSettings, GameLogEntry, CapturedPieces } from './types';
import { sfx } from './lib/audio';
import { calculateCapturedPieces, getSmartLocalMove, COLS } from './lib/chessHelper';
import { ChessPiece8Bit } from './components/ChessPieces8Bit';
import { SettingsPanel } from './components/SettingsPanel';
import { GameTerminal } from './components/GameTerminal';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, RefreshCw, Cpu, BookOpen, Monitor, Play, Eye, EyeOff } from 'lucide-react';

function changeFenTurn(fen: string, targetColor: 'w' | 'b'): string {
  const parts = fen.split(' ');
  if (parts.length >= 2) {
    parts[1] = targetColor;
  }
  return parts.join(' ');
}

export default function App() {
  // --- STATE ---
  const [game, setGame] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedFen = localStorage.getItem('chess_8bit_fen');
        if (savedFen) {
          return new Chess(savedFen);
        }
      }
    } catch (e) {
      console.error('Failed to load saved FEN:', e);
    }
    return new Chess();
  });

  const [fen, setFen] = useState(() => game.fen());

  const [moveHistory, setMoveHistory] = useState<string[]>(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedHistory = localStorage.getItem('chess_8bit_move_history');
        if (savedHistory) {
          return JSON.parse(savedHistory);
        }
      }
    } catch (e) {
      console.error('Failed to load saved move History:', e);
    }
    return [];
  });

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validSquares, setValidSquares] = useState<Square[]>([]);

  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedLastMove = localStorage.getItem('chess_8bit_last_move');
        if (savedLastMove) {
          return JSON.parse(savedLastMove);
        }
      }
    } catch (e) {
      console.error('Failed to load saved last move:', e);
    }
    return null;
  });

  const [engineThinking, setEngineThinking] = useState(false);
  const [isCrtEnabled, setIsCrtEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Stats
  const [captured, setCaptured] = useState<{ w: CapturedPieces; b: CapturedPieces }>(() =>
    calculateCapturedPieces(game)
  );

  // Settings with localStorage backup
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('chess_8bit_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          lmStudioUrl: 'http://localhost:1234/v1',
          modelName: 'gemma-2-2b-it',
          connectionMode: 'direct',
          fallbackToRandom: true,
          engineDelayMs: 1200,
          showThoughtProcess: true,
          persistMoveHistory: true,
          ...parsed,
        };
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return {
      lmStudioUrl: 'http://localhost:1234/v1',
      modelName: 'gemma-2-2b-it',
      connectionMode: 'direct',
      fallbackToRandom: true,
      engineDelayMs: 1200,
      showThoughtProcess: true,
      persistMoveHistory: true,
    };
  });

  const [logs, setLogs] = useState<GameLogEntry[]>(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedLogs = localStorage.getItem('chess_8bit_logs');
        if (savedLogs) {
          return JSON.parse(savedLogs);
        }
      }
    } catch (e) {
      console.error('Failed to load saved stdout logs:', e);
    }
    return [];
  });

  const [activeRoutingError, setActiveRoutingError] = useState<string | null>(null);

  // --- RPG ADVENTURE MECHANICS ---
  const [mana, setMana] = useState<number>(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedMana = localStorage.getItem('chess_8bit_mana');
        if (savedMana !== null) {
          return parseInt(savedMana, 10);
        }
      }
    } catch (e) {
      console.error('Failed to load saved mana:', e);
    }
    return 40; // Default starts at 40
  });

  const [frozenPieces, setFrozenPieces] = useState<Record<Square, number>>(() => {
    try {
      const savedSettings = localStorage.getItem('chess_8bit_settings');
      let isPersist = true;
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.persistMoveHistory === false) {
          isPersist = false;
        }
      }
      if (isPersist) {
        const savedFrozen = localStorage.getItem('chess_8bit_frozen_pieces');
        if (savedFrozen) {
          return JSON.parse(savedFrozen);
        }
      }
    } catch (e) {
      console.error('Failed to load saved frozen pieces:', e);
    }
    return {};
  });

  const [activeSpell, setActiveSpell] = useState<'lightning' | 'freeze' | 'mutation' | null>(null);

  // Refs for tracking
  const stateRef = useRef({ fen, settings });
  useEffect(() => {
    stateRef.current = { fen, settings };
    localStorage.setItem('chess_8bit_settings', JSON.stringify(settings));
  }, [fen, settings]);

  // Persist game state history across sessions side-effect
  useEffect(() => {
    if (settings.persistMoveHistory) {
      localStorage.setItem('chess_8bit_fen', fen);
      localStorage.setItem('chess_8bit_move_history', JSON.stringify(moveHistory));
      localStorage.setItem('chess_8bit_last_move', lastMove ? JSON.stringify(lastMove) : '');
      localStorage.setItem('chess_8bit_logs', JSON.stringify(logs));
      localStorage.setItem('chess_8bit_mana', mana.toString());
      localStorage.setItem('chess_8bit_frozen_pieces', JSON.stringify(frozenPieces));
    } else {
      localStorage.removeItem('chess_8bit_fen');
      localStorage.removeItem('chess_8bit_move_history');
      localStorage.removeItem('chess_8bit_last_move');
      localStorage.removeItem('chess_8bit_logs');
      localStorage.removeItem('chess_8bit_mana');
      localStorage.removeItem('chess_8bit_frozen_pieces');
    }
  }, [settings.persistMoveHistory, fen, moveHistory, lastMove, logs, mana, frozenPieces]);

  // Initial welcome boot logs
  useEffect(() => {
    const isPersist = settings.persistMoveHistory !== false;
    const hasSavedLogs = isPersist && localStorage.getItem('chess_8bit_logs');
    if (hasSavedLogs) return;

    const timestamp = new Date().toLocaleTimeString();
    setLogs([
      {
        id: 'boot-1',
        timestamp,
        type: 'system',
        message: 'SYSTEM ONLINE: INITIALIZING RETRO CHESS MATRIX...',
      },
      {
        id: 'boot-2',
        timestamp,
        type: 'system',
        message: 'DRIVERS DETECTED: GEMMA-3 COGNITIVE CONTROLLER ATTACHED.',
      },
      {
        id: 'boot-3',
        timestamp,
        type: 'system',
        message: 'YOUR ARMOR: WHITE CHIPS (HUMAN PLAYER). READY FOR TURN 01.',
      },
    ]);
  }, []);

  // --- AUDIO HELPER ---
  const handleToggleMute = () => {
    const currentMute = sfx.toggleMute();
    setIsMuted(currentMute);
    sfx.playSelect();
  };

  // --- GAME LOGGING ---
  const addLog = (type: GameLogEntry['type'], message: string, thought?: string, move?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp,
        type,
        message,
        move,
        thought,
      },
    ]);
  };

  // --- GAME RESET ---
  const handleResetGame = () => {
    sfx.playMove();
    const newChess = new Chess();
    setGame(newChess);
    setFen(newChess.fen());
    setMoveHistory([]);
    setSelectedSquare(null);
    setValidSquares([]);
    setLastMove(null);
    setEngineThinking(false);
    setActiveRoutingError(null);
    setCaptured(calculateCapturedPieces(newChess));

    // Reset Wizard elements
    setMana(50);
    setFrozenPieces({});
    activeSpell && setActiveSpell(null);
    
    addLog('system', 'SYSTEM REBOOT completed. Board reset to starting positions. INSERT COIN...');
  };

  // --- AI LOGIC (GEMMA MODEL) ---
  const makeAIMove = async (activeGame: Chess) => {
    setEngineThinking(true);
    const legalMoves = activeGame.moves({ verbose: true });
    
    if (activeGame.isGameOver() || legalMoves.length === 0) {
      setEngineThinking(false);
      return;
    }

    // Filter out moves starting from frozen squares
    const frozenSquaresList = Object.keys(frozenPieces);
    const nonFrozenMoves = legalMoves.filter(m => !frozenSquaresList.includes(m.from));
    const finalLegalMoves = nonFrozenMoves.length > 0 ? nonFrozenMoves : legalMoves;

    addLog('system', `AI GATHERING REASONING DATA (depth: ${activeGame.history().length + 1})...`);
    addLog('stdout', `ENGINE_STDOUT // INITIATING SOLVER PORT HANDSHAKE [endpoint: ${settings.lmStudioUrl}]`);
    addLog('stdout', `ENGINE_STDOUT // TRANSMITTING MATRIX: { model: "${settings.modelName}", turn: "b", depth: ${activeGame.history().length + 1} }`);

    const fenState = activeGame.fen();
    const historyList = activeGame.history();
    const playableMoves = finalLegalMoves.map(m => m.lan); // e.g. ["e7e5", "g8f6"]

    const startThinkingTime = Date.now();

    try {
      // Step A: Format our system instruction packet for Gemma-3
      const sysLogPrompt = settings.showThoughtProcess
        ? `You are an 8-bit retro arcade chess boss named GEMMA-3. You play BLACK. You are playing against a human who plays WHITE.
You must respond ONLY with a valid JSON block containing your next move of choice.
Your response MUST use this output schema:
{
  "thought": "A brief, ultra-sarcastic arcade boss remark about this stage of the board (max 20 words). Speak in ALL CAPS.",
  "move": "EXACT_CHOSEN_MOVE_FROM_THE_LEGAL_LIST"
}`
        : `Choose a chess move. Play BLACK. Return JSON: { "move": "YOUR_MOVE" }`;

      const userPrompt = `CURRENT BOARD STATE (FEN): ${fenState}
MOVE LOG SEQUENCE: ${historyList.join(', ')}
LEGAL MOVES FOR YOU TO SELECT (CHOOSE EXACTLY ONE): ${JSON.stringify(playableMoves)}

Choose exactly one move string from the array. Your return block must be a valid JSON object matching our protocol schema:
{ "thought": "HA! SHIELD YOUR INFANTRY, WEAKLING!", "move": "${playableMoves[0] || ''}" }
Only output the JSON structure. Do not output surrounding textual chat.`;

      const messagePayload = [
        { role: 'system', content: sysLogPrompt },
        { role: 'user', content: userPrompt }
      ];

      // Step B: Query LM Studio endpoint
      let responsePayload;

      if (settings.connectionMode === 'direct') {
        const cleanUrl = settings.lmStudioUrl.endsWith('/') ? settings.lmStudioUrl.slice(0, -1) : settings.lmStudioUrl;
        const responseList = await fetch(`${cleanUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.modelName,
            messages: messagePayload,
            temperature: 0.35,
            max_tokens: 300,
            response_format: { type: 'json_object' }
          }),
        });

        if (!responseList.ok) {
          throw new Error(`LM Studio returned status ${responseList.status}`);
        }
        responsePayload = await responseList.json();
      } else {
        // Proxy route to evade browser mixed-content sandboxing
        const responseList = await fetch('/api/gemma', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: settings.lmStudioUrl,
            model: settings.modelName,
            messages: messagePayload
          }),
        });

        if (!responseList.ok) {
          let errorInfo = `Proxy error code ${responseList.status}`;
          try {
            const errBody = await responseList.json();
            if (errBody && errBody.error) {
              errorInfo = errBody.error;
            }
          } catch (_) {}
          throw new Error(errorInfo);
        }
        responsePayload = await responseList.json();
      }

      // Step C: Parse completion content
      const aiReplyRaw = responsePayload.choices?.[0]?.message?.content || '';
      console.log('Raw LM Studio Gemma choice output:', aiReplyRaw);

      if (!aiReplyRaw) {
        throw new Error('Received empty response text from local Gemma model');
      }

      addLog('stdout', `ENGINE_STDOUT // INCOMING DATALAST STREAM RECEIVED SUCCESFULLY`);
      addLog('stdout', `ENGINE_STDOUT // RAW MODEL OUTPUT:\n${aiReplyRaw.trim()}`);

      // Robust extraction of JSON & move matching
      let aiThoughtMsg = 'AFFIRMATIVE COMPUTATION RUN.';
      let aiSelectedMove = '';

      try {
        const parsedNode = JSON.parse(aiReplyRaw.trim());
        aiThoughtMsg = parsedNode.thought || 'EXECUTION PIPELINE CLEAR.';
        aiSelectedMove = parsedNode.move || '';
      } catch (parseErr) {
        // Fallback parsing: look for block inside curly braces
        const jsonMatch = aiReplyRaw.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const parsedNode = JSON.parse(jsonMatch[0]);
            aiThoughtMsg = parsedNode.thought || 'RE-ROUTE MATRIX ENGAGED.';
            aiSelectedMove = parsedNode.move || '';
          } catch (e) {
            // failed sub-parse
          }
        }
      }

      // If Direct Move was not parsed, scan text manually for matches
      if (!aiSelectedMove) {
        const textLower = aiReplyRaw.toLowerCase();
        for (const candidate of playableMoves) {
          if (textLower.includes(candidate.toLowerCase())) {
            aiSelectedMove = candidate;
            aiThoughtMsg = 'DECRYPTED RAW STREAM DIRECTIVE.';
            break;
          }
        }
      }

      // Ensure Selected Move resides in legal moves list
      const cleanMove = aiSelectedMove ? aiSelectedMove.trim() : '';
      const matchingVerboseMove = finalLegalMoves.find(m => m.lan === cleanMove || m.san === cleanMove);

      // Delay to respect retro paced thinking
      const timeElapsed = Date.now() - startThinkingTime;
      const remainingDelay = Math.max(100, settings.engineDelayMs - timeElapsed);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      if (matchingVerboseMove) {
        // Successful AI processing
        executePieceMove(activeGame, matchingVerboseMove.lan, 'ai', aiThoughtMsg);
      } else {
        // Invalid AI choice fallback
        console.warn(`Gemma selected move "${cleanMove}" is not legal! Playable moves:`, playableMoves);
        triggerFallbackMove(activeGame, `Gemma-3 chosen move "${cleanMove || 'empty'}" was deemed illegal. Engaging local solver check.`);
      }

    } catch (apiErr: any) {
      console.error('Gemma AI Move Failed:', apiErr);
      
      const errorMsgText = apiErr.message || '';
      setActiveRoutingError(errorMsgText);
      addLog('stdout', `ENGINE_STDERR // CONNECTION EXCEPTION OCCURRED: ${errorMsgText}`);

      const timeElapsed = Date.now() - startThinkingTime;
      const remainingDelay = Math.max(100, settings.engineDelayMs - timeElapsed);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      triggerFallbackMove(
        activeGame,
        `Gemma model connection failed: ${errorMsgText || 'Disconnected'}. Engaging local 8-bit CPU...`
      );
    } finally {
      setEngineThinking(false);
    }
  };

  // Safe fallback to Greedy Minimax solver
  const triggerFallbackMove = (activeGame: Chess, fallbackReasonLog: string) => {
    if (activeGame.isGameOver()) return;

    if (settings.fallbackToRandom) {
      const frozenSquaresList = Object.keys(frozenPieces);
      const fallbackMove = getSmartLocalMove(activeGame, 0.2, frozenSquaresList);
      if (fallbackMove) {
        addLog('error', fallbackReasonLog);
        executePieceMove(activeGame, fallbackMove, 'ai', "CRITICAL MATRIX ENGAGED! CHIP FORCED SAFETY ALIGNMENT!");
      } else {
        addLog('error', "No legal protective moves available. Engine locked.");
      }
    } else {
      addLog('error', `${fallbackReasonLog} Fallback algorithm disabled. Waiting for instruction.`);
    }
  };

  // --- CORE CHESS ACTION ---
  const executePieceMove = (
    activeGame: Chess,
    moveNotation: string,
    playerType: 'player' | 'ai',
    thoughtString?: string
  ) => {
    try {
      const isCapturing = activeGame.moves({ verbose: true }).some(m => m.lan === moveNotation && m.captured);
      
      // Perform move in Chess engine
      const moveResult = activeGame.move(moveNotation);
      if (!moveResult) return;

      // SFX feedback playing
      if (isCapturing) {
        sfx.playCapture();
      } else {
        sfx.playMove();
      }

      // Sync React state
      const targetFen = activeGame.fen();
      setFen(targetFen);
      setMoveHistory(activeGame.history());
      setLastMove({ from: moveResult.from, to: moveResult.to });
      setCaptured(calculateCapturedPieces(activeGame));

      // Manage Mana & Frozen statuses per round
      if (playerType === 'player') {
        const reward = isCapturing ? 35 : 15;
        setMana(prev => Math.min(100, prev + reward));
        addLog('system', `+${reward} MANA ACQUIRED [${isCapturing ? "TACTICAL SLAY" : "INITIATIVE SEIZED"}]`);
      } else {
        // AI turn: decrement ice lock counts
        setFrozenPieces(prev => {
          const next = { ...prev };
          let changed = false;
          for (const sq in next) {
            const square = sq as Square;
            if (typeof next[square] === 'number' && next[square] > 0) {
              next[square]!--;
              changed = true;
              if (next[square] === 0) {
                delete next[square];
                addLog('system', `❄️ UNFREEZE: THE PIECE ON ${square.toUpperCase()} HAS WARMED UP. ICE REMOVED.`);
              }
            }
          }
          return changed ? next : prev;
        });
      }

      // Append logs
      const legibleMove = moveResult.san; // e.g. e4, Nf3
      if (playerType === 'player') {
        addLog('player', `Move triggered successfully: ${legibleMove}`, undefined, legibleMove);
      } else {
        addLog('ai', `REPLY FILED: **${legibleMove}**`, thoughtString, legibleMove);
      }

      // Game state analysis warnings
      if (activeGame.isGameOver()) {
        setTimeout(() => {
          if (activeGame.isCheckmate()) {
            addLog('system', `🚨 MATCH DECIDED! CHECKMATE! ${playerType === 'player' ? 'HUMAN PREVAILS!' : 'GEMMA-3 SENDS YOU IN FLAMES!'}`);
            if (playerType === 'player') {
              sfx.playVictory();
            } else {
              sfx.playDefeat();
            }
          } else if (activeGame.isStalemate()) {
            addLog('system', '🔗 MATCH CONCLUDED IN STALEMATE. DEADLOCK ENGAGED.');
            sfx.playDefeat();
          } else {
            addLog('system', '🔗 MATCH CONCLUDED IN DRAW PROVISIONS.');
            sfx.playDefeat();
          }
        }, 300);
        return;
      }

      if (activeGame.inCheck()) {
        setTimeout(() => {
          addLog('system', `⚠️ DANGER WARNING! RED FLASH! ${playerType === 'player' ? 'GEMMA-3' : 'HUMAN'} IS IN CHIPS CHECK!`);
          sfx.playCheck();
        }, 150);
      }

      // Trigger AI move if manual turn just executed
      if (playerType === 'player') {
        setTimeout(() => {
          makeAIMove(activeGame);
        }, 600);
      }

    } catch (e: any) {
      console.error('Execute Move Error:', e);
      addLog('error', `CHESS SHELL EXCEPTION: ${e.message || 'Illegal notation pattern.'}`);
    }
  };

  // --- MANUAL SELECTION & TOUCH CONTROLS ---
  const handleSquareClick = (squareKey: Square) => {
    if (engineThinking || game.isGameOver()) return;
    
    // Safety check: is it white's turn?
    if (game.turn() !== 'w') {
      addLog('error', "Gemma is currently processing computing nodes. Please wait.");
      return;
    }

    // SPELL INTERCEPT CASTING PROCESS
    if (activeSpell) {
      const targetPiece = game.get(squareKey);

      if (activeSpell === 'lightning') {
        if (!targetPiece || targetPiece.color !== 'b') {
          sfx.playSelect();
          addLog('error', 'Lightning Strike failed: Target square must contain an active enemy piece!');
          return;
        }

        // Obliterate the enemy piece
        const removed = game.remove(squareKey);
        if (removed) {
          addLog('system', `⚡ LIGHTNING CRACKLE! ENEMY ${removed.type.toUpperCase()} ON ${squareKey.toUpperCase()} WAS VAPORIZED!`);
          sfx.playSpellCast();
          setMana(prev => Math.max(0, prev - 35));

          // Hand turn over to Black by FEN translation
          const nextFen = changeFenTurn(game.fen(), 'b');
          game.load(nextFen);
          setFen(nextFen);
          setCaptured(calculateCapturedPieces(game));
          setActiveSpell(null);
          setSelectedSquare(null);
          setValidSquares([]);

          setTimeout(() => {
            makeAIMove(game);
          }, 600);
        }
        return;
      }

      if (activeSpell === 'freeze') {
        if (!targetPiece || targetPiece.color !== 'b') {
          sfx.playSelect();
          addLog('error', 'Frost Nova failed: Target square must contain an active enemy piece!');
          return;
        }

        // Apply 2 turns freeze
        setFrozenPieces(prev => ({ ...prev, [squareKey]: 2 }));
        addLog('system', `❄️ FROST SPELL CAST! ENEMY PIECE ON ${squareKey.toUpperCase()} SHACKLED FOR 2 AI MOVES.`);
        sfx.playSpellCast();
        setMana(prev => Math.max(0, prev - 25));

        // Hand turn over to Black by FEN translation
        const nextFen = changeFenTurn(game.fen(), 'b');
        game.load(nextFen);
        setFen(nextFen);
        setActiveSpell(null);
        setSelectedSquare(null);
        setValidSquares([]);

        setTimeout(() => {
          makeAIMove(game);
        }, 600);
        return;
      }

      if (activeSpell === 'mutation') {
        if (!targetPiece || targetPiece.type !== 'p' || targetPiece.color !== 'w') {
          sfx.playSelect();
          addLog('error', 'Alchemy Mutation failed: Target square must contain one of your active Pawns!');
          return;
        }

        // Remove pawn and put a Knight
        game.remove(squareKey);
        game.put({ type: 'n', color: 'w' }, squareKey);

        addLog('system', `🧪 ALCHEMICAL TRANS-MUTATION! HERO PAWN ON ${squareKey.toUpperCase()} MUTATED TO A KNIGHT!`);
        sfx.playSpellCast();
        setMana(prev => Math.max(0, prev - 40));

        // Hand turn over to Black by FEN translation
        const nextFen = changeFenTurn(game.fen(), 'b');
        game.load(nextFen);
        setFen(nextFen);
        setCaptured(calculateCapturedPieces(game));
        setActiveSpell(null);
        setSelectedSquare(null);
        setValidSquares([]);

        setTimeout(() => {
          makeAIMove(game);
        }, 650);
        return;
      }
    }

    const piece = game.get(squareKey);

    // 1. Clicked on a valid target square to execute a move
    if (validSquares.includes(squareKey) && selectedSquare) {
      // Execute Player Move
      const legalMovesOnSelected = game.moves({ square: selectedSquare, verbose: true });
      const moveNeeded = legalMovesOnSelected.find(m => m.to === squareKey);
      
      if (moveNeeded) {
        setSelectedSquare(null);
        setValidSquares([]);
        
        // Execute Move (auto-promote to Queen for streamlined arcade interaction)
        executePieceMove(game, moveNeeded.lan, 'player');
      }
      return;
    }

    // 2. Clicked on their own piece: highlight paths
    if (piece && piece.color === 'w') {
      sfx.playSelect();
      setSelectedSquare(squareKey);
      const moves = game.moves({ square: squareKey, verbose: true });
      setValidSquares(moves.map(m => m.to as Square));
    } else {
      // Clicked on blank space or Opponent piece (without valid target): Deselect
      setSelectedSquare(null);
      setValidSquares([]);
    }
  };

  // --- FORCE ENGINE MOVE ---
  const handleForceAIMove = () => {
    if (engineThinking || game.isGameOver()) return;
    sfx.playSelect();
    addLog('system', 'FORCE INTERRUPT TRIGGERED. AI Opponent takes prompt control.');
    makeAIMove(game);
  };

  // --- RPG SFX AND SPELL ACTION TRIGGERS ---
  const handleToggleSpell = (spellName: 'lightning' | 'freeze' | 'mutation') => {
    sfx.playSelect();
    if (activeSpell === spellName) {
      setActiveSpell(null);
      addLog('system', 'SPELL CAST CANCELLED. Readying standard formations.');
    } else {
      setActiveSpell(spellName);
      const costStr = spellName === 'lightning' ? '35 MP' : spellName === 'freeze' ? '25 MP' : '40 MP';
      addLog('system', `🔮 READY TO CAST: ${spellName.toUpperCase()} (${costStr}). SELECT TILE ON COGNITIVE MATRIX!`);
    }
  };

  const handleCastChronoShift = () => {
    sfx.playSelect();
    if (mana < 30) {
      addLog('error', 'Casting Failed: Insufficient Wizard Mana! Move or capture to siphon more power.');
      return;
    }
    if (game.history().length < 2) {
      addLog('error', 'Casting Failed: Space-time continuum is too young. Make at least 1 round of moves.');
      return;
    }

    // Double undo to rewind self and opponent previous turns
    game.undo();
    game.undo();

    addLog('system', '🌀 CHRONO SHIFT! TIME-WARP CHRONOLOGY DISTORTED. RECOVERING RECENT BLUNDER.');
    sfx.playSpellCast();
    setMana(prev => Math.max(0, prev - 30));

    // Deselect and clear valid target rings safely
    setActiveSpell(null);
    setSelectedSquare(null);
    setValidSquares([]);

    // Sync React standard checkers
    const targetFen = game.fen();
    setFen(targetFen);
    setMoveHistory(game.history());

    // Compute previous last move
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      setLastMove({ from: last.from as Square, to: last.to as Square });
    } else {
      setLastMove(null);
    }
    setCaptured(calculateCapturedPieces(game));
  };

  // --- BOARD RENDER HELPERS ---
  const boardCells: Square[][] = [];
  for (let r = 0; r < 8; r++) {
    const rowCells: Square[] = [];
    for (let c = 0; c < 8; c++) {
      const file = COLS[c];
      const rank = 8 - r;
      rowCells.push(`${file}${rank}` as Square);
    }
    boardCells.push(rowCells);
  }

  const isDarkSquare = (colIndex: number, rowIndex: number) => {
    return (colIndex + rowIndex) % 2 === 1;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#e2e8f0] flex flex-col font-mono uppercase tracking-tight selection:bg-cyan-500/30 antialiased relative">
      
      {/* Absolute Header Ribbon */}
      <header className="h-14 border-b-4 border-slate-800 bg-slate-900 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-none border-2 border-white flex items-center justify-center font-bold text-slate-950">8B</div>
          <div>
            <h1 className="font-retro text-xs md:text-sm text-[#e2e8f0] tracking-wider font-bold mb-0.5">
              GEMMA_CHESS <span className="text-cyan-400">// V3.0</span>
            </h1>
            <p className="font-mono text-[9px] text-[#39FF14] tracking-tight leading-none uppercase">
              LM_STUDIO: CONNECTED [127.0.0.1:1234]
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2 md:space-x-3.5 text-slate-300">
          <button
            onClick={() => {
              sfx.playSelect();
              setIsCrtEnabled(!isCrtEnabled);
            }}
            title="Toggle Scanlines Filter"
            className={`p-2 hover:bg-slate-850 border-2 rounded-none transition-colors border-slate-800 ${
              isCrtEnabled ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
            className="p-2 hover:bg-slate-800 border-2 border-slate-800 text-slate-400 hover:text-[#e2e8f0] transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500 animate-pulse" /> : <Volume2 className="w-4 h-4 text-emerald-450" />}
          </button>

          <button
            onClick={() => {
              sfx.playSelect();
              setShowSettings(!showSettings);
            }}
            className={`text-[8px] font-retro px-3 py-1.5 border-2 shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all ${
              showSettings
                ? 'bg-cyan-505 text-slate-950 border-white bg-cyan-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-[#e2e8f0]'
            }`}
          >
            SETTINGS
          </button>
        </div>
      </header>

      {/* Main Responsive Grid split */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Aspect: Chess Sandbox Panel (columns 1 to 7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Troubleshooting Warning Banner */}
          {((settings.lmStudioUrl.includes('localhost') || settings.lmStudioUrl.includes('127.0.0.1')) && settings.connectionMode === 'proxy' || activeRoutingError) && (
            <div className="w-full max-w-[500px] mb-4 p-3.5 bg-slate-950 border-4 border-cyan-500 rounded-none font-mono text-[10px] leading-relaxed text-[#e2e8f0] select-none shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10">
              <div className="flex items-center space-x-2 text-cyan-400 font-retro text-[9px] mb-2 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 bg-cyan-400 inline-block animate-ping rounded-none"></span>
                <span>⚠️ SYSTEM ROUTING ERROR // LOCALHOST CONFLICT</span>
              </div>
              
              {(settings.lmStudioUrl.includes('localhost') || settings.lmStudioUrl.includes('127.0.0.1')) && settings.connectionMode === 'proxy' ? (
                <p className="mb-2 text-slate-300">
                  YOUR ENDPOINT IS LISTED AS <span className="text-cyan-400 font-bold underline">{settings.lmStudioUrl}</span> VIA <span className="font-bold text-white bg-slate-800 px-1">SERVER PROXY</span>. 
                  SINCE THE COGNITIVE DECRYPTER OPERATES IN THE CLOUD, IT CANNOT REACH YOUR COMPUTER&apos;S "LOCALHOST" BOUNDS!
                </p>
              ) : (
                <p className="mb-2 text-rose-400">
                  CONNECTION CONFLICT DETECTED: <span className="text-slate-100 font-bold">{activeRoutingError}</span>. THIS OCCURS IF CORS IS BLOCKED OR YOUR LOCAL ENGINE IS OFFLINE.
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {settings.connectionMode !== 'direct' && (
                  <button
                    onClick={() => {
                      sfx.playSelect();
                      setSettings({ ...settings, connectionMode: 'direct' });
                      setActiveRoutingError(null);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-retro text-[8px] font-bold py-1 px-2.5 border-2 border-white shadow-[0_2px_0_0_#fff] active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    ENABLE BROWSER DIRECT MODE
                  </button>
                )}
                <button
                  onClick={() => {
                    sfx.playSelect();
                    setActiveRoutingError(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-retro text-[8px] py-1 px-3 border border-slate-700 shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  DISMISS
                </button>
              </div>
            </div>
          )}
          
          {/* Arcade Cabinet Bezel Cover wrapper */}
          <div className="w-full max-w-[500px] bg-slate-900 border-8 border-slate-800 shadow-[0_12px_24px_rgba(0,0,0,0.8)] relative rounded-none flex flex-col p-4 md:p-5">
            
            {/* Top Score Slot / Nameplates */}
            <div className="flex justify-between items-center p-3 mb-4 bg-slate-950 border-4 border-slate-850 font-retro">
              {/* White Panel */}
              <div className="flex flex-col space-y-1">
                <span className="text-[7px] text-slate-500">P-01 (WHITE)</span>
                <span className="text-[10px] text-white tracking-tight flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-400 inline-block mr-1.5 animate-pulse"></span>
                  HUMAN
                </span>
                
                {/* Captured black pieces by White */}
                <div className="flex space-x-1.5 text-[8px] mt-0.5 min-h-[14px]">
                  {Object.entries(captured.w).some(([_, val]) => (val as number) > 0) ? (
                    Object.entries(captured.w).map(([type, val]) =>
                      (val as number) > 0 ? (
                        <span key={type} className="text-cyan-400 font-mono" title={`${val} captured black ${type}`}>
                          {type.toUpperCase()}x{val}
                        </span>
                      ) : null
                    )
                  ) : (
                    <span className="text-slate-600 text-[6px]">EMPTY_SACK</span>
                  )}
                </div>
              </div>

              {/* Middle Round Shield */}
              <div className="flex flex-col items-center text-center px-2">
                <div className={`text-[8px] leading-none mb-1 text-slate-505 font-bold text-cyan-400 ${engineThinking ? 'animate-bounce' : ''}`}>
                  {engineThinking ? 'COMPUTING' : 'STAGE'}
                </div>
                <div className="text-sm font-bold text-white font-sans tabular-nums">
                  {Math.floor(moveHistory.length / 2) + 1}
                </div>
              </div>

              {/* Black Panel */}
              <div className="flex flex-col items-end text-right space-y-1">
                <span className="text-[7px] text-slate-500">AI-02 (BLACK)</span>
                <span className={`text-[10px] tracking-tight flex items-center ${engineThinking ? 'text-cyan-400' : 'text-slate-205'}`}>
                  {engineThinking && <Cpu className="w-3 h-3 mr-1 animate-spin text-cyan-400" />}
                  GEMMA-3
                </span>
                
                {/* Captured white pieces by Black */}
                <div className="flex space-x-1.5 text-[8px] mt-0.5 min-h-[14px]">
                  {Object.entries(captured.b).some(([_, val]) => (val as number) > 0) ? (
                    Object.entries(captured.b).map(([type, val]) =>
                      (val as number) > 0 ? (
                        <span key={type} className="text-slate-400 font-mono" title={`${val} captured white ${type}`}>
                          {type.toUpperCase()}x{val}
                        </span>
                      ) : null
                    )
                  ) : (
                    <span className="text-slate-600 text-[6px]">EMPTY_SACK</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cabinet CRT overlay layers */}
            <div className={`relative border-8 border-slate-800 p-1 md:p-3 bg-slate-950 shadow-inner select-none ${isCrtEnabled ? 'crt-effect' : ''}`}>
              {isCrtEnabled && <div className="scanline-bar"></div>}
              {isCrtEnabled && <div className="absolute inset-0 crt-vignette flicker-screen opacity-90 z-10 pointer-events-none"></div>}
              
              {/* Actual 8x8 Visual Chess Grid */}
              <div className="grid grid-cols-8 gap-0 relative border-[12px] border-slate-800 bg-slate-800 aspect-square w-full select-none shadow-2xl">
                {boardCells.map((rowText, rIdx) => {
                  return rowText.map((square, cIdx) => {
                    const cellSquare = square;
                    const piece = game.get(cellSquare);
                    const darkSq = isDarkSquare(cIdx, rIdx);

                    // Highlights
                    const isSelected = selectedSquare === cellSquare;
                    const isValidTarget = validSquares.includes(cellSquare);
                    const isCheckInSquare = game.inCheck() && piece?.type === 'k' && piece?.color === game.turn();
                    
                    const isLastFrom = lastMove?.from === cellSquare;
                    const isLastTo = lastMove?.to === cellSquare;

                    const isSpellTarget = 
                      (activeSpell === 'lightning' && piece && piece.color === 'b') ||
                      (activeSpell === 'freeze' && piece && piece.color === 'b' && !frozenPieces[cellSquare]) ||
                      (activeSpell === 'mutation' && piece && piece.type === 'p' && piece.color === 'w');

                    const isFrozen = typeof frozenPieces[cellSquare] === 'number' && frozenPieces[cellSquare] > 0;

                    // Compute specific square classes
                    let squareColorBg = darkSq ? 'bg-slate-700' : 'bg-slate-600'; // High density slate theme squares
                    let cellBorder = 'border border-slate-800/10';

                    if (activeSpell) {
                      if (isSpellTarget) {
                        if (activeSpell === 'lightning') {
                          squareColorBg = 'bg-amber-950/85 border border-amber-400 animate-pulse ring-2 ring-amber-400/50';
                        } else if (activeSpell === 'freeze') {
                          squareColorBg = 'bg-cyan-950/85 border border-cyan-400 animate-pulse ring-2 ring-cyan-400/50';
                        } else if (activeSpell === 'mutation') {
                          squareColorBg = 'bg-indigo-950/85 border border-indigo-400 animate-pulse ring-2 ring-indigo-400/50';
                        }
                      } else {
                        // Dim non-targets during spelling to allow pristine focus!
                        squareColorBg = darkSq ? 'bg-slate-800/40 text-slate-600/40' : 'bg-slate-800/30 text-slate-600/40';
                      }
                    } else {
                      if (isSelected) {
                        squareColorBg = 'bg-cyan-500 text-slate-950 border-2 border-white ring-4 ring-cyan-500/30'; // Glowing Cyan Selection
                      } else if (isValidTarget) {
                        squareColorBg = darkSq ? 'bg-cyan-900/70 border border-cyan-400/50' : 'bg-cyan-800/60 border border-cyan-400/50'; 
                      } else if (isCheckInSquare) {
                        squareColorBg = 'bg-rose-700 animate-pulse'; // High contrast red pulse for alert
                      } else if (isLastFrom || isLastTo) {
                        squareColorBg = darkSq ? 'bg-cyan-950/50' : 'bg-cyan-900/40'; // Highlight slate cyan
                      }
                    }

                    return (
                      <div
                        id={`square-${cellSquare}`}
                        key={cellSquare}
                        onClick={() => handleSquareClick(cellSquare)}
                        className={`aspect-square w-full flex items-center justify-center relative cursor-pointer select-none transition-colors duration-150 relative ${squareColorBg} ${cellBorder}`}
                        title={cellSquare}
                      >
                        {/* Dot indicator inside empty target destination tiles */}
                        {isValidTarget && !piece && !activeSpell && (
                          <div className="w-2.5 h-2.5 bg-cyan-400 border border-white rounded-full animate-ping pointer-events-none"></div>
                        )}

                        {/* Ice Freeze Status overlay */}
                        {isFrozen && (
                          <div className="absolute inset-0 bg-sky-500/25 border-2 border-sky-400/80 flex flex-col items-center justify-center pointer-events-none z-10 animate-pulse select-none">
                            <span className="text-[12px] opacity-90 drop-shadow-md">❄️</span>
                            <span className="text-[5px] font-retro text-cyan-200 mt-0.5 tracking-tighter">
                              FROST {frozenPieces[cellSquare]}T
                            </span>
                          </div>
                        )}

                        {/* Render Pixel Art Piece with Role Name */}
                        {piece && (
                          <div className="flex flex-col items-center justify-center w-full h-full pt-1.5 pb-0.5 select-none pointer-events-none">
                            <ChessPiece8Bit
                              type={piece.type}
                              color={piece.color}
                              size={34}
                            />
                            <span 
                              className={`font-retro text-[6.5px] tracking-tight mt-1 leading-none select-none ${
                                piece.color === 'w' ? 'text-cyan-200' : 'text-amber-400'
                              }`}
                            >
                              {piece.type === 'p' ? 'pawn' :
                               piece.type === 'r' ? 'rook' :
                               piece.type === 'n' ? 'knight' :
                               piece.type === 'b' ? 'bishop' :
                               piece.type === 'q' ? 'queen' :
                               piece.type === 'k' ? 'king' : ''}
                            </span>
                          </div>
                        )}

                        {/* Mini board rank notation on left file */}
                        {cIdx === 0 && (
                          <span className="absolute top-0.5 left-1 text-[7px] font-retro text-slate-300/40 pointer-events-none uppercase">
                            {8 - rIdx}
                          </span>
                        )}

                        {/* Mini board file notation on bottom row */}
                        {rIdx === 7 && (
                          <span className="absolute bottom-0.5 right-1 text-[7px] font-retro text-slate-300/40 pointer-events-none uppercase">
                            {COLS[cIdx]}
                          </span>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            {/* RPG Adventure Spells Dock */}
            <div className="mt-4 p-3 bg-slate-950 border-4 border-slate-850 rounded-none font-mono">
              <div className="flex justify-between items-center mb-2">
                <span className="font-retro text-[9px] text-[#39FF14] tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  WIZARD MANA REACTOR (MP)
                </span>
                <span className="font-sans text-[11px] font-bold text-cyan-400 tracking-wider tabular-nums">
                  {mana} / 100 MP
                </span>
              </div>
              
              {/* Mana Bar */}
              <div className="h-3 w-full bg-slate-900 border-2 border-slate-700 p-0.5 mb-3.5 relative overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-300 relative"
                  style={{ width: `${mana}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
              </div>

              {/* Spell grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {/* 1. Lightning Strike */}
                <button
                  onClick={() => handleToggleSpell('lightning')}
                  disabled={mana < 35 || game.turn() !== 'w' || game.isGameOver()}
                  className={`relative p-2 flex flex-col items-center justify-center border-2 text-center transition-all ${
                    activeSpell === 'lightning'
                      ? 'bg-amber-500 border-white text-slate-950 animate-pulse font-bold'
                      : 'bg-slate-900 border-amber-600/50 text-amber-400 hover:bg-slate-850 hover:border-amber-400 disabled:opacity-30 disabled:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">⚡</span>
                  <span className="font-retro text-[7px] mt-1 font-bold">LIGHTNING</span>
                  <span className="font-mono text-[6px] text-slate-400 uppercase">35 MP</span>
                </button>

                {/* 2. Frost Nova */}
                <button
                  onClick={() => handleToggleSpell('freeze')}
                  disabled={mana < 25 || game.turn() !== 'w' || game.isGameOver()}
                  className={`relative p-2 flex flex-col items-center justify-center border-2 text-center transition-all ${
                    activeSpell === 'freeze'
                      ? 'bg-cyan-500 border-white text-slate-950 animate-pulse font-bold'
                      : 'bg-slate-900 border-cyan-600/50 text-cyan-400 hover:bg-slate-850 hover:border-cyan-400 disabled:opacity-30 disabled:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">❄️</span>
                  <span className="font-retro text-[7px] mt-1 font-bold">FROST LOCKED</span>
                  <span className="font-mono text-[6px] text-slate-400 uppercase">25 MP</span>
                </button>

                {/* 3. Alchemical Mutation */}
                <button
                  onClick={() => handleToggleSpell('mutation')}
                  disabled={mana < 40 || game.turn() !== 'w' || game.isGameOver()}
                  className={`relative p-2 flex flex-col items-center justify-center border-2 text-center transition-all ${
                    activeSpell === 'mutation'
                      ? 'bg-indigo-500 border-white text-white animate-pulse font-bold'
                      : 'bg-slate-900 border-indigo-600/50 text-indigo-400 hover:bg-slate-850 hover:border-indigo-400 disabled:opacity-30 disabled:hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">🧪</span>
                  <span className="font-retro text-[7px] mt-1 font-bold">MUTATION</span>
                  <span className="font-mono text-[6px] text-slate-400 uppercase">40 MP</span>
                </button>

                {/* 4. Chrono Shift */}
                <button
                  onClick={handleCastChronoShift}
                  disabled={mana < 30 || game.turn() !== 'w' || game.isGameOver()}
                  className="relative p-2 flex flex-col items-center justify-center border-2 text-center transition-all bg-slate-900 border-rose-600/50 text-rose-405 hover:bg-slate-850 hover:border-rose-450 disabled:opacity-30 disabled:hover:bg-slate-900"
                >
                  <span className="text-sm">🔄</span>
                  <span className="font-retro text-[7px] mt-1 font-bold">TIME-WARP</span>
                  <span className="font-mono text-[6px] text-slate-400 uppercase">30 MP</span>
                </button>
              </div>

              {activeSpell && (
                <div className="text-[7.5px] font-retro text-center text-rose-550 mt-1.5 animate-pulse tracking-wide select-none">
                  ⚡ SELECT TARGET SQUARE ON CHESS GRID OR CLICK SPELL AGAIN TO CANCEL ⚡
                </div>
              )}
            </div>

            {/* Quick manual triggers under board */}
            <div className="flex gap-3 mt-4 text-xs font-mono select-none">
              <button
                onClick={handleResetGame}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-retro text-[8px] py-1.5 px-3 border-2 border-slate-750 shadow-[0_3px_0_0_#0f172a] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>RESTART</span>
              </button>

              <button
                onClick={handleForceAIMove}
                disabled={engineThinking || game.turn() !== 'b' || game.isGameOver()}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-retro text-[8px] py-1.5 px-3 border-2 border-cyan-800 shadow-[0_3px_0_0_#0f172a] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center space-x-1"
              >
                <Play className="w-3 h-3 text-slate-950" />
                <span>FORCE_MOVE</span>
              </button>
            </div>

            {/* Mini Turn state indicator badge */}
            <div className="mt-4 p-2.5 text-center bg-slate-950 border-2 border-slate-800 rounded-none font-retro tracking-wider select-none text-[8px]">
              {game.isGameOver() ? (
                <span className="text-rose-500 block uppercase font-bold text-[9px] animate-pulse">
                  ⚠️ GAME OVER - MANAGE BOARD TO PLAY AGAIN
                </span>
              ) : engineThinking ? (
                <span className="text-cyan-400 block animate-bounce uppercase">
                  🤖 GEMMA_CHESS IS COMPUTING NODES...
                </span>
              ) : game.turn() === 'w' ? (
                <span className="text-[#39FF14] block animate-pulse uppercase">
                  🟢 HERO_TURN - SELECT_PIECE_TO_ENGAGE
                </span>
              ) : (
                <span className="text-cyan-400 block animate-pulse uppercase">
                  ⚙️ GEMMA_TURN - COMPUTING_TRANSFERS...
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Right Aspect: Configuration and Command Terminal (columns 8 to 12) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col h-full justify-start">
          
          {/* Animated Settings configuration drawer toggle */}
          <div className="transition-all duration-300">
            {showSettings ? (
              <SettingsPanel
                settings={settings}
                onUpdateSettings={setSettings}
                onLogMessage={(type, msg) => addLog(type, msg)}
              />
            ) : (
              <div className="bg-slate-900 border-4 border-slate-800 text-slate-350 p-4 font-screen shadow-[0_4px_0_0_rgba(0,0,0,0.4)] relative">
                <h3 className="font-retro text-[9px] text-cyan-400 mb-2 tracking-wide uppercase">⚡ COMBAT HUD STATUS</h3>
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono leading-none pt-1">
                  <div className="bg-slate-950/60 p-2.5 border border-slate-800/80 rounded-none">
                    <span className="text-slate-500 uppercase block text-[8px] font-retro mb-1.5">ACTIVE COG</span>
                    <span className="text-cyan-400 block font-screen truncate">{settings.modelName}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 border border-slate-800/80 rounded-none">
                    <span className="text-slate-500 uppercase block text-[8px] font-retro mb-1.5">LATENCY DELAY</span>
                    <span className="text-[#39FF14] block font-screen">{(settings.engineDelayMs / 1000).toFixed(1)} Secs</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 border border-slate-800/80 rounded-none">
                    <span className="text-slate-500 uppercase block text-[8px] font-retro mb-1.5">HOST CONNECTOR</span>
                    <span className="text-cyan-400 block font-screen truncate">{settings.connectionMode.toUpperCase()}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 border border-slate-800/80 rounded-none">
                    <span className="text-slate-500 uppercase block text-[8px] font-retro mb-1.5">BACKUP DRIVER</span>
                    <span className="text-emerald-450 block font-screen">{settings.fallbackToRandom ? "STATIONARY" : "OFFLINE"}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sfx.playSelect();
                    setShowSettings(true);
                  }}
                  className="mt-3.5 w-full bg-slate-800 hover:bg-slate-700 text-[#e2e8f0] py-1.5 border-2 border-slate-700 font-retro text-[8px] shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center space-x-1.5"
                >
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>CUSTOMIZE DECRYPTER CONFIG</span>
                </button>
              </div>
            )}
          </div>

          {/* Core logging console panel */}
          <div className="flex-1 min-h-[340px]">
            <GameTerminal
              logs={logs}
              onClearLogs={() => {
                const timestamp = new Date().toLocaleTimeString();
                setLogs([
                  {
                    id: 'flush-1',
                    timestamp,
                    type: 'system',
                    message: 'SHELL FLUSH: TERM PROTOCOL RE-ENGAGED.',
                  },
                ]);
              }}
            />
          </div>

          {/* Visual Piece Reference guide panel */}
          <div className="bg-slate-950 border-4 border-slate-800 p-3 flex flex-col font-screen text-[10px] select-none text-slate-400 leading-snug">
            <div className="font-retro text-[8px] text-slate-550 mb-1.5 tracking-wider uppercase flex items-center space-x-2">
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>ARCADE REFERENCE LABELS</span>
            </div>
            <p className="font-mono text-slate-500 text-[9px]">
              Classic moves apply. Reach rank 8 to auto-upgrade pawns to Queens.
              If Gemma generates unparseable text or disconnects, the machine initiates automatic protective backups.
            </p>
          </div>

        </div>

      </main>

      {/* Retro Arcade Cabin footer creds */}
      <footer className="bg-slate-950 text-slate-600 py-3 text-center border-t-2 border-slate-900 font-retro text-[7px] tracking-wide select-none">
        LM STUDIO CONNECTOR MODULE / SYSTEM INSTRUCTIONS V3.0-CHIP / HEURISTIC FALLBACK DEPLOYED COGS.
      </footer>

    </div>
  );
}
