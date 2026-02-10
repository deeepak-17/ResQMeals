import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
import authRoutes from "./routes/auth";
import donationRoutes from "./routes/donation";
import ngoRoutes from "./routes/ngo";

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ngo", ngoRoutes);

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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
