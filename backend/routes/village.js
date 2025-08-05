const express = require("express");
const router = express.Router();
const db = require("../db"); // Pfad ggf. anpassen
const { requireAuth } = require("../middleware/auth"); // falls du eine Auth-Middleware hast

// GET /api/collect
router.get("/collect", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Dorf holen
    const village = await db.get(`SELECT * FROM village WHERE user_id = ?`, [
      userId,
    ]);
    if (!village) return res.status(404).json({ error: "Village not found" });

    // Einkommen der Bewohner summieren
    const villagers = await db.all(
      `SELECT income FROM villagers WHERE village_id = ?`,
      [village.id]
    );
    const villagersIncome = villagers.reduce((sum, v) => sum + v.income, 0);

    // Zeitdifferenz berechnen
    const now = new Date();
    const last = new Date(village.last_collected || now);
    const minutesPassed = Math.floor((now - last) / 60000);
    if (minutesPassed <= 0) {
      return res.json({ earned: 0, minutesPassed: 0 });
    }

    const totalIncome = minutesPassed * (village.base_income + villagersIncome);

    // Geld zum Benutzer hinzufügen
    await db.run(`UPDATE users SET money = money + ? WHERE id = ?`, [
      totalIncome,
      userId,
    ]);

    // Zeitstempel aktualisieren
    await db.run(`UPDATE village SET last_collected = ? WHERE id = ?`, [
      now.toISOString(),
      village.id,
    ]);

    res.json({ earned: totalIncome, minutesPassed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
