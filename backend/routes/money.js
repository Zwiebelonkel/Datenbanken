import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/update', async (req, res) => {
  const { username, amount } = req.body;

  if (!username || typeof amount !== 'number') {
    return res.status(400).json({ message: 'Ungültige Eingaben für Geld' });
  }

  try {
    await db.execute({
      sql: 'UPDATE users SET money = money + ? WHERE LOWER(username) = LOWER(?)',
      args: [amount, username],
    });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim money Update:', err);
    res.status(500).json({ message: 'Money-Update fehlgeschlagen' });
  }
});

export default router;
