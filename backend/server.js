
import express from "express";
import cors from "cors";
import http from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import scoresRoutes from "./routes/scores.js";
import profileRoutes from "./routes/profile.js";
import skillRoutes from "./routes/skills.js";
import moneyRoutes from "./routes/money.js";
import cardsRoutes from "./routes/cards.js";
import db from "./db.js";
import villageRoutes from "./routes/village.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import messagesRoutes from "./routes/messages.js";
import setupWebsockets from "./websockets.js";
import { verifyToken, requireAuth, requireAdmin } from "./auth.js";

const app = express();
const server = http.createServer(app);
const io = setupWebsockets(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

app.use(cors());
app.use(express.json());
app.use("/api/scores", scoresRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/profile", skillRoutes);
app.use("/api/money", moneyRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/village", villageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/uploads", express.static("uploads"));

const ALL_ACHIEVEMENTS = [
  { name: "First Game 1️⃣", description: "Dein erstes Spiel!" },
  { name: "Pechvogel 🐓", description: "0 Punkte erzielt" },
  { name: "Newbie 🐣", description: "Du hast 10 Punkte erreicht!" },
  { name: "Glückspilz 🍄", description: "Du hast 50 Punkte erreicht!" },
  { name: "Zahlenmeister 💯", description: "Du hast 75 Punkte erreicht!" },
  { name: "Rund 🥸", description: "Du hast 100 Punkte erreicht!" },
  { name: "Göttlicher Segen 👼🏻", description: "Du hast 500 Punkte erreicht!" },
  {
    name: "Gambler 🎲",
    description: "Du hast 3 mal richtig geraten ohne ein Leben zu verlieren",
  },
  {
    name: "Arbeitswoche 🛠️",
    description: "Du hast 5 mal richtig geraten ohne ein Leben zu verlieren",
  },
  {
    name: "Strategieprofi 🧭",
    description: "Du hast 10 mal richtig geraten ohne ein Leben zu verlieren",
  },
  {
    name: "Magier 🪄",
    description: "Du hast 20 mal richtig geraten ohne ein Leben zu verlieren",
  },
  { name: "Champion 🏆", description: "Sei auf dem Leaderboard" },
  { name: "Gründer 🔰", description: "Verbessere dein Dorf" },
  { name: "Bürgermeister 🏠", description: "Verbessere dein Dorf auf Level 5" },
  { name: "Kanzler 🗳️", description: "Verbessere dein Dorf auf Level 10" },
  { name: "Präsident 🦅", description: "Verbessere dein Dorf auf Level 20" },
  { name: "Diktator 👑", description: "Verbessere dein Dorf auf Level 50" },
  { name: "Las Vegas 🎰", description: "Versuche dein Glück" },
  { name: "Lone Wolf 🐺", description: "Gewinne beim Glücksspiel" },
  { name: "Joker 🃏", description: "Ziehe die seltenste Karte im Spiel" },
];

// Registrierung mit Dorf und Bewohnern
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    // 1. Nutzer anlegen
    const result = await db.execute({
      sql: "INSERT INTO users (username, password) VALUES (?, ?)",
      args: [username, hash],
    });

    const userId = result.lastInsertRowid;

    // 2. Dorf anlegen
    const villageResult = await db.execute({
      sql: "INSERT INTO village (user_id) VALUES (?)"
      ,
      args: [userId],
    });

    const villageId = villageResult.lastInsertRowid;

    // 3. 4 Bewohner anlegen
    for (let i = 1; i <= 2; i++) {
      await db.execute({
        sql: "INSERT INTO villagers (village_id, name, level, income) VALUES (?, ?, ?, ?)",
        args: [villageId, `Bewohner ${i}`, 1, 0.5],
      });
    }

    res.status(201).json({ message: "Registrierung & Dorf erfolgreich" });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ message: "Benutzername bereits vergeben" });
    }
    console.error("❌ Fehler bei Registrierung:", err);
    res.status(500).json({ message: "Fehler beim Registrieren" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Falsches Passwort" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ message: "Login-Fehler" });
  }
});

// Benutzerliste
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.execute("SELECT id, username FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Benutzer" });
  }
});

