import { Socket } from "socket.io";
import { Events } from "../enums/Events";

/**
 * Handle time synchronization requests from clients.
 * Expects the client to send a payload containing { clientTime: number }.
 * Replies immediately with { clientTime: number, serverTime: number } so client can calculate offset.
 */
export const handleTimeSync = (
    socket: Socket,
    payload: { clientTime: number }
) => {
    socket.emit(Events.TIME_SYNC, {
        clientTime: payload.clientTime,
        serverTime: Date.now()
    });
};
