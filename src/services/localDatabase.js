const fs = require("fs/promises");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "members.json");

const emptyData = {
  members: [],
  payments: []
};

async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(emptyData, null, 2));
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

async function writeDatabase(data) {
  await ensureDatabase();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

module.exports = {
  readDatabase,
  writeDatabase
};
