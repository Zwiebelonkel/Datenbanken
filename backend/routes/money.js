import express from "express";
import db from "../db.js";

const router = express.Router();

router.post("/update", async (req, res) => {
  const { username, amount } = req.body;

  if (!username || typeof amount !== "number") {
    return res.status(400).json({ message: "Ungültige Eingaben für Geld" });
  }

  try {
    // 1. Multiplier aus der User-Tabelle holen
    const userRes = await db.execute({
      sql: "SELECT monetary_multiplier FROM users WHERE LOWER(username) = LOWER(?)",
      args: [username],
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    const multiplier = userRes.rows[0].monetary_multiplier || 1;

    // 2. Wenn amount negativ ist (Einsatz), keinen Multiplier anwenden
    let finalAmount = amount;
    
    if (amount > 0) {
      // Wenn Betrag positiv ist (also ein Gewinn), Multiplier anwenden
      finalAmount = Math.floor(amount * multiplier);
    }

    // 3. Geld updaten: Betrag + Multiplier für Gewinn, sonst nur der Einsatzbetrag
    await db.execute({
      sql: "UPDATE users SET money = money + ? WHERE LOWER(username) = LOWER(?)",
      args: [finalAmount, username],
    });

    res.json({ success: true, appliedAmount: finalAmount });
  } catch (err) {
    console.error("❌ Fehler beim money Update:", err);
    res.status(500).json({ message: "Money-Update fehlgeschlagen" });
  }
});

export default router;
