import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token fehlt" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Ungültiger Token" });
  }
}

export function requireAuth(req, res, next) {
  return verifyToken(req, res, next);
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  const role = String(req.user.role || "").toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({ error: "Nur für Admins" });
  }
  next();
}
