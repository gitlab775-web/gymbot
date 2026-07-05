const cron = require("node-cron");
const dotenv = require("dotenv");
const app = require("./app");
const { runDailyReminders } = require("./services/reminderService");

dotenv.config();

const PORT = process.env.PORT || 3000;

// Runs every day at 9 AM server time.
cron.schedule("0 9 * * *", () => {
  runDailyReminders().catch((error) => {
    console.error("Daily reminder failed:", error.message);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Dummy test endpoint: POST /dev/message");
});