// Benutzer + alle abhängigen Daten löschen (mit ON DELETE CASCADE)
// DELETE /api/users/:id nur für authentifizierte Admins erlauben
app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. Hole den Username des Users
    const result = await db.execute({
      sql: "SELECT username FROM users WHERE id = ?",
      args: [userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User nicht gefunden" });
    }

    const username = result.rows[0].username;

    // 2. Lösche alle Scores mit diesem Username
    await db.execute({
      sql: "DELETE FROM scores WHERE username = ?",
      args: [username],
    });

    // 3. Lösche den User selbst
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId],
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Benutzerlöschen:", err);
    res.status(500).json({ error: "Fehler beim Löschen des Benutzers" });
  }
});

// Scores abrufen (kann vielleicht weg wegen scores.js)
app.get("/api/scores/all", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM scores ORDER BY score DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Scores" });
  }
});

// Score löschen
app.delete("/api/scores/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM scores WHERE id = ?",
      args: [req.params.id],
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Scores" });
  }
});

// Achievements abrufen
app.get("/api/achievements", async (req, res) => {
  const username = req.query.username;
  if (!username)
    return res.status(400).json({ error: "Kein Benutzername angegeben" });

  try {
    const result = await db.execute({
      sql: `
        SELECT a.name FROM achievements a
        JOIN users u ON u.id = a.user_id
        WHERE LOWER(u.username) = LOWER(?)
      `,
      args: [username],
    });

    const unlockedNames = result.rows.map((r) => r.name);
    const merged = ALL_ACHIEVEMENTS.map((ach) => ({
      ...ach,
      unlocked: unlockedNames.includes(ach.name),
    }));

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Achievements" });
  }
});

// Achievement freischalten
app.post("/api/unlock", async (req, res) => {
  const { userId, name, description } = req.body;
  if (!userId || !name || !description) {
    return res.status(400).json({ message: "Fehlende Daten" });
  }

  try {
    const result = await db.execute({
      sql: "SELECT * FROM achievements WHERE user_id = ? AND name = ?",
      args: [userId, name],
    });

    if (result.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO achievements (user_id, name, description, unlocked) VALUES (?, ?, ?, 1)",
        args: [userId, name, description],
      });

      return res.status(201).json({ unlocked: true, name });
    }

    // Bereits vorhanden
    return res.status(200).json({ unlocked: false, name });
  } catch (err) {
    console.error("Fehler beim Achievement-Unlock:", err);
    return res.status(500).json({ message: "Serverfehler" });
  }
});

// Passwort ändern
app.patch("/api/users/password", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Benutzer nicht gefunden" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ message: "Falsches Passwort" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: "UPDATE users SET password = ? WHERE username = ?",
      args: [hashedPassword, username],
    });

    res.json({ message: "Passwort erfolgreich geändert" });
  } catch (err) {
    res.status(500).json({ message: "Fehler beim Ändern des Passworts" });
  }
});

