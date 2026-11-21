// Small registry that lets controllers and models push realtime events
// without importing socket.io. When no Socket.IO server has been registered
// (unit tests, scripts), every emit is a harmless no-op.

let io = null;

const toId = (value) => String(value?._id || value || "");

const roomFor = (userId) => `user:${toId(userId)}`;

function setIO(instance) {
    io = instance;
}

function emitToUser(userId, event, payload) {
    const id = toId(userId);
    if (!io || !id) return false;
    try {
        io.to(roomFor(id)).emit(event, payload);
        return true;
    } catch (error) {
        console.error(`Could not emit "${event}":`, error.message);
        return false;
    }
}

module.exports = { setIO, emitToUser, roomFor };
