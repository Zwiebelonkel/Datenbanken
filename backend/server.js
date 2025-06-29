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

// Login mit JWT
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Login-Fehler' });
      if (results.length === 0) return res.status(401).json({ message: 'Benutzer nicht gefunden' });

      const valid = await bcrypt.compare(password, results[0].password);
      if (!valid) return res.status(401).json({ message: 'Falsches Passwort' });

      // JWT erzeugen
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });

      res.json({ success: true, token });
    }
  );
});

// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
