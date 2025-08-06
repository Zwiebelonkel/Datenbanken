// routes/chat.js
import express from 'express';
import { ChatService } from '../services/chat.service.js';

const router = express.Router();

// 📥 Neue Nachricht senden
router.post('/send', async (req, res) => {
  const { username, message } = req.body;

  try {
    const result = await ChatService.sendMessage(username, message);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }
});

// 📤 Letzte Nachrichten abrufen
router.get('/latest', async (req, res) => {
  try {
    const messages = await ChatService.getLatestMessages(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten.' });
  }
});

export default router;