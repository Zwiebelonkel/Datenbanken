// services/chat.service.js
import db from '../db.js';

export const ChatService = {
  sendMessage(username, message) {
    return new Promise((resolve, reject) => {
      if (!username || !message || message.length > 200) {
        return reject('Ungültige Nachricht');
      }

      const sql = 'INSERT INTO chat_messages (username, message) VALUES (?, ?)';
      db.run(sql, [username, message], function (err) {
        if (err) return reject(err);
        resolve({ success: true });
      });
    });
  },

  getLatestMessages(limit = 50) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT username, message, created_at
                   FROM chat_messages
                   ORDER BY created_at DESC
                   LIMIT ?`;

      db.all(sql, [limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows.reverse()); // Jüngste zuletzt
      });
    });
  }
};