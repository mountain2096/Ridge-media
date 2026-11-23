const express = require('express');
const cors = require('cors');
const path = require("node:path");
const isMainModule = require.main === module;
if (isMainModule) require('dotenv').config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");
const commentRoutes = require("./routes/comment");
const friendRoutes = require("./routes/friend");
const notificationRoutes = require("./routes/notification");
const messageRoutes = require("./routes/message");
const storyRoutes = require("./routes/story");
const uploadRoutes = require("./routes/upload");
const reportRoutes = require("./routes/report");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");

const app = express();
app.set("trust proxy", 1);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    let parsedOrigin;
    try {
        parsedOrigin = new URL(origin);
    } catch {
        return false;
    }
    if (parsedOrigin.origin !== origin) return false;

    const allowedOrigins = [];
    const clientUrl = process.env.CLIENT_URL?.trim();
    if (clientUrl) {
        try {
            allowedOrigins.push(new URL(clientUrl).origin);
        } catch {
            // Ignore invalid configuration rather than allowing an arbitrary origin.
        }
    }

    const isDevelopment = process.env.NODE_ENV !== "production";
    if (isDevelopment && parsedOrigin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname)) {
        return true;
    }

    return allowedOrigins.includes(origin);
};

app.use(cors({
    origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
    },
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

app.get("/", (req,res) =>{
    res.json({message:"Ridge API is running!"})    
})
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    // Loaded here so tests that import `app` do not need socket.io installed.
    const http = require("node:http");
    const { initSocket } = require("./socket");
    const httpServer = http.createServer(app);
    initSocket(httpServer, { isAllowedOrigin });
    httpServer.listen(PORT, () =>{
        console.log(`Server running on port ${PORT}`);
    })
}

if (isMainModule) {
    startServer();
}

module.exports = app;
