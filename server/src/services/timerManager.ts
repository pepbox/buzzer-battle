import { Types } from 'mongoose';

/**
 * Timer Manager for handling game state transitions
 * Manages server-side timeouts for buzzer rounds and answering phases
 */
class TimerManager {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Schedule a timer for buzzer round auto-transition
     * @param sessionId - Session ID
     * @param duration - Duration in seconds
     * @param callback - Function to call when timer expires
     * @returns Timer key for cancellation
     */
    scheduleBuzzerTimer(
        sessionId: Types.ObjectId | string,
        duration: number,
        callback: () => Promise<void>
    ): string {
        const timerKey = `buzzer-${sessionId.toString()}`;
        
        // Cancel existing timer if any
        this.cancelTimer(timerKey);

        // Schedule new timer
        const timer = setTimeout(async () => {
            console.log(`⏰ Buzzer timer expired for session ${sessionId}`);
            try {
                await callback();
            } catch (error) {
                console.error(`Error in buzzer timer callback for session ${sessionId}:`, error);
            } finally {
                this.timers.delete(timerKey);
            }
        }, duration * 1000);

        this.timers.set(timerKey, timer);
        console.log(`✅ Buzzer timer scheduled for session ${sessionId} (${duration}s)`);
        
        return timerKey;
    }

    /**
     * Schedule a timer for answering round auto-transition
     * @param sessionId - Session ID
     * @param teamId - Current answering team ID
     * @param duration - Duration in seconds
     * @param callback - Function to call when timer expires
     * @returns Timer key for cancellation
     */
    scheduleAnsweringTimer(
        sessionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string,
        duration: number,
        callback: () => Promise<void>
    ): string {
        const timerKey = `answering-${sessionId.toString()}-${teamId.toString()}`;
        
        // Cancel existing timer if any
        this.cancelTimer(timerKey);

        // Schedule new timer
        const timer = setTimeout(async () => {
            console.log(`⏰ Answering timer expired for session ${sessionId}, team ${teamId}`);
            try {
                await callback();
            } catch (error) {
                console.error(`Error in answering timer callback:`, error);
            } finally {
                this.timers.delete(timerKey);
            }
        }, duration * 1000);

        this.timers.set(timerKey, timer);
        console.log(`✅ Answering timer scheduled for session ${sessionId} (${duration}s)`);
        
        return timerKey;
    }

    /**
     * Cancel a specific timer
     * @param timerKey - The key of the timer to cancel
     */
    cancelTimer(timerKey: string): void {
        const timer = this.timers.get(timerKey);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(timerKey);
            console.log(`❌ Timer cancelled: ${timerKey}`);
        }
    }

    /**
     * Cancel all timers for a session
     * @param sessionId - Session ID
     */
    cancelSessionTimers(sessionId: Types.ObjectId | string): void {
        const sessionIdStr = sessionId.toString();
        const keysToDelete: string[] = [];

        this.timers.forEach((timer, key) => {
            if (key.includes(sessionIdStr)) {
                clearTimeout(timer);
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.timers.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`❌ Cancelled ${keysToDelete.length} timers for session ${sessionId}`);
        }
    }

    /**
     * Cancel all active timers
     */
    cancelAllTimers(): void {
        this.timers.forEach((timer, key) => {
            clearTimeout(timer);
        });
        this.timers.clear();
        console.log('❌ All timers cancelled');
    }

    /**
     * Get active timer count
     */
    getActiveTimerCount(): number {
        return this.timers.size;
    }

    /**
     * Check if a timer exists
     */
    hasTimer(timerKey: string): boolean {
        return this.timers.has(timerKey);
    }
}

// Export singleton instance
export const timerManager = new TimerManager();
