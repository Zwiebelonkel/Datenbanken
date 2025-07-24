import { Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ScoreService } from '../../services/score.service';
import { MoneyService } from '../../services/money.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DarkModeService } from '../../services/dark.service';
import { ProfileService } from '../../services/profile.service';
import { Renderer2 } from '@angular/core';
import { LoaderComponent } from '../loader/loader.component'; // Import LoaderComponent
import { CardsService } from '../../services/cards.service';
import { SoundsService } from '../../services/sound.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  imports: [CommonModule, FormsModule, LoaderComponent],
  encapsulation: ViewEncapsulation.None
})
export class GameComponent implements OnInit {
  num1 = 0;
  num2 = 0;
  testNum = 0;
  score = 0;
  money = 0;
  highestStreak = 0;
  lives = 3;
  hasPlayedYet: boolean = false;
  gameOver = false;
  isHighscore = false;
  consecutiveWins = 0;
  darkMode = false;
  isLoading = true;
  sidebarOpen = false;
  achievementMessage: string | null = null;
  achAmount = 0;
  floatingMoney: { x: number; y: number }[] = [];
  cards: any[] = [];
  selectedCard: any = null;
  gameStarted = false;
  cardMultiplierUsed = false;
  // justAppeared = false; // Für Lava-Animation
  leaderboardTitles = ['Top Punkte', 'Längste Streak', 'Geld pro Runde'];
  currentLeaderboardIndex = 0;
  currentLeaderboard: { username: string; value: string }[] = [];
  allLeaderboards: { username: string; value: string }[][] = [];
  touchStartX = 0;




  buttonsDisabled = false;
  currentMultiplier: number = 1.0;
  cardMultiplier = 1.0;


  topScores: any[] = [];
  constructor(private scoreService: ScoreService, public authService: AuthService, private router: Router, private http: HttpClient, public darkModeService: DarkModeService, private moneyService: MoneyService, private profileService: ProfileService, private renderer: Renderer2, private cardsService: CardsService, private soundService: SoundsService) {}

  ngOnInit() {
    this.newRound();
    this.loadLeaderboards();
    this.loadCards();
  }

//   ngOnChanges(): void {
//   if (this.currentMultiplier > 1 && !this.justAppeared) {
//     this.justAppeared = true;

//     // Kleine Pause, dann "hochfahren"
//     setTimeout(() => {
//       this.justAppeared = false;
//     }, 50); // 50 ms Delay reicht für Transition-Start
//   }
// }

  loadCards() {
    this.cardsService.getCards().subscribe({
      next: (data) => {
        this.cards = data;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Karten:', err);
      }
    });
  }

  useSelectedCard() {
    if (!this.selectedCard) return;

    this.cardMultiplier = this.selectedCard.multiplier;
    this.cardMultiplierUsed = true;
    this.soundService.playSound('hardPop.aac', 0.6); // Sound beim Verwenden der Karte abspielen

    // Karte um 1 reduzieren
    this.cardsService.useCard(this.selectedCard.multiplier).subscribe({
      next: () => {
        this.selectedCard.amount--;
        if (this.selectedCard.amount <= 0) {
          this.cards = this.cards.filter(c => c.multiplier !== this.selectedCard.multiplier);
          this.selectedCard = null;
        }
      },
      error: (err) => {
        console.error('Fehler beim Verwenden der Karte:', err);
      }
    });
  }

  isDarkMode(): boolean {
  return this.darkModeService.isDarkMode();
}

  newRound() {
    this.num1 = this.getRandomNumber();
    this.num2 = this.getRandomNumber();
    this.testNum = this.getRandomNumber();
    this.gameOver = false;
  }

  getRandomNumber(): number {
    return Math.floor(Math.random() * 100);
  }

