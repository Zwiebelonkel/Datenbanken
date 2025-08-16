import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * Fester Skill-Katalog (kein DB-Table nötig)
 * price: Kosten in Skillpunkten pro Upgrade
 * max_level: Maximum; null/undefined = kein Limit
 */
const CATALOG = {
  "Score Multiplier": {
    description: "+10% Score pro Level",
    price: 1,
    max_level: 10,
    apply: async (username) => {
      await db.execute({
        sql: `UPDATE users SET score_multiplier = score_multiplier + 0.1 WHERE LOWER(username)=LOWER(?)`,
        args: [username],
      });
    },
  },
  "Monetary Multiplier": {
    description: "+10% Geld pro Level",
    price: 1,
    max_level: 10,
    apply: async (username) => {
      await db.execute({
        sql: `UPDATE users SET monetary_multiplier = monetary_multiplier + 0.1 WHERE LOWER(username)=LOWER(?)`,
        args: [username],
      });
    },
  },
};

/* ===== Einmalige Migration (als Kommentar; manuell in Turso ausführen) =====
CREATE TABLE IF NOT EXISTS user_skills (
  username    TEXT NOT NULL,
  skill_name  TEXT NOT NULL,
  skill_level INTEGER NOT NULL DEFAULT 0,
  purchased   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (username, skill_name)
);

-- User-Felder (falls noch nicht vorhanden; ALTER wirft Fehler, wenn Spalten schon existieren → ignorieren)
ALTER TABLE users ADD COLUMN skill_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN score_multiplier REAL DEFAULT 1.0;
ALTER TABLE users ADD COLUMN monetary_multiplier REAL DEFAULT 1.0;
*/

/** GET /api/skills/:username
 *  -> Katalog + Userstände mergen
 */
router.get("/:username/skills", async (req, res) => {
  const username = (req.params.username || "").trim();
  if (!username) return res.status(400).json({ message: "Kein Benutzername" });

  try {
    // vorhandene Einträge des Users laden
    const us = await db.execute({
      sql: `SELECT skill_name, skill_level, purchased
            FROM user_skills
            WHERE LOWER(username)=LOWER(?)`,
      args: [username],
    });

    const have = new Map(us.rows.map((r) => [r.skill_name, r]));
    let id = 1;

    const skills = Object.entries(CATALOG).map(([name, def]) => {
      const row = have.get(name);
      return {
        id: id++,
        name,
        description: def.description,
        price: def.price,
        max_level: def.max_level ?? null,
        skill_level: row ? Number(row.skill_level) : 0, // 0 = noch nicht gekauft
        purchased: !!(row && row.purchased),
      };
    });

    res.json(skills);
  } catch (error) {
    console.error("❌ fetch skills:", error);
    res.status(500).json({ message: "Fehler beim Laden der Skills" });
  }
});

/** POST /api/skills/:username/upgrade
 * Body: { skillName: string }
 * Preis/MaxLevel kommen aus dem KATALOG (nicht vom Client!)
 */
router.post('/:username/skills/upgrade', async (req, res) => {
  const username = (req.params.username || "").trim();
  const { skillName } = req.body;

  if (!username || !skillName) {
    return res.status(400).json({ message: "Fehlende Daten" });
  }

  const def = CATALOG[skillName];
  if (!def) return res.status(404).json({ message: "Skill nicht gefunden" });

  try {
    await db.execute("BEGIN");

    // Userpunkte und Multis
    const u = await db.execute({
      sql: `SELECT 
              COALESCE(skill_points,0) AS sp,
              COALESCE(score_multiplier,1.0) AS sm,
              COALESCE(monetary_multiplier,1.0) AS mm
            FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
      args: [username],
    });
    if (!u.rows.length) {
      await db.execute("ROLLBACK");
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    const sp = Number(u.rows[0].sp);
    if (sp < def.price) {
      await db.execute("ROLLBACK");
      return res.status(400).json({ message: "Nicht genügend Skill-Punkte" });
    }

    // aktuelles Level
    const curRes = await db.execute({
      sql: `SELECT skill_level FROM user_skills
            WHERE LOWER(username)=LOWER(?) AND skill_name=? LIMIT 1`,
      args: [username, skillName],
    });
    const curLevel = curRes.rows.length ? Number(curRes.rows[0].skill_level) : 0;

    if (def.max_level != null && curLevel >= def.max_level) {
      await db.execute("ROLLBACK");
      return res.status(400).json({ message: "Max-Level erreicht" });
    }

    const nextLevel = curLevel + 1;

    // Upsert user_skills; MIN() statt LEAST(); purchased immer 1
    await db.execute({
      sql: `INSERT INTO user_skills (username, skill_name, skill_level, purchased)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(username, skill_name)
            DO UPDATE SET skill_level = MIN(user_skills.skill_level + 1, COALESCE(?, 999999)), purchased=1`,
      args: [username, skillName, Math.max(1, nextLevel), def.max_level],
    });

    // Skillpunkte abziehen
    await db.execute({
      sql: `UPDATE users SET skill_points = skill_points - ? WHERE LOWER(username)=LOWER(?)`,
      args: [def.price, username],
    });

    // Effekt anwenden (z. B. Multiplikator +0.1)
    await def.apply(username);

    // neue Userwerte zurückgeben
    const back = await db.execute({
      sql: `SELECT 
              COALESCE(skill_points,0) AS skill_points,
              COALESCE(score_multiplier,1.0) AS score_multiplier,
              COALESCE(monetary_multiplier,1.0) AS monetary_multiplier
            FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
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
    console.error("❌ upgrade:", error);
    res.status(500).json({ message: "Datenbankfehler beim Upgrade" });
  }
});

export default router;