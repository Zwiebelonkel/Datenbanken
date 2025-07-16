import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ message: 'Kein Benutzername angegeben' });
  }
 
  try {
const result = await db.execute({
  sql: `
    SELECT 
      u.total_score AS totalScore,
      u.money AS money,
      (SELECT COUNT(*) FROM scores WHERE username = ?) AS totalGames,
      (SELECT MAX(score) FROM scores WHERE username = ?) AS highscore,
      (SELECT COUNT(*) FROM achievements a 
         JOIN users u2 ON u2.id = a.user_id 
         WHERE LOWER(u2.username) = LOWER(?)) AS unlockedAchievements
    FROM users u
    WHERE LOWER(u.username) = LOWER(?)
    LIMIT 1
  `,
  args: [username, username, username, username],
});

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Fehler beim Laden des Profils:', err);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});

export default router;
