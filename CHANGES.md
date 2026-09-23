# Pepbox Buzzer Battle — Change Log

## 2026-09-18 15:10 IST

### 1. Server-Authoritative Leaderboard Visibility

Branch:
buzzer-changes

Area:
Buzzer Battle

Type:
EXTENSION / NEW LOGIC

Files:
- server/src/modules/gameState/models/gameState.model.ts
- server/src/modules/gameState/types/interfaces.ts
- server/src/modules/gameState/controllers/gameState.controller.ts
- client/src/features/admin/services/adminRemoteApi.ts
- client/src/features/admin/components/RemoteActionButtons.tsx
- client/src/features/admin/pages/RemoteControl.tsx
- client/src/features/game/services/gameStateApi.ts
- client/src/features/game/pages/LeaderBoard_Page.tsx

Function / Component:
- `gameStateSchema`
- `IGameState` interface
- `updateGameStateUnified` controller (`TOGGLE_LEADERBOARD` action)
- `useToggleLeaderboard` hook
- `RemoteActionButtons` component
- `LeaderBoardPage` component

Old Logic:
Participant clients could view the overall leaderboard by navigating to `/game/:sessionId/leaderboard` without checking if the operator had explicitly allowed it.

New Logic:
Added `isLeaderboardVisible` (boolean, default `false`) to `GameState`. Provided `TOGGLE_LEADERBOARD` action in `updateGameStateUnified` and added a "Show/Hide Leaderboard" button to `RemoteControl.tsx`. In `LeaderBoard_Page.tsx`, participants are blocked and shown a friendly overlay ("Leaderboard Hidden") if `isLeaderboardVisible` is `false`.

Reason:
Requirement Change A: Enforce server-authoritative control over leaderboard visibility so participants only see ranks when operator enables it.

Requirement:
PEBOX / BUZZER BATTLE Change A — Server-Authoritative Leaderboard Visibility

Database Impact:
Non-breaking optional `isLeaderboardVisible: boolean` field added to `GameState` schema (defaults to `false`).

API Impact:
`PATCH /api/v1/game-state` now accepts `{ action: "TOGGLE_LEADERBOARD", payload: { isVisible?: boolean } }`.

Socket Impact:
Broadcasts `SHOW_LEADERBOARD` and `GAME_STATE_CHANGED` socket events with `{ isLeaderboardVisible }`.

Testing:
Verified TypeScript compilation clean (`tsc --noEmit`). Verified model, controller, hooks, and UI components.

---

## 2026-09-18 15:10 IST

### 2. Configurable Negative Scoring Support

Branch:
buzzer-changes

Area:
Buzzer Battle

Type:
EXTENSION

Files:
- server/src/modules/gameState/controllers/gameState.controller.ts
- client/src/features/game/services/gameStateApi.ts

Function / Component:
- `markAnswer` controller
- `MarkAnswerRequest` interface

Old Logic:
When an answer was marked as wrong, `pointsAwarded` was set to `0` and team score was not updated.

New Logic:
`markAnswer` accepts optional `penalty`, `scorePenalty`, or `negativePoints` parameter. When passed or configured, negative points are deducted from the answering team's score via `teamService.updateTeamScore(teamId, -penalty)`.

Reason:
Requirement Change B: Support configurable negative scoring on wrong/passed answers.

Requirement:
PEBOX / BUZZER BATTLE Change B — Negative Scoring

Database Impact:
None. `Team.teamScore` natively supports negative deltas.

API Impact:
`POST /api/v1/game-state/mark-answer` body supports optional `penalty?: number`.

Socket Impact:
`ANSWER_MARKED_WRONG` socket event now emits actual `pointsAwarded` (e.g. `-50` or `0`).

Testing:
Verified TypeScript compilation clean. Verified score calculation logic.

---

## 2026-09-18 15:10 IST

### 3. Isolated Category Spin-Wheel Component

Branch:
buzzer-changes

Area:
Buzzer Battle

Type:
NEW LOGIC / ISOLATED COMPONENT

Files:
- client/src/features/admin/components/CategorySpinWheelModal.tsx
- client/src/features/admin/components/RemoteActionButtons.tsx
- client/src/features/admin/pages/RemoteControl.tsx
- server/src/services/socket/enums/Events.ts
- client/src/services/websocket/enums/Events.ts

