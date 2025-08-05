import express from "express";
import db from "../db.js";
import { verifyToken } from "../auth.js";

const router = express.Router();

// Dorf + Einkommen + Bewohner abrufen
router.get("/collect", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Dorf holen oder automatisch erstellen
    let villageResult = await db.execute({
      sql: "SELECT * FROM village WHERE user_id = ?",
      args: [userId],
    });

    if (villageResult.rows.length === 0) {
      const now = new Date().toISOString();
      const createVillage = await db.execute({
        sql: "INSERT INTO village (user_id, level, base_income, last_collected) VALUES (?, 1, 1, ?)",
        args: [userId, now],
      });

      const villageId = createVillage.lastInsertRowid;

      // 4 Bewohner einfügen (ohne x/y)
      for (let i = 0; i < 4; i++) {
        await db.execute({
          sql: "INSERT INTO villagers (village_id, income) VALUES (?, 1)",
          args: [villageId],
        });
      }

      // Neue Abfrage für Dorf
      villageResult = await db.execute({
        sql: "SELECT * FROM village WHERE user_id = ?",
        args: [userId],
      });
    }

    const village = villageResult.rows[0];
console.log("📦 Village ID im Code:", village.id);
    // 2. Bewohner holen
    const villagersResult = await db.execute({
      sql: "SELECT id, income FROM villagers WHERE village_id = ?",
      args: [village.id],
    });
    const villagers = villagersResult.rows;

    const villagersIncome = villagers.reduce((sum, v) => sum + v.income, 0);

    // 3. Zeitdifferenz
    const now = new Date();
    const lastCollected = new Date(village.last_collected || now);
    const minutesPassed = Math.floor((now - lastCollected) / 60000);

    if (minutesPassed <= 0) {
      return res.json({
        earned: 0,
        minutesPassed: 0,
        villageLevel: village.level,
        villagers,
      });
    }

    const totalIncome = minutesPassed * (village.base_income + villagersIncome);

    // 4. Einkommen verbuchen
    await db.execute({
      sql: "UPDATE users SET money = money + ? WHERE id = ?",
      args: [totalIncome, userId],
    });

    // 5. Zeitpunkt aktualisieren
    await db.execute({
      sql: "UPDATE village SET last_collected = ? WHERE id = ?",
      args: [now.toISOString(), village.id],
    });

    res.json({
      earned: totalIncome,
      minutesPassed,
      villageLevel: village.level,
      villagers,
    });
  } catch (err) {
    console.error("❌ Fehler in /api/village/collect:", err);
    res.status(500).json({ error: "Serverfehler beim Sammeln" });
  }
});

export default router;