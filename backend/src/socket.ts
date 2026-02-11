import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server;

/**
 * Initialize Socket.io with JWT authentication and room management.
 * Must be called after creating the HTTP server.
 */
export const initializeSocket = (server: HttpServer): Server => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // JWT authentication middleware for socket connections
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new Error("Server configuration error"));
        }

        try {
            const decoded = jwt.verify(token, secret) as { id: string; role: string };
            // Attach user data to the socket
            (socket as any).user = decoded;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    // Connection handler
    io.on("connection", (socket: Socket) => {
        const user = (socket as any).user;

        if (user) {
            // Auto-join user-specific room and role-based room
            socket.join(`user:${user.id}`);
            socket.join(`role:${user.role}`);
            console.log(`Socket connected: ${user.id} (${user.role})`);
        }

        socket.on("disconnect", () => {
            if (user) {
                console.log(`Socket disconnected: ${user.id}`);
            }
        });
    });

    console.log("Socket.io initialized");
    return io;
};

/**
 * Get the Socket.io server instance.
 * Must be called AFTER initializeSocket().
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initializeSocket() first.");
    }
    return io;
};
