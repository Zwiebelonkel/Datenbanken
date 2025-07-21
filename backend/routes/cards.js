import express from 'express';
import db from '../db.js'; // oder dein DB-Connector

const router = express.Router();

// 🔸 Karte hinzufügen oder erhöhen
router.post('/add', async (req, res) => {
  const { user_id, multiplier } = req.body;

  try {
    const existing = await db.get(
      'SELECT * FROM cards WHERE user_id = ? AND multiplier = ?',
      [user_id, multiplier]
    );

    if (existing) {
      await db.run(
        'UPDATE cards SET amount = amount + 1 WHERE id = ?',
        [existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO cards (user_id, multiplier, amount) VALUES (?, ?, ?)',
        [user_id, multiplier, 1]
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Fehler beim Hinzufügen der Karte:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

export default router;
