// Web Audio API helper for realistic radar sonar pings & alerts

class RadarAudioEngine {
  private ctx: AudioContext | null = null;
  private lastPingTime = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playSonarPing(confidence: number) {
    const now = Date.now();
    // throttle pings
    if (now - this.lastPingTime < 350) return;
    this.lastPingTime = now;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch scales from 600Hz to 1400Hz depending on confidence
      const baseFreq = 700 + (confidence * 6);
      osc.type = confidence > 70 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2500, ctx.currentTime);

      const maxGain = Math.min(0.2, 0.03 + (confidence / 100) * 0.15);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(maxGain, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio autoplay policy or device audio unsupported
    }
  }

  public playAlertBeep() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch {}
  }
}

export const radarAudio = new RadarAudioEngine();
