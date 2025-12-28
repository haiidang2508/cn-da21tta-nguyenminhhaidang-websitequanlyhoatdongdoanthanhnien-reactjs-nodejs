const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id,email,role }
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin only" });
  return next();
}

function requireSecretary(req, res, next) {
  // allow both 'secretary' and 'admin' to access secretary-level endpoints
  if (req.user?.role !== "secretary" && req.user?.role !== "admin") return res.status(403).json({ message: "Secretary only" });
  return next();
}

module.exports = { requireAuth, requireAdmin, requireSecretary };
