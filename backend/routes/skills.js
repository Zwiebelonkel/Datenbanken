// In skills.js (Backend API)
import express from "express";
import db from "../db.js";
const router = express.Router();

// Endpunkt zum Abrufen der Skills eines Benutzers mit Level
router.get("/:username", async (req, res) => {
  const username = req.params.username;

  try {
    // Abfrage der Skills des Benutzers mit Level aus der Datenbank
    const result = await db.execute({
      sql: `
        SELECT s.id, s.skill_name, IFNULL(us.skill_level, 1) AS skill_level, s.price, IFNULL(us.purchased, FALSE) AS purchased
        FROM skills s
        LEFT JOIN user_skills us ON us.skill_name = s.skill_name AND us.username = ?
        `,
      args: [username],
    });

    // Falls keine Skills für den Benutzer gefunden wurden
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Keine Skills gefunden." });
    }

    res.json(result.rows); // Gibt die Liste der Skills mit Level zurück
  } catch (error) {
    console.error("Fehler beim Abrufen der Skills:", error);
    res.status(500).json({ message: "Datenbankfehler beim Abrufen der Skills." });
  }
});

// Endpunkt zum Upgrade eines Skills (Level erhöhen)
router.post("/:username/skills/upgrade", async (req, res) => {
  const { username } = req.params;
  const { skillName, skillPrice, skillLevel } = req.body;

  try {
    // Überprüfen, ob der Benutzer genügend Skill-Punkte hat
    const userResult = await db.execute({
      sql: 'SELECT skill_points FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    const user = userResult.rows[0];
    const currentSkillPoints = user.skill_points;

    // Überprüfen, ob der Benutzer genügend Skill-Punkte hat
    if (currentSkillPoints < skillPrice) {
      return res.status(400).json({ message: "Nicht genügend Skill-Punkte" });
    }

    // Skill-Level erhöhen (wenn der Skill bereits vorhanden ist)
    await db.execute({
      sql: `
        INSERT INTO user_skills (username, skill_name, skill_level, purchased)
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE skill_level = skill_level + 1
      `,
      args: [username, skillName, skillLevel],
    });

    // Skill-Punkte abziehen
    await db.execute({
      sql: 'UPDATE users SET skill_points = skill_points - ? WHERE LOWER(username) = LOWER(?)',
      args: [skillPrice, username],
    });

    res.json({ message: `Skill "${skillName}" auf Level ${skillLevel + 1} erfolgreich gekauft!` });
  } catch (error) {
    console.error("Fehler beim Upgrade des Skills:", error);
    res.status(500).json({ message: "Datenbankfehler beim Upgrade des Skills." });
  }
});

export default router;
