const userRoom = (userId) => `user:${userId}`;

const roleRoom = (role) => `role:${role}`;

const restaurantRoom = (restaurantId) => `restaurant:${restaurantId}`;

const reservationRoom = (reservationId) => `reservation:${reservationId}`;

const donationRoom = (donationId) => `donation:${donationId}`;

module.exports = {
    userRoom,
    roleRoom,
    restaurantRoom,
    reservationRoom,
    donationRoom,
};
