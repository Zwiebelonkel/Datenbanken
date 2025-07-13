import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import scoresRoutes from './routes/scores.js';
import profileRoutes from './routes/profile.js';


const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';;

app.use(cors());
app.use(express.json());
app.use('/api/scores', scoresRoutes);
app.use('/api/profile', profileRoutes);

// MySQL Verbindung
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});


// Registrierung
app.post('/api/register', async (req, res) => {
  console.log('📩 Neue Registrierungsanfrage:', req.body); // <-- hinzufügen
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hash],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Benutzername bereits vergeben' });
        }
        return res.status(500).json({ message: 'Fehler beim Registrieren' });
      }
      res.status(201).json({ message: 'Registrierung erfolgreich' });
    }
  );
});

// Login mit JWT inkl. ROLE
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Login-Fehler' });
      if (results.length === 0) return res.status(401).json({ message: 'Benutzer nicht gefunden' });

      const user = results[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Falsches Passwort' });

      // 🛠 JWT erzeugen – MIT Rolle!
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ success: true, token });
    }
  );
});


// Benutzer abrufen
app.get('/api/users', (req, res) => {
  db.query('SELECT id, username FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Fehler beim Laden der Benutzer' });
    res.json(results);
  });
});

// Benutzer löschen
app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    res.status(200).json({ success: true }); // ✅
  });
});


// Alle Highscores abrufen
app.get('/api/scores/all', (req, res) => {
  db.query('SELECT * FROM scores', (err, results) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Laden der Scores' });
    res.json(results);
  });
});

// Highscore löschen
app.delete('/api/scores/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM scores WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Löschen des Scores' });
    res.status(200).json({ success: true }); // ✅
  });
});

// GET: Alle Achievements eines Users
const ALL_ACHIEVEMENTS = [
  { name: 'First Game', description: 'Dein erstes Spiel!' },
  { name: 'Newbie', description: 'Du hast 10 Punkte erreicht!' },
  { name: 'Glückspilz', description: 'Du hast 100 Punkte erreicht!' },
  { name: 'Zahlenmeister', description: 'Du hast 1000 Punkte erreicht!' },
  { name: 'Strategieprofi', description: 'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren' },
  // Weitere hier ergänzen
];

app.get('/api/achievements', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Kein Benutzername angegeben' });

  db.query(`
    SELECT a.name FROM achievements a
    JOIN users u ON u.id = a.user_id
    WHERE LOWER(u.username) = LOWER(?)
  `, [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'Fehler beim Laden der Achievements' });

    const unlockedNames = results.map(r => r.name);
    const merged = ALL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: unlockedNames.includes(ach.name)
    }));

    res.json(merged);
  });
});

// Achievement freischalten
app.post('/api/unlock', (req, res) => {
  const { userId, name, description } = req.body;

  if (!userId || !name || !description) {
    return res.status(400).json({ message: 'Fehlende Daten' });
  }

  // Gibt es diesen Erfolg schon?
  db.query(
    'SELECT * FROM achievements WHERE user_id = ? AND name = ?',
    [userId, name],
    (err, rows) => {
      if (err) {
        console.error('Fehler beim SELECT:', err);
        return res.status(500).send('Serverfehler');
      }

      if (rows.length === 0) {
        // Noch nicht vorhanden: einfügen
        db.query(
          'INSERT INTO achievements (user_id, name, description, unlocked) VALUES (?, ?, ?, 1)',
          [userId, name, description],
          (err) => {
            if (err) {
              console.error('Fehler beim INSERT:', err);
              return res.status(500).send('Serverfehler');
            }
            console.log(`✅ Achievement "${name}" für User ${userId} gespeichert.`);
            return res.status(200).send('OK');
          }
        );
      } else {
        console.log(`⚠️ Achievement "${name}" für User ${userId} bereits vorhanden.`);
        return res.status(200).send('OK');
      }
    }
  );
});

// Benutzerstatistiken abrufen
app.get('/api/profile', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Kein Benutzername übergeben' });

  const stats = {};

  // 1. Gesamtpunkte
  db.query('SELECT total_score FROM users WHERE username = ?', [username], (err, result1) => {
    if (err || result1.length === 0) return res.status(500).json({ error: 'Fehler bei total_score' });
    stats.totalScore = result1[0].total_score;

    // 2. Anzahl Spiele
    db.query('SELECT COUNT(*) AS count FROM scores WHERE username = ?', [username], (err2, result2) => {
      if (err2) return res.status(500).json({ error: 'Fehler bei Spielanzahl' });
      stats.totalGames = result2[0].count;

      // 3. Erfolge
      db.query(`
        SELECT COUNT(*) AS count FROM achievements a
        JOIN users u ON a.user_id = u.id
        WHERE u.username = ?
      `, [username], (err3, result3) => {
        if (err3) return res.status(500).json({ error: 'Fehler bei Erfolgen' });
        stats.unlockedAchievements = result3[0].count;
        res.json(stats);
      });
    });
  });
});

// PATCH /api/users/password
app.patch('/api/users/password', (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }

    const user = results[0];

    bcrypt.compare(currentPassword, user.password, (errCompare, isMatch) => {
      if (errCompare || !isMatch) {
        return res.status(403).json({ message: 'Falsches Passwort' });
      }

      bcrypt.hash(newPassword, 10, (errHash, hashedPassword) => {
        if (errHash) return res.status(500).json({ message: 'Fehler beim Verschlüsseln' });

        db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], (errUpdate) => {
          if (errUpdate) return res.status(500).json({ message: 'Fehler beim Ändern' });
          res.json({ message: 'Passwort erfolgreich geändert' });
        });
      });
    });
  });
});






// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
  const password = 'admin'; // oder dein gewünschtes Passwort
bcrypt.hash(password, 10).then(hash => {
  console.log('Gehashter Wert:', hash);
});
});
