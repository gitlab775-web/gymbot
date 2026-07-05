const { readDatabase, writeDatabase } = require("./localDatabase");
const { addDays, toSheetDate } = require("../utils/dates");
const {
  findSheetMemberByPaymentId,
  findSheetMemberByPhone,
  isGoogleSheetsEnabled,
  listSheetMembers,
  upsertSheetMember
} = require("./googleSheetsService");

function createMemberId() {
  return `MEM-${Date.now()}`;
}

async function findMemberByPhone(phone) {
  if (isGoogleSheetsEnabled()) {
    return findSheetMemberByPhone(phone);
  }

  const db = await readDatabase();
  return db.members.find((member) => member.phone === phone) || null;
}

async function listMembers() {
  if (isGoogleSheetsEnabled()) {
    return listSheetMembers();
  }

  const db = await readDatabase();
  return db.members;
}

async function createPendingMember({ name, phone, plan, paymentId }) {
  if (isGoogleSheetsEnabled()) {
    const existing = await findSheetMemberByPhone(phone);
    const member = {
      memberId: existing?.memberId || createMemberId(),
      name,
      phone,
      plan: plan.label,
      amount: plan.amount,
      startDate: existing?.startDate || "",
      endDate: existing?.endDate || "",
      status: "payment_pending",
      reminder3Days: existing?.reminder3Days || "",
      reminderToday: existing?.reminderToday || "",
      lastPaymentId: paymentId,
      planDays: plan.days,
      updatedAt: new Date().toISOString()
    };

    await upsertSheetMember(member);
    return member;
  }

  const db = await readDatabase();
  const existingIndex = db.members.findIndex((member) => member.phone === phone);
  const now = new Date();
  const existing = existingIndex >= 0 ? db.members[existingIndex] : null;

  const member = {
    memberId: existing?.memberId || createMemberId(),
    name,
    phone,
    plan: plan.label,
    amount: plan.amount,
    startDate: existing?.startDate || "",
    endDate: existing?.endDate || "",
    status: "payment_pending",
    reminder3Days: existing?.reminder3Days || "",
    reminderToday: existing?.reminderToday || "",
    lastPaymentId: paymentId,
    planDays: plan.days,
    updatedAt: now.toISOString()
  };

  if (existingIndex >= 0) {
    db.members[existingIndex] = member;
  } else {
    db.members.push(member);
  }

  await writeDatabase(db);
  return member;
}

async function activatePayment(paymentId) {
  if (isGoogleSheetsEnabled()) {
    const member = await findSheetMemberByPaymentId(paymentId);

    if (!member) return null;

    const today = new Date();
    const currentEnd = member.endDate ? new Date(member.endDate) : null;
    const renewalBase = currentEnd && currentEnd > today ? currentEnd : today;
    const endDate = addDays(renewalBase, member.planDays);
    const activatedMember = {
      ...member,
      startDate: member.startDate || toSheetDate(today),
      endDate: toSheetDate(endDate),
      status: "active",
      reminder3Days: "",
      reminderToday: "",
      updatedAt: today.toISOString()
    };

    await upsertSheetMember(activatedMember);
    return activatedMember;
  }

  const db = await readDatabase();
  const memberIndex = db.members.findIndex((member) => member.lastPaymentId === paymentId);

  if (memberIndex < 0) return null;

  const member = db.members[memberIndex];
  const today = new Date();
  const currentEnd = member.endDate ? new Date(member.endDate) : null;
  const renewalBase = currentEnd && currentEnd > today ? currentEnd : today;
  const endDate = addDays(renewalBase, member.planDays);

  db.members[memberIndex] = {
    ...member,
    startDate: member.startDate || toSheetDate(today),
    endDate: toSheetDate(endDate),
    status: "active",
    reminder3Days: "",
    reminderToday: "",
    updatedAt: today.toISOString()
  };

  await writeDatabase(db);
  return db.members[memberIndex];
}

async function markReminderSent(memberId, reminderField) {
  if (isGoogleSheetsEnabled()) {
    const members = await listSheetMembers();
    const member = members.find((item) => item.memberId === memberId);

    if (!member) return null;

    member[reminderField] = new Date().toISOString();
    member.updatedAt = new Date().toISOString();

    await upsertSheetMember(member);
    return member;
  }

  const db = await readDatabase();
  const member = db.members.find((item) => item.memberId === memberId);

  if (!member) return null;

  member[reminderField] = new Date().toISOString();
  member.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  return member;
}

module.exports = {
  activatePayment,
  createPendingMember,
  findMemberByPhone,
  listMembers,
  markReminderSent
};
