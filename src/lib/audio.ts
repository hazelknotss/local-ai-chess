/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    // Resume context if suspended (browser security blocks auto-play)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // Pure 8-bit move blip
  playMove() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square'; // classic 8-bit square wave
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Crunchy 8-bit capture sweep
  playCapture() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Synthesize noise/sawtooth crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth'; // rugged 8-bit wave for textures
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Alarm sound/Check warn
  playCheck() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const t = 0.12;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(584, now + t / 2);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.setValueAtTime(292, now + t / 2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + t);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + t);
      osc2.stop(now + t);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Ascending major arpeggio (C4 - E4 - G4 - C5 - E5)
  playVictory() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25]; // C, E, G, C, E
      const duration = 0.08;

      freqs.forEach((freq, index) => {
        const toneTime = now + index * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, toneTime);

        gain.gain.setValueAtTime(0.08, toneTime);
        gain.gain.exponentialRampToValueAtTime(0.005, toneTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(toneTime);
        osc.stop(toneTime + duration);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Descending minor theme (G4 - Eb4 - C4 - Ab3)
  playDefeat() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [392.00, 311.13, 261.63, 207.65]; // G4, Eb4, C4, Ab3
      const duration = 0.15;

      freqs.forEach((freq, index) => {
        const toneTime = now + index * 0.16;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, toneTime);

        gain.gain.setValueAtTime(0.12, toneTime);
        gain.gain.exponentialRampToValueAtTime(0.005, toneTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(toneTime);
        osc.stop(toneTime + duration);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Short click for UI buttons
  playSelect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // 8-bit Spell Cast frequency warp sweep
  playSpellCast() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }
}

export const sfx = new AudioSynth();
