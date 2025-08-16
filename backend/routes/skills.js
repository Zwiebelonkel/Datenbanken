import express from "express";
import db from "../db.js";
const router = express.Router();

// Funktion zum Abrufen der Skills eines Benutzers
export const getUserSkills = async (username) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT skill_name, skill_level, purchased
        FROM user_skills
        WHERE LOWER(username) = LOWER(?)
      `,
      args: [username],
    });

    return result.rows; // Gibt eine Liste von Skills zurück
  } catch (e) {
    console.error("Fehler beim Abrufen der Skills:", e);
    throw new Error("Fehler beim Abrufen der Skills.");
  }
};

// Funktion zum Kauf eines Skills
export const purchaseSkill = async (username, skillName, skillPrice) => {
  try {
    // Aktuelle Skillpunkte aus der DB abrufen
    const result = await db.execute({
      sql: 'SELECT skill_points FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username],
    });

    if (result.rows.length === 0) {
      throw new Error("Benutzer nicht gefunden");
    }

    const currentSkillPoints = result.rows[0].skill_points;

    // Überprüfen, ob der Benutzer genügend Skillpunkte hat
    if (currentSkillPoints < skillPrice) {
      throw new Error("Nicht genügend Skillpunkte");
    }

    // Skill-Level des Benutzers prüfen und ggf. erhöhen
    const skillResult = await db.execute({
      sql: 'SELECT skill_level FROM user_skills WHERE LOWER(username) = LOWER(?) AND skill_name = ?',
      args: [username, skillName],
    });

    let newSkillLevel = 1; // Default-Wert, wenn der Benutzer den Skill noch nicht hat
    if (skillResult.rows.length > 0) {
      // Wenn der Skill bereits gekauft wurde, das Level erhöhen
      newSkillLevel = skillResult.rows[0].skill_level + 1;  // Skill-Level erhöhen
    }

    // Skill als gekauft markieren (wenn nicht schon gekauft) und das Level setzen
    await db.execute({
      sql: `
        INSERT INTO user_skills (username, skill_name, skill_level, purchased)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE purchased = TRUE, skill_level = ?
      `,
      args: [username, skillName, newSkillLevel, true, newSkillLevel],
    });

    // Skillpunkte abziehen
    await db.execute({
      sql: 'UPDATE users SET skill_points = skill_points - ? WHERE LOWER(username) = LOWER(?)',
      args: [skillPrice, username],
    });

    return { message: `Skill "${skillName}" erfolgreich gekauft!`, newSkillLevel };
  } catch (e) {
    console.error('Fehler beim Kauf des Skills:', e);
    throw new Error('Datenbankfehler');
  }
};

export default router;
