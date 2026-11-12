const express = require('express');
const cors = require('cors');
const path = require("node:path");
require('dotenv').config();

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

const app = express();

app.use(cors());
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

app.get("/", (req,res) =>{
    res.json({message:"Ridge API is running!"})    
})
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () =>{
        console.log(`Server running on port ${PORT}`);
    })
}
startServer();
