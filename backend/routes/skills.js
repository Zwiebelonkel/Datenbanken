import express from "express";
import db from "../db.js";
const router = express.Router();

/* Wichtig: einmalig (Migration) in deiner DB ausführen:
   CREATE TABLE IF NOT EXISTS user_skills (
     username TEXT NOT NULL,
     skill_name TEXT NOT NULL,
     skill_level INTEGER NOT NULL DEFAULT 1,
     purchased INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (username, skill_name)
   );
   -- oder falls es schon existiert:
   CREATE UNIQUE INDEX IF NOT EXISTS ux_user_skills ON user_skills(username, skill_name);
*/

/** 🔹 Skills eines Users laden */
router.get("/:username/skills", async (req, res) => {
  const username = (req.params.username || "").trim();
  if (!username) return res.status(400).json({ message: "Kein Benutzername" });

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          s.id,
          s.skill_name      AS name,
          s.description,
          s.price,
          COALESCE(us.skill_level, 1)              AS skill_level,
          s.max_level                                 AS max_level,
          COALESCE(us.purchased, 0)                  AS purchased
        FROM skills s
        LEFT JOIN user_skills us
          ON us.skill_name = s.skill_name
         AND LOWER(us.username) = LOWER(?)
        ORDER BY s.id
      `,
      args: [username],
    });

    // Leere Liste ist okay → kein 404, einfach []
    const skills = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: Number(r.price),
      skill_level: Number(r.skill_level),
      max_level: r.max_level != null ? Number(r.max_level) : undefined,
      purchased: !!r.purchased,
    }));

    res.json(skills);
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Skills:", error);
    res.status(500).json({ message: "Datenbankfehler beim Abrufen der Skills." });
  }
});

/** 🔹 Skill upgraden (Skillpunkte als Währung) */
router.post("/:username/skills/upgrade", async (req, res) => {
  const username = (req.params.username || "").trim();
  const { skillName, skillPrice, skillLevel } = req.body;

  if (!username || !skillName) {
    return res.status(400).json({ message: "Fehlende Daten" });
  }

  const price = Number(skillPrice);
  const currentLevel = Number(skillLevel);

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ message: "Ungültiger Preis" });
  }
  if (!Number.isFinite(currentLevel) || currentLevel < 0) {
    return res.status(400).json({ message: "Ungültiges Level" });
  }

  try {
    // Start Tx
    await db.execute("BEGIN");

    // User + Punkte + Multiplikatoren holen
    const userRes = await db.execute({
      sql: `
        SELECT 
          COALESCE(skill_points, 0) AS skill_points,
          COALESCE(score_multiplier, 1.0) AS score_multiplier,
          COALESCE(monetary_multiplier, 1.0) AS monetary_multiplier
        FROM users
        WHERE LOWER(username) = LOWER(?)
        LIMIT 1
      `,
      args: [username],
    });
    if (!userRes.rows.length) {
      await db.execute("ROLLBACK");
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    const sp = Number(userRes.rows[0].skill_points);
    if (sp < price) {
      await db.execute("ROLLBACK");
      return res.status(400).json({ message: "Nicht genügend Skill-Punkte" });
    }

    // Skill-Definition (max_level etc.)
    const sRes = await db.execute({
      sql: `SELECT price, max_level FROM skills WHERE skill_name = ? LIMIT 1`,
      args: [skillName],
    });
    if (!sRes.rows.length) {
      await db.execute("ROLLBACK");
      return res.status(404).json({ message: "Skill nicht gefunden" });
    }
    const maxLevel = sRes.rows[0].max_level != null ? Number(sRes.rows[0].max_level) : undefined;

    // Aktuellen Skill-Level lesen (falls vorhanden)
    const usRes = await db.execute({
      sql: `
        SELECT skill_level FROM user_skills 
        WHERE LOWER(username)=LOWER(?) AND skill_name = ?
        LIMIT 1
      `,
      args: [username, skillName],
    });
    const curLevel = usRes.rows.length ? Number(usRes.rows[0].skill_level) : 0;

    // Max-Level prüfen
    if (maxLevel != null && curLevel >= maxLevel) {
      await db.execute("ROLLBACK");
      return res.status(400).json({ message: "Max-Level erreicht" });
    }

    const nextLevel = curLevel + 1;

    // Upsert (SQLite): INSERT ... ON CONFLICT(username, skill_name) DO UPDATE ...
    await db.execute({
      sql: `
        INSERT INTO user_skills (username, skill_name, skill_level, purchased)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(username, skill_name)
        DO UPDATE SET skill_level = MIN(user_skills.skill_level + 1, COALESCE(?, 999999)), purchased = 1
      `,
      args: [username, skillName, Math.max(1, nextLevel), maxLevel],
    });

    // Skill-Punkte abziehen
    await db.execute({
      sql: `UPDATE users SET skill_points = skill_points - ? WHERE LOWER(username) = LOWER(?)`,
      args: [price, username],
    });

    // Multiplikatoren anpassen (hier +0.1 pro Level – passe an dein Balancing an)
    if (skillName === 'Score Multiplier') {
      await db.execute({
        sql: `UPDATE users SET score_multiplier = score_multiplier + 0.1 WHERE LOWER(username) = LOWER(?)`,
        args: [username],
      });
    } else if (skillName === 'Monetary Multiplier') {
      await db.execute({
        sql: `UPDATE users SET monetary_multiplier = monetary_multiplier + 0.1 WHERE LOWER(username) = LOWER(?)`,
        args: [username],
      });
    }

    // Neue Werte zurückgeben
    const back = await db.execute({
      sql: `
        SELECT 
          COALESCE(skill_points, 0) AS skill_points,
          COALESCE(score_multiplier, 1.0) AS score_multiplier,
          COALESCE(monetary_multiplier, 1.0) AS monetary_multiplier
        FROM users
        WHERE LOWER(username) = LOWER(?)
        LIMIT 1
      `,
      args: [username],
    });

    await db.execute("COMMIT");

    res.json({
      message: `Skill "${skillName}" erfolgreich verbessert!`,
      newSkillLevel: nextLevel,
      skillPoints: Number(back.rows[0].skill_points),
      scoreMultiplier: Number(back.rows[0].score_multiplier),
      monetaryMultiplier: Number(back.rows[0].monetary_multiplier),
    });
  } catch (error) {
    try { await db.execute("ROLLBACK"); } catch {}
    console.error("❌ Fehler beim Upgrade des Skills:", error);
    res.status(500).json({ message: "Datenbankfehler beim Upgrade des Skills." });
  }
});

export default router;