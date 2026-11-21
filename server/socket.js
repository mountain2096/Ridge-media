const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("./models/User");
const Conversation = require("./models/Conversation");
const { setIO, emitToUser, roomFor } = require("./utils/realtime");

const TYPING_MIN_INTERVAL_MS = 1000;

const toId = (value) => String(value?._id || value || "");

// Socket.IO handshake: the client sends its JWT in `auth.token`.
async function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake?.auth?.token;
        if (typeof token !== "string" || !token) {
            return next(new Error("UNAUTHORIZED"));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("_id isLocked");
        if (!user || user.isLocked) {
            return next(new Error("UNAUTHORIZED"));
        }
        socket.data.userId = toId(user._id);
        return next();
    } catch {
        return next(new Error("UNAUTHORIZED"));
    }
}

// Returns the other participant's id when `userId` may talk in the
// conversation (participant, visible, nobody blocked anybody); otherwise null.
async function getTypingTarget(userId, conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) return null;

    const conversation = await Conversation.findById(conversationId).select("participants hiddenFor");
    if (!conversation) return null;

    const participants = (conversation.participants || []).map(toId);
    if (!participants.includes(userId)) return null;
    if ((conversation.hiddenFor || []).some((id) => toId(id) === userId)) return null;

    const otherId = participants.find((id) => id !== userId);
    if (!otherId) return null;

    const [me, other] = await Promise.all([
        User.findById(userId).select("blockList"),
        User.findById(otherId).select("blockList"),
    ]);
    if (!me || !other) return null;
    const blocked = (me.blockList || []).some((id) => toId(id) === otherId) ||
        (other.blockList || []).some((id) => toId(id) === userId);
    return blocked ? null : otherId;
}

function registerSocketHandlers(socket) {
    const userId = socket.data.userId;
    socket.join(roomFor(userId));

    const lastTypingAt = new Map();

    async function handleTyping(isTyping, payload) {
        try {
            const conversationId = payload?.conversationId;
            const key = `${conversationId}:${isTyping}`;
            const now = Date.now();
            // Drop floods of identical events from one socket.
            if (now - (lastTypingAt.get(key) || 0) < TYPING_MIN_INTERVAL_MS) return;
            lastTypingAt.set(key, now);

            const targetId = await getTypingTarget(userId, conversationId);
            if (!targetId) return;
            emitToUser(targetId, "typing", {
                conversationId: toId(conversationId),
                userId,
                isTyping,
            });
        } catch (error) {
            console.error("Typing event failed:", error.message);
        }
    }

    socket.on("typing:start", (payload) => { void handleTyping(true, payload); });
    socket.on("typing:stop", (payload) => { void handleTyping(false, payload); });
}

function initSocket(httpServer, { isAllowedOrigin }) {
    // Required lazily so the rest of the server (and its tests) load even
    // before the socket.io package is installed.
    const { Server } = require("socket.io");

    const io = new Server(httpServer, {
        cors: {
            origin(origin, callback) {
                callback(null, isAllowedOrigin(origin));
            },
        },
    });
    io.use(authenticateSocket);
    io.on("connection", registerSocketHandlers);
    setIO(io);
    return io;
}

module.exports = { initSocket, authenticateSocket, registerSocketHandlers, getTypingTarget };
