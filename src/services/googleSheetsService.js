const { google } = require("googleapis");
const { plans } = require("../config/plans");

const sheetColumns = [
  "memberId",
  "name",
  "phone",
  "plan",
  "amount",
  "startDate",
  "endDate",
  "status",
  "reminder3Days",
  "reminderToday",
  "lastPaymentId"
];

function isGoogleSheetsEnabled() {
  return Boolean(
    process.env.GOOGLE_SHEETS_ENABLED === "true" &&
      process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

function getSheetName() {
  const range = process.env.GOOGLE_SHEET_RANGE || "Members!A:K";
  return range.split("!")[0] || "Members";
}

function getSheetRange() {
  return process.env.GOOGLE_SHEET_RANGE || "Members!A:K";
}

function getSheetsClient() {
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY.trim();
  let privateKey = rawPrivateKey;

  if (privateKey.startsWith("GOOGLE_PRIVATE_KEY=")) {
    privateKey = privateKey.split("=").slice(1).join("=");
  }

  privateKey = privateKey.replace(/^['"`]|['"`]$/g, "").trim();

  if (privateKey.startsWith("{")) {
    privateKey = JSON.parse(privateKey).private_key;
  } else if (privateKey.includes('"private_key"')) {
    privateKey = JSON.parse(privateKey).private_key;
  } else if (privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    const begin = privateKey.indexOf("-----BEGIN PRIVATE KEY-----");
    const endMarker = "-----END PRIVATE KEY-----";
    const end = privateKey.indexOf(endMarker) + endMarker.length;
    privateKey = privateKey.slice(begin, end);
  }

  privateKey = privateKey.replace(/\\n/g, "\n").trim();

  if (privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    const body = privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    const lines = body.match(/.{1,64}/g) || [];

    privateKey = [
      "-----BEGIN PRIVATE KEY-----",
      ...lines,
      "-----END PRIVATE KEY-----"
    ].join("\n");
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

function planDaysFromLabel(label) {
  const plan = Object.values(plans).find((item) => item.label === label);
  return plan?.days || 30;
}

function rowFromMember(member) {
  return sheetColumns.map((column) => member[column] || "");
}

function memberFromRow(row, rowNumber) {
  const member = {};

  sheetColumns.forEach((column, index) => {
    member[column] = row[index] || "";
  });

  member.amount = Number(member.amount || 0);
  member.planDays = planDaysFromLabel(member.plan);
  member.rowNumber = rowNumber;

  return member;
}

async function ensureSheetHeaders() {
  if (!isGoogleSheetsEnabled()) return;

  const sheets = getSheetsClient();
  const sheetName = getSheetName();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A1:K1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [sheetColumns]
    }
  });
}

async function listSheetMembers() {
  if (!isGoogleSheetsEnabled()) return null;

  await ensureSheetHeaders();

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: getSheetRange()
  });

  const rows = response.data.values || [];

  return rows
    .slice(1)
    .map((row, index) => memberFromRow(row, index + 2))
    .filter((member) => member.memberId || member.phone);
}

async function upsertSheetMember(member) {
  if (!isGoogleSheetsEnabled()) return { mode: "disabled" };

  const sheets = getSheetsClient();
  const members = await listSheetMembers();
  const existing = members.find((item) => item.phone === member.phone);
  const sheetName = getSheetName();
  const values = [rowFromMember(member)];

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A${existing.rowNumber}:K${existing.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    return { mode: "google-sheets", action: "updated" };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: getSheetRange(),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values }
  });

  return { mode: "google-sheets", action: "appended" };
}

async function findSheetMemberByPhone(phone) {
  const members = await listSheetMembers();
  if (!members) return null;

  return members.find((member) => member.phone === phone) || null;
}

async function findSheetMemberByPaymentId(paymentId) {
  const members = await listSheetMembers();
  if (!members) return null;

  return members.find((member) => member.lastPaymentId === paymentId) || null;
}

module.exports = {
  findSheetMemberByPaymentId,
  findSheetMemberByPhone,
  isGoogleSheetsEnabled,
  listSheetMembers,
  sheetColumns,
  upsertSheetMember
};
