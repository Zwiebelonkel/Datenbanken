import express from "express";
import db from "../db.js";

const router = express.Router();

// POST /api/money/update
router.post("/update", async (req, res) => {
  try {
    const { username, amount } = req.body;
    const base = Number(amount) || 0;

    // Userdaten holen (inkl. multiplier)
    const row = await db.execute({
      sql: `SELECT COALESCE(monetary_multiplier,1) AS m, COALESCE(money,0) AS money
            FROM users WHERE username = ?`,
      args: [username],
    });

    if (!row.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const m = Number(row.rows[0].m) || 1;
    const credited = Math.round(base * m);

    // Addieren statt überschreiben!
    await db.execute({
      sql: `UPDATE users SET money = money + ? WHERE username = ?`,
      args: [credited, username],
    });

    // neuen Kontostand holen
    const after = await db.execute({
      sql: `SELECT COALESCE(money,0) AS money FROM users WHERE username = ?`,
      args: [username],
    });
    const newMoney = Number(after.rows[0].money) || 0;

    res.json({ ok: true, credited, money: newMoney });
  } catch (err) {
    console.error("❌ updateMoney error:", err);
    res.status(500).json({ error: "Fehler beim Update" });
  }
});

export default router;
