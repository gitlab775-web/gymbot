function adminAuth(req, res, next) {
  if (!process.env.ADMIN_TOKEN) return next();

  const authHeader = req.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearerToken || req.query.token;

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = adminAuth;