  isBetween(): boolean {
    const min = Math.min(this.num1, this.num2);
    const max = Math.max(this.num1, this.num2);
    return this.testNum > min && this.testNum < max;
  }

guess(answer: 'inside' | 'outside') {
  this.gameStarted = true;
  this.soundService.playSound('softClick.aac');
  const correct = this.isBetween() ? 'inside' : 'outside';
  const resultElement = document.querySelector('.game-container') as HTMLElement;

  this.showTestNum();

  if (answer === correct) {
    this.consecutiveWins++;
    if (this.consecutiveWins > this.highestStreak) {
      this.highestStreak = this.consecutiveWins;
    }

    // Serien-Multiplikator bleibt sichtbar
    const seriesMultiplier = this.consecutiveWins >= 2 ? 1 + (this.consecutiveWins - 1) * 0.2 : 1.0;
    this.currentMultiplier = seriesMultiplier;

    // Gesamt-Multiplikator nur intern für Punkteberechnung
    const totalMultiplier = seriesMultiplier * this.cardMultiplier;

    const points = Math.round(1 * this.lives * totalMultiplier);

    this.score += points;
    this.money += this.lives;

    this.flashBackground(resultElement, 'rgb(177, 255, 168)');

    if (this.consecutiveWins % 5 === 0) {
      const intensity = Math.min(10 + this.consecutiveWins * 2, 50);
      this.emojiRain("🔥", intensity);
      this.soundService.playSound('fire.aac', 0.3); // Sound für Emoji-Regen abspielen
    }

    setTimeout(() => this.newRound(), 500);
  } else if (this.lives > 1) {
    this.lives--;
    this.consecutiveWins = 0;
    this.currentMultiplier = 1.0;
    this.flashBackground(resultElement, 'rgb(255, 168, 168)');
    this.soundService.playSound('damage.aac', 0.2); // Sound für falsche Antwort abspielen
    setTimeout(() => this.newRound(), 500);
  } else {
    this.gameOver = true;
    this.soundService.playSound('end.aac', 0.2); // Sound für Spielende abspielen
    this.consecutiveWins = 0;
    this.currentMultiplier = 1.0;
    this.lives = 0;
    this.flashBackground(resultElement, 'rgb(255, 168, 168)');
    setTimeout(() => this.endGame(), 500);
  }

  this.checkForAchievements();
}

showTestNum() {
  const testNumElement = document.getElementById('finalNumber') as HTMLElement;
  this.buttonsDisabled = true;

  if (testNumElement) {
    testNumElement.style.visibility = 'visible';

    setTimeout(() => {
      testNumElement.style.visibility = 'hidden';
      this.buttonsDisabled = false; // Wieder aktivieren
    }, 500); // nach 0.5 Sekunde wieder aktiv
  }
}

  flashBackground(element: HTMLElement, color: string) {
    if (element) {
      console.log("Flash: "+color + " on " + element.className);
      element.style.backgroundColor = color;
            setTimeout(() => {
        element.style.backgroundColor = '';
      }, 500);
    }
  }

endGame() {
  const username = this.authService.getUsername();
  if (!username) {
    console.warn('Kein Benutzer eingeloggt – Score wird nicht gespeichert.');
    this.gameOver = true;
    return;
  }

  this.gameStarted = false;
  this.gameOver = true;

  // ✅ total_score aktualisieren
  this.scoreService.updateTotalScore({ username, score: this.score }).subscribe({
    next: () => console.log('✅ total_score aktualisiert'),
    error: err => console.error('❌ Fehler beim total_score:', err)
  });

// 💰 money aktualisieren
this.moneyService.updateMoney({ username, amount: this.score }).subscribe({
  next: () => console.log('💰 Geld aktualisiert'),
  error: err => console.error('❌ Fehler beim Geld-Update:', err)
});

  // ✅ Highscore prüfen
  this.scoreService.isHighscore(this.score).subscribe(res => {
    this.isHighscore = res.isHighscore;
  });
}



submitScore() {
  this.soundService.playSound('hardPop.aac', 0.6); // Sound beim Einreichen des Scores abspielen
  const username = this.authService.getUsername();
  if (!username) {
    console.warn('Kein Benutzer eingeloggt – Score wird nicht gespeichert.');
    return;
  }

    this.scoreService.submitScore({ username, score: this.score, consecutive_wins: this.highestStreak, money_per_round: this.money }).subscribe(() => {

    this.loadLeaderboards();
    this.restart();
  });
this.scoreService.isHighscore(this.score).subscribe({
  next: (res) => {
    if (res.isHighscore) {
      this.unlockAchievement('Champion 🏆');
    }
  },
  error: (err) => {
    console.error('❌ Fehler bei Highscore-Prüfung:', err);
  }
});
}


// loadHighscores() {
//   this.isLoading = true;
//   this.scoreService.getTopScores().subscribe(
//     (scores) => {
//       this.topScores = scores;
//       this.isLoading = false;
//     },
//     (error) => {
//       console.error('Fehler beim Laden der Highscores', error);
//       this.isLoading = false;
//     }
//   );
// }

loadLeaderboards() {
  this.isLoading = true;

  Promise.all([
    firstValueFrom(this.scoreService.getTopScores()),
    firstValueFrom(this.scoreService.getTopStreaks()),
    firstValueFrom(this.scoreService.getTopMoneyPerRound())
  ]).then(([scores, streaks, money]) => {
    this.allLeaderboards = [
      scores.map(s => ({ username: s.username, value: `${s.score} Punkte` })),
      streaks.map(s => ({ username: s.username, value: `${s.consecutive_wins} 🔁` })),              // ← geändert
      money.map(s => ({ username: s.username, value: `${s.money_per_round}€ 💰` }))             // ← geändert
    ];
    this.setLeaderboard(0);
    this.isLoading = false;
  });
}

setLeaderboard(index: number) {
  this.currentLeaderboardIndex = index;
  this.currentLeaderboard = this.allLeaderboards[index];
}

nextLeaderboard() {
  const nextIndex = (this.currentLeaderboardIndex + 1) % this.leaderboardTitles.length;
  this.setLeaderboard(nextIndex);
}

prevLeaderboard() {
  const prevIndex = (this.currentLeaderboardIndex - 1 + this.leaderboardTitles.length) % this.leaderboardTitles.length;
  this.setLeaderboard(prevIndex);
}

