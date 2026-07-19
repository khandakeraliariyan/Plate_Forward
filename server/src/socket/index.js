const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Reservation = require("../models/Reservation");

const corsOptions = require("../config/cors");

const {
    userRoom,
    roleRoom,
    restaurantRoom,
    reservationRoom,
    donationRoom,
} = require("./rooms");

const { setIO, getIO, emitToRoom } = require("./state");

const registerVolunteerLocationHandlers = require("./volunteerLocation");

let redisClients = null;

const authenticateSocket = async (socket) => {
    const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace(
            "Bearer ",
            ""
        );

    if (!token) {
        throw new Error("Authentication token missing.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
        throw new Error("User not found.");
    }

    if (user.isBlocked) {
        throw new Error("Account blocked.");
    }

    return user;
};

const joinDefaultRooms = async (socket) => {
    const user = socket.user;

    socket.join(userRoom(user._id.toString()));
    socket.join(roleRoom(user.role));

    if (user.role === "restaurant") {
        const restaurant = await Restaurant.findOne({
            user: user._id,
        }).select("_id");

        if (restaurant) {
            socket.join(restaurantRoom(restaurant._id.toString()));
        }
    }

    if (user.role === "ngo" || user.role === "volunteer") {
        const activeReservations = await Reservation.find({
            [user.role === "ngo" ? "ngo" : "volunteer"]: user._id,
            status: {
                $in: ["reserved", "accepted", "picked_up"],
            },
        }).select("_id");

        activeReservations.forEach((reservation) => {
            socket.join(reservationRoom(reservation._id.toString()));
        });
    }

    if (user.role === "admin") {
        // Lazy require avoids a load-time circular dependency with services
        // that themselves emit through this socket module.
        const { emitAdminStats } = require("./adminDashboard");

        await emitAdminStats();
    }
};

const registerConnectionHandlers = (socket) => {
    socket.on("auth:refresh", async ({ token } = {}, callback) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);

            if (!user || user.isBlocked) {
                throw new Error("Invalid session.");
            }

            socket.user = user;

            callback?.({ success: true });
        } catch (error) {
            callback?.({
                success: false,
                message: error.message,
            });

            socket.emit("auth:error", {
                message: "Session expired. Please log in again.",
            });

            socket.disconnect(true);
        }
    });

    socket.on("reservation:join", async (reservationId) => {
        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return;
        }

        const isParticipant =
            reservation.ngo.toString() === socket.user._id.toString() ||
            (reservation.volunteer &&
                reservation.volunteer.toString() ===
                    socket.user._id.toString()) ||
            socket.user.role === "admin";

        if (isParticipant) {
            socket.join(reservationRoom(reservationId));
        }
    });

    socket.on("reservation:leave", (reservationId) => {
        socket.leave(reservationRoom(reservationId));
    });

    socket.on("donation:join", (donationId) => {
        socket.join(donationRoom(donationId));
    });

    socket.on("donation:leave", (donationId) => {
        socket.leave(donationRoom(donationId));
    });

    registerVolunteerLocationHandlers(socket, getIO());
};

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: corsOptions,
    });

    setIO(io);

    io.use(async (socket, next) => {
        try {
            const user = await authenticateSocket(socket);

            socket.user = user;

            next();
        } catch (error) {
            next(new Error(error.message || "Unauthorized"));
        }
    });

    io.on("connection", async (socket) => {
        try {
            await joinDefaultRooms(socket);

            registerConnectionHandlers(socket);
        } catch (error) {
            socket.emit("auth:error", {
                message: "Failed to initialize connection.",
            });

            socket.disconnect(true);
        }
    });

    if (process.env.REDIS_URL) {
        setupRedisAdapter(io).catch((error) => {
            console.error(
                "Socket.IO Redis adapter failed to connect, falling back to in-memory adapter:",
                error.message
            );
        });
    } else {
        console.log(
            "Socket.IO using in-memory adapter (single instance)."
        );
    }

    return io;
};

const setupRedisAdapter = async (ioInstance) => {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    ioInstance.adapter(createAdapter(pubClient, subClient));

    redisClients = { pubClient, subClient };

    console.log("Socket.IO using Redis adapter for horizontal scaling.");
};

const shutdownSocket = async () => {
    let io;

    try {
        io = getIO();
    } catch {
        io = null;
    }

    if (io) {
        io.disconnectSockets(true);
        await new Promise((resolve) => io.close(resolve));
    }

    if (redisClients) {
        await Promise.all([
            redisClients.pubClient.quit(),
            redisClients.subClient.quit(),
        ]);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToRoom,
    shutdownSocket,
};
