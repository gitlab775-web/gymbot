const Razorpay = require("razorpay");

function hasRazorpayCredentials() {
  return Boolean(process.env.RAZORPAY_KEY && process.env.RAZORPAY_SECRET);
}

function getRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
  });
}

async function createPaymentLink({ memberName, phone, plan, baseUrl }) {
  // Dummy mode keeps phase 1 testable before you create Razorpay credentials.
  if (!hasRazorpayCredentials()) {
    const paymentId = `dummy_${Date.now()}`;

    return {
      id: paymentId,
      short_url: `${baseUrl}/dev/pay-success/${paymentId}`,
      mode: "dummy"
    };
  }

  const razorpay = getRazorpayClient();
  const paymentLink = await razorpay.paymentLink.create({
    amount: plan.amount * 100,
    currency: "INR",
    description: `RK Gym ${plan.label} Membership`,
    customer: {
      name: memberName,
      contact: phone.replace("+", "")
    },
    notes: {
      memberName,
      phone,
      plan: plan.label,
      planDays: String(plan.days)
    },
    notify: {
      sms: false,
      email: false
    }
  });

  return {
    id: paymentLink.id,
    short_url: paymentLink.short_url,
    mode: "razorpay"
  };
}

module.exports = {
  createPaymentLink
};
