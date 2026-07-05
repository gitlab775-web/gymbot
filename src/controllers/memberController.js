const ExcelJS = require("exceljs");
const { listMembers } = require("../services/memberService");
const { isGoogleSheetsEnabled, sheetColumns } = require("../services/googleSheetsService");

async function getMembers(_req, res) {
  const members = await listMembers();
  const uniqueMembers = Array.from(
    members
      .reduce((byMemberId, member) => {
        byMemberId.set(member.memberId || member.phone, member);
        return byMemberId;
      }, new Map())
      .values()
  );

  res.json({ members: uniqueMembers });
}

async function exportMembers(_req, res) {
  if (isGoogleSheetsEnabled()) {
    return res.redirect(`https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`);
  }

  const members = await listMembers();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Members");

  sheet.columns = sheetColumns.map((column) => ({
    header: column,
    key: column,
    width: 18
  }));

  members.forEach((member) => sheet.addRow(member));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=members.xlsx");

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  exportMembers,
  getMembers
};
