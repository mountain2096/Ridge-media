const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const postRoutes = require("./routes/post");
const commentRoutes = require("./routes/comment");
const friendRoutes = require("./routes/friend");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/friend", friendRoutes)

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