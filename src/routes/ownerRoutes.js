const express = require("express");
const { triggerReminders } = require("../controllers/ownerController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.post("/owner/reminders", adminAuth, triggerReminders);

module.exports = router;
