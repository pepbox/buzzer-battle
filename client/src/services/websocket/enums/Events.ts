export enum Events {
    // Buzzer Battle Events
    GAME_STATE_CHANGED = "game-state-changed",
    BUZZER_PRESSED = "buzzer-pressed",
    BUZZER_PRESSED_SUCCESS = "buzzer-pressed-success",
    BUZZER_ERROR = "buzzer-error",
    PRESS_BUZZER = "press-buzzer",
    
    // New admin remote control events
    TEAM_SELECTED = "team-selected",              // When fastest team is auto-selected
    GAME_ENDED = "game-ended",                    // When all questions completed
    ANSWER_RESULT = "answer-result",              // When team submits answer
    SECOND_CHANCE = "second-chance",              // When 2nd team gets a chance
}