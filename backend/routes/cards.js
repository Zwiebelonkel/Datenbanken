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

// Alle Karten für einen Benutzer abrufen
router.get('/', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username fehlt' });
  }

  try {
    // User-ID abrufen
    const userResult = await db.execute({
      sql: 'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const userId = userResult.rows[0].id;

    // Karten für diesen User laden
    const cardsResult = await db.execute({
      sql: 'SELECT multiplier, amount FROM cards WHERE user_id = ?',
      args: [userId],
    });

    res.json(cardsResult.rows || []);
  } catch (err) {
    console.error('❌ Fehler beim Abrufen der Karten:', err);
    res.status(500).json({ message: 'Fehler beim Abrufen der Karten' });
  }
});


export default router;
