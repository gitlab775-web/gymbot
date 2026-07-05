const { triggerOwnerReminders } = require("../services/reminderService");

async function triggerReminders(req, res) {
  const result = await triggerOwnerReminders({
    days: req.body?.days ?? req.query.days,
    force: req.body?.force === true || req.query.force === "true"
  });

  res.json(result);
}

module.exports = {
  triggerReminders
};
