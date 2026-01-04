const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();

// Connect database
require("./config/database");

const app = express();

// ------------------- Middlewares -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ------------------- Routes -------------------
const userRoutes = require("./routes/User");
const courseRoutes = require("./routes/Course");
const profileRoutes = require("./routes/Profile");
const paymentsRoutes = require("./routes/Payments");

app.use("/api/user", userRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payments", paymentsRoutes);

// ------------------- Test Route -------------------
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ------------------- Health Check Route -------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "Server is running perfectly!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 4000
  });
});

// ------------------- Start Server -------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});