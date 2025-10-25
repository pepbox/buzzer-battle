/**
 * Synchronized Timer Utility
 * 
 * This class helps maintain synchronized timers across all clients
 * by calculating remaining time based on server-provided start time
 * rather than local client time.
 */

export class SyncedTimer {
  private startTime: number;
  private duration: number;
  private interval: NodeJS.Timeout | null = null;
  private onTick: ((remaining: number) => void) | null = null;
  private onComplete: (() => void) | null = null;

  /**
   * @param startTime - Unix timestamp (milliseconds) when the timer started
   * @param duration - Duration of the timer in milliseconds
   */
  constructor(startTime: number, duration: number) {
    this.startTime = startTime;
    this.duration = duration;
  }

  /**
   * Get the remaining time in milliseconds
   */
  getRemainingTime(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Get the remaining time as a percentage (0-100)
   */
  getRemainingPercentage(): number {
    const remaining = this.getRemainingTime();
    return (remaining / this.duration) * 100;
  }

  /**
   * Check if the timer has expired
   */
  isExpired(): boolean {
    return this.getRemainingTime() <= 0;
  }

  /**
   * Start the timer
   * @param callback - Called every tick with remaining time in milliseconds
   * @param onComplete - Called when timer reaches 0
   * @param intervalMs - Update interval in milliseconds (default: 100ms)
   */
  start(
    callback: (remaining: number) => void,
    onComplete?: () => void,
    intervalMs: number = 100
  ) {
    this.onTick = callback;
    this.onComplete = onComplete || null;

    // Immediate callback with current remaining time
    const remaining = this.getRemainingTime();
    callback(remaining);

    // Check if already expired
    if (remaining <= 0 && onComplete) {
      onComplete();
      return;
    }

    // Set up interval for updates
    this.interval = setInterval(() => {
      const remaining = this.getRemainingTime();
      
      if (this.onTick) {
        this.onTick(remaining);
      }

      if (remaining <= 0) {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }, intervalMs);
  }

  /**
   * Stop the timer
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Format remaining time as MM:SS
   */
  static formatTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format remaining time as seconds only
   */
  static formatSeconds(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    return `${totalSeconds}s`;
  }
}

/**
 * Hook-friendly timer manager
 * Usage in React components with useEffect
 */
export class TimerManager {
  private timers: Map<string, SyncedTimer> = new Map();

  /**
   * Create or update a timer
   */
  createTimer(
    id: string,
    startTime: number,
    duration: number
  ): SyncedTimer {
    // Stop existing timer if any
    this.stopTimer(id);

    const timer = new SyncedTimer(startTime, duration);
    this.timers.set(id, timer);
    return timer;
  }

  /**
   * Get an existing timer
   */
  getTimer(id: string): SyncedTimer | undefined {
    return this.timers.get(id);
  }

  /**
   * Stop and remove a timer
   */
  stopTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.stop();
      this.timers.delete(id);
    }
  }

  /**
   * Stop all timers
   */
  stopAll() {
    this.timers.forEach(timer => timer.stop());
    this.timers.clear();
  }
}

// Export singleton instance
export const timerManager = new TimerManager();
