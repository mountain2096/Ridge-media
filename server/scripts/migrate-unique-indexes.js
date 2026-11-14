const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

async function migrate() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI chưa được cấu hình");
    }

    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });

    const duplicateUsernames = await User.collection.aggregate([
        { $group: { _id: { $toLower: { $trim: { input: "$username" } } }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 10 },
    ]).toArray();
    if (duplicateUsernames.length) {
        throw new Error("Duplicate usernames found; resolve them before creating the unique index");
    }

    const duplicateRequests = await FriendRequest.collection.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: { senderId: "$senderId", receiverId: "$receiverId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 10 },
    ]).toArray();
    if (duplicateRequests.length) {
        throw new Error("Duplicate pending friend requests found; resolve them before creating the unique index");
    }

    const userIndexes = await User.collection.indexes();
    const usernameIndex = userIndexes.find((index) =>
        index.key.username === 1 && index.unique === true
    );
    if (!usernameIndex) {
        const conflictingIndex = userIndexes.find((index) => index.key.username === 1);
        if (conflictingIndex) {
            throw new Error("A non-unique username index exists; inspect it before changing indexes");
        }
        await User.collection.createIndex({ username: 1 }, { unique: true, name: "username_unique" });
    }
    await FriendRequest.collection.createIndex(
        { senderId: 1, receiverId: 1 },
        {
            unique: true,
            partialFilterExpression: { status: "pending" },
            name: "unique_pending_friend_request",
        }
    );
}

migrate()
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
        console.error(error.message);
        await mongoose.disconnect();
        process.exitCode = 1;
    });
