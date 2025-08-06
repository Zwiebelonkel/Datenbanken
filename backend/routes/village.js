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
    sql: "INSERT INTO villagers (village_id, name, level, income) VALUES (?, ?, ?, ?)",
    args: [villageId, `Bewohner ${i + 1}`, 1, 1],
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
      sql: "SELECT id, name, level, income FROM villagers WHERE village_id = ?",
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

router.post("/upgrade", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Dorf holen
    const villageResult = await db.execute({
      sql: "SELECT * FROM village WHERE user_id = ?",
      args: [userId],
    });

    const village = villageResult.rows[0];
    if (!village) return res.status(404).json({ message: "Kein Dorf gefunden" });

    // 2. Level erhöhen
    const newLevel = village.level + 1;
    await db.execute({
      sql: "UPDATE village SET level = ? WHERE id = ?",
      args: [newLevel, village.id],
    });

    // 3. 2 neue Bewohner hinzufügen
    for (let i = 0; i < 2; i++) {
      await db.execute({
  sql: "INSERT INTO villagers (village_id, name, income) VALUES (?, ?, ?)",
  args: [village.id, `Bewohner ${Date.now()}`, 1],
});
    }

    res.json({ message: "Dorf verbessert", newLevel });
  } catch (err) {
    console.error("❌ Fehler bei Dorf-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

router.post("/upgrade-villager", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { villagerId } = req.body;

  try {
    // Bewohner und Dorf holen
    const result = await db.execute({
      sql: `
        SELECT v.*, u.money 
        FROM villagers v 
        JOIN village vi ON v.village_id = vi.id 
        JOIN users u ON vi.user_id = u.id 
        WHERE v.id = ? AND vi.user_id = ?
      `,
      args: [villagerId, userId],
    });

    const villager = result.rows[0];
    if (!villager) return res.status(404).json({ message: "Bewohner nicht gefunden" });

    const upgradeCost = 10 * (villager.level + 1);
    if (villager.money < upgradeCost) {
      return res.status(400).json({ message: "Nicht genug Geld" });
    }

    const newLevel = villager.level + 1;
    const newIncome = villager.income + 0.2;

    // Upgrade durchführen
    await db.execute({
      sql: "UPDATE villagers SET level = ?, income = ? WHERE id = ?",
      args: [newLevel, newIncome, villagerId],
    });

    await db.execute({
      sql: "UPDATE users SET money = money - ? WHERE id = ?",
      args: [upgradeCost, userId],
    });

    res.json({ message: "Upgrade erfolgreich", newLevel, newIncome });
  } catch (err) {
    console.error("❌ Fehler bei Bewohner-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

export default router;
