let io = null;

const setIO = (instance) => {
    io = instance;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized.");
    }

    return io;
};

// Safe to call from services even before Socket.IO has started
// (e.g. during tests or scripts run outside the HTTP server).
const emitToRoom = (room, event, payload) => {
    if (!io) {
        return;
    }

    io.to(room).emit(event, payload);
};

module.exports = {
    setIO,
    getIO,
    emitToRoom,
};