  restart() {
    this.lives = 3;
    this.score = 0;
    this.money = 0;
    this.cardMultiplier = 1.0;
    this.cardMultiplierUsed = false;
    this.newRound();
  }

  logout() {
    this.authService.logout();
    this.toggleSidebar();
  }

  goToLogin() {
  this.router.navigate(['/login']);
  }

  admin() {
    if (this.authService.getRole() === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      console.warn('Nur Admins können diese Seite aufrufen.');
    }
  }

  getLivesArray(): number[] {
  return Array(this.lives).fill(0);
}

goToAchievements() {
  this.router.navigate(['/achievements']);
}

goToProfile() {
  this.router.navigate(['/profile']);
}

howToPlay() {
  this.router.navigate(['/how-to-play']);
}

goToClicker() {
  this.router.navigate(['/clicker']);
}

shop() {
  this.router.navigate(['/card-shop']);
}

unlockAchievement(name: string) {
  this.http.post<{ unlocked: boolean; name: string }>(
    'https://outside-between.onrender.com/api/unlock',
    {
      userId: this.authService.getUserId(),
      name: name,
      description: this.getAchievementDescription(name)
    }
  ).subscribe({
    next: (res) => {
      console.log('SERVER-ANTWORT:', res);
      if (res.unlocked) {
        this.showAchievementMessage(`🎉 Erfolg freigeschaltet: ${res.name}`);
        console.log('✅ Achievement neu freigeschaltet:', res.name);
        this.emojiRain("🎖️");
        this.soundService.playSound('message.aac'); // Sound beim Freischalten des Achievements abspielen
      } else {
        console.log('ℹ️ Achievement war bereits freigeschaltet:', res.name);
      }
    },
    error: (err) => console.error('Fehler beim Unlock:', err)
  });
}



checkForAchievements() {
  if (!this.hasPlayedYet) {
    this.unlockAchievement('First Game 1️⃣');
    this.hasPlayedYet = true;
  }
  if (this.score === 0 && this.lives === 0) {
    this.unlockAchievement('Pechvogel 🐓');
  }
  if (this.score >= 10) {
    this.unlockAchievement('Newbie 🐣');
  }
  if (this.score >= 50) {
    this.unlockAchievement('Glückspilz 🍄');
  }
  if (this.score >= 75) {
    this.unlockAchievement('Zahlenmeister 💯');
  }
  if (this.score >= 100) {
    this.unlockAchievement('Rund 🥸');
  }
  if (this.score >= 500) {
    this.unlockAchievement('Göttlicher Segen 👼🏻');
  }
  if (this.consecutiveWins >= 3) {
    this.unlockAchievement('Gambler 🎲');
  }
  if (this.consecutiveWins >= 5) {
    this.unlockAchievement('Arbeitswoche 🛠️');
  }
  if (this.consecutiveWins >= 10) {
    this.unlockAchievement('Strategieprofi 🧭');
  }
  if (this.consecutiveWins >= 20) {
    this.unlockAchievement('Magier 🪄');
  }
}


getAchievementDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'First Game 1️⃣': 'Dein erstes Spiel!',
    'Pechvogel 🐓': '0 Punkte erzielt',
    'Newbie 🐣': 'Du hast 10 Punkte erreicht!',
    'Glückspilz 🍄': 'Du hast 50 Punkte erreicht!',
    'Zahlenmeister 💯': 'Du hast 75 Punkte erreicht!',
    'Rund 🥸': 'Du hast 100 Punkte erreicht!',
    'Göttlicher Segen 👼🏻': 'Du hast 500 Punkte erreicht!',
    'Gambler 🎲': 'Du hast 3 mal richtig geraten ohne ein Leben zu verlieren',
    'Arbeitswoche 🛠️': 'Du hast 5 mal richtig geraten ohne ein Leben zu verlieren',
    'Strategieprofi 🧭': 'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren',
    'Magier 🪄': 'Du hast 20 mal richtig geraten ohne ein Leben zu verlieren',
    'Champion 🏆': 'Sei auf dem Leaderboard',
  };
  return descriptions[name] || 'Erfolg freigeschaltet';
}


