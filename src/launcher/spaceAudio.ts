class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private muted = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAmbience();
    } else {
      this.startAmbience();
    }
    return this.muted;
  }

  public startAmbience(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || this.oscA) return;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.2);

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55; // A1 warm cosmic hum

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 82.41; // E2 fifth harmonic

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscA.start();
    oscB.start();

    this.droneGain = gain;
    this.oscA = oscA;
    this.oscB = oscB;
  }

  public stopAmbience(): void {
    if (!this.ctx || !this.droneGain) return;
    const now = this.ctx.currentTime;
    try {
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setValueAtTime(Math.max(0.0001, this.droneGain.gain.value), now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    } catch {
      // Ignore gain ramp errors on inactive audio graph
    }
    const oscA = this.oscA;
    const oscB = this.oscB;
    this.oscA = null;
    this.oscB = null;
    this.droneGain = null;
    window.setTimeout(() => {
      try {
        oscA?.stop();
        oscB?.stop();
      } catch {
        // Already stopped
      }
    }, 280);
  }

  public playHover(world: 'mars' | 'moon'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(world === 'mars' ? 330 : 392, now);
    osc.frequency.exponentialRampToValueAtTime(world === 'mars' ? 370 : 440, now + 0.14);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playLaunch(world: 'mars' | 'moon'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = world === 'mars' ? 220 : 261.63;

    [1, 1.5, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * mult, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 1.12, now + i * 0.06 + 0.35);

      gain.gain.setValueAtTime(0.0001, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.05, now + i * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.48);
    });
  }
}

export const spaceAudio = new SpaceAudioEngine();
