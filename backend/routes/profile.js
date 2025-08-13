import express from "express";
import multer from "multer";
import path from "path";
import db from "../db.js";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// 📂 Multer-Storage-Konfiguration für Bild-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    cb(null, uuidv4() + fileExtension); // einzigartiger Dateiname
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Nur Bilder sind erlaubt!"));
  },
}).single("profileImage"); // Feldname muss im Frontend gleich heißen

// 📤 Profilbild hochladen
router.post("/upload-profile-image", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const username = req.body.username; // Username aus dem FormData
    if (!username) {
      return res.status(400).json({ message: "Kein Benutzername angegeben" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Kein Bild hochgeladen" });
    }

    // ✅ URL automatisch aus Host & Protokoll generieren
    const profileImageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

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

      res.json({
        message: "Profilbild erfolgreich hochgeladen",
        profileImageUrl,
      });
    } catch (err) {
      console.error("❌ Fehler beim Speichern des Profilbildes:", err);
      res.status(500).json({ message: "Datenbankfehler" });
    }
  });
});

// 📥 Profil-Daten abrufen
router.get("/", async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ message: "Kein Benutzername angegeben" });
  }

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          u.total_score AS totalScore,
          u.money AS money,
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

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Fehler beim Laden des Profils:", err);
    res.status(500).json({ message: "Datenbankfehler" });
  }
});

export default router;
