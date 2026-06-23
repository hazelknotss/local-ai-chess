/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppSettings } from '../types';
import { sfx } from '../lib/audio';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onLogMessage: (type: 'system' | 'error', message: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onLogMessage,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    detectedModels: string[];
  }>({ status: 'idle', message: '', detectedModels: [] });

  const testConnection = async () => {
    sfx.playSelect();
    setTesting(true);
    setTestResult({ status: 'idle', message: 'PINGING LM STUDIO...', detectedModels: [] });
    onLogMessage('system', `Pinging LM Studio at ${settings.lmStudioUrl}...`);

    try {
      const response = await fetch('/api/check-lmstudio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: settings.lmStudioUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'ok') {
        const modelsList = data.models?.map((m: any) => m.id) || [];
        setTestResult({
          status: 'success',
          message: 'CONNECTION ESTABLISHED!',
          detectedModels: modelsList,
        });
        onLogMessage('system', `LM Studio Live! Detected models: ${modelsList.join(', ') || 'none'}`);
        // Model Name is locked to google/gemma-3-1b-2, so we do not auto-override it
        sfx.playVictory();
      } else {
        throw new Error(data.error || 'Unknown response structure');
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({
        status: 'error',
        message: `CONNECTION FAILED: ${err.message || 'Timeout'}`,
        detectedModels: [],
      });
      onLogMessage('error', `Connection failed: ${err.message || 'Make sure LM Studio local server is active'}`);
      sfx.playDefeat();
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-4 border-slate-800 text-slate-100 flex flex-col font-screen h-full shadow-[0_4px_0_0_rgba(0,0,0,0.5)]">
      <CardHeader className="p-4 border-b-2 border-slate-800 bg-slate-950/50">
        <CardTitle className="text-sm font-retro text-cyan-400 tracking-wider flex items-center justify-between">
          <span>⚙️ ENGINE_CONFIG</span>
          <Badge className="bg-cyan-505 text-slate-955 bg-cyan-500 text-slate-950 font-retro text-[9px] hover:bg-cyan-455">
            v3.0-it
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 flex-1 space-y-4 text-xs overflow-y-auto">
        {/* Connection Mode */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-retro text-slate-400 block">ROUTING SYSTEM</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sfx.playSelect();
                onUpdateSettings({ ...settings, connectionMode: 'direct' });
              }}
              className={`p-2 font-retro text-[9px] border-2 text-center transition-colors shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none ${
                settings.connectionMode === 'direct'
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                  : 'bg-slate-950 text-slate-400 border-slate-805 hover:border-slate-700'
              }`}
            >
              BROWSER DIRECT
            </button>
            <button
              onClick={() => {
                sfx.playSelect();
                onUpdateSettings({ ...settings, connectionMode: 'proxy' });
              }}
              className={`p-2 font-retro text-[9px] border-2 text-center transition-colors shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none ${
                settings.connectionMode === 'proxy'
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                  : 'bg-slate-950 text-slate-400 border-slate-805 hover:border-slate-700'
              }`}
            >
              SERVER PROXY
            </button>
          </div>
          <span className="text-[8px] text-slate-500 leading-tight block pt-0.5">
            {settings.connectionMode === 'direct'
              ? 'Direct local calls. Fast, but browser must allow localhost HTTP CORS.'
              : 'Proxies via container backend to evade CORS/mixed-content blocks.'}
          </span>
        </div>

        {/* LM Studio Endpoint Address */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-retro text-slate-400 block">LM STUDIO ENDPOINT</label>
          <div className="flex gap-2">
            <Input
              value={settings.lmStudioUrl}
              onChange={(e) => onUpdateSettings({ ...settings, lmStudioUrl: e.target.value })}
              className="font-mono bg-slate-950 border-2 border-slate-850 text-slate-200 h-9 p-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-cyan-500 rounded-none text-xs"
              placeholder="e.g. http://localhost:1234/v1"
            />
            <button
              disabled={testing}
              onClick={testConnection}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-retro text-[9px] h-9 px-3 border-2 border-slate-950 shadow-[0_2px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
            >
              {testing ? '...' : 'TEST'}
            </button>
          </div>
        </div>

        {/* Model ID Display (Locked to google/gemma-3-1b-2) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-retro text-slate-400 block">TARGET MODEL</label>
          <div className="font-mono bg-slate-950 border-2 border-slate-800 text-cyan-400 h-9 px-2.5 flex items-center justify-between text-xs select-none">
            <span>google/gemma-3-1b-2</span>
            <span className="text-[7.5px] font-retro px-1 py-0.5 bg-slate-850 text-slate-400 border border-slate-700">LOCKED</span>
          </div>
          <span className="text-[8px] text-slate-400 leading-tight block">
            Target model is pre-configured to utilize the optimized Google Gemma 3 1B pipeline natively. No manual input required.
          </span>
        </div>

        {/* Diagnostic Status Box */}
        {testResult.status !== 'idle' && (
          <div
            className={`p-2.5 border-2 text-[10px] font-mono leading-relaxed select-all rounded-none ${
              testResult.status === 'success'
                ? 'bg-emerald-950/40 text-emerald-450 border-emerald-800'
                : 'bg-rose-950/40 text-rose-455 border-rose-800'
            }`}
          >
            <div className="font-retro text-[8px] mb-1">
              STATUS: {testResult.status === 'success' ? '✔ LIVE' : '❌ OFFLINE'}
            </div>
            {testResult.message}
          </div>
        )}

        {/* AI Thinking delay */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] font-retro text-slate-400">
            <span>ENGINE SPEED DELAY</span>
            <span className="text-cyan-400 font-mono">{(settings.engineDelayMs / 1000).toFixed(1)}s</span>
          </div>
          <Slider
            min={100}
            max={5000}
            step={100}
            value={[settings.engineDelayMs]}
            onValueChange={(val) => onUpdateSettings({ ...settings, engineDelayMs: val[0] })}
            className="[&_[data-slot=slider-range]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:border-slate-950"
          />
        </div>

        {/* Fallback & Thought Settings */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="flex items-center space-x-2.5 cursor-pointer text-[10px] font-retro text-slate-300">
            <input
              type="checkbox"
              checked={settings.fallbackToRandom}
              onChange={(e) => {
                sfx.playSelect();
                onUpdateSettings({ ...settings, fallbackToRandom: e.target.checked });
              }}
              className="accent-cyan-500 h-4 w-4 rounded-none cursor-pointer border-2 border-slate-800 bg-slate-950"
            />
            <span>LOCAL ALGORITHM FALLBACK</span>
          </label>
          <span className="text-[8px] text-slate-500 leading-tight block pl-6">
            If LM Studio is offline or Gemma choice is invalid, automatically fallback to our smart local heuristic solver to keep the action seamless.
          </span>

          <label className="flex items-center space-x-2.5 cursor-pointer text-[10px] font-retro text-slate-300 pt-1">
            <input
              type="checkbox"
              checked={settings.showThoughtProcess}
              onChange={(e) => {
                sfx.playSelect();
                onUpdateSettings({ ...settings, showThoughtProcess: e.target.checked });
              }}
              className="accent-cyan-500 h-4 w-4 rounded-none cursor-pointer border-2 border-slate-800 bg-slate-950"
            />
            <span>SHOW COG THINKING PROMPT</span>
          </label>
          <span className="text-[8px] text-slate-500 leading-tight block pl-6">
            Force Gemma to provide a JSON thought rationale block to print inside the retro monitor terminal.
          </span>

          <label className="flex items-center space-x-2.5 cursor-pointer text-[10px] font-retro text-slate-300 pt-1">
            <input
              type="checkbox"
              checked={!!settings.persistMoveHistory}
              onChange={(e) => {
                sfx.playSelect();
                onUpdateSettings({ ...settings, persistMoveHistory: e.target.checked });
              }}
              className="accent-cyan-500 h-4 w-4 rounded-none cursor-pointer border-2 border-slate-800 bg-slate-950"
            />
            <span>PERSIST MOVE HISTORY</span>
          </label>
          <span className="text-[8px] text-slate-500 leading-tight block pl-6">
            Safeguard and restore your move history, board positions, and stdout logs across browser reboots.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
