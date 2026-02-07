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

app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);

mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

app.get("/", (req, res) => {
    res.send("ResQMeals API running");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
