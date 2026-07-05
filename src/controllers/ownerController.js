const { triggerOwnerReminders } = require("../services/reminderService");
const { activatePayment } = require("../services/memberService");
const { sendWhatsAppMessage } = require("../services/whatsappService");
const { formatDisplayDate } = require("../utils/dates");

async function activatePaymentManually(req, res) {
  const paymentId = req.body?.paymentId || req.query.paymentId;

  if (!paymentId) {
    return res.status(400).json({ error: "paymentId is required" });
  }

  const member = await activatePayment(paymentId);

  if (!member) {
    return res.status(404).json({ error: "Member not found for payment" });
  }

  await sendWhatsAppMessage(
    member.phone,
    `Your membership is active from ${formatDisplayDate(
      member.startDate
    )} to ${formatDisplayDate(member.endDate)}.\nShow this message at gym entry.`
  );

  res.json({
    status: "ok",
    member
  });
}

async function triggerReminders(req, res) {
  const result = await triggerOwnerReminders({
    days: req.body?.days ?? req.query.days,
    force: req.body?.force === true || req.query.force === "true"
  });

  res.json(result);
}

module.exports = {
  activatePaymentManually,
  triggerReminders
};
