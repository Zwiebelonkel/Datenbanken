import express from "express";
import db from "../db.js";

const router = express.Router();

router.post("/submit", async (req, res) => {
  const { username, score, consecutive_wins, money_per_round } = req.body;
  const date = new Date();

  try {
    await db.execute(
      `INSERT INTO scores (username, score, created_at, consecutive_wins, money_per_round)
       VALUES (?, ?, ?, ?, ?)`,
      [username, score, date.toISOString(), consecutive_wins, money_per_round]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gesamtpunktzahl aktualisieren
router.post("/updateTotalScore", async (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== "number") {
    return res.status(400).json({ message: "Ungültige Eingaben" });
  }

  try {
    await db.execute({
      sql: "UPDATE users SET total_score = total_score + ? WHERE LOWER(username) = LOWER(?)",
      args: [score, username],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim total_score:", err);
    res.status(500).json({ message: "total_score Update fehlgeschlagen" });
  }
});

/** 🔝 Top 10 Einzel-Highscores inkl. Avatar */
router.get("/top", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        s.username,
        s.score,
        s.created_at,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      ORDER BY s.score DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 📜 Alle Scores (falls du es brauchst) inkl. Avatar */
router.get("/all", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        s.*,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      ORDER BY s.score DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Scores" });
  }
});

// Highscore prüfen
router.post("/isHighscore", async (req, res) => {
  const { score } = req.body;
  try {
    const result = await db.execute({
      sql: "SELECT COUNT(*) AS betterScores FROM scores WHERE score > ?",
      args: [score],
    });
    const count = result.rows[0].betterScores;
    res.json({ isHighscore: count < 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Total Score eines Users abrufen
router.get("/userTotalScore/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await db.execute({
      sql: "SELECT total_score FROM users WHERE LOWER(username) = LOWER(?)",
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User nicht gefunden" });
    }
    res.json({ total_score: result.rows[0].total_score });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

/** 🔹 Längste Serien inkl. Avatar */
router.get("/topStreaks", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        s.username,
        MAX(s.consecutive_wins) AS consecutive_wins,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      GROUP BY s.username, u.profile_image_url
      ORDER BY consecutive_wins DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 🔹 Meistes Geld pro Runde inkl. Avatar */
router.get("/topMoneyPerRound", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        s.username,
        MAX(s.money_per_round) AS money_per_round,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      GROUP BY s.username, u.profile_image_url
      ORDER BY money_per_round DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;