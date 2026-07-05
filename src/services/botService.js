const { getPlan, getPlanChoice, membershipMenu } = require("../config/plans");
const { createPendingMember, findMemberByPhone } = require("./memberService");
const { createPaymentLink } = require("./paymentService");
const { normalizePhone } = require("../utils/phone");

const sessions = new Map();

function startMembershipSelection(phone) {
  const normalizedPhone = normalizePhone(phone);
  sessions.set(normalizedPhone, { step: "choose_plan" });
  return membershipMenu();
}

async function handleIncomingText({ phone, text, baseUrl }) {
  const normalizedPhone = normalizePhone(phone);
  const message = String(text || "").trim();
  const command = message.toLowerCase();
  const session = sessions.get(normalizedPhone) || { step: "menu" };
  const planChoice = getPlanChoice(message);

  if (["hi", "hello", "hey", "menu", "start"].includes(command)) {
    return startMembershipSelection(normalizedPhone);
  }

  if (session.step === "choose_plan" || (session.step === "menu" && planChoice)) {
    const plan = getPlan(planChoice);

    if (!plan) {
      return `Please choose a valid membership.\n\n${membershipMenu()}`;
    }

    const existingMember = await findMemberByPhone(normalizedPhone);

    if (existingMember?.name) {
      const paymentLink = await createPaymentLink({
        memberName: existingMember.name,
        phone: normalizedPhone,
        plan,
        baseUrl
      });

      await createPendingMember({
        name: existingMember.name,
        phone: normalizedPhone,
        plan,
        paymentId: paymentLink.id
      });

      sessions.delete(normalizedPhone);

      return [
        `Welcome back ${existingMember.name}.`,
        "Pay here to renew membership:",
        paymentLink.short_url,
        "",
        paymentLink.mode === "dummy"
          ? "Dummy mode: open this link in browser to simulate successful payment."
          : "After payment, your membership will activate automatically."
      ].join("\n");
    }

    sessions.set(normalizedPhone, {
      step: "ask_name",
      planChoice
    });

    return "Please share your full name.";
  }

  if (session.step === "ask_name") {
    if (message.length < 2) {
      return "Please share a valid full name.";
    }

    const plan = getPlan(session.planChoice);
    const paymentLink = await createPaymentLink({
      memberName: message,
      phone: normalizedPhone,
      plan,
      baseUrl
    });

    await createPendingMember({
      name: message,
      phone: normalizedPhone,
      plan,
      paymentId: paymentLink.id
    });

    sessions.delete(normalizedPhone);

    return [
      "Great. Pay here to activate membership:",
      paymentLink.short_url,
      "",
      paymentLink.mode === "dummy"
        ? "Dummy mode: open this link in browser to simulate successful payment."
        : "After payment, your membership will activate automatically."
    ].join("\n");
  }

  sessions.set(normalizedPhone, { step: "choose_plan" });
  return membershipMenu();
}

module.exports = {
  handleIncomingText,
  startMembershipSelection
};
