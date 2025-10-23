/**
 * Audio Manager for Presenter View
 * Uses Web Audio API to generate sound effects
 */

class PresenterAudio {
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeAudioContext();
    this.setupUserInteractionUnlock();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  private setupUserInteractionUnlock(): void {
    const unlockAudio = async () => {
      if (this.isUnlocked || !this.audioContext) return;

      try {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.001);

        this.isUnlocked = true;
        console.log('✅ Audio unlocked!');
        
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } catch (error) {
        console.error('Failed to unlock audio:', error);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
  }

  private generateBeep(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (this.isMuted || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const currentTime = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration / 1000);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration / 1000);
    } catch (error) {
      console.error('Failed to generate beep:', error);
    }
  }

  playBuzzer(): void {
    console.log('🔊 Playing buzzer sound');
    this.generateBeep(220, 300, 'square');
  }

  playTick(): void {
    console.log('🔊 Playing tick sound');
    this.generateBeep(880, 50, 'sine');
  }

  playAlarm(): void {
    console.log('🔊 Playing alarm sound');
    this.generateBeep(800, 150, 'square');
    setTimeout(() => this.generateBeep(600, 150, 'square'), 150);
    setTimeout(() => this.generateBeep(800, 150, 'square'), 300);
  }

  playSuccess(): void {
    console.log('🔊 Playing success sound');
    this.generateBeep(523, 100, 'sine');
    setTimeout(() => this.generateBeep(659, 100, 'sine'), 100);
    setTimeout(() => this.generateBeep(784, 200, 'sine'), 200);
  }

  playError(): void {
    console.log('🔊 Playing error sound');
    this.generateBeep(300, 400, 'sawtooth');
  }

  mute(): void {
    this.isMuted = true;
    console.log('🔇 Audio muted');
  }

  unmute(): void {
    this.isMuted = false;
    console.log('🔊 Audio unmuted');
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  setVolume(_volume: number): void {
    // Volume control could be implemented here
  }

  stopAll(): void {
    console.log('Stopping all sounds');
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const presenterAudio = new PresenterAudio();
export default PresenterAudio;
