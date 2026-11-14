const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const posts = await Post.collection.updateMany(
    { status: { $exists: false } },
    { $set: { status: "active", privacy: "public" } }
  );
  const comments = await Comment.collection.updateMany(
    { status: { $exists: false } },
    { $set: { status: "active" } }
  );

  console.log("Bài viết đã cập nhật:", posts.modifiedCount);
  console.log("Bình luận đã cập nhật:", comments.modifiedCount);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});