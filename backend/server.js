import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import scoresRoutes from './routes/scores.js';
import profileRoutes from './routes/profile.js';
import moneyRoutes from './routes/money.js';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors());
app.use(express.json());
app.use('/api/scores', scoresRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/money', moneyRoutes);


const ALL_ACHIEVEMENTS = [
  { name: 'First Game', description: 'Dein erstes Spiel!' },
  { name: 'Pechvogel', description: '0 Punkte erzielt' },
  { name: 'Newbie', description: 'Du hast 10 Punkte erreicht!' },
  { name: 'Glückspilz', description: 'Du hast 50 Punkte erreicht!' },
  { name: 'Zahlenmeister', description: 'Du hast 75 Punkte erreicht!' },
  { name: 'Gambler', description: 'Du hast 3 mal richtig geraten ohne ein Leben zu verlieren' },
  { name: 'Arbeitswoche', description: 'Du hast 5 mal richtig geraten ohne ein Leben zu verlieren' },
  { name: 'Strategieprofi', description: 'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren' }
];

// Registrierung
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.execute({
      sql: 'INSERT INTO users (username, password) VALUES (?, ?)',
      args: [username, hash],
    });
    res.status(201).json({ message: 'Registrierung erfolgreich' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ message: 'Benutzername bereits vergeben' });
    }
    res.status(500).json({ message: 'Fehler beim Registrieren' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Falsches Passwort' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ message: 'Login-Fehler' });
  }
});

// Benutzerliste
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT id, username FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
  }
});

// Benutzer löschen
app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [req.params.id],
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
});

// Scores abrufen
app.get('/api/scores/all', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM scores');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Scores' });
  }
});

// Score löschen
app.delete('/api/scores/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM scores WHERE id = ?',
      args: [req.params.id],
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen des Scores' });
  }
});

// Achievements abrufen
app.get('/api/achievements', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Kein Benutzername angegeben' });

  try {
    const result = await db.execute({
      sql: `
        SELECT a.name FROM achievements a
        JOIN users u ON u.id = a.user_id
        WHERE LOWER(u.username) = LOWER(?)
      `,
      args: [username],
    });

    const unlockedNames = result.rows.map(r => r.name);
    const merged = ALL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: unlockedNames.includes(ach.name)
    }));

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Achievements' });
  }
});

// Achievement freischalten
app.post('/api/unlock', async (req, res) => {
  const { userId, name, description } = req.body;
  if (!userId || !name || !description) {
    return res.status(400).json({ message: 'Fehlende Daten' });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM achievements WHERE user_id = ? AND name = ?',
      args: [userId, name],
    });

    if (result.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO achievements (user_id, name, description, unlocked) VALUES (?, ?, ?, 1)',
        args: [userId, name, description],
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Serverfehler');
  }
});

// Passwort ändern
app.patch('/api/users/password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username],
    });

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ message: 'Falsches Passwort' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE username = ?',
      args: [hashedPassword, username],
    });

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Ändern des Passworts' });
  }
});


// Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});