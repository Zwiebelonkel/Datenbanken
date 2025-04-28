-- 1. Datenbank erstellen
CREATE DATABASE IF NOT EXISTS highscores_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 2. Verwenden der neuen Datenbank
USE highscores_db;

-- 3. Tabelle "scores" erstellen
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    created_at DATETIME NOT NULL
);
