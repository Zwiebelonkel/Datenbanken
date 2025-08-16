import express from "express";
import multer from "multer";
import db from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

/** 🔐 Cloudinary: ENV Variablen müssen in Render gesetzt sein */
cloudinary.config({
  cloud_name: process.env.CLD_NAME,
  api_key: process.env.CLD_KEY,
  api_secret: process.env.CLD_SECRET,
});

async function getUserSkills(username) {
  try {
    const result = await db.execute({
      sql: `
        SELECT skill_name, skill_level
        FROM user_skills
        WHERE username = ?
      `,
      args: [username],
    });

    return result.rows;
  } catch (error) {
    console.error("Fehler beim Abrufen der Skills:", error);
    throw error;  // Fehler weiterwerfen, damit der Fehler im Aufrufer sichtbar ist
  }
}


/** 🗄️ Multer-Storage direkt in Cloudinary (keine lokale Disk) */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile-pictures",
    public_id: () => uuidv4(),
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 256, height: 256, crop: "fill", gravity: "auto", quality: "auto" }],
  },
});
const upload = multer({ storage }).single("profileImage");

/** 📤 Profilbild hochladen */
router.post("/upload-profile-image", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const username = (req.body.username || "").trim();
    if (!username) return res.status(400).json({ message: "Kein Benutzername angegeben" });
    if (!req.file) return res.status(400).json({ message: "Kein Bild hochgeladen" });

    const profileImageUrl = req.file.secure_url || req.file.path;
    if (!profileImageUrl) return res.status(500).json({ message: "Upload fehlgeschlagen" });

    try {
      const result = await db.execute({
        sql: `
          UPDATE users
          SET profile_image_url = ?
          WHERE LOWER(username) = LOWER(?)
        `,
        args: [profileImageUrl, username],
      });

      if (!result.rowsAffected || result.rowsAffected === 0) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      res.json({ message: "Profilbild erfolgreich hochgeladen", profileImageUrl });
    } catch (e) {
      console.error("❌ Fehler beim Speichern des Profilbildes:", e);
      res.status(500).json({ message: "Datenbankfehler" });
    }
  });
});

