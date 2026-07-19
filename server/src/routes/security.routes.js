const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/security.controller");

router.use(protect);
router.use(authorize("admin"));

router.get("/audit-logs", controller.getAuditLogs);

router.get("/blocked-ips", controller.getBlockedIps);

router.post("/blocked-ips", controller.blockIp);

router.delete("/blocked-ips/:ip", controller.unblockIp);

module.exports = router;
