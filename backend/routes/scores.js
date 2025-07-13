import express from 'express';
import db from '../db.js';

const router = express.Router();


// 🔸 Score einreichen
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

// 🔸 Gesamtpunktzahl aktualisieren
router.post('/updateTotalScore', (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== 'number') {
    return res.status(400).json({ message: 'Ungültige Eingaben' });
  }

  db.query(
    'UPDATE users SET total_score = total_score + ? WHERE LOWER(username) = LOWER(?)',
    [score, username],
    (err, result) => {
      if (err) {
        console.error('❌ Fehler beim total_score:', err);
        return res.status(500).json({ message: 'total_score Update fehlgeschlagen' });
      }
      console.log(`✅ total_score für ${username} um ${score} erhöht.`);
      res.json({ success: true });
    }
  );
});

// 🔸 Top 10 Scores abrufen
router.get('/top', (req, res) => {
  db.query(
    'SELECT username, score, created_at FROM scores ORDER BY score DESC LIMIT 10',
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

// 🔸 Alle Scores abrufen (z. B. für Admin oder Debug)
router.get('/all', (req, res) => {
  db.query('SELECT * FROM scores', (err, results) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Laden der Scores' });
    res.json(results);
  });
});

// 🔸 Prüfen, ob aktueller Score ein Highscore ist
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

// 🔸 Total Score eines Users abrufen
router.get('/userTotalScore/:username', (req, res) => {
  const { username } = req.params;
  db.query(
    'SELECT total_score FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Fehler beim Laden' });
      if (results.length === 0) return res.status(404).json({ error: 'User nicht gefunden' });
      res.json({ total_score: results[0].total_score });
    }
  );
});

export default router;
