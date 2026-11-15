// 100% Procedural Web Audio API sound, thruster, leak, footsteps, doors, alarm, and music synthesizer

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private leakNode: AudioBufferSourceNode | null = null;
  private leakGain: GainNode | null = null;

  private musicEnabled = true;
  private sfxEnabled = true;
  private volume = 0.65;
  private noteIndex = 0;
  private isIndoors = false;

  // Cinematic adventure theme motif
  private readonly melodyNotes = [261.63, 329.63, 392.0, 493.88, 523.25, 440.0, 392.0, 329.63];

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 0.22 : 0;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 0.6 : 0;
    this.sfxGain.connect(this.masterGain);

    this.startMartianAmbience();
    this.startAmbientMusic();
  }

  public updateSettings(musicEnabled: boolean, sfxEnabled: boolean, volume: number): void {
    this.musicEnabled = musicEnabled;
    this.sfxEnabled = sfxEnabled;
    this.volume = volume;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(volume, now, 0.08);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(musicEnabled ? 0.22 : 0, now, 0.12);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(sfxEnabled ? 0.6 : 0, now, 0.05);
    if (this.windGain) {
      const windLevel = musicEnabled ? (this.isIndoors ? 0.015 : 0.05) : 0;
      this.windGain.gain.setTargetAtTime(windLevel, now, 0.2);
    }
  }

  public setIndoors(indoors: boolean): void {
    if (this.isIndoors === indoors) return;
    this.isIndoors = indoors;
    if (!this.ctx || !this.windGain) return;
    const target = this.musicEnabled ? (indoors ? 0.014 : 0.05) : 0;
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  public setWindIntensity(intensity01: number): void {
    if (!this.ctx || !this.windGain || !this.musicEnabled) return;
    const base = this.isIndoors ? 0.014 : 0.045 + intensity01 * 0.095;
    this.windGain.gain.setTargetAtTime(base, this.ctx.currentTime, 0.35);
  }

  private startMartianAmbience(): void {
    if (!this.ctx || !this.masterGain) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 1.5;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = this.musicEnabled ? 0.05 : 0;

    noise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    noise.start();
    this.windNode = noise;

    // Continuous water leak hiss node (volume toggled dynamically during water emergency)
    const leakNoise = this.ctx.createBufferSource();
    leakNoise.buffer = buffer;
    leakNoise.loop = true;
    const leakFilter = this.ctx.createBiquadFilter();
    leakFilter.type = 'highpass';
    leakFilter.frequency.value = 1800;
    this.leakGain = this.ctx.createGain();
    this.leakGain.gain.value = 0;
    leakNoise.connect(leakFilter);
    leakFilter.connect(this.leakGain);
    this.leakGain.connect(this.sfxGain ?? this.masterGain);
    leakNoise.start();
    this.leakNode = leakNoise;
  }

  public setWaterLeakSound(active: boolean): void {
    if (!this.ctx || !this.leakGain) return;
    this.leakGain.gain.setTargetAtTime(active && this.sfxEnabled ? 0.11 : 0, this.ctx.currentTime, 0.15);
  }

  private startAmbientMusic(): void {
    if (this.musicInterval !== null) return;
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const freq = this.melodyNotes[this.noteIndex % this.melodyNotes.length];
      this.noteIndex++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1.55);

      if (this.noteIndex % 4 === 1) {
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(this.noteIndex % 8 === 1 ? 130.81 : 98.0, now);
        bassGain.gain.setValueAtTime(0.0001, now);
        bassGain.gain.exponentialRampToValueAtTime(0.15, now + 0.25);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.9);
        bass.connect(bassGain);
        bassGain.connect(this.musicGain);
        bass.start(now);
        bass.stop(now + 3.0);
      }
    }, 950);
  }

  public playClick(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playFootstep(sprint = false, indoor = false): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = indoor ? 'triangle' : 'sine';
    const baseFreq = indoor ? 155 : 108;
    osc.frequency.setValueAtTime(baseFreq + (sprint ? 24 : 0), now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.065);
    gain.gain.setValueAtTime(sprint ? 0.095 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playDoorAirlock(opening = true): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 190 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 340 : 150, now + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playThrusterRumble(durationSec = 2.4): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + durationSec);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 170;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  public playRadioChirp(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [880, 1180].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.1, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.07);
    });
  }

  public playAlert(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, start);
      osc.frequency.linearRampToValueAtTime(390, start + 0.16);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.22);
    }
  }

  public playToolSuccess(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playSeedPlant(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [440, 587.33].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playMissionComplete(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [392.0, 493.88, 587.33, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  public playScannerPing(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.18);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCameraShutter(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [1300, 720].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.05);
    });
  }

  public playGeigerTick(): void {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1650, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.022);
  }

  public playVehicleBoot(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [220, 330, 440, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.085;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playWireZap(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [520, 780, 1046.5].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playGentleRetry(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public dispose(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    try {
      this.windNode?.stop();
      this.leakNode?.stop();
    } catch {
      // ignore
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
