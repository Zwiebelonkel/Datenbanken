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

      // 2 Bewohner einfügen (ohne x/y)
      for (let i = 0; i < 2; i++) {
        await db.execute({
          sql: "INSERT INTO villagers (village_id, name) VALUES (?, ?)",
          args: [villageId, `Bewohner`],
        });
      }

      // Neue Abfrage für Dorf
      villageResult = await db.execute({
        sql: "SELECT * FROM village WHERE user_id = ?",
        args: [userId],
      });
    }

    const village = villageResult.rows[0];
    // 2. Bewohner holen
    const villagersResult = await db.execute({
      sql: "SELECT id, name, level, income, speed, stamina FROM villagers WHERE village_id = ?",
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

    // Hier den Offline-Multiplikator anwenden (z.B. 50% des Einkommens)
    const offlineMultiplier = 0.5; // 50% des normalen Einkommens
    const totalIncome =
      minutesPassed *
      (village.base_income + villagersIncome) *
      offlineMultiplier;

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
    // 1. Dorf und Geld holen
    const result = await db.execute({
      sql: `
        SELECT v.id as villageId, v.level, u.money 
        FROM village v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.user_id = ?
      `,
      args: [userId],
    });

    const data = result.rows[0];
    if (!data) return res.status(404).json({ message: "Kein Dorf gefunden" });

    const currentLevel = data.level;
    const upgradeCost = 100 * currentLevel;

    if (data.money < upgradeCost) {
      return res.status(400).json({ message: "Nicht genug Geld" });
    }

    const newLevel = currentLevel + 1;

    // 2. Geld abziehen + Level erhöhen (Transaktion empfohlen, falls verfügbar)
    await db.execute({
      sql: "UPDATE users SET money = money - ? WHERE id = ?",
      args: [upgradeCost, userId],
    });

    await db.execute({
      sql: "UPDATE village SET level = ? WHERE id = ?",
      args: [newLevel, data.villageId],
    });

    // 3. Neue Bewohner hinzufügen
    for (let i = 0; i < 2; i++) {
      await db.execute({
        sql: "INSERT INTO villagers (village_id, name) VALUES (?, ?)",
        args: [data.villageId, `Bewohner`],
      });
    }

    // 4. Neuen Geldstand abrufen und zurückgeben
    const moneyRes = await db.execute({
      sql: "SELECT money FROM users WHERE id = ?",
      args: [userId],
    });

    res.json({
      message: "Dorf verbessert",
      newLevel,
      newMoney: moneyRes.rows[0].money,
    });
  } catch (err) {
    console.error("❌ Fehler bei Dorf-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

router.post("/upgrade-villager", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { villagerId, times = 1 } = req.body;

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

    let villager = result.rows[0];
    if (!villager)
      return res.status(404).json({ message: "Bewohner nicht gefunden" });

    let currentLevel = villager.level;
    let currentIncome = villager.income;
    let availableMoney = villager.money;
    let totalCost = 0;
    currentIncome = parseFloat(currentIncome.toFixed(2));

    for (let i = 0; i < times; i++) {
      const cost = 10 * (currentLevel + 1);
      if (availableMoney < cost) break;

      currentLevel++;
      currentIncome += 0.2;

      currentIncome = parseFloat(currentIncome.toFixed(2));

      availableMoney -= cost;
      totalCost += cost;
    }

    await db.execute({
      sql: "UPDATE villagers SET level = ?, income = ? WHERE id = ?",
      args: [currentLevel, parseFloat(currentIncome.toFixed(2)), villagerId],
    });

    await db.execute({
      sql: "UPDATE users SET money = money - ? WHERE id = ?",
      args: [totalCost, userId],
    });

    const moneyRes = await db.execute({
      sql: "SELECT money FROM users WHERE id = ?",
      args: [userId],
    });

    res.json({
      message: "Upgrade erfolgreich",
      newLevel: currentLevel,
      newIncome: currentIncome,
      newMoney: moneyRes.rows[0].money,
    });
  } catch (err) {
    console.error("❌ Fehler bei Bewohner-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

router.post("/upgrade-speed", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { villagerId, times = 1 } = req.body;

  try {
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

    let villager = result.rows[0];
    if (!villager)
      return res.status(404).json({ message: "Bewohner nicht gefunden" });

    let currentSpeed = villager.speed;
    let availableMoney = villager.money;
    let totalCost = 0;

    for (let i = 0; i < times; i++) {
      const cost = 10 * (currentSpeed + 1);
      if (availableMoney < cost) break;

      currentSpeed += 0.5;
      availableMoney -= cost;
      totalCost += cost;
    }

    await db.execute({
      sql: "UPDATE villagers SET speed = ? WHERE id = ?",
      args: [currentSpeed, villagerId],
    });

    await db.execute({
      sql: "UPDATE users SET money = money - ? WHERE id = ?",
      args: [totalCost, userId],
    });

    const moneyRes = await db.execute({
      sql: "SELECT money FROM users WHERE id = ?",
      args: [userId],
    });

    res.json({
      message: "Upgrade erfolgreich",
      newSpeed: currentSpeed,
      newMoney: moneyRes.rows[0].money,
    });
  } catch (err) {
    console.error("❌ Fehler bei Speed-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

router.post("/upgrade-stamina", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { villagerId, times = 1 } = req.body;

  try {
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

    let villager = result.rows[0];
    if (!villager)
      return res.status(404).json({ message: "Bewohner nicht gefunden" });

    let currentStamina = villager.stamina;
    let availableMoney = villager.money;
    let totalCost = 0;

    for (let i = 0; i < times; i++) {
      const cost = 10 * (currentStamina + 1);
      if (availableMoney < cost) break;

      currentStamina += 0.5;
      availableMoney -= cost;
      totalCost += cost;
    }

    await db.execute({
      sql: "UPDATE villagers SET stamina = ? WHERE id = ?",
      args: [currentStamina, villagerId],
    });

    await db.execute({
      sql: "UPDATE users SET money = money - ? WHERE id = ?",
      args: [totalCost, userId],
    });

    const moneyRes = await db.execute({
      sql: "SELECT money FROM users WHERE id = ?",
      args: [userId],
    });

    res.json({
      message: "Upgrade erfolgreich",
      newStamina: currentStamina,
      newMoney: moneyRes.rows[0].money,
    });
  } catch (err) {
    console.error("❌ Fehler bei Stamina-Upgrade:", err);
    res.status(500).json({ error: "Upgrade fehlgeschlagen" });
  }
});

// Bewohner umbenennen
router.patch("/villager/:id/rename", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const villagerId = req.params.id;
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: "Name darf nicht leer sein." });
  }

  try {
    // Prüfen, ob Bewohner zum User gehört
    const checkResult = await db.execute({
      sql: `
        SELECT v.id 
        FROM villagers v
        JOIN village vi ON v.village_id = vi.id
        WHERE v.id = ? AND vi.user_id = ?
      `,
      args: [villagerId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ message: "Zugriff verweigert." });
    }

    // Namen aktualisieren
    await db.execute({
      sql: `UPDATE villagers SET name = ? WHERE id = ?`,
      args: [name.trim(), villagerId],
    });

    res.json({ newName: name.trim() });
  } catch (err) {
    console.error("❌ Fehler beim Umbenennen:", err);
    res.status(500).json({ error: "Fehler beim Umbenennen" });
  }
});

export default router;
