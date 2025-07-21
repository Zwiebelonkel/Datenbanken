import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/', (req, res) => {
  const { username, multiplier } = req.body;
  const query = 'INSERT INTO cards (username, multiplier, amount) VALUES (?, ?, 1) ON CONFLICT(username, multiplier) DO UPDATE SET amount = amount + 1';

  db.run(query, [username, multiplier], function (err) {
    if (err) {
      console.error('Fehler beim Speichern:', err);
      res.status(500).send('Fehler beim Speichern der Karte');
    } else {
      res.status(200).send({ success: true });
    }
  });
});

export default router;