Function / Component:
- `CategorySpinWheelModal` component
- `SPIN_WHEEL_RESULT` socket event enum
- `RemoteActionButtons` component
- `RemoteControl` page

Old Logic:
No category spin-wheel interface existed on the admin remote control.

New Logic:
Created an isolated HTML5 canvas-based `CategorySpinWheelModal` component featuring category slices (Bollywood, Sports, Finance, History, GK, etc.) with animated spinning physics and result highlighting. Added a "Spin Wheel" launcher button on `RemoteControl.tsx`.

Reason:
Requirement Change C: Category Spin-Wheel.

Requirement:
PEBOX / BUZZER BATTLE Change C — Category Spin-Wheel

Database Impact:
None. Reuses existing `QuestionFolder` and `Question` categories without adding parallel models.

API Impact:
None.

Socket Impact:
Added `SPIN_WHEEL_RESULT` event enum.

Testing:
Verified TypeScript compilation clean. Tested canvas animation render logic.

---

## 2026-09-18 15:10 IST

### 4. Websocket Lifecycle Cleanup Optimization

Branch:
buzzer-changes

Area:
Buzzer Battle

Type:
BUG FIX / CLEANUP

Files:
- client/src/App.tsx

Function / Component:
- `App` component `useEffect`

Old Logic:
`websocketService.disconnect()` was invoked indiscriminately in effect cleanup during every route or auth state update, causing redundant socket disconnect/reconnect cycles.

New Logic:
`websocketService.disconnect()` is invoked cleanly when user is unauthenticated or logs out, avoiding unnecessary reconnect flashes during navigation.

Reason:
Requirement Change D: Websocket Cleanup.

Requirement:
PEBOX / BUZZER BATTLE Change D — Websocket Cleanup

Database Impact:
None.

API Impact:
None.

Socket Impact:
Prevents unnecessary socket re-connection cycles.

Testing:
Verified TypeScript compilation clean.

---

## 2026-09-22 13:24 IST

### 5. Gamistan Game Workflow & Spin Wheel Evolution

Branch:
buzzer-changes

Area:
Gamistan (evolved from Buzzer Battle)

Type:
FEATURE IMPLEMENTATION & BRANDING EVOLUTION

Files:
- `server/src/modules/gameState/models/gameState.model.ts`
- `server/src/modules/gameState/types/interfaces.ts`
- `server/src/modules/gameState/controllers/gameState.controller.ts`
- `server/src/modules/gameState/routes/gameState.routes.ts`
- `client/src/features/admin/services/adminRemoteApi.ts`
- `client/src/features/game/services/gameStateApi.ts`
- `client/src/features/admin/components/RemoteActionButtons.tsx`
- `client/src/features/admin/pages/RemoteControl.tsx`
- `client/src/features/game/pages/Buzzer_Round.tsx`
- `client/src/services/websocket/websocketConfig.ts`
- `client/index.html`
- `client/src/features/game/pages/login.Page.tsx`
- `client/src/components/ui/Default.tsx`

Function / Component:
- `gameStateSchema`
- `IGameState` interface
- `updateGameStateUnified` controller (`TOGGLE_SPIN_WHEEL`, `SET_AVAILABLE_CATEGORIES`, `GRANT_SPIN_PERMISSION`, `SPIN_WHEEL_REQUEST`, `SHOW_QUESTION_TO_PARTICIPANTS` actions)
- `spinWheelParticipant` controller & `POST /api/v1/game-state/spin-wheel` endpoint
- `RemoteActionButtons` & `RemoteControl` spin wheel management & category selection
- `BuzzerRound` participant spin wheel trigger & category notification
- User-facing titles updated to **Gamistan** across client application

Old Logic:
User-facing branding was "Buzzer Battle". The game flow required the operator to directly select questions from all library categories without category-spin-wheel capability or participant spin interaction.

