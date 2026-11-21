// Loads the demo data set into a DEMO database.
//
//   node server/scripts/seed-demo.js           -> dry run: shows the target database and what would happen
//   node server/scripts/seed-demo.js --yes     -> deletes the previous demo data and writes a fresh set
//
// Safety rules:
//   * MONGO_URI (from the root .env) must point to a database whose NAME contains "demo"
//     (for example .../ridge_demo?...). Otherwise the script stops. --allow-any-db overrides this.
//   * Only documents that belong to demo users (email ending with @ridge.demo) are deleted.
//   * Nothing is written without --yes.
//
// Run it again right before a demo: the dates are relative to "now".

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { configureDnsServers } = require("../config/db");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Report = require("../models/Report");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const FriendRequest = require("../models/FriendRequest");
const Story = require("../models/Story");
const { buildDemoData, DEMO_DOMAIN } = require("./demo-data");

const DEMO_PASSWORD = "Demo@1234";
const args = new Set(process.argv.slice(2));

const idsOf = (rows) => rows.map((row) => row._id);

async function deleteDemoData() {
    const emailPattern = new RegExp(`@${DEMO_DOMAIN.replace(/\./g, "\\.")}$`, "i");
    const ids = idsOf(await User.find({ email: emailPattern }).select("_id").lean());
    if (ids.length === 0) return 0;

    const postIds = idsOf(await Post.find({ authorId: { $in: ids } }).select("_id").lean());
    const commentIds = idsOf(await Comment.find({
        $or: [{ authorId: { $in: ids } }, { postId: { $in: postIds } }],
    }).select("_id").lean());
    const conversationIds = idsOf(await Conversation.find({ participants: { $in: ids } }).select("_id").lean());

    await Promise.all([
        Report.deleteMany({ $or: [
            { reporterId: { $in: ids } },
            { targetType: "post", targetId: { $in: postIds } },
            { targetType: "comment", targetId: { $in: commentIds } },
        ] }),
        Notification.deleteMany({ $or: [{ recipientId: { $in: ids } }, { senderId: { $in: ids } }] }),
        FriendRequest.deleteMany({ $or: [{ senderId: { $in: ids } }, { receiverId: { $in: ids } }] }),
        Message.deleteMany({ conversationId: { $in: conversationIds } }),
        Story.deleteMany({ authorId: { $in: ids } }),
    ]);
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
    await Comment.deleteMany({ _id: { $in: commentIds } });
    await Post.deleteMany({ _id: { $in: postIds } });
    await User.deleteMany({ _id: { $in: ids } });
    return ids.length;
}

// Mongoose sets createdAt/updatedAt itself and protects createdAt, so the planned dates are written
// with the native driver after the documents exist.
function applyTimes(Model, docs) {
    return Model.collection.bulkWrite(docs.map((doc) => ({
        updateOne: {
            filter: { _id: doc._id },
            update: { $set: { createdAt: doc.createdAt, updatedAt: doc.updatedAt || doc.createdAt } },
        },
    })));
}

async function insertWithTimes(Model, docs) {
    await Model.insertMany(docs);
    await applyTimes(Model, docs);
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error("Thiếu MONGO_URI trong file .env.");
    configureDnsServers();
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

    const dbName = mongoose.connection.name;
    console.log(`Đang kết nối tới máy chủ ${mongoose.connection.host}, database "${dbName}".`);
    if (!/demo/i.test(dbName) && !args.has("--allow-any-db")) {
        console.error(`Dừng lại: tên database "${dbName}" không chứa chữ "demo".`);
        console.error('Hãy đổi MONGO_URI sang một database riêng, ví dụ ".../ridge_demo?...", rồi chạy lại.');
        process.exitCode = 1;
        return;
    }

    const existing = await User.countDocuments({ email: new RegExp(`@${DEMO_DOMAIN.replace(/\./g, "\\.")}$`, "i") });
    console.log(`Hiện có ${existing} tài khoản demo trong database này. Chúng và dữ liệu của chúng sẽ bị xóa rồi nạp lại.`);
    if (!args.has("--yes")) {
        console.log("Đây là chạy thử, chưa ghi gì. Thêm --yes để thật sự nạp dữ liệu.");
        return;
    }

    const removed = await deleteDemoData();
    console.log(`Đã xóa ${removed} tài khoản demo cũ và dữ liệu liên quan.`);

    const data = buildDemoData({ newId: () => new mongoose.Types.ObjectId() });
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await insertWithTimes(User, data.users.map((user) => ({
        _id: user._id, username: user.username, email: user.email, password: passwordHash, bio: user.bio,
        isAdmin: user.isAdmin, isLocked: user.isLocked, friend: user.friend,
        createdAt: user.createdAt, updatedAt: user.updatedAt,
    })));
    await insertWithTimes(Post, data.posts);
    await insertWithTimes(Comment, data.comments);
    await insertWithTimes(FriendRequest, data.friendRequests);
    await insertWithTimes(Report, data.reports);
    await insertWithTimes(Conversation, data.conversations);
    await insertWithTimes(Message, data.messages);
    await insertWithTimes(Notification, data.notifications);

    console.log("Đã nạp dữ liệu demo:");
    Object.entries({
        "người dùng": data.users, "bài đăng": data.posts, "bình luận": data.comments,
        "báo cáo": data.reports, "cuộc trò chuyện": data.conversations, "tin nhắn": data.messages,
        "thông báo": data.notifications, "lời mời kết bạn": data.friendRequests,
    }).forEach(([label, list]) => console.log(`  - ${list.length} ${label}`));
    console.log("");
    console.log(`Mật khẩu của mọi tài khoản demo: ${DEMO_PASSWORD}`);
    console.log(`  Quản trị viên:  demo_admin@${DEMO_DOMAIN}`);
    console.log(`  Người dùng 1:   minh_anh@${DEMO_DOMAIN}   (đứng ở cửa sổ A khi demo tin nhắn)`);
    console.log(`  Người dùng 2:   hoang_nam@${DEMO_DOMAIN}  (đứng ở cửa sổ B khi demo tin nhắn)`);
}

main()
    .catch((error) => {
        console.error("Lỗi:", error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
