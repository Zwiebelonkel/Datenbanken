# 🎮 ZahlenRaten Game

Ein interaktives Webspiel, bei dem du zwischen zwei zufälligen Zahlen raten musst, ob eine dritte Zahl **dazwischen** oder **außerhalb** liegt. Sammle Punkte, verdiene Geld, nutze **Multiplikator-Karten** und kämpfe dich in die **Leaderboards**!

## 🔧 Features

- 🔢 Zahlenraten mit steigendem Schwierigkeitsgrad
- 🎴 Karten-Shop mit Packs (Basic, Premium, Ultra)
- ✨ Multiplikator-Karten (1.2x bis 5x)
- 🏅 Achievement-System mit Erfolgen
- 📈 Drei Leaderboards: Punkte, Streaks, Geld
- 🌙 Dark Mode Toggle
- 📱 Mobile Swipe-Support
- 👤 Login-System mit Benutzerprofil
- 💼 Geldsystem mit Einlösen-Funktion

## 📸 Screenshots

> *(Screenshots hier einfügen)*

## 🚀 Technologien

- **Frontend:** Angular
- **Backend:** Node.js (Express)
- **Datenbank:** Turso (SQLite-basiert)
- **Styling:** SCSS, Responsive Design
- **Animationen:** Emoji Rain, Kartenöffnungen, Multiplikator-Effekte

## 📂 Projektstruktur

```
📁 src/
├── app/
│   ├── components/           # Angular-Komponenten (Game, Sidebar, Shop, etc.)
│   ├── services/             # HTTP-Services (z.B. User, Score, Card)
│   ├── models/               # Datenmodelle (User, Card, etc.)
│   └── app-routing.module.ts # Routen
├── assets/                   # Bilder, Karten, Logos
├── styles.scss               # Globales Styling
```

## 📦 Setup & Installation

### 🔧 Voraussetzungen

- Node.js
- Turso DB (oder SQLite lokal)
- Angular CLI

### 🖥️ Lokales Setup

```bash
# 1. Repository klonen
git clone https://github.com/dein-benutzername/zahlenraten-game.git
cd zahlenraten-game

# 2. Abhängigkeiten installieren
npm install

# 3. Angular starten
ng serve
```

### ⚙️ Backend starten

```bash
# Backend starten
cd backend
npm install
node server.js
```

## 🗃️ Datenbankstruktur (Turso)

- `users`: id, username, email, password, role
- `scores`: id, username, score, created_at
- `cards`: id, user_id, multiplier, amount
- `achievements`: id, user_id, type, achieved_at

## 🌐 Deployment

- Frontend: [Firebase Hosting](https://firebase.google.com/)
- Backend: [Render](https://render.com/)
- Datenbank: [Turso](https://turso.tech/)

## ✅ To-Do

- [x] Kartenpacks mit Zieh-Animation
- [x] Swipe-Unterstützung auf Mobile
- [ ] Soundeffekte und Musik
- [ ] Tutorial-Seite erweitern
- [ ] Leaderboard-Favoriten & Filter

## 🧠 Inspiration

Das Spiel ist inspiriert von klassischen Ratespielen, kombiniert mit modernen Belohnungssystemen wie **Kartenpacks** und **Achievements**.

## 🧑‍💻 Autor

**Dein Name**  
[🔗 dein-linkedin.com](https://www.linkedin.com/in/deinprofil)  
[📧 dein@email.de](mailto:dein@email.de)
