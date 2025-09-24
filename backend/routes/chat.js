
import express from "express";
import db from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
// IMPORTANT: Make sure to set the GEMINI_API_KEY environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

    if (message.includes("@ki")) {
      try {
        const prompt = message.replace("@ki", "").trim();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        const kiNow = new Date().toISOString();

        await db.execute({
          sql: "INSERT INTO chat_messages (username, message, created_at) VALUES (?, ?, ?)",
          args: ["KI", text, kiNow],
        });

      } catch (error) {
        console.error(error);
        const kiNow = new Date().toISOString();
        await db.execute({
            sql: "INSERT INTO chat_messages (username, message, created_at) VALUES (?, ?, ?)",
            args: ["KI", "Sorry, I am having trouble thinking right now.", kiNow],
        });
      }
    }

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