/** 📥 Profil-Daten abrufen */
router.get("/:username", async (req, res) => {
  const username = (req.params.username || "").trim();
  if (!username) return res.status(400).json({ message: "Kein Benutzername angegeben" });

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          u.username AS username,  -- Benutzername
          u.total_score AS totalScore,  -- Gesamtpunkte
          u.money AS money,  -- Geld
          u.level AS level,  -- Level
          u.xp AS xp,  -- XP
          ROUND(100 * POWER(1.05, u.level - 1), 0) AS xpThreshold,  -- XP-Schwelle
          ROUND((u.xp / (100 * POWER(1.05, u.level - 1))) * 100, 0) AS xpPercent,  -- XP-Prozent
          (SELECT COUNT(*) FROM scores WHERE username = u.username) AS totalGames,  -- Gesamtzahl der Spiele
          (SELECT MAX(score) FROM scores WHERE username = u.username) AS highscore,  -- Höchster Score
          (SELECT COUNT(*) FROM achievements a 
             JOIN users u2 ON u2.id = a.user_id 
             WHERE LOWER(u2.username) = LOWER(u.username)) AS unlockedAchievements,  -- Anzahl der freigeschalteten Erfolge
          u.profile_image_url AS profileImageUrl,  -- Profilbild-URL
          u.skill_points AS skillPoints,  -- Skill-Punkte
          u.score_multiplier AS scoreMultiplier,  -- Score-Multiplikator
          u.monetary_multiplier AS monetaryMultiplier  -- Monetärer Multiplikator
        FROM users u
        WHERE LOWER(u.username) = LOWER(?)
        LIMIT 1
      `,
      args: [username],
    });

    if (result.rows.length === 0) return res.status(404).json({ message: "Benutzer nicht gefunden" });

    const userStats = result.rows[0];

    // Abrufen der Benutzer-Skills
    const userSkills = await getUserSkills(username);

    res.json({
      ...userStats,
      skills: userSkills,  // Füge Skills zu den Benutzer-Daten hinzu
    });
  } catch (e) {
    console.error("❌ Fehler beim Laden des Profils:", e);
    res.status(500).json({ message: "Datenbankfehler" });
  }
});

/** 📤 XP hinzufügen */
router.post('/:username/add-xp', async (req, res) => {
  const username = (req.params.username || '').trim();
  let { xpToAdd } = req.body;

  // Eingaben prüfen/konvertieren
  xpToAdd = Number(xpToAdd);
  if (!username) return res.status(400).json({ message: 'Kein Benutzername angegeben' });
  if (!Number.isFinite(xpToAdd) || xpToAdd <= 0) {
    return res.status(400).json({ message: 'Ungültige XP-Anzahl' });
  }

  try {
    // Aktuelle Werte laden
    const result = await db.execute({
      sql: `SELECT level, xp FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1`,
      args: [username],
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Zahlen sicher machen + Defaults
    let level = Number(result.rows[0].level);
    let xp    = Number(result.rows[0].xp);
    if (!Number.isFinite(level) || level < 1) level = 1;
    if (!Number.isFinite(xp)    || xp   < 0)  xp    = 0;

    // Schwelle-Funktion
    const xpForLevel = (lvl) => Math.round(100 * Math.pow(1.05, Math.max(1, lvl) - 1));

    // XP addieren + Level-Ups zählen
    let gainedSkillPoints = 0;     // ⬅️ nur Zunahme, totaler Wert wird DB-seitig addiert
    let leveledUp = false;

    xp += xpToAdd;
    let xpThreshold = xpForLevel(level);  // aktuelle Schwelle für dieses Level

    while (xp >= xpThreshold) {
      xp -= xpThreshold;
      level += 1;
      gainedSkillPoints += 1;
      leveledUp = true;
      xpThreshold = xpForLevel(level);    // neue Schwelle für das neue Level
    }

    // Update: Level/XP setzen, Skillpunkte erhöhen
    // (setzt skill_points falls Spalte existiert; sonst diesen Teil entfernen)
    await db.execute({
      sql: `
        UPDATE users
        SET level = ?,
            xp    = ?,
            skill_points = COALESCE(skill_points, 0) + ?
        WHERE LOWER(username) = LOWER(?)
      `,
      args: [level, xp, gainedSkillPoints, username],
    });

    // Optional: aktuellen Gesamt-Skillpunktestand zurückgeben (wenn du ihn brauchst)
    // const sp = await db.execute({
    //   sql: `SELECT COALESCE(skill_points,0) AS skill_points FROM users WHERE LOWER(username)=LOWER(?)`,
    //   args: [username],
    // });

    res.json({
      message: `XP hinzugefügt${leveledUp ? ', Level erhöht!' : ''}`,
      leveledUp,
      level,
      // skillPointsTotal: sp.rows[0]?.skill_points ?? undefined,
      skillPointsGained: gainedSkillPoints,
      xp,
      xpThreshold, // Schwelle für das *aktuelle* Level (nächster Balken)
    });
  } catch (e) {
    console.error('❌ add-xp Fehler:', e);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});

/** Optional: Alte Query-Variante für Kompatibilität */
router.get("/", async (req, res) => {
  const username = (req.query.username || "").trim();
  if (!username) return res.status(400).json({ message: "Kein Benutzername angegeben" });

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          u.total_score AS totalScore,
          u.money AS money,
          u.level AS level,
          u.xp AS xp,
          ROUND(100 * POWER(1.05, u.level - 1), 0) AS xpThreshold,
          ROUND((u.xp / (100 * POWER(1.05, u.level - 1))) * 100, 0) AS xpPercent,
          (SELECT COUNT(*) FROM scores WHERE username = ?) AS totalGames,
          (SELECT MAX(score) FROM scores WHERE username = ?) AS highscore,
          (SELECT COUNT(*) FROM achievements a 
             JOIN users u2 ON u2.id = a.user_id 
             WHERE LOWER(u2.username) = LOWER(?)) AS unlockedAchievements,
          u.profile_image_url AS profileImageUrl
        FROM users u
        WHERE LOWER(u.username) = LOWER(?)
        LIMIT 1
      `,
      args: [username, username, username, username],
    });

    if (result.rows.length === 0) return res.status(404).json({ message: "Benutzer nicht gefunden" });
    res.json(result.rows[0]);
  } catch (e) {
    console.error("❌ Fehler beim Laden des Profils:", e);
    res.status(500).json({ message: "Datenbankfehler" });
  }
});

export default router;
