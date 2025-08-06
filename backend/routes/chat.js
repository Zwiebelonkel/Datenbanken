import express from "express";
import db from "../db.js";

const router = express.Router();

// Nachricht absenden
router.post("/send", async (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ message: "Fehlende Felder" });
  }

  const now = new Date().toISOString();

  try {
    await db.execute({
      sql: "INSERT INTO chat_messages (username, message, created_at) VALUES (?, ?, ?)",
      args: [username, message, now],
    });

    res.status(201).json({ message: "Gespeichert" });
  } catch (err) {
    console.error("Fehler beim Senden:", err);
    res.status(500).json({ message: "Fehler beim Speichern" });
  }
});

// Nachrichten abrufen
router.get("/latest", async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?",
      args: [limit],
    });

    res.json(result.rows.reverse()); // älteste zuerst
  } catch (err) {
    console.error("Fehler beim Abrufen:", err);
    res.status(500).json({ message: "Fehler beim Abrufen" });
  }
});

export default router;
