import express from "express";
import db from "../db.js";

const router = express.Router();

/** 📝 Score einreichen (Server multipliziert, falls Base-Werte mitkommen) */
router.post("/submit", async (req, res) => {
  const {
    username,
    score, // legacy (bereits multipliziert)
    baseScore, // ✅ neu: Basis-Score
    consecutive_wins,
    money_per_round, // legacy (evtl. multipliziert)
    baseMoneyPerRound, // ✅ neu: Basis-Geld/Runde
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

    const wins = Number.isFinite(Number(consecutive_wins))
      ? Number(consecutive_wins)
      : 0;

    const dateIso = new Date().toISOString();

    // Score speichern
    await db.execute(
      `INSERT INTO scores (username, score, created_at, consecutive_wins, money_per_round)
       VALUES (?, ?, ?, ?, ?)`,
      [username, finalScore, dateIso, wins, finalMoneyPerRound]
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
    const result = await db.execute(
      `
      SELECT COUNT(*) AS betterPlayers
      FROM (
        SELECT LOWER(username) AS uname, MAX(score) AS best
        FROM scores
        GROUP BY uname
      ) t
      WHERE t.best > ?
    `,
      [s]
    );

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

// Verlauf aller Score-Einträge eines Spielers
router.get("/scores/user/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const result = await db.execute({
      sql: `
        SELECT id, score, created_at
        FROM scores
        WHERE LOWER(username) = LOWER(?)
        ORDER BY created_at ASC
      `,
      args: [username],
    });

    return res.json(result.rows);
  } catch (err) {
    console.error("❌ Fehler beim Laden des Score-Verlaufs:", err);
    return res
      .status(500)
      .json({ error: "Fehler beim Abrufen des Score-Verlaufs" });
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

// helper: wandelt "2,1" -> 2.1, fällt safe auf 1 zurück
function parseMult(x, fallback = 1) {
  if (x == null) return fallback;
  if (typeof x === "string") x = x.replace(",", ".");
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default router;
