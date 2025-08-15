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

/** 🗄️ Multer-Storage direkt in Cloudinary (keine lokale Disk) */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile-pictures",
    public_id: () => uuidv4(),
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    // kleine, quadratische Avatare – spart Traffic
    transformation: [{ width: 256, height: 256, crop: "fill", gravity: "auto", quality: "auto" }],
  },
});
const upload = multer({ storage }).single("profileImage");

/** 📤 Profilbild hochladen (Username kommt wie bisher im Body mit) */
router.post("/upload-profile-image", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const username = (req.body.username || "").trim();
    if (!username) return res.status(400).json({ message: "Kein Benutzername angegeben" });
    if (!req.file) return res.status(400).json({ message: "Kein Bild hochgeladen" });

    // Cloudinary liefert eine sofort-öffentliche URL
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

/** 📥 Profil-Daten abrufen – neue Param-Route */
router.get("/:username", async (req, res) => {
  const username = (req.params.username || "").trim();
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
          ROUND((u.xp / (100 * POWER(1.05, u.level - 1))) * 100, 0) AS xpPercent
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

/** (Optional) Alte Query-Variante beibehalten, falls Frontend sie noch nutzt */
router.get("/", async (req, res) => {
  const username = (req.query.username || "").trim();
  if (!username) return res.status(400).json({ message: "Kein Benutzername angegeben" });

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          u.total_score AS totalScore,
          u.money AS money,
          u.level AS level,              -- HIER ergänzt
          u.xp AS xp,                    -- HIER ergänzt
          ROUND(100 * POWER(1.05, u.level - 1), 0) AS xpThreshold,
          ROUND((u.xp / (100 * POWER(1.05, u.level - 1))) * 100, 0) AS xpPercent

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
    console.error("❌ Fehler beim Laden des Profils (Query):", e);
    res.status(500).json({ message: "Datenbankfehler" });
  }
});


export default router;
