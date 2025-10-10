import store from "../../app/store";
import { websocketService } from "./websocketService";
import { throttle } from "../../utils/throttle";
import { Events } from "./enums/Events";
import { gameStateApi } from "../../features/game/services/gameStateApi";
import { buzzerApi } from "../../features/game/services/buzzerApi";
import { setGameState } from "../../features/game/services/gameStateSlice";

export const setupGlobalListeners = () => {
  // Game State Changed Event
  websocketService.addGlobalListener(
    Events.GAME_STATE_CHANGED,
    (data: any) => {
      console.log("Game state changed:", data);
      // Update game state in Redux
      store.dispatch(setGameState(data));
      // Invalidate game state query to refetch
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
    },
    "redux"
  );

  // Buzzer Pressed Event (broadcast to all)
  websocketService.addGlobalListener(
    Events.BUZZER_PRESSED,
    throttle(() => {
      console.log("Buzzer pressed by another team");
      // Invalidate buzzer leaderboard to show updated rankings
      store.dispatch(buzzerApi.util.invalidateTags(["BuzzerLeaderboard"]));
    }, 1000),
    "redux"
  );

  // Buzzer Pressed Success (for the team that pressed)
  websocketService.addGlobalListener(
    Events.BUZZER_PRESSED_SUCCESS,
    (data: any) => {
      console.log("Buzzer press successful:", data);
      // Invalidate buzzer leaderboard
      store.dispatch(buzzerApi.util.invalidateTags(["BuzzerLeaderboard"]));
    },
    "redux"
  );

  // Buzzer Error
  websocketService.addGlobalListener(
    Events.BUZZER_ERROR,
    (data: any) => {
      console.error("Buzzer error:", data);
      // You can dispatch a toast notification here
    },
    "redux"
  );
};

export const initializeWebSocket = async (
  serverUrl: string,
  authToken?: string
) => {
  try {
    const options: any = {};
    if (authToken) {
      options.auth = { token: authToken };
    }

    await websocketService.connect(serverUrl, options);
    setupGlobalListeners();
    console.log("Socket.IO initialized with global listeners");
  } catch (error) {
    console.error("Failed to initialize Socket.IO:", error);
    throw error;
  }
};
