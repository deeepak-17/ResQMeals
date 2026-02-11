import { getIO } from "../socket";

/**
 * Emit an event to a specific user by their user ID.
 * The user must be connected and will have auto-joined `user:<userId>` room.
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
    try {
        getIO().to(`user:${userId}`).emit(event, data);
    } catch (error) {
        console.error(`Failed to emit '${event}' to user ${userId}:`, error);
    }
};

/**
 * Emit an event to all users of a specific role.
 * Users auto-join `role:<role>` room on connection.
 */
export const emitToRole = (role: string, event: string, data: any): void => {
    try {
        getIO().to(`role:${role}`).emit(event, data);
    } catch (error) {
        console.error(`Failed to emit '${event}' to role ${role}:`, error);
    }
};

/**
 * Emit an event to all connected clients.
 */
export const emitToAll = (event: string, data: any): void => {
    try {
        getIO().emit(event, data);
    } catch (error) {
        console.error(`Failed to emit '${event}' to all:`, error);
    }
};
