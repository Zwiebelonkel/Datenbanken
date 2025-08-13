import express from "express";
import multer from "multer";
import path from "path";
import db from "../db.js";
import fs from "fs";
import { v4 as uuidv4 } from "uuid"; // UUID für einzigartige Dateinamen

const router = express.Router();

// Multer-Storage-Konfiguration für Bild-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); // Zielordner
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const filename = uuidv4() + fileExtension; // Einzigartiger Dateiname
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Nur Bilder sind erlaubt!"));
  },
}).single("profileImage"); // Single-File Upload

// Profilbild-Upload Endpoint
router.post("/upload-profile-image", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const username = req.body.username; // Benutzername aus dem Body
    if (!username) {
      return res.status(400).json({ message: "Kein Benutzername angegeben" });
    }

    // Bild-URL (das Bild wird im Ordner 'uploads/' gespeichert)
    const profileImageUrl = `https://your-domain.com/uploads/${req.file.filename}`;

    try {
      // Bild-URL in der Datenbank speichern
      const result = await db.execute({
        sql: `
          UPDATE users
          SET profile_image_url = ?
          WHERE LOWER(username) = LOWER(?)
        `,
        args: [profileImageUrl, username],
      });

      if (result.rowsAffected === 0) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      res.json({ message: "Profilbild erfolgreich hochgeladen", profileImageUrl });
    } catch (err) {
      console.error("❌ Fehler beim Speichern des Profilbildes:", err);
      res.status(500).json({ message: "Datenbankfehler" });
    }
  });
});

// Profil-Daten abrufen
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
