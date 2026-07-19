const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/analytics.controller");

router.use(protect);

router.get("/restaurant", authorize("restaurant"), controller.getRestaurantDashboard);

router.get("/ngo", authorize("ngo"), controller.getNgoDashboard);

router.get("/volunteer", authorize("volunteer"), controller.getVolunteerDashboard);

router.get("/admin", authorize("admin"), controller.getAdminDashboard);

router.get("/admin/heatmap", authorize("admin"), controller.getAdminHeatmap);

module.exports = router;
