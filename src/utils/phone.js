function normalizePhone(value = "") {
  const raw = String(value).trim();
  const withoutWhatsAppPrefix = raw.replace(/^whatsapp:/, "");

  if (withoutWhatsAppPrefix.startsWith("+")) return withoutWhatsAppPrefix;

  const digits = withoutWhatsAppPrefix.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 0) return `+${digits}`;

  return withoutWhatsAppPrefix;
}

module.exports = {
  normalizePhone
};
