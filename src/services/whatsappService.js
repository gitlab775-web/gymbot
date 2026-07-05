const twilio = require("twilio");
const { normalizePhone } = require("../utils/phone");

function getProvider() {
  return (process.env.WHATSAPP_PROVIDER || "dummy").toLowerCase();
}

function toTwilioWhatsAppNumber(phone) {
  const raw = String(phone || "").trim();
  return `whatsapp:${normalizePhone(raw)}`;
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendWhatsAppMessage(phone, text) {
  const provider = getProvider();

  if (provider === "twilio") {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`[dummy-twilio] To ${phone}: ${text}`);
      return { mode: "dummy-twilio" };
    }

    const client = getTwilioClient();
    return client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to: toTwilioWhatsAppNumber(phone),
      body: text
    });
  }

  if (provider !== "cloud" || !process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[dummy-whatsapp] To ${phone}: ${text}`);
    return { mode: "dummy" };
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";
  const url = `https://graph.facebook.com/${apiVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace("+", ""),
      type: "text",
      text: {
        body: text
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp API failed: ${body}`);
  }

  return response.json();
}

async function sendTwilioContentMessage(phone, contentSid, contentVariables = {}) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[dummy-twilio-content] To ${phone}: ${contentSid}`);
    return { mode: "dummy-twilio-content" };
  }

  const client = getTwilioClient();
  const payload = {
    from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
    to: toTwilioWhatsAppNumber(phone),
    contentSid
  };

  if (Object.keys(contentVariables).length > 0) {
    payload.contentVariables = JSON.stringify(contentVariables);
  }

  return client.messages.create(payload);
}

function getWhatsAppStatus() {
  const provider = getProvider();

  return {
    provider,
    configured:
      provider === "twilio"
        ? Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
        : Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    twilio: {
      hasAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
      hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      hasPlanContentSid: Boolean(process.env.TWILIO_PLAN_CONTENT_SID)
    },
    apiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
    hasToken: Boolean(process.env.WHATSAPP_TOKEN),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN)
  };
}

module.exports = {
  getWhatsAppStatus,
  sendTwilioContentMessage,
  sendWhatsAppMessage
};
