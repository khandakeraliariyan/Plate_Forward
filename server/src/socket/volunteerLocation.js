const { reservationRoom, roleRoom } = require("./rooms");
const { VOLUNTEER_LOCATION_UPDATE } = require("./events");

// In-memory only: volunteer GPS is transient and re-sent every few seconds
// by the client, so it does not need database persistence.
const registerVolunteerLocationHandlers = (socket, io) => {
    socket.on(
        "volunteer:location:update",
        ({ reservationId, latitude, longitude, distanceRemaining, etaMinutes } = {}) => {
            if (socket.user.role !== "volunteer" || !reservationId) {
                return;
            }

            const payload = {
                reservationId,
                volunteerId: socket.user._id.toString(),
                latitude,
                longitude,
                distanceRemaining,
                etaMinutes,
                updatedAt: new Date(),
            };

            io.to(reservationRoom(reservationId)).emit(
                VOLUNTEER_LOCATION_UPDATE,
                payload
            );

            io.to(roleRoom("admin")).emit(
                VOLUNTEER_LOCATION_UPDATE,
                payload
            );
        }
    );
};

module.exports = registerVolunteerLocationHandlers;
