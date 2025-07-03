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
        { username: user.username, role: user.role },
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



// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
  const password = 'admin'; // oder dein gewünschtes Passwort
bcrypt.hash(password, 10).then(hash => {
  console.log('Gehashter Wert:', hash);
});
});