toggleSidebar() {
  this.soundService.playSound('pop.aac'); // Sound beim Öffnen/Schließen der Sidebar abspielen
  this.sidebarOpen = !this.sidebarOpen;
  if (this.sidebarOpen){
    this.loadAch();
  }
}

loadAch() {
  const username = this.authService.getUsername();
  if (!username) return; // Sicherheit: nicht einloggen -> abbrechen

  this.profileService.getUserStats(username).subscribe({
    next: stats => {
      this.achAmount = stats.unlockedAchievements;
    },
    error: err => {
      console.error('Fehler beim Laden der Statistiken', err);
    }
  });
}

toggleDarkMode() {
  this.darkMode = !this.darkMode;
  const body = document.body;
  if (this.darkMode) {
    console.log("Dark Mode aktiviert");
    body.classList.add('dark-mode');
  } else {
    console.log("Dark Mode deaktiviert");
    body.classList.remove('dark-mode');
  }
}

showAchievementMessage(message: string) {
  this.achievementMessage = message;
  setTimeout(() => {
    this.achievementMessage = null;
  }, 3000); // 3 Sekunden sichtbar
}

emojiRain(emoji: string, count: number = 50) {
  const container = document.querySelector('.emoji-rain-container');
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const span = this.renderer.createElement('span');
    const text = this.renderer.createText(emoji);
    this.renderer.appendChild(span, text);
    this.renderer.addClass(span, 'emoji-drop');

    const startX = Math.random() * window.innerWidth;
    const delay = Math.random() * 2;

    this.renderer.setStyle(span, 'left', `${startX}px`);
    this.renderer.setStyle(span, 'animationDelay', `${delay}s`);

    this.renderer.appendChild(container, span);

    // ❗ Timeout mit passendem Delay (nicht neu deklarieren)
    setTimeout(() => {
      this.renderer.removeChild(container, span);
    }, (3 + delay) * 1000);
  }
}

getMedal(index: number): string {
  switch (index) {
    case 0: return '🥇';
    case 1: return '🥈';
    case 2: return '🥉';
    default: return `${index + 1}.`;
  }
}

// getLavaHeight(): string {
//   const base = 10;
//   const multiplierFactor = Math.min(this.currentMultiplier - 1, 4);
//   return `${base + multiplierFactor * 15}%`;
// }

// getLavaOpacity(): number {
//   return Math.min((this.currentMultiplier - 1) / 3 + 0.2, 1);
// }




}
