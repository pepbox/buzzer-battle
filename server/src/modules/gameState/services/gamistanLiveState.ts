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
  private getKey(sessionId: string | any): string {
    return `gamistan:liveState:${sessionId?.toString()}`;
  }

  async getState(sessionId: string | any, fallbackDbState?: Partial<IGamistanLiveState>): Promise<IGamistanLiveState> {
    const sId = sessionId?.toString() || "";
    try {
      if (redis && redis.status === "ready") {
        const raw = await redis.get(this.getKey(sId));
        if (raw) {
          return { ...getDefaultState(), ...JSON.parse(raw) };
        }
      }
    } catch (err) {
      console.warn("Redis get failed for Gamistan live state, using memory store:", err);
    }

    if (!memoryStore.has(sId)) {
      const initial: IGamistanLiveState = {
        ...getDefaultState(),
        ...(typeof fallbackDbState?.isSpinWheelEnabled === "boolean"
          ? { isSpinWheelEnabled: fallbackDbState.isSpinWheelEnabled }
          : {}),
        ...(fallbackDbState?.roundType ? { roundType: fallbackDbState.roundType } : {}),
        ...(fallbackDbState?.selectedCategory ? { selectedCategory: fallbackDbState.selectedCategory } : {}),
        ...(fallbackDbState?.availableCategories && fallbackDbState.availableCategories.length > 0
          ? { availableCategories: fallbackDbState.availableCategories }
          : {}),
        ...(typeof fallbackDbState?.spinPermissionGranted === "boolean"
          ? { spinPermissionGranted: fallbackDbState.spinPermissionGranted }
          : {}),
      };
      if (initial.isSpinWheelEnabled && !fallbackDbState?.roundType) {
        initial.roundType = "SPIN_WHEEL";
      }
      memoryStore.set(sId, initial);
    }
    return memoryStore.get(sId)!;
  }

  async updateState(
    sessionId: string | any,
    patch: Partial<IGamistanLiveState>,
  ): Promise<IGamistanLiveState> {
    const sId = sessionId?.toString() || "";
    const current = await this.getState(sId);
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

    memoryStore.set(sId, updated);

    try {
      if (redis && redis.status === "ready") {
        await redis.set(this.getKey(sId), JSON.stringify(updated), "EX", 86400); // 24hr TTL
      }
    } catch (err) {
      console.warn("Redis set failed for Gamistan live state:", err);
    }

    return updated;
  }

  async addUsedQuestionId(sessionId: string | any, questionId: string): Promise<IGamistanLiveState> {
    const sId = sessionId?.toString() || "";
    const current = await this.getState(sId);
    if (!current.usedQuestionIds.includes(questionId)) {
      const updatedUsed = [...current.usedQuestionIds, questionId];
      return await this.updateState(sId, { usedQuestionIds: updatedUsed });
    }
    return current;
  }
}

export const gamistanLiveState = new GamistanLiveStateService();
