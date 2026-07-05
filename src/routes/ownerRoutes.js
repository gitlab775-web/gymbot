const express = require("express");
const {
  activatePaymentManually,
  triggerReminders
} = require("../controllers/ownerController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.post("/owner/activate-payment", adminAuth, activatePaymentManually);
router.post("/owner/reminders", adminAuth, triggerReminders);

module.exports = router;
