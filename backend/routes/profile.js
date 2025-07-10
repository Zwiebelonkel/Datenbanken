import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ message: 'Kein Benutzername angegeben' });
  }

  db.query(
    `SELECT 
       u.total_score AS totalScore,
       (SELECT COUNT(*) FROM scores WHERE username = ?) AS totalGames,
       (SELECT COUNT(*) FROM achievements a 
         JOIN users u2 ON u2.id = a.user_id 
         WHERE LOWER(u2.username) = LOWER(?)) AS unlockedAchievements
     FROM users u
     WHERE LOWER(u.username) = LOWER(?)
     LIMIT 1
    `,
    [username, username, username],
    (err, results) => {
      if (err) {
        console.error('❌ Fehler beim Laden des Profils:', err);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }

      res.json(results[0]);
    }
  );
});

export default router;
