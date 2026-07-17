const catchAsync = require("../utils/catchAsync");

const { createRestaurantSchema } = require("../validations/restaurant.validation");

const { createRestaurant, getMyRestaurant } = require("../services/restaurant.service");

exports.createRestaurant = catchAsync(
    async (req, res) => {
        const payload =
            createRestaurantSchema.parse(req.body);

        const restaurant = await createRestaurant(
            req.user._id,
            payload
        );

        res.status(201).json({
            success: true,
            message: "Restaurant profile created successfully.",
            data: restaurant,
        });
    }
);

exports.getMyRestaurant = catchAsync(
    async (req, res) => {
        const restaurant = await getMyRestaurant(
            req.user._id
        );

        res.json({
            success: true,
            data: restaurant,
        });
    }
);