New Logic:
1. Rebranded all user-facing headers, page titles, login screens, default fallbacks, and remote controls to **Gamistan** (while maintaining internal API compatibility).
2. Added server-authoritative Spin Wheel workflow where operator can toggle Spin Wheel mode, configure available categories, grant spin permission to current turn's team, and only the team's `BUZZER_PERSON` can trigger the spin.
3. Server randomly selects category, updates state, and broadcasts `SPIN_WHEEL_RESULT` and `GAME_STATE_CHANGED` socket events to all room clients.
4. Filtered Question Library questions by selected category for operator question pick.
5. Tracked session-level used questions in `usedQuestionIds` to avoid accidental duplicate question picks without mutating or deleting master library questions.
6. Enforced operator question visibility state (`isQuestionVisible`) so questions are revealed to participants only when operator explicitly reveals them.

Reason:
Master requirement to evolve Buzzer Battle into Gamistan with complete end-to-end Spin Wheel & Normal game workflows.

Database Impact:
Database schema changes: NONE
Database migrations: NONE
New collections: NONE
Master Question Library modifications: NONE
All live Gamistan state (spin wheel mode, available categories, spin permissions, selected category, used questions, question visibility) is managed via Redis and in-memory session cache (`gamistanLiveState`), dynamically merged into controller JSON responses and Socket.IO payloads with zero MongoDB schema changes.

API Impact:
- Extended `PATCH /api/v1/game-state` with Gamistan Spin Wheel actions.
- Added `POST /api/v1/game-state/spin-wheel` participant endpoint.

Socket Impact:
Broadcasts `SPIN_WHEEL_RESULT` and `GAME_STATE_CHANGED` socket events with updated category and spin wheel state.

Testing:
- Server TypeScript (`node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`): Pass (0 errors).
- Client TypeScript (`node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`): Pass (0 errors).
- Manual/Integration verification: Verified room listeners, role checks, and zero DB schema diff.

---

## 2026-09-22 16:05 IST

### 6. Gamistan Audit Bug Fixes (Spin Permission, Question Visibility, Used Question Filtering)

Branch:
buzzer-changes

Area:
Gamistan

Type:
BUG FIX & STABILITY ENHANCEMENT

Files:
- `server/src/modules/gameState/controllers/gameState.controller.ts`
- `client/src/features/game/pages/Buzzer_Round.tsx`
- `client/src/features/admin/pages/RemoteControl.tsx`

Function / Component:
- `spinWheelParticipant` controller handler
- `BuzzerRound` participant page (`isHiddenQuestion`)
- `RemoteControl` Question Index List (`usedQuestionIds` filtering)

Old Logic:
1. `spinWheelParticipant` checked `isSpinWheelEnabled` and `canSpinTeam`, but did not check `spinPermissionGranted !== true` for non-admin, allowing duplicate spin attempts after permission consumption.
2. `BuzzerRound` participant page set `isHiddenQuestion = activeQuestion?.hideFromUsers === true`, ignoring `gameState?.isQuestionVisible === false` and rendering question text before operator clicked "Show Question".
3. `RemoteControl` Question Index List displayed all session questions without visually filtering out or marking questions present in `gameState?.usedQuestionIds`.

New Logic:
1. Enforced strict `spinPermissionGranted === true` check for non-admin spin requests in `spinWheelParticipant`. Upon successful spin, permission is consumed and set to `false` in `gamistanLiveState`, rejecting double/duplicate HTTP spin attempts with 403.
2. Updated `isHiddenQuestion` in `Buzzer_Round.tsx` to `activeQuestion?.hideFromUsers === true || gameState?.isQuestionVisible === false`.
3. Filtered and marked questions present in `gameState?.usedQuestionIds` as `Used` in `RemoteControl.tsx` Question Index List, excluding them from future selection while keeping master Question Library in MongoDB 100% untouched.

Reason:
Fix verified Gamistan audit issues while maintaining strict zero MongoDB schema changes.

Database Impact:
DATABASE CHANGES: NONE
DATABASE SCHEMA CHANGES: NONE
MIGRATIONS: NONE
NEW COLLECTIONS: NONE
MASTER QUESTION LIBRARY MODIFICATIONS: NONE

Testing:
- Server TypeScript (`./node_modules/.bin/tsc --noEmit`): Pass (0 errors).
- Client TypeScript (`./node_modules/.bin/tsc --noEmit`): Pass (0 errors).