// Automatisches Einkommen (passiv)
app.get("/api/collect", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const villageResult = await db.execute({
      sql: "SELECT * FROM village WHERE user_id = ?",
      args: [userId],
    });
    const village = villageResult.rows[0];
    if (!village)
      return res.status(404).json({ message: "Kein Dorf gefunden" });

    const villagersResult = await db.execute({
      sql: "SELECT income FROM villagers WHERE village_id = ?",
      args: [village.id],
    });
    const villagersIncome = villagersResult.rows.reduce(
      (sum, row) => sum + row.income,
      0
    );

    const now = new Date();
    const lastCollected = new Date(village.last_collected || now);
    const minutesPassed = Math.floor((now - lastCollected) / 60000);
    if (minutesPassed <= 0) {
      return res.json({ earned: 0, minutesPassed: 0 });
    }

    const income = (village.base_income + villagersIncome) * minutesPassed;

    await db.execute({
      sql: "UPDATE users SET money = money + ? WHERE id = ?",
      args: [income, userId],
    });

    await db.execute({
      sql: "UPDATE village SET last_collected = ? WHERE id = ?",
      args: [now.toISOString(), village.id],
    });

    res.json({
      earned: income,
      minutesPassed,
      villageLevel: village.level,
      villagers: villagersResult.rows,
    });
  } catch (err) {
    console.error("💥 Fehler bei /api/collect:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// Seiten-Konfiguration laden (öffentlich oder mit Login)
app.get("/api/pages", async (req, res) => {
  try {
    const result = await db.execute("SELECT key, enabled FROM page_settings");
    const pages = {};
    result.rows.forEach((r) => {
      pages[r.key] = !!r.enabled;
    });
    res.json({ pages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden der Seiten" });
  }
});

// Admin: Seiten-Flags lesen (mit Auth)
app.get("/api/admin/pages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute("SELECT key, enabled FROM page_settings");
    const pages = {};
    result.rows.forEach((r) => {
      pages[r.key] = !!r.enabled;
    });
    res.json({ pages });
  } catch (err) {
    console.error("Fehler beim Laden der Admin-Seitenflags:", err);
    res.status(500).json({ error: "Fehler beim Laden der Seiten" });
  }
});

// Admin-Only: alle Seiten inkl. ändern
app.put(
  "/api/admin/pages/:key",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const key = req.params.key;
    const enabled = !!req.body.enabled;
    try {
      await db.execute({
        sql: `INSERT INTO page_settings (key, enabled)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled`,
        args: [key, enabled ? 1 : 0],
      });

      const result = await db.execute("SELECT key, enabled FROM page_settings");
      const pages = {};
      result.rows.forEach((r) => {
        pages[r.key] = !!r.enabled;
      });
      res.json({ pages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Speichern der Seite" });
    }
  }
);

// 🔝 Alle Spieler nach Level (absteigend) inkl. Profilbild — serverseitig paginiert
app.get("/api/users/levels", async (req, res) => {
  try {
    // Query-Parameter parsen & begrenzen
    const pageParam = parseInt(String(req.query.page ?? "1"), 10);
    const limitParam = parseInt(String(req.query.limit ?? "10"), 10);
    let page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, limitParam))
      : 10;

    // Gesamtanzahl
    const totalRows = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM users`,
      args: [],
    });
    const total = Number(totalRows.rows[0]?.cnt ?? 0);

    if (total === 0) {
      res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
      return res.json({
        users: [],
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
        hasPrev: false,
        hasNext: false,
      });
    }

    // totalPages berechnen und page clampen
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;

    const offset = (page - 1) * limit;

    // Daten selektieren — xpThreshold & xpPercent werden ohne DB-Spalte berechnet
    const rows = await db.execute({
      sql: `
        SELECT
          u.username,
          COALESCE(u.level, 1)   AS level,
          COALESCE(u.xp, 0)      AS xp,
          COALESCE(u.total_score, 0) AS total_score,
          u.profile_image_url    AS profileImageUrl
        FROM users u
        ORDER BY
          level DESC,
          xp DESC,
          total_score DESC,
          username COLLATE NOCASE ASC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    // Mapping + Berechnung wie an deiner anderen Stelle:
    const users = rows.rows.map((u) => {
      const lvl = Number(u.level) || 1;
      const xp = Number(u.xp) || 0;

      // XP-Schwelle (gleich wie im Screenshot): 100 * 1.05^(level-1)
      const thr = Math.round(100 * Math.pow(1.05, lvl - 1));

      // Prozent 0..100, division by zero sicher
      const xpPercent = Math.min(
        100,
        Math.max(0, Math.round((thr ? xp / thr : 0) * 100))
      );

      return {
        username: u.username,
        level: lvl,
        xp,
        xpThreshold: thr,
        xpPercent,
        total_score: Number(u.total_score) || 0,
        profileImageUrl: u.profileImageUrl ?? null,
      };
    });

    // kurze Cachebarkeit erlauben
    res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=60");

    return res.json({
      users,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    });
  } catch (err) {
    console.error("❌ /api/users/levels Fehler:", err);
    return res.status(500).json({ error: "Fehler beim Laden der Level-Liste" });
  }
});

// Server starten
server.listen(PORT, () => {
  console.log(`✅ Server läuft auf: ${PORT}. Jetzt nurnoch Eier schaukeln.🥚`);
});
