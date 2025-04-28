const express = require('express');
const router = express.Router();
const db = require('../db');

// Highscore speichern
router.post('/submit', (req, res) => {
  const { username, score } = req.body;
  const date = new Date();

  db.query(
    'INSERT INTO scores (username, score, created_at) VALUES (?, ?, ?)',
    [username, score, date],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});

// Top 10 Scores abrufen
router.get('/top', (req, res) => {
  db.query(
    'SELECT username, score, created_at FROM scores ORDER BY score DESC LIMIT 10',
    (err, results) => {
      if (err) {
        console.error("Datenbankfehler:", err);  // Zeigt den Fehler in der Konsole an
        return res.status(500).json({ error: err }); // Gibt den Fehler als Antwort zurück
      }
      res.json(results);
    }
  );
});


// Prüfen ob Score in Top 10 ist
router.post('/isHighscore', (req, res) => {
  const { score } = req.body;
  db.query(
    'SELECT COUNT(*) AS betterScores FROM scores WHERE score > ?',
    [score],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      const count = results[0].betterScores;
      res.json({ isHighscore: count < 10 });
    }
  );
});

module.exports = router;
