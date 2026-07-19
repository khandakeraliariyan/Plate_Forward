const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/fraud.controller");

router.use(protect);
router.use(authorize("admin"));

router.get("/report", controller.getFraudReport);

module.exports = router;
