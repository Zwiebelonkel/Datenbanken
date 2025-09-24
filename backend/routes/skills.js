import express from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = express.Router();

// --- Server-Side Skill Definitions ---
const CATALOG = {
  "Präzision 🎯": {
    description: "+10% Score pro Level",
    price: 1, 
    max_level: 20,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET score_multiplier = 1.0 + (SELECT skill_level * 0.1 FROM user_skills WHERE username = ? AND skill_name = 'Präzision 🎯') WHERE username = ?`,
        args: [username, username],
      });
    },
  },
  "Businessman 💸": {
    description: "+10% Geld pro Level",
    price: 1, 
    max_level: 20,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET monetary_multiplier = 1.0 + (SELECT skill_level * 0.1 FROM user_skills WHERE username = ? AND skill_name = 'Businessman 💸') WHERE username = ?`,
        args: [username, username],
      });
    },
  },
  "Ausdauer 💨": {
    description: "-1 erforderliche Streak zum erhalten eines neuen ♥️",
    price: 5,
    max_level: 10,
    apply: async (tx, username) => {
      await tx.execute({
        sql: `UPDATE users SET streak_needed = 10 - (SELECT skill_level FROM user_skills WHERE username = ? AND skill_name = 'Ausdauer 💨') WHERE username = ?`,
        args: [username, username],
      });
    },
  },
};


/**
 * GET /api/skills
 * Authenticated user gets their own merged skill list.
 */
router.get("/skills", requireAuth, async (req, res) => {
  const username = req.user.username; // USE USERNAME FROM TOKEN

  try {
    const userSkillsResult = await db.execute({
      sql: `SELECT skill_name, skill_level, purchased
            FROM user_skills
            WHERE username = ?`,
      args: [username],
    });

    const userSkillsMap = new Map(userSkillsResult.rows.map((r) => [r.skill_name, r]));
    let id = 1;

    const skills = Object.entries(CATALOG).map(([name, def]) => {
      const userSkill = userSkillsMap.get(name);
      return {
        id: id++,
        name,
        description: def.description,
        base_price: def.price,
        max_level: def.max_level ?? null,
        skill_level: userSkill ? Number(userSkill.skill_level) : 0,
        purchased: !!(userSkill && userSkill.purchased),
      };
    });

    res.json(skills);
  } catch (error) {
    console.error("❌ fetch skills:", error);
    res.status(500).json({ message: "Fehler beim Laden der Skills" });
  }
});

/**
 * POST /api/skills/upgrade
 * Authenticated user upgrades their own skill.
 */
router.post("/skills/upgrade", requireAuth, async (req, res) => {
  const username = req.user.username; // USE USERNAME FROM TOKEN
  const { skillName } = req.body;

  if (!skillName) {
    return res.status(400).json({ message: "skillName fehlt" });
  }

  const def = CATALOG[skillName];
  if (!def) {
    return res.status(404).json({ message: "Skill nicht im Katalog gefunden" });
  }

  let tx;
  try {
    tx = await db.transaction("write");

    const [[user], [skill]] = await Promise.all([
        tx.execute({ sql: "SELECT skill_points FROM users WHERE username = ?", args: [username]}),
        tx.execute({ sql: "SELECT skill_level FROM user_skills WHERE username = ? AND skill_name = ?", args: [username, skillName]}) 
    ]);

    if (!user) {
        await tx.rollback();
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    const currentLevel = skill ? Number(skill.skill_level) : 0;
    if (def.max_level != null && currentLevel >= def.max_level) {
      await tx.rollback();
      return res.status(400).json({ message: "Maximales Level bereits erreicht" });
    }

    const cost = def.price + currentLevel;
    const userSkillPoints = Number(user.skill_points) || 0;

    if (userSkillPoints < cost) {
      await tx.rollback();
      return res.status(400).json({ message: "Nicht genügend Skill-Punkte", needed: cost, has: userSkillPoints });
    }

    const nextLevel = currentLevel + 1;

    // Upsert skill and deduct points
    await Promise.all([
        tx.execute({
            sql: `INSERT INTO user_skills (username, skill_name, skill_level, purchased) VALUES (?, ?, ?, 1) 
                  ON CONFLICT(username, skill_name) DO UPDATE SET skill_level = ?`,
            args: [username, skillName, nextLevel, nextLevel]
        }),
        tx.execute({
            sql: "UPDATE users SET skill_points = skill_points - ? WHERE username = ?",
            args: [cost, username]
        })
    ]);

    // Apply the skill's effect
    await def.apply(tx, username);
    
    await tx.commit();

    // Get fresh data to return
    const finalUserData = await db.execute({ 
        sql: "SELECT skill_points, score_multiplier, monetary_multiplier, streak_needed FROM users WHERE username = ?", 
        args: [username]
    });

    const nextCost = (def.max_level != null && nextLevel >= def.max_level) ? null : def.price + nextLevel;

    return res.json({
      message: `Skill "${skillName}" erfolgreich verbessert!`,
      cost,
      nextCost,
      newSkillLevel: nextLevel,
      ...finalUserData.rows[0]
    });

  } catch (error) {
    if (tx) await tx.rollback();
    console.error("❌ skill upgrade error:", error);
    return res.status(500).json({ message: "Datenbankfehler beim Upgrade", detail: error.message });
  }
});

export default router;
