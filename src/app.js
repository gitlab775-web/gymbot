const express = require("express");
const botRoutes = require("./routes/botRoutes");
const memberRoutes = require("./routes/memberRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const { getWhatsAppStatus } = require("./services/whatsappService");

const app = express();

app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    }
  })
);
app.use(express.urlencoded({ extended: false }));

app.get("/", (_req, res) => {
  res.send("RK Gym WhatsApp MVP is running");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.RAZORPAY_KEY ? "real-api-ready" : "dummy-local",
    googleSheets: process.env.GOOGLE_SHEETS_ENABLED === "true",
    whatsappCloud: getWhatsAppStatus()
  });
});

app.use(botRoutes);
app.use(memberRoutes);
app.use(ownerRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

module.exports = app;
