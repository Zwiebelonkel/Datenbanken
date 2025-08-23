import express from "express";
import db from "../db.js";

const router = express.Router();
const CATALOG = {
  "Score Multiplier": {
    description: "+10% Score pro Level",
    price: 1, // == base_price
    max_level: 20,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET score_multiplier = score_multiplier + 0.1 WHERE LOWER(username)=LOWER(?)`,
        args: [username],
      });
    },
  },
  "Monetary Multiplier": {
    description: "+10% Geld pro Level",
    price: 1, // == base_price
    max_level: 20,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET monetary_multiplier = monetary_multiplier + 0.1 WHERE LOWER(username)=LOWER(?)`,
        args: [username],
      });
    },
  },

  "Streak needed": {
    description: "-1 erforderlicher Sieg pro Level",
    price: 5, // == base_price
    max_level: 15,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET streak_needed = streak_needed -1 WHERE LOWER(username)=LOWER(?)`,
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
        price: def.price, // für Rückwärtskompatibilität
        base_price: def.price, // NEU: explizit
        max_level: def.max_level ?? null,
        skill_level: row ? Number(row.skill_level) : 0,
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
router.post("/:username/skills/upgrade", async (req, res) => {
  const username = (req.params.username || "").trim();
  const { skillName } = req.body;
  if (!username || !skillName)
    return res.status(400).json({ message: "Fehlende Daten" });

  const def = CATALOG[skillName];
  if (!def) return res.status(404).json({ message: "Skill nicht gefunden" });

  let tx;
  try {
    tx = await db.transaction("write");

    // aktuelles Level laden (VOR Kostenberechnung!)
    const curRes = await tx.execute({
      sql: `SELECT skill_level FROM user_skills
            WHERE LOWER(username)=LOWER(?) AND skill_name=? LIMIT 1`,
      args: [username, skillName],
    });
    const curLevel = curRes.rows.length
      ? Number(curRes.rows[0].skill_level)
      : 0;

    if (def.max_level != null && curLevel >= def.max_level) {
      await tx.rollback();
      return res.status(400).json({ message: "Max-Level erreicht" });
    }

    // 💰 dynamische Kosten: base_price + aktuelles Level
    const cost = def.price + curLevel;

    // Userpunkte laden und prüfen
    const u = await tx.execute({
      sql: `SELECT COALESCE(skill_points,0) AS sp,
                   COALESCE(score_multiplier,1.0) AS sm,
                   COALESCE(monetary_multiplier,1.0) AS mm,
                   COALESCE(streak_needed,1.0) AS sn

            FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
      args: [username],
    });
    if (!u.rows.length) {
      await tx.rollback();
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }
    const sp = Number(u.rows[0].sp);
    if (sp < cost) {
      await tx.rollback();
      return res
        .status(400)
        .json({ message: "Nicht genügend Skill-Punkte", needed: cost });
    }

    const nextLevel = curLevel + 1;

    // Upsert user_skills
    await tx.execute({
      sql: `INSERT INTO user_skills (username, skill_name, skill_level, purchased)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(username, skill_name)
            DO UPDATE SET skill_level = MIN(user_skills.skill_level + 1, COALESCE(?, 999999)), purchased=1`,
      args: [username, skillName, Math.max(1, nextLevel), def.max_level],
    });

    // Skillpunkte abziehen (mit dynamischen Kosten!)
    await tx.execute({
      sql: `UPDATE users SET skill_points = skill_points - ? WHERE LOWER(username)=LOWER(?)`,
      args: [cost, username],
    });

    // Effekt anwenden
    await def.apply(tx, username);

    // neue Userwerte
    const back = await tx.execute({
      sql: `SELECT COALESCE(skill_points,0) AS skill_points,
                   COALESCE(score_multiplier,1.0) AS score_multiplier,
                   COALESCE(monetary_multiplier,1.0) AS monetary_multiplier,
                   COALESCE(streak_needed,1.0) AS streak_needed

            FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1`,
      args: [username],
    });

    await tx.commit();

    // optional: nützliche Preise zurückgeben (aktueller Kaufpreis & nächster)
    const nextCost =
      def.max_level != null && nextLevel >= def.max_level
        ? null
        : def.price + nextLevel;

    return res.json({
      message: `Skill "${skillName}" erfolgreich verbessert!`,
      cost, // was gerade bezahlt wurde
      nextCost, // was das nächste Upgrade kosten würde (oder null bei Max)
      newSkillLevel: nextLevel,
      skillPoints: Number(back.rows[0].skill_points),
      scoreMultiplier: Number(back.rows[0].score_multiplier),
      monetaryMultiplier: Number(back.rows[0].monetary_multiplier),
      streakNeeded: Number(back.rows[0].streak_needed),
    });
  } catch (error) {
    if (tx) {
      try {
        await tx.rollback();
      } catch {}
    }
    console.error("❌ upgrade tx error:", error);
    return res.status(500).json({
      message: "Datenbankfehler beim Upgrade",
      detail: error?.message,
      code: error?.code,
    });
  }
});

export default router;
