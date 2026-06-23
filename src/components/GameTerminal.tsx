/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { GameLogEntry } from '../types';
import { sfx } from '../lib/audio';

interface GameTerminalProps {
  logs: GameLogEntry[];
  onClearLogs: () => void;
}

export const GameTerminal: React.FC<GameTerminalProps> = ({ logs, onClearLogs }) => {
  const terminalAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs inside container without scrolling page or sliding smoothly
  useEffect(() => {
    if (terminalAreaRef.current) {
      terminalAreaRef.current.scrollTop = terminalAreaRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColorClass = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'player':
        return 'text-emerald-400';
      case 'ai':
        return 'text-cyan-400';
      case 'error':
        return 'text-rose-500 font-bold';
      case 'stdout':
        return 'text-cyan-300 font-mono opacity-90 block whitespace-pre-wrap leading-tight';
      case 'system':
      default:
        return 'text-amber-500';
    }
  };

  const getLogSymbol = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'player':
        return 'P-01>';
      case 'ai':
        return 'AI-02>';
      case 'error':
        return '[ERR]';
      case 'stdout':
        return 'STDOUT>';
      case 'system':
      default:
        return 'SYS>';
    }
  };

  const handleClear = () => {
    sfx.playSelect();
    onClearLogs();
  };

  return (
    <div className="bg-slate-900 border-4 border-slate-805 text-xs font-mono h-full flex flex-col crt-effect shadow-inner">
      <div className="scanline-bar"></div>
      
      {/* Console Header */}
      <div className="bg-slate-950 border-b-2 border-slate-800 p-2 flex justify-between items-center select-none">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse"></span>
          <span className="font-retro text-[9px] text-slate-400 uppercase tracking-widest leading-none font-bold">ENGINE_STDOUT // AI_LOGS</span>
        </div>
        <button
          onClick={handleClear}
          className="font-retro text-[8px] bg-slate-850 hover:bg-slate-750 text-[#e2e8f0] px-2 py-1 border border-slate-700 shadow-[0_1px_0_0_#444] active:translate-y-0.5 active:shadow-none transition-all"
        >
          CLEAR
        </button>
      </div>

      {/* Terminal View Area */}
      <div 
        ref={terminalAreaRef}
        className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[300px] md:max-h-[380px] bg-[#0a0f1d] text-slate-300 scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center py-6 font-retro text-[9px]">
            &lt; TERMINAL IDLE - WAITING FOR MOVES &gt;
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-relaxed border-b border-slate-900/50 pb-2">
              <div className="flex items-start text-[11px] space-x-1.5 md:space-x-2">
                <span className="text-slate-500 text-[8px] select-none pt-0.5 font-sans">
                  {log.timestamp}
                </span>
                
                <span className={`font-retro text-[8px] tracking-tight shrink-0 pt-0.5 ${getLogColorClass(log.type)}`}>
                  {getLogSymbol(log.type)}
                </span>
                
                <span className={`text-[11px] break-words font-screen ${getLogColorClass(log.type)}`}>
                  {log.message}
                </span>
              </div>

              {/* Thought processing nested area */}
              {log.thought && (
                <div className="mt-1.5 ml-8 md:ml-12 p-2 bg-slate-900/80 border-l-2 border-cyan-500 text-[10px] text-cyan-400/90 font-mono leading-normal whitespace-pre-line">
                  <div className="text-[8px] font-retro text-cyan-500/70 mb-1 select-none flex items-center space-x-1.5">
                    <span>🧠 GEMMA REASONING MATRIX</span>
                  </div>
                  {log.thought}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
