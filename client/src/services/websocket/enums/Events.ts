export enum Events {
  // Buzzer Battle Events
  GAME_STATE_CHANGED = "game-state-changed",
  BUZZER_PRESSED = "buzzer-pressed",
  BUZZER_PRESSED_SUCCESS = "buzzer-pressed-success",
  BUZZER_ERROR = "buzzer-error",
  PRESS_BUZZER = "press-buzzer",

  // Team Management Events
  TEAM_JOINED = "team-joined", // When a new team joins the session
  TEAM_UPDATED = "team-updated", // When admin edits team details

  // Game Flow Events
  BUZZER_ROUND_STARTED = "buzzer-round-started", // Buzzer round starts with timestamp
  ANSWERING_ROUND_STARTED = "answering-round-started", // Question answering starts with timestamp

  // Admin Remote Control Events
  TEAM_SELECTED = "team-selected", // When fastest team is auto-selected
  GAME_ENDED = "game-ended", // When all questions completed
  ANSWER_SUBMITTED = "answer-submitted", // When team submits answer
  ANSWER_MARKED_CORRECT = "answer-marked-correct", // When admin marks answer correct
  ANSWER_MARKED_WRONG = "answer-marked-wrong", // When admin marks answer wrong
  SECOND_CHANCE = "second-chance", // When 2nd team gets a chance
  QUESTION_PASSED = "question-passed", // When admin passes question to next team
  SHOW_LEADERBOARD = "show-leaderboard", // When admin triggers leaderboard view
  SHOW_ANSWER = "show-answer", // When admin reveals current answer to all users

  // Session Events
  SESSION_UPDATE = "session-update", // Session settings changed
  SESSION_ENDED = "session-ended", // Super admin ended the session - log out all users
}
