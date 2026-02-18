import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { initializeSocket } from "./socket";

dotenv.config();

const app = express();

// Create HTTP server for Socket.io
const server = createServer(app);

// Initialize Socket.io
initializeSocket(server);

app.use(cors());
app.use(express.json());

// Serve uploaded files
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
import authRoutes from "./routes/auth";
import donationRoutes from "./routes/donation";
import ngoRoutes from "./routes/ngo";
import adminRoutes from "./routes/admin";
import matchingRoutes from "./routes/matching";
import volunteerRoutes from "./routes/volunteerRoutes";

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ngo", ngoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/tasks", volunteerRoutes);

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI is not defined");
    process.exit(1);
}

mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    });

app.get("/", (req, res) => {
    res.send("ResQMeals API running");
});

// Start server (use HTTP server instead of app.listen for Socket.io)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
