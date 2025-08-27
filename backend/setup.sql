PRAGMA foreign_keys = ON;

-- Tabelle: users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  total_score INTEGER DEFAULT 0,
  money INTEGER DEFAULT 0
);

-- Tabelle: village
CREATE TABLE village (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  base_income REAL DEFAULT 1,
  last_collected TEXT DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabelle: villagers
CREATE TABLE villagers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  village_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  income REAL DEFAULT 0.5,
  FOREIGN KEY (village_id) REFERENCES village(id) ON DELETE CASCADE
);

-- Tabelle: achievements
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unlocked INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabelle: cards
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  multiplier REAL NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, multiplier)
);

-- Tabelle: scores
CREATE TABLE scores (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  consecutive_wins INTEGER DEFAULT 0,
  money_per_round REAL DEFAULT 0
);
