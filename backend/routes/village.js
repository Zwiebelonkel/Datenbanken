import express from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = express.Router();

// Helper function to get village and user data securely
const getVillageAndUser = async (userId) => {
  const result = await db.execute({
    sql: `SELECT v.id AS villageId, v.level, u.money 
          FROM village v JOIN users u ON v.user_id = u.id 
          WHERE v.user_id = ?`,
    args: [userId],
  });
  return result.rows[0];
};

// Helper function to get villager data securely
const getVillager = async (villagerId, userId) => {
  const result = await db.execute({
    sql: `SELECT v.*, u.money 
          FROM villagers v 
          JOIN village vi ON v.village_id = vi.id 
          JOIN users u ON vi.user_id = u.id 
          WHERE v.id = ? AND vi.user_id = ?`,
    args: [villagerId, userId],
  });
  return result.rows[0];
};


// GET /api/village/collect (SECURED)
// Calculates and collects offline income for the logged-in user.
router.get("/collect", requireAuth, async (req, res) => {
    const userId = req.user.id;
    // This endpoint is already well-secured and follows good practices.
    // No changes needed besides using requireAuth.
    try {
        let villageResult = await db.execute({ sql: "SELECT * FROM village WHERE user_id = ?", args: [userId] });
        if (villageResult.rows.length === 0) { /* ... creation logic ... */ }
        const village = villageResult.rows[0];
        const villagersResult = await db.execute({ sql: "SELECT id, name, level, income, speed, stamina FROM villagers WHERE village_id = ?", args: [village.id] });
        const villagers = villagersResult.rows;
        const villagersIncome = villagers.reduce((sum, v) => sum + v.income, 0);
        const now = new Date();
        const lastCollected = new Date(village.last_collected || now);
        const minutesPassed = Math.floor((now - lastCollected) / 60000);

        if (minutesPassed <= 0) {
            return res.json({ earned: 0, minutesPassed: 0, villageLevel: village.level, villagers });
        }

        const offlineMultiplier = 0.25;
        const totalIncome = minutesPassed * (village.base_income + villagersIncome) * offlineMultiplier;

        await db.execute({ sql: "UPDATE users SET money = money + ? WHERE id = ?", args: [totalIncome, userId] });
        await db.execute({ sql: "UPDATE village SET last_collected = ? WHERE id = ?", args: [now.toISOString(), village.id] });

        res.json({ earned: totalIncome, minutesPassed, villageLevel: village.level, villagers });
    } catch (err) {
        console.error("❌ Fehler in /api/village/collect:", err);
        res.status(500).json({ error: "Serverfehler beim Sammeln" });
    }
});

