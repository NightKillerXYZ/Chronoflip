class AudioService {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private stopTimeout: any = null;
  private activeNodes: AudioNode[] = []; 
  private customSounds: Map<string, AudioBuffer> = new Map();

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // --- Public API ---

  public resumeContext() {
    this.init();
  }

  public async addCustomSound(id: string, file: File): Promise<void> {
    this.init();
    if (!this.audioContext) return;
    
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.customSounds.set(id, audioBuffer);
  }

  public getCustomSoundIds(): string[] {
    return Array.from(this.customSounds.keys());
  }

  /**
   * Plays a subtle tick sound for UI interactions.
   */
  public playTick() {
    // Debounce/Throttle check could be added if needed, but Web Audio is fast.
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    // Create a short, high-pitched blip
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, this.audioContext.currentTime); // Very quiet
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.05);
  }

  /**
   * Plays the sound.
   * @param soundId ID of the sound
   * @param duration Duration in seconds. Defaults to 20s (Alarm mode).
   */
  public playAlarm(soundId: string = 'radar', duration: number = 20) {
    this.init();
    if (!this.audioContext) return;
    
    this.stopAlarm(); // Stop any currently playing
    this.isPlaying = true;

    const now = this.audioContext.currentTime;

    // Check for custom sound first
    if (this.customSounds.has(soundId)) {
      this.playCustomBuffer(this.customSounds.get(soundId)!, now, duration);
    } else {
      this.playSynthPreset(soundId, now, duration);
    }

    // Auto stop after duration
    this.stopTimeout = setTimeout(() => {
      this.stopAlarm();
    }, duration * 1000);
  }

  public previewSound(soundId: string) {
    // Preview is limited to 5 seconds
    this.playAlarm(soundId, 5);
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.stopTimeout) clearTimeout(this.stopTimeout);
    this.stopNodes();
  }

  // --- Internal Logic ---

  private stopNodes() {
    this.activeNodes.forEach(node => {
        try {
            if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                node.stop();
                node.disconnect();
            } else if (node instanceof GainNode) {
                // Ramp down to avoid clicks
                node.gain.setTargetAtTime(0, this.audioContext!.currentTime, 0.05);
                setTimeout(() => node.disconnect(), 100);
            }
        } catch (e) { /* ignore */ }
    });
    this.activeNodes = [];
  }

  private playCustomBuffer(buffer: AudioBuffer, startTime: number, duration: number) {
     if (!this.audioContext) return;
     const source = this.audioContext.createBufferSource();
     source.buffer = buffer;
     source.loop = true; // Loop shorter files
     
     const gain = this.audioContext.createGain();
     source.connect(gain);
     gain.connect(this.audioContext.destination);
     
     source.start(startTime);
     this.activeNodes.push(source, gain);
  }

  private playSynthPreset(id: string, now: number, duration: number) {
    // Dispatch to specific synth function
    switch (id) {
      case 'ripple': this.synthRipple(now); break;
      case 'cosmic': this.synthCosmic(now); break;
      case 'beacon': this.synthBeacon(now); break;
      case 'orbit': this.synthOrbit(now); break;
      case 'crystal': this.synthCrystal(now); break;
      case 'retro': this.synthRetro(now); break;
      case 'bounce': this.synthBounce(now); break;
      case 'echo': this.synthEcho(now); break;
      case 'shimmer': this.synthShimmer(now); break;
      case 'mars': this.synthMars(now); break;
      case 'void': this.synthVoid(now); break;
      case 'radar': default: this.synthRadar(now); break;
    }
  }

  // --- Synthesizers ---

  // 1. Radar (Sharp, Aggressive)
  private synthRadar(t: number) {
     this.createLoop(t, 1.0, 30, (time) => {
        [0, 0.15, 0.3].forEach(offset => 
            this.tone(time + offset, 'sawtooth', 1100, 0.15, 0.1, 1000)
        );
     });
  }

  // 2. Ripple (Arpeggio)
  private synthRipple(t: number) {
    const notes = [523, 659, 784, 1046, 784, 659];
    this.createLoop(t, 1.5, 15, (loopStart) => {
        notes.forEach((freq, i) => 
            this.tone(loopStart + i * 0.08, 'sine', freq, 0.4, 0.01)
        );
    });
  }

  // 3. Cosmic (Pad)
  private synthCosmic(t: number) {
    const ratios = [1, 1.5, 2.0, 2.5]; 
    this.createLoop(t, 3.0, 8, (loopStart) => {
        ratios.forEach(r => 
            this.tone(loopStart, 'triangle', 220 * r, 2.5, 1.0)
        );
    });
  }

  // 4. Beacon (Glassy FM)
  private synthBeacon(t: number) {
    this.createLoop(t, 1.2, 20, (loopStart) => {
        this.tone(loopStart, 'sine', 880, 0.8, 0.02, 1760);
    });
  }

  // 5. Orbit (Spacey)
  private synthOrbit(t: number) {
     const notes = [440, 554, 659, 880];
     this.createLoop(t, 2.0, 10, (start) => {
        notes.forEach((f, i) => {
            this.tone(start + i * 0.2, 'sine', f, 0.5, 0.1, f + 10); // slight pitch drift
        });
     });
  }

  // 6. Crystal (High Bell)
  private synthCrystal(t: number) {
      this.createLoop(t, 2.0, 10, (start) => {
          this.tone(start, 'sine', 1568, 1.5, 0.01);
          this.tone(start + 0.2, 'sine', 1175, 1.5, 0.01);
      });
  }

  // 7. Retro (8-bit)
  private synthRetro(t: number) {
      this.createLoop(t, 0.5, 40, (start) => {
          this.tone(start, 'square', 440, 0.1, 0.01);
          this.tone(start + 0.1, 'square', 880, 0.1, 0.01);
      });
  }

  // 8. Bounce (Rubber)
  private synthBounce(t: number) {
      this.createLoop(t, 0.8, 25, (start) => {
          const osc = this.createOsc('sine', 200, start);
          osc.frequency.exponentialRampToValueAtTime(800, start + 0.2);
          this.connectEnv(osc, start, 0.2, 0.01);
      });
  }

  // 9. Echo (Delay effect sim)
  private synthEcho(t: number) {
      this.createLoop(t, 1.5, 15, (start) => {
          [0, 0.2, 0.4].forEach((d, i) => {
              this.tone(start + d, 'triangle', 300, 0.3 - i*0.1, 0.05);
          });
      });
  }

  // 10. Shimmer (High Freq tremolo)
  private synthShimmer(t: number) {
      this.createLoop(t, 2.0, 10, (start) => {
          const osc = this.createOsc('sine', 1200, start);
          // Simple Vibrato manually
          osc.frequency.setValueCurveAtTime(new Float32Array([1200, 1210, 1200, 1190, 1200]), start, 1.0);
          this.connectEnv(osc, start, 1.5, 0.5);
      });
  }

  // 11. Mars (Low Sci-fi)
  private synthMars(t: number) {
      this.createLoop(t, 1.0, 20, (start) => {
          const osc = this.createOsc('sawtooth', 110, start); // Low A2
          osc.frequency.linearRampToValueAtTime(55, start + 0.8); // Drop
          this.connectEnv(osc, start, 0.8, 0.1);
      });
  }

  // 12. Void (Empty space drone)
  private synthVoid(t: number) {
      this.createLoop(t, 4.0, 5, (start) => {
          this.tone(start, 'sine', 60, 3.5, 2.0); // Sub bass
          this.tone(start, 'sine', 120, 3.5, 2.0);
      });
  }

  // --- Helpers ---

  private createLoop(startTime: number, loopDuration: number, iterations: number, callback: (t: number) => void) {
      for(let i=0; i<iterations; i++) {
          callback(startTime + i * loopDuration);
      }
  }

  private createOsc(type: OscillatorType, freq: number, startTime: number): OscillatorNode {
      const osc = this.audioContext!.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      return osc;
  }

  private connectEnv(osc: OscillatorNode, startTime: number, duration: number, attack: number) {
      const env = this.audioContext!.createGain();
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(0.3, startTime + attack);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(env);
      env.connect(this.audioContext!.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
      
      this.activeNodes.push(osc, env);
  }

  private tone(startTime: number, type: OscillatorType, freq: number, duration: number, attack: number, endFreq?: number) {
      const osc = this.createOsc(type, freq, startTime);
      if (endFreq) {
          osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + attack);
      }
      this.connectEnv(osc, startTime, duration, attack);
  }
}

export const audioService = new AudioService();