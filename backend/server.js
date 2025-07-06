import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import scoresRoutes from './routes/scores.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'dein_geheimes_token_passwort'; // Später in .env auslagern

app.use(cors());
app.use(express.json());
app.use('/api/scores', scoresRoutes);

// MySQL Verbindung
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'highscores_db',
});

// Registrierung
app.post('/api/register', async (req, res) => {
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







// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
  const password = 'admin'; // oder dein gewünschtes Passwort
bcrypt.hash(password, 10).then(hash => {
  console.log('Gehashter Wert:', hash);
});
});
