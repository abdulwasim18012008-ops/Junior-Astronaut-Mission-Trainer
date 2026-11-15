// 100% Procedural Web Audio API synthesizer — zero external audio dependencies

class LunarAudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private roverGain: GainNode | null = null;
  private roverOsc: OscillatorNode | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.roverGain && this.ctx) {
      this.roverGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock() {
    this.ensureContext();
  }

  public playTone(freq: number, duration = 0.14, type: OscillatorType = 'sine', volume = 0.12, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  public playChime() {
    this.playTone(587.33, 0.15, 'triangle', 0.12, 0);
    this.playTone(880, 0.25, 'sine', 0.12, 0.09);
  }

  public playRadioBeep() {
    this.playTone(1046.5, 0.08, 'sine', 0.1, 0);
    this.playTone(1318.5, 0.08, 'sine', 0.1, 0.11);
    this.playTone(1567.98, 0.16, 'sine', 0.1, 0.22);
  }

  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(380, t0 + 0.22);
    gain.gain.setValueAtTime(0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.26);
  }

  public playLand() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.15);
    gain.gain.setValueAtTime(0.11, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }

  public playScanPulse() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(980, t0 + 0.35);
    gain.gain.setValueAtTime(0.09, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }

  public playSuccessFanfare() {
    this.playTone(523.25, 0.15, 'triangle', 0.12, 0);
    this.playTone(659.25, 0.15, 'triangle', 0.12, 0.1);
    this.playTone(783.99, 0.15, 'triangle', 0.12, 0.2);
    this.playTone(1046.5, 0.4, 'sine', 0.14, 0.3);
  }

  public playApolloDiscoveryChime() {
    // Subtle, respectful harmonic chime for historic Tranquility Base inspection
    this.playTone(392.0, 0.85, 'sine', 0.08, 0.0);
    this.playTone(493.88, 0.9, 'sine', 0.075, 0.22);
    this.playTone(587.33, 1.0, 'triangle', 0.065, 0.48);
    this.playTone(783.99, 1.45, 'sine', 0.085, 0.78);
    this.playTone(1174.66, 1.3, 'sine', 0.045, 1.12);
  }

  public playRocketLaunch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 2.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(320, ctx.currentTime + 1.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public updateRoverHum(active: boolean, speed: number) {
    if (this.muted) return;
    if (!active) {
      if (this.roverGain && this.ctx) {
        this.roverGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.roverOsc || !this.roverGain) {
      this.roverOsc = ctx.createOscillator();
      this.roverGain = ctx.createGain();
      this.roverOsc.type = 'triangle';
      this.roverOsc.frequency.value = 65;
      this.roverGain.gain.value = 0;
      this.roverOsc.connect(this.roverGain);
      this.roverGain.connect(ctx.destination);
      this.roverOsc.start();
    }
    const absSpd = Math.min(Math.abs(speed), 18);
    const targetFreq = 62 + absSpd * 7.5;
    const targetGain = absSpd > 0.3 ? Math.min(0.055, 0.012 + absSpd * 0.003) : 0.004;
    this.roverOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
    this.roverGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
  }
}

export const lunarAudio = new LunarAudioManager();
