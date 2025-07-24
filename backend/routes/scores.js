import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/submit', async (req, res) => {
  const { username, score, consecutive_wins, money_per_round } = req.body;
  const date = new Date();

  try {
    await db.execute(
      `INSERT INTO scores (username, score, created_at, consecutive_wins, money_per_round)
       VALUES (?, ?, ?, ?, ?)`,
      [username, score, date.toISOString(), consecutive_wins, money_per_round]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



//Gesamtpunktzahl aktualisieren
router.post('/updateTotalScore', async (req, res) => {
  const { username, score } = req.body;

  if (!username || typeof score !== 'number') {
    return res.status(400).json({ message: 'Ungültige Eingaben' });
  }

  try {
    await db.execute({
      sql: 'UPDATE users SET total_score = total_score + ? WHERE LOWER(username) = LOWER(?)',
      args: [score, username],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim total_score:', err);
    res.status(500).json({ message: 'total_score Update fehlgeschlagen' });
  }
});

//Top 10 Scores abrufen
router.get('/top', async (req, res) => {
  try {
    const result = await db.execute('SELECT username, score, created_at FROM scores ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Alle Scores abrufen
router.get('/all', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM scores ORDER BY score DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Scores' });
  }
});

//Highscore prüfen
router.post('/isHighscore', async (req, res) => {
  const { score } = req.body;
  try {
    const result = await db.execute({
      sql: 'SELECT COUNT(*) AS betterScores FROM scores WHERE score > ?',
      args: [score],
    });
    const count = result.rows[0].betterScores;
    res.json({ isHighscore: count < 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Total Score eines Users abrufen
router.get('/userTotalScore/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await db.execute({
      sql: 'SELECT total_score FROM users WHERE username = ?',
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    res.json({ total_score: result.rows[0].total_score });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// 🔹 Längste Serien
router.get('/topStreaks', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT username, MAX(consecutive_wins) AS consecutive_wins FROM scores GROUP BY username ORDER BY consecutive_wins DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Meistes Geld pro Runde
router.get('/topMoneyPerRound', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT username, MAX(money_per_round) AS money_per_round FROM scores GROUP BY username ORDER BY money_per_round DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
