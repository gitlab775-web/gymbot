const { daysUntil, formatDisplayDate } = require("../utils/dates");
const { listMembers, markReminderSent } = require("./memberService");
const { createPaymentLink } = require("./paymentService");
const { sendWhatsAppMessage } = require("./whatsappService");

async function sendRenewalReminder(member, reminderField, options = {}) {
  const plan = {
    label: member.plan,
    amount: Number(member.amount),
    days: Number(member.planDays)
  };

  const paymentLink = await createPaymentLink({
    memberName: member.name,
    phone: member.phone,
    plan,
    baseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
  });

  await sendWhatsAppMessage(
    member.phone,
    [
      `Hi ${member.name}, your RK Gym membership expires on ${formatDisplayDate(
        member.endDate
      )}.`,
      "",
      "Renew now to continue:",
      paymentLink.short_url
    ].join("\n")
  );

  if (options.markSent !== false) {
    await markReminderSent(member.memberId, reminderField);
  }
}

async function runDailyReminders() {
  const members = await listMembers();
  const activeMembers = members.filter((member) => member.status === "active");

  for (const member of activeMembers) {
    const remainingDays = daysUntil(member.endDate);

    if (remainingDays === 3 && !member.reminder3Days) {
      await sendRenewalReminder(member, "reminder3Days");
    }

    if (remainingDays === 0 && !member.reminderToday) {
      await sendRenewalReminder(member, "reminderToday");
    }
  }
}

async function triggerOwnerReminders(options = {}) {
  const days = Number(options.days ?? process.env.OWNER_REMINDER_DAYS ?? 7);
  const force = Boolean(options.force);
  const members = await listMembers();
  const activeMembers = members.filter((member) => member.status === "active");
  const results = [];

  for (const member of activeMembers) {
    const remainingDays = daysUntil(member.endDate);

    if (remainingDays < 0 || remainingDays > days) {
      continue;
    }

    if (!force && remainingDays === 0 && member.reminderToday) {
      results.push({
        memberId: member.memberId,
        phone: member.phone,
        name: member.name,
        skipped: true,
        reason: "today reminder already sent"
      });
      continue;
    }

    if (!force && remainingDays === 3 && member.reminder3Days) {
      results.push({
        memberId: member.memberId,
        phone: member.phone,
        name: member.name,
        skipped: true,
        reason: "3-day reminder already sent"
      });
      continue;
    }

    const reminderField = remainingDays === 0 ? "reminderToday" : "reminder3Days";
    await sendRenewalReminder(member, reminderField, {
      markSent: remainingDays === 0 || remainingDays === 3
    });

    results.push({
      memberId: member.memberId,
      phone: member.phone,
      name: member.name,
      endDate: member.endDate,
      remainingDays,
      sent: true
    });
  }

  return {
    days,
    checked: activeMembers.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    results
  };
}

module.exports = {
  runDailyReminders,
  triggerOwnerReminders
};
