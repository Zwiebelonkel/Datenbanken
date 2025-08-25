import express from "express";
import db from "../db.js";

const router = express.Router();

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** 📝 Score einreichen */
router.post("/submit", async (req, res) => {
  const {
    username,
    baseScore,             // Basis-Score (ohne Profil/Karten/Streak)
    score,                 // legacy (schon multipliziert)
    consecutive_wins,
    baseMoneyPerRound,     // Basis MPR (ohne alle Multis)
    money_per_round,       // legacy
  } = req.body;

  if (!username) return res.status(400).json({ error: "Kein Benutzername" });

  try {
    // Nur für SCORE brauchen wir den sm
    const u = await db.execute({
      sql: `SELECT COALESCE(score_multiplier,1.0) AS sm
            FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
      args: [username],
    });
    if (!u.rows.length) return res.status(404).json({ error: "User nicht gefunden" });

    const sm = Number(u.rows[0].sm) || 1;

    // SCORE: baseScore bevorzugt, legacy fallback
    let finalScore = 0;
    if (isNum(baseScore)) {
      finalScore = Math.round(baseScore * sm);
    } else if (isNum(score)) {
      finalScore = Math.round(score);
    }

    // MPR (digitale Währung): IMMER Basis, keine Multiplikatoren
    let mprBase = 0;
    if (isNum(baseMoneyPerRound)) {
      mprBase = baseMoneyPerRound;
    } else if (isNum(money_per_round)) {
      mprBase = money_per_round;
    }
    // optional auf 2 Nachkommastellen „runden“, aber nicht auf Ganzzahl
    mprBase = Math.round(mprBase * 100) / 100;

    const dateIso = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO scores (username, score, created_at, consecutive_wins, money_per_round)
            VALUES (?, ?, ?, ?, ?)`,
      args: [username, finalScore, dateIso, isNum(consecutive_wins) ? consecutive_wins : null, mprBase],
    });

    await db.execute({
      sql: `UPDATE users SET total_score = total_score + ?
            WHERE LOWER(username)=LOWER(?)`,
      args: [finalScore, username],
    });

    res.json({
      success: true,
      score: finalScore,
      money_per_round: mprBase,   // Basis!
      scoreMultiplier: sm,
      monetaryMultiplier: 1,      // hier bewusst nicht genutzt
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

/** 🔝 Top 10 Einzel-Highscores inkl. Avatar – je Spieler nur ein Eintrag (bester) */
router.get("/top", async (_req, res) => {
  try {
    const result = await db.execute(`
      WITH ranked AS (
        SELECT
          s.username,
          s.score,
          s.created_at,
          u.profile_image_url AS profileImageUrl,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(s.username)
            ORDER BY s.score DESC, s.created_at ASC
          ) AS rn
        FROM scores s
        LEFT JOIN users u
          ON LOWER(u.username) = LOWER(s.username)
      )
      SELECT username, score, created_at, profileImageUrl
      FROM ranked
      WHERE rn = 1
      ORDER BY score DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 📜 Alle Scores inkl. Avatar (volle Liste, NICHT dedupliziert) */
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

/** ❓ Highscore prüfen – Top-10 mit „ein Eintrag pro Spieler“ Logik */
router.post("/isHighscore", async (req, res) => {
  const { score } = req.body; // finaler Score
  const s = Number(score) || 0;
  try {
    // Anzahl Spieler mit einem besseren *Bestwert* ermitteln
    const result = await db.execute(`
      SELECT COUNT(*) AS betterPlayers
      FROM (
        SELECT LOWER(username) AS uname, MAX(score) AS best
        FROM scores
        GROUP BY uname
      ) t
      WHERE t.best > ?
    `, [s]);

    const betterPlayers = Number(result.rows?.[0]?.betterPlayers || 0);
    res.json({ isHighscore: betterPlayers < 10 });
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

/** 🔹 Längste Serien (Top 10) inkl. Avatar – je Spieler nur ein Eintrag (beste Serie) */
router.get("/topStreaks", async (_req, res) => {
  try {
    const result = await db.execute(`
      WITH best AS (
        SELECT
          s.username,
          MAX(COALESCE(s.consecutive_wins, 0)) AS best_streak
        FROM scores s
        GROUP BY LOWER(s.username)
      )
      SELECT
        b.username,
        b.best_streak AS consecutive_wins,
        u.profile_image_url AS profileImageUrl
      FROM best b
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(b.username)
      ORDER BY b.best_streak DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 🔹 Meistes Geld pro Runde (Top 10) inkl. Avatar – je Spieler nur ein Eintrag (bester Wert) */
router.get("/topMoneyPerRound", async (_req, res) => {
  try {
    const result = await db.execute(`
      WITH best AS (
        SELECT
          s.username,
          MAX(COALESCE(s.money_per_round, 0)) AS best_mpr
        FROM scores s
        GROUP BY LOWER(s.username)
      )
      SELECT
        b.username,
        b.best_mpr AS money_per_round,
        u.profile_image_url AS profileImageUrl
      FROM best b
      LEFT JOIN users u
        ON LOWER(u.username) = LOWER(b.username)
      ORDER BY b.best_mpr DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;