import express from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";

const router = express.Router();

// ADMIN ONLY: Karte einem Benutzer hinzufügen oder erhöhen
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { username, multiplier, amount } = req.body;

  if (!username || typeof multiplier !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ message: "Fehlende oder ungültige Felder (username, multiplier, amount)" });
  }

  try {
    const userResult = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
      args: [username],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }
    const userId = userResult.rows[0].id;

    await db.execute({
      sql: `
        INSERT INTO cards (user_id, multiplier, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, multiplier)
        DO UPDATE SET amount = amount + excluded.amount
      `,
      args: [userId, multiplier, amount],
    });

    res.json({ success: true, message: `Karte ${multiplier}x an ${username} gegeben.` });
  } catch (err) {
    console.error("❌ Fehler beim Karten-Speichern:", err);
    res.status(500).json({ message: "Fehler beim Speichern der Karte" });
  }
});

// EIGENE Karten als authentifizierter Benutzer abrufen
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id; // ID aus dem Token verwenden

  try {
    const cardsResult = await db.execute({
      sql: "SELECT multiplier, amount FROM cards WHERE user_id = ? AND amount > 0",
      args: [userId],
    });

    res.json(cardsResult.rows || []);
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Karten:", err);
    res.status(500).json({ message: "Fehler beim Abrufen der Karten" });
  }
});

// EIGENE Karte verbrauchen (1 abziehen)
router.put("/use", requireAuth, async (req, res) => {
  const { multiplier } = req.body;
  const userId = req.user.id; // ID aus dem Token verwenden

  if (typeof multiplier !== "number") {
    return res.status(400).json({ message: "Ungültiger 'multiplier'" });
  }

  try {
    // Sicherstellen, dass der User die Karte besitzt
    const cardCheck = await db.execute({
        sql: "SELECT amount FROM cards WHERE user_id = ? AND multiplier = ?",
        args: [userId, multiplier]
    });

    if (cardCheck.rows.length === 0 || cardCheck.rows[0].amount <= 0) {
        return res.status(400).json({ message: "Karte nicht im Besitz oder keine Exemplare mehr" });
    }

    // Karte um 1 verringern
    const updateResult = await db.execute({
      sql: "UPDATE cards SET amount = amount - 1 WHERE user_id = ? AND multiplier = ?",
      args: [userId, multiplier],
    });

    if (updateResult.rowsAffected === 0) {
        return res.status(404).json({ message: "Konnte die Karte nicht verwenden"});
    }

    res.json({ success: true, message: `Karte ${multiplier}x verwendet.` });
  } catch (err) {
    console.error("❌ Fehler beim Verwenden der Karte:", err);
    res.status(500).json({ message: "Fehler beim Verwenden der Karte" });
  }
});

export default router;
