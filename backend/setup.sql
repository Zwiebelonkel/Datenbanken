-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 13. Jul 2025 um 21:24
-- Server-Version: 10.4.32-MariaDB
-- PHP-Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `highscores_db`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `achievements`
--

CREATE TABLE `achievements` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `unlocked` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Daten für Tabelle `achievements`
--

INSERT INTO `achievements` (`id`, `user_id`, `name`, `description`, `unlocked`) VALUES
(1, 1, 'First Game', 'Dein erstes Spiel!', 1),
(2, 1, 'Newbie', 'Du hast 10 Punkte erreicht!', 1),
(3, 9, 'First Game', 'Dein erstes Spiel!', 1),
(4, 9, 'Newbie', 'Du hast 10 Punkte erreicht!', 1);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `scores`
--

CREATE TABLE `scores` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `score` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Daten für Tabelle `scores`
--

INSERT INTO `scores` (`id`, `username`, `score`, `created_at`) VALUES
(1, 'Luca', 1, '2025-07-13 16:39:32'),
(2, 'Luca', 6, '2025-07-13 16:40:02'),
(3, 'Luca', 6, '2025-07-13 16:40:04'),
(4, 'Luca', 0, '2025-07-13 16:42:46'),
(5, 'Luca', 0, '2025-07-13 16:43:54'),
(6, 'Luca', 0, '2025-07-13 16:43:55'),
(7, 'Luca', 8, '2025-07-13 16:43:59'),
(8, 'Luca', 8, '2025-07-13 16:44:00'),
(9, 'Luca', 1, '2025-07-13 16:44:08'),
(10, 'Luca', 1, '2025-07-13 16:44:08'),
(11, 'Luca', 11, '2025-07-13 16:47:43'),
(12, 'admin', 11, '2025-07-13 21:19:32');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'player',
  `total_score` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Daten für Tabelle `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `total_score`) VALUES
(1, 'Luca', '$2b$10$.X.OZirsi1mNSY3M8CpPfesfXHG/aP0LMtIxM383FSrRcGt.5PJqO', 'player', 20),
(9, 'admin', '$2b$10$aXaCzcD5AsGfyg8jFVASiOjBWmNbBsi1yExai1aLliAdvUl997/Yq', 'admin', 11),
(10, 'test', '$2b$10$kC4U9acor7wcTywKkhrZouOV7ppRbRXA1BS7tBhBqG2YcUo6Ir9Le', 'player', 0);

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `achievements`
--
ALTER TABLE `achievements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indizes für die Tabelle `scores`
--
ALTER TABLE `scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `username` (`username`);

--
-- Indizes für die Tabelle `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `achievements`
--
ALTER TABLE `achievements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT für Tabelle `scores`
--
ALTER TABLE `scores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT für Tabelle `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `achievements`
--
ALTER TABLE `achievements`
  ADD CONSTRAINT `achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints der Tabelle `scores`
--
ALTER TABLE `scores`
  ADD CONSTRAINT `scores_ibfk_1` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
