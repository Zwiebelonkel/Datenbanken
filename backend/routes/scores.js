import express from "express";
import db from "../db.js";

const router = express.Router();

/** 📝 Score einreichen (Server multipliziert, falls Base-Werte mitkommen) */
router.post("/submit", async (req, res) => {
  const {
    username,
    score, // legacy (bereits multipliziert vom Client)
    baseScore, // ✅ neu: Basis-Score (ohne score_multiplier)
    consecutive_wins,
    money_per_round, // legacy (evtl. schon multipliziert)
    baseMoneyPerRound, // ✅ neu: Basis-Geld/Runde (ohne monetary_multiplier)
  } = req.body;

  if (!username) return res.status(400).json({ error: "Kein Benutzername" });

  try {
    // Multis holen
    const u = await db.execute({
      sql: `SELECT 
              COALESCE(score_multiplier,1.0)    AS sm,
              COALESCE(monetary_multiplier,1.0) AS mm
            FROM users 
            WHERE LOWER(username)=LOWER(?) 
            LIMIT 1`,
      args: [username],
    });
    if (!u.rows.length)
      return res.status(404).json({ error: "User nicht gefunden" });

    const sm = Number(u.rows[0].sm) || 1;
    const mm = Number(u.rows[0].mm) || 1;

    // Finalwerte bestimmen (Base bevorzugt, sonst legacy)
    const finalScore = Math.round(
      Number.isFinite(Number(baseScore))
        ? Number(baseScore) * sm
        : Number(score) || 0
    );

    const finalMoneyPerRound = Math.round(
      Number.isFinite(Number(baseMoneyPerRound))
        ? Number(baseMoneyPerRound) * mm
        : Number(money_per_round) || 0
    );

    const dateIso = new Date().toISOString();

    // Score speichern
    await db.execute(
      `INSERT INTO scores (username, score, created_at, consecutive_wins, money_per_round)
       VALUES (?, ?, ?, ?, ?)`,
      [
        username,
        finalScore,
        dateIso,
        consecutive_wins ?? null,
        finalMoneyPerRound,
      ]
    );

    // total_score erhöhen (mit finalScore)
    await db.execute({
      sql: `UPDATE users SET total_score = total_score + ? WHERE LOWER(username)=LOWER(?)`,
      args: [finalScore, username],
    });

    res.json({
      success: true,
      score: finalScore,
      money_per_round: finalMoneyPerRound,
      scoreMultiplier: sm,
      monetaryMultiplier: mm,
      savedAt: dateIso,
    });
  } catch (err) {
    console.error("❌ /scores/submit Fehler:", err);
    res.status(500).json({ error: "Serverfehler beim Score-Submit" });
  }
});

/** 🔼 Gesamtpunktzahl aktualisieren (Server multipliziert, falls baseScore mitkommt) */
router.post("/updateTotalScore", async (req, res) => {
  const { username, score, baseScore } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Kein Benutzername" });
  }

  try {
    let add = 0;

    if (Number.isFinite(Number(baseScore))) {
      // score_multiplier holen & anwenden
      const u = await db.execute({
        sql: `SELECT COALESCE(score_multiplier,1.0) AS sm
              FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
        args: [username],
      });
      if (!u.rows.length)
        return res.status(404).json({ message: "User nicht gefunden" });

      const sm = Number(u.rows[0].sm) || 1;
      add = Math.round(Number(baseScore) * sm);
    } else if (Number.isFinite(Number(score))) {
      // legacy: bereits multipliziert angeliefert
      add = Number(score);
    } else {
      return res
        .status(400)
        .json({ message: "Ungültige Eingaben (score/baseScore)" });
    }

    await db.execute({
      sql: "UPDATE users SET total_score = total_score + ? WHERE LOWER(username) = LOWER(?)",
      args: [add, username],
    });
    res.json({ success: true, added: add });
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

/** 📜 Alle Scores inkl. Avatar */
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

/** ❓ Highscore prüfen */
router.post("/isHighscore", async (req, res) => {
  const { score } = req.body; // erwartet finalen Score (wie gespeichert)
  try {
    const result = await db.execute({
      sql: "SELECT COUNT(*) AS betterScores FROM scores WHERE score > ?",
      args: [Number(score) || 0],
    });
    const count = result.rows[0].betterScores;
    res.json({ isHighscore: count < 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 🔢 Total Score eines Users abrufen */
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

/** 🔹 Längste Serien (Top 10) inkl. Avatar */
router.get("/topStreaks", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        s.username,
        s.consecutive_wins,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      ORDER BY s.consecutive_wins DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 🔹 Meistes Geld pro Runde (Top 10) inkl. Avatar */
router.get("/topMoneyPerRound", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT
        s.username,
        s.money_per_round,
        u.profile_image_url AS profileImageUrl
      FROM scores s
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(s.username)
      ORDER BY s.money_per_round DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
