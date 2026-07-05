const plans = {
  "1": {
    code: "monthly",
    label: "Monthly",
    amount: 600,
    days: 30
  },
  "2": {
    code: "quarterly",
    label: "Quarterly",
    amount: 1500,
    days: 90
  },
  "3": {
    code: "half_yearly",
    label: "Half Yearly",
    amount: 2700,
    days: 180
  }
};

function getPlan(choice) {
  return plans[String(choice)];
}

function getPlanChoice(input) {
  const value = String(input || "").trim().toLowerCase();

  if (["1", "monthly", "month", "monthly - rs 600", "monthly-600"].includes(value)) {
    return "1";
  }
  if (["2", "quarterly", "quarter", "quarterly - rs 1500", "quarterly-1500"].includes(value)) {
    return "2";
  }
  if (
    [
      "3",
      "half yearly",
      "half-yearly",
      "half year",
      "half yearly - rs 2700",
      "half yearly-2700",
      "half-yearly-2700"
    ].includes(value)
  ) {
    return "3";
  }

  return null;
}

function membershipMenu() {
  return [
    "Welcome to RK Gym",
    "Choose membership:",
    "1. Monthly - Rs 600",
    "2. Quarterly - Rs 1500",
    "3. Half Yearly - Rs 2700"
  ].join("\n");
}

module.exports = {
  plans,
  getPlan,
  getPlanChoice,
  membershipMenu
};