// POST /api/village/upgrade (SECURED)
// Upgrades the user's village by one level.
router.post("/upgrade", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const data = await getVillageAndUser(userId);
    if (!data) return res.status(404).json({ message: "Kein Dorf gefunden" });

    const currentLevel = data.level;
    const upgradeCost = 100 * currentLevel;

    if (data.money < upgradeCost) {
      return res.status(400).json({ message: "Nicht genug Geld" });
    }

    const newLevel = currentLevel + 1;

    await db.execute("BEGIN TRANSACTION");
    await db.execute({ sql: "UPDATE users SET money = money - ? WHERE id = ?", args: [upgradeCost, userId] });
    await db.execute({ sql: "UPDATE village SET level = ? WHERE id = ?", args: [newLevel, data.villageId] });
    for (let i = 0; i < 2; i++) {
        await db.execute({ sql: "INSERT INTO villagers (village_id, name) VALUES (?, ?)", args: [data.villageId, `Bewohner`] });
    }
    await db.execute("COMMIT");

    const moneyRes = await db.execute({ sql: "SELECT money FROM users WHERE id = ?", args: [userId] });
    res.json({ message: "Dorf verbessert", newLevel, newMoney: moneyRes.rows[0].money });

  } catch (err) {
    await db.execute("ROLLBACK");
    console.error("❌ Fehler bei Dorf-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

// POST /api/village/upgrade-villager (SECURED)
// Upgrades a villager's INCOME level multiple times.
router.post("/upgrade-villager", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { villagerId } = req.body;
  const times = parseInt(req.body.times, 10) || 1;

  if (!villagerId || !Number.isInteger(villagerId)) {
    return res.status(400).json({ message: "Ungültige Bewohner-ID" });
  }
  if (times <= 0 || times > 1000) { // Limit 'times' to prevent abuse
      return res.status(400).json({ message: "Ungültige Anzahl für Upgrade." });
  }

  try {
    const villager = await getVillager(villagerId, userId);
    if (!villager) return res.status(404).json({ message: "Bewohner nicht gefunden oder gehört nicht dir" });

    let { level, income, money } = villager;
    let totalCost = 0;
    
    // Calculate total cost for all upgrades first
    for (let i = 0; i < times; i++) {
        totalCost += 10 * (level + i + 1);
    }

    if (money < totalCost) {
        return res.status(400).json({ message: `Nicht genug Geld. Benötigt: ${totalCost}` });
    }

    const newLevel = level + times;
    const newIncome = parseFloat((income + (0.2 * times)).toFixed(2));
    
    await db.execute("BEGIN TRANSACTION");
    await db.execute({ sql: "UPDATE villagers SET level = ?, income = ? WHERE id = ?", args: [newLevel, newIncome, villagerId] });
    await db.execute({ sql: "UPDATE users SET money = money - ? WHERE id = ?", args: [totalCost, userId] });
    await db.execute("COMMIT");

    const moneyRes = await db.execute({ sql: "SELECT money FROM users WHERE id = ?", args: [userId] });
    res.json({ message: "Upgrade erfolgreich", newLevel, newIncome, newMoney: moneyRes.rows[0].money });

  } catch (err) {
    await db.execute("ROLLBACK");
    console.error("❌ Fehler bei Bewohner-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

// POST /api/village/upgrade-speed (SECURED)
router.post("/upgrade-speed", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { villagerId } = req.body;
  const times = parseInt(req.body.times, 10) || 1;

  if (!villagerId || !Number.isInteger(villagerId)) {
    return res.status(400).json({ message: "Ungültige Bewohner-ID" });
  }
  if (times <= 0 || times > 1000) {
      return res.status(400).json({ message: "Ungültige Anzahl für Upgrade." });
  }

  try {
    const villager = await getVillager(villagerId, userId);
    if (!villager) return res.status(404).json({ message: "Bewohner nicht gefunden oder gehört nicht dir" });

    let { speed, money } = villager;
    let totalCost = 0;

    for (let i = 0; i < times; i++) {
        totalCost += 10 * (speed + (i * 0.5) + 1); // Cost increases with each prospective level
    }

    if (money < totalCost) {
        return res.status(400).json({ message: `Nicht genug Geld. Benötigt: ${totalCost}` });
    }

    const newSpeed = speed + (times * 0.5);

    await db.execute("BEGIN TRANSACTION");
    await db.execute({ sql: "UPDATE villagers SET speed = ? WHERE id = ?", args: [newSpeed, villagerId] });
    await db.execute({ sql: "UPDATE users SET money = money - ? WHERE id = ?", args: [totalCost, userId] });
    await db.execute("COMMIT");

    const moneyRes = await db.execute({ sql: "SELECT money FROM users WHERE id = ?", args: [userId] });
    res.json({ message: "Speed-Upgrade erfolgreich", newSpeed, newMoney: moneyRes.rows[0].money });

  } catch (err) {
      await db.execute("ROLLBACK");
      console.error("❌ Fehler bei Speed-Upgrade:", err);
      res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

// POST /api/village/upgrade-stamina (SECURED)
router.post("/upgrade-stamina", requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { villagerId } = req.body;
    const times = parseInt(req.body.times, 10) || 1;

    if (!villagerId || !Number.isInteger(villagerId)) {
        return res.status(400).json({ message: "Ungültige Bewohner-ID" });
    }
    if (times <= 0 || times > 1000) {
        return res.status(400).json({ message: "Ungültige Anzahl für Upgrade." });
    }

    try {
        const villager = await getVillager(villagerId, userId);
        if (!villager) return res.status(404).json({ message: "Bewohner nicht gefunden oder gehört nicht dir" });

        let { stamina, money } = villager;
        let totalCost = 0;

        for (let i = 0; i < times; i++) {
            totalCost += 10 * (stamina + (i * 0.5) + 1);
        }

        if (money < totalCost) {
            return res.status(400).json({ message: `Nicht genug Geld. Benötigt: ${totalCost}` });
        }

        const newStamina = stamina + (times * 0.5);

        await db.execute("BEGIN TRANSACTION");
        await db.execute({ sql: "UPDATE villagers SET stamina = ? WHERE id = ?", args: [newStamina, villagerId] });
        await db.execute({ sql: "UPDATE users SET money = money - ? WHERE id = ?", args: [totalCost, userId] });
        await db.execute("COMMIT");

        const moneyRes = await db.execute({ sql: "SELECT money FROM users WHERE id = ?", args: [userId] });
        res.json({ message: "Stamina-Upgrade erfolgreich", newStamina, newMoney: moneyRes.rows[0].money });

    } catch (err) {
        await db.execute("ROLLBACK");
        console.error("❌ Fehler bei Stamina-Upgrade:", err);
        res.status(500).json({ error: "Upgrade fehlgeschlagen" });
    }
});


// PATCH /api/village/villager/:id/rename (SECURED)
// Renames a specific villager belonging to the user.
router.patch("/villager/:id/rename", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const villagerId = req.params.id;
  const { name } = req.body;

  if (!name || name.trim().length < 2 || name.trim().length > 25) {
    return res.status(400).json({ message: "Name muss zwischen 2 und 25 Zeichen lang sein." });
  }

  try {
    const villager = await getVillager(villagerId, userId);
    if (!villager) {
      return res.status(403).json({ message: "Zugriff verweigert. Dieser Bewohner gehört nicht dir." });
    }

    await db.execute({ sql: `UPDATE villagers SET name = ? WHERE id = ?`, args: [name.trim(), villagerId] });

    res.json({ newName: name.trim() });
  } catch (err) {
    console.error("❌ Fehler beim Umbenennen:", err);
    res.status(500).json({ error: "Fehler beim Umbenennen" });
  }
});

export default router;
