import express from 'express';
import db from '../db.js';

const router = express.Router();

// Karte hinzufügen oder erhöhen
router.post('/', async (req, res) => {
  const { username, multiplier, amount } = req.body;

  if (!username || typeof multiplier !== 'number') {
    return res.status(400).json({ message: 'Fehlende oder ungültige Felder' });
  }

  try {
    // 1. User-ID ermitteln
    const userResult = await db.execute({
      sql: 'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const userId = userResult.rows[0].id;

    // 2. Einfügen oder erhöhen (upsert)
    await db.execute({
      sql: `
        INSERT INTO cards (user_id, multiplier, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, multiplier)
        DO UPDATE SET amount = amount + excluded.amount
      `,
      args: [userId, multiplier, amount || 1],
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Karten-Speichern:', err);
    res.status(500).json({ message: 'Fehler beim Speichern der Karte' });
  }
});

export default router;
