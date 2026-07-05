const express = require("express");
const {
  devMessage,
  devPaySuccess,
  razorpayWebhook,
  receiveWhatsAppWebhook,
  receiveTwilioWebhook,
  verifyWhatsAppWebhook
} = require("../controllers/botController");

const router = express.Router();

router.post("/dev/message", devMessage);
router.get("/dev/pay-success/:paymentId", devPaySuccess);
router.post("/twilio/webhook", receiveTwilioWebhook);
router.post("/abc-gym-twilio-2026", receiveTwilioWebhook);
router.post("/rk-gym-twilio-2026", receiveTwilioWebhook);
router.get("/webhook", verifyWhatsAppWebhook);
router.post("/webhook", receiveWhatsAppWebhook);
router.post("/razorpay-webhook", razorpayWebhook);

module.exports = router;
