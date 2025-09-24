
import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET messages between two users
router.get('/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const result = await db.execute({
        sql: 'SELECT * FROM messages WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ORDER BY timestamp ASC',
        args: [user1, user2, user2, user1]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new message
router.post('/', async (req, res) => {
  const { sender, receiver, message } = req.body;
  if (!sender || !receiver || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await db.execute({
        sql: 'INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)',
        args: [sender, receiver, message]
    });
    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
