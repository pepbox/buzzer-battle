import store from "../../app/store";
import { websocketService } from "./websocketService";
import { throttle } from "../../utils/throttle";
import { Events } from "./enums/Events";
import { gameStateApi } from "../../features/game/services/gameStateApi";
import { buzzerApi } from "../../features/game/services/buzzerApi";
import { setGameState } from "../../features/game/services/gameStateSlice";
import { adminApi } from "../../features/admin/services/admin.Api";
import { teamApi } from "../../features/game/services/teamApi";
import { questionApi } from "../../features/question/services/questions.api";
import { clearAdmin } from "../../features/admin/services/adminSlice";
import { clearTeam } from "../../features/game/services/teamSlice";

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
    "redux",
  );

  // Buzzer Pressed Event (broadcast to all)
  websocketService.addGlobalListener(
    Events.BUZZER_PRESSED,
    throttle(() => {
      console.log("Buzzer pressed by another team");
      // Invalidate buzzer leaderboard to show updated rankings
      store.dispatch(buzzerApi.util.invalidateTags(["BuzzerLeaderboard"]));
    }, 1000),
    "redux",
  );

  // Buzzer Pressed Success (for the team that pressed)
  websocketService.addGlobalListener(
    Events.BUZZER_PRESSED_SUCCESS,
    (data: any) => {
      console.log("Buzzer press successful:", data);
      // Invalidate buzzer leaderboard
      store.dispatch(buzzerApi.util.invalidateTags(["BuzzerLeaderboard"]));
    },
    "redux",
  );

  // Buzzer Error
  websocketService.addGlobalListener(
    Events.BUZZER_ERROR,
    (data: any) => {
      console.error("Buzzer error:", data);
      // You can dispatch a toast notification here
    },
    "redux",
  );

  // Team Joined Event (for admins)
  websocketService.addGlobalListener(
    Events.TEAM_JOINED,
    (data: any) => {
      console.log("New team joined:", data);
      // Invalidate teams list and dashboard data
      // Note: You'll need to add these API tags to your teams API
      store.dispatch(adminApi.util.invalidateTags(["Team"]));
    },
    "redux",
  );

  // Buzzer Round Started Event
  websocketService.addGlobalListener(
    Events.BUZZER_ROUND_STARTED,
    (data: any) => {
      console.log("Buzzer round started:", data);
      // Component-specific handlers will manage the timer
      // This is just for global state updates
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      store.dispatch(questionApi.util.invalidateTags(["Question"]));
      store.dispatch(buzzerApi.util.invalidateTags(["BuzzerLeaderboard"]));
    },
    "redux",
  );

  // Answering Round Started Event
  websocketService.addGlobalListener(
    Events.ANSWERING_ROUND_STARTED,
    (data: any) => {
      console.log("Answering round started:", data);
      // Component-specific handlers will manage the timer
    },
    "redux",
  );

  // Team Selected Event
  websocketService.addGlobalListener(
    Events.TEAM_SELECTED,
    (data: any) => {
      console.log("Team selected to answer:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
    },
    "redux",
  );

  // Answer Marked Correct Event
  websocketService.addGlobalListener(
    Events.ANSWER_MARKED_CORRECT,
    (data: any) => {
      console.log("Answer marked correct:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      store.dispatch(teamApi.util.invalidateTags(["Leaderboard", "Team"]));
      store.dispatch(questionApi.util.invalidateTags(["Question"]));
    },
    "redux",
  );

  // Answer Marked Wrong Event
  websocketService.addGlobalListener(
    Events.ANSWER_MARKED_WRONG,
    (data: any) => {
      console.log("Answer marked wrong:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      store.dispatch(teamApi.util.invalidateTags(["Leaderboard", "Team"]));
    },
    "redux",
  );

  // Second Chance Event
  websocketService.addGlobalListener(
    Events.SECOND_CHANCE,
    (data: any) => {
      console.log("Second chance given:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
    },
    "redux",
  );

  // Game Ended Event
  websocketService.addGlobalListener(
    Events.GAME_ENDED,
    (data: any) => {
      console.log("Game ended:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      // Invalidate leaderboard to show final results
      // store.dispatch(teamsApi.util.invalidateTags(["Leaderboard"]));
    },
    "redux",
  );
  // Answer Submitted Event
  websocketService.addGlobalListener(
    Events.ANSWER_SUBMITTED,
    (data: any) => {
      console.log("Answer submitted:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      store.dispatch(teamApi.util.invalidateTags(["Leaderboard"]));
      // Invalidate teams and leaderboard
      // store.dispatch(teamsApi.util.invalidateTags(["Teams", "Leaderboard"]));
    },
    "redux",
  );

  websocketService.addGlobalListener(
    Events.SHOW_ANSWER,
    (data: any) => {
      console.log("Show answer triggered:", data);
      store.dispatch(gameStateApi.util.invalidateTags(["GameState"]));
      store.dispatch(questionApi.util.invalidateTags(["Question"]));
    },
    "redux",
  );

  // Session Ended Event - force logout all users in this session
  websocketService.addGlobalListener(
    Events.SESSION_ENDED,
    (data: any) => {
      console.warn("Session ended event received:", data);

      // Clear both auth states to ensure all user types are logged out
      store.dispatch(clearAdmin());
      store.dispatch(clearTeam());

      // Redirect based on current route. Use hard navigation to avoid stale app state.
      const pathname = window.location.pathname;
      const sessionIdFromPath = pathname.split("/")[2] || "";

      if (pathname.startsWith("/admin/")) {
        window.location.replace(`/admin/${sessionIdFromPath}/login`);
        return;
      }

      if (pathname.startsWith("/game/")) {
        window.location.replace(`/game/${sessionIdFromPath}/`);
        return;
      }

      window.location.replace("/");
    },
    "redux",
  );
};

export const initializeWebSocket = async (
  serverUrl: string,
  authToken?: string,
  sessionId?: string,
) => {
  try {
    const options: any = {};
    if (authToken) {
      options.auth = { token: authToken };
    }

    if (sessionId) {
      options.auth = {
        ...(options.auth || {}),
        sessionId,
      };
    }

    await websocketService.connect(serverUrl, options);
    setupGlobalListeners();
    console.log("Socket.IO initialized with global listeners");
  } catch (error) {
    console.error("Failed to initialize Socket.IO:", error);
    throw error;
  }
};
