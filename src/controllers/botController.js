const crypto = require("crypto");
const { handleIncomingText, startMembershipSelection } = require("../services/botService");
const { activatePayment } = require("../services/memberService");
const {
  sendTwilioContentMessage,
  sendWhatsAppMessage
} = require("../services/whatsappService");
const { triggerOwnerReminders } = require("../services/reminderService");
const { formatDisplayDate } = require("../utils/dates");
const { normalizePhone } = require("../utils/phone");

function getBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sendTwiml(res, message) {
  res
    .type("text/xml")
    .send(`<Response><Message>${escapeXml(message)}</Message></Response>`);
}

async function devMessage(req, res) {
  const reply = await handleIncomingText({
    phone: req.body.phone || "9999999999",
    text: req.body.text,
    baseUrl: getBaseUrl(req)
  });

  res.json({ reply });
}

async function devPaySuccess(req, res) {
  const member = await activatePayment(req.params.paymentId);

  if (!member) {
    return res.status(404).send("Payment/member not found.");
  }

  const confirmation = `Your membership is active from ${formatDisplayDate(
    member.startDate
  )} to ${formatDisplayDate(member.endDate)}.\nShow this message at gym entry.`;

  await sendWhatsAppMessage(member.phone, confirmation);
  res.send(confirmation.replace(/\n/g, "<br>"));
}

async function receiveTwilioWebhook(req, res) {
  const phone = normalizePhone(req.body.From);
  const text = req.body.ButtonText || req.body.Body || "";
  const command = String(text).trim().toLowerCase();

  console.log("[twilio:incoming]", {
    from: phone,
    body: req.body.Body,
    buttonText: req.body.ButtonText
  });

  if (
    process.env.OWNER_PHONE &&
    phone === normalizePhone(process.env.OWNER_PHONE) &&
    ["remind expiring", "send reminders", "trigger reminders"].includes(command)
  ) {
    const result = await triggerOwnerReminders({ days: process.env.OWNER_REMINDER_DAYS });
    return sendTwiml(
      res,
      `Owner reminder run complete.\nChecked: ${result.checked}\nSent: ${result.sent}\nSkipped: ${result.skipped}`
    );
  }

  if (
    ["hi", "hello", "hey", "menu", "start"].includes(command) &&
    process.env.TWILIO_PLAN_CONTENT_SID
  ) {
    const fallbackMenu = startMembershipSelection(phone);

    try {
      await sendTwilioContentMessage(phone, process.env.TWILIO_PLAN_CONTENT_SID);
      return res.type("text/xml").send("<Response></Response>");
    } catch (error) {
      console.error("[twilio:content-message-failed]", {
        message: error.message,
        code: error.code,
        status: error.status
      });

      return sendTwiml(res, fallbackMenu);
    }
  }

  const reply = await handleIncomingText({
    phone,
    text,
    baseUrl: getBaseUrl(req)
  });

  console.log("[twilio:reply]", {
    to: phone,
    reply
  });

  return sendTwiml(res, reply);
}

function verifyWhatsAppWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[whatsapp:verify]", {
    mode,
    tokenMatches: token === process.env.WHATSAPP_VERIFY_TOKEN,
    hasChallenge: Boolean(challenge)
  });

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

async function receiveWhatsAppWebhook(req, res) {
  if (req.body.Body && req.body.From) {
    return receiveTwilioWebhook(req, res);
  }

  console.log("[whatsapp:incoming]", JSON.stringify(req.body, null, 2));

  const entries = req.body.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const messages = change.value?.messages || [];

      for (const message of messages) {
        if (message.type !== "text") continue;

        const phone = normalizePhone(message.from);
        console.log("[whatsapp:text]", {
          from: phone,
          body: message.text.body
        });

        const reply = await handleIncomingText({
          phone,
          text: message.text.body,
          baseUrl: getBaseUrl(req)
        });

        console.log("[whatsapp:reply]", {
          to: phone,
          reply
        });

        await sendWhatsAppMessage(phone, reply);
      }
    }
  }

  res.sendStatus(200);
}

function verifyRazorpaySignature(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  const signature = req.get("x-razorpay-signature");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest("hex");

  return signature === expectedSignature;
}

async function razorpayWebhook(req, res) {
  console.log("[razorpay:webhook]", {
    event: req.body.event,
    hasSignature: Boolean(req.get("x-razorpay-signature")),
    hasSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET)
  });

  if (!verifyRazorpaySignature(req)) {
    console.log("[razorpay:webhook] invalid signature");
    return res.status(400).json({ error: "Invalid Razorpay signature" });
  }

  if (req.body.event !== "payment_link.paid") {
    return res.json({ status: "ignored" });
  }

  const paymentLink = req.body.payload.payment_link.entity;
  const paymentId = paymentLink.id;
  console.log("[razorpay:webhook] payment link paid", { paymentId });

  const member = await activatePayment(paymentId);

  if (!member) {
    console.log("[razorpay:webhook] member not found", { paymentId });
    return res.status(404).json({ error: "Member not found for payment" });
  }

  await sendWhatsAppMessage(
    member.phone,
    `Your membership is active from ${formatDisplayDate(
      member.startDate
    )} to ${formatDisplayDate(member.endDate)}.\nShow this message at gym entry.`
  );

  console.log("[razorpay:webhook] membership activated", {
    phone: member.phone,
    endDate: member.endDate
  });

  return res.json({ status: "ok" });
}

module.exports = {
  devMessage,
  devPaySuccess,
  razorpayWebhook,
  receiveWhatsAppWebhook,
  receiveTwilioWebhook,
  verifyWhatsAppWebhook
};
