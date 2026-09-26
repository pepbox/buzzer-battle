import { redis } from "../../../services/redis/redisClient";
import { IGamistanLiveState } from "../types/interfaces";

const memoryStore = new Map<string, IGamistanLiveState>();

const getDefaultState = (): IGamistanLiveState => ({
  roundType: "BUZZER",
  isSpinWheelEnabled: false,
  availableCategories: [
    "Who Am I?",
    "Guess The Song",
    "Rumble Jumble : Guess The Movie and the song",
    "Prop Round : Guess The Movie",
    "English Vinglish",
  ],
  spinPermissionGranted: false,
  selectedCategory: "",
  usedQuestionIds: [],
  isQuestionVisible: true,
});

export class GamistanLiveStateService {
  private getKey(sessionId: string): string {
    return `gamistan:liveState:${sessionId}`;
  }

  async getState(sessionId: string): Promise<IGamistanLiveState> {
    try {
      if (redis && redis.status === "ready") {
        const raw = await redis.get(this.getKey(sessionId));
        if (raw) {
          return { ...getDefaultState(), ...JSON.parse(raw) };
        }
      }
    } catch (err) {
      console.warn("Redis get failed for Gamistan live state, using memory store:", err);
    }

    if (!memoryStore.has(sessionId)) {
      memoryStore.set(sessionId, getDefaultState());
    }
    return memoryStore.get(sessionId)!;
  }

  async updateState(
    sessionId: string,
    patch: Partial<IGamistanLiveState>,
  ): Promise<IGamistanLiveState> {
    const current = await this.getState(sessionId);
    const isSpin = typeof patch.isSpinWheelEnabled === "boolean"
      ? patch.isSpinWheelEnabled
      : typeof current.isSpinWheelEnabled === "boolean"
      ? current.isSpinWheelEnabled
      : false;

    const updated: IGamistanLiveState = {
      ...current,
      ...patch,
      roundType: patch.roundType || (isSpin ? "SPIN_WHEEL" : "BUZZER"),
    };

    memoryStore.set(sessionId, updated);

    try {
      if (redis && redis.status === "ready") {
        await redis.set(this.getKey(sessionId), JSON.stringify(updated), "EX", 86400); // 24hr TTL
      }
    } catch (err) {
      console.warn("Redis set failed for Gamistan live state:", err);
    }

    return updated;
  }

  async addUsedQuestionId(sessionId: string, questionId: string): Promise<IGamistanLiveState> {
    const current = await this.getState(sessionId);
    if (!current.usedQuestionIds.includes(questionId)) {
      const updatedUsed = [...current.usedQuestionIds, questionId];
      return await this.updateState(sessionId, { usedQuestionIds: updatedUsed });
    }
    return current;
  }
}

export const gamistanLiveState = new GamistanLiveStateService();
