function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + Number(days));
  return copy;
}

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).format(new Date(date));
}

function toSheetDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

module.exports = {
  addDays,
  daysUntil,
  formatDisplayDate,
  toSheetDate
};
