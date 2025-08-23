export enum SessionStatus {
    WAITING = 'waiting',      // Session created, teams can join --> Waiting for the teams 
    PLAYING = 'playing',    // Admin clicked start, game initializing   --->game started by admin 
    ENDED = 'ended'   // All questions done, game finished               ----> game ended   
}