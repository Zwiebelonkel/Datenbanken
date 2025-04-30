import express from 'express';
import cors from 'cors';
import scoresRoutes from './routes/scores.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/scores', scoresRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log(`Ein Glück`);


  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
  
    db.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password],
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
  
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
  
    db.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err, results) => {
        if (err) return res.status(500).json({ message: 'Login-Fehler' });
        if (results.length > 0) {
          res.json({ success: true });
        } else {
          res.status(401).json({ success: false, message: 'Falsche Zugangsdaten' });
        }
      }
    );
  });
});
