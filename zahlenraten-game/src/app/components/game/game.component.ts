import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { ScoreService } from '../../services/score.service';
import { MoneyService } from '../../services/money.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DarkModeService } from '../../services/dark.service';
import { ProfileService } from '../../services/profile.service';
import { LoaderComponent } from '../loader/loader.component'; // Import LoaderComponent
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatComponent } from '../chat/chat.component';
import { CardsService } from '../../services/cards.service';
import { SoundsService } from '../../services/sound.service';
import { firstValueFrom } from 'rxjs';
import { HostListener } from '@angular/core';
import { RainComponent } from '../rain/rain.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  standalone: true,
  styleUrls: ['./game.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    SidebarComponent,
    ChatComponent,
    RainComponent
  ],
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent implements OnInit {
  @ViewChild('rain') rainComponent!: RainComponent;
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
  selectedHeartCard: any = null;
  heartCardUsed: boolean = false;
  cardUsed: boolean = false;
  activeBoardIndex: number | null = null;
  activeRowIndex: number | null = null;
  selectedUsername: string | null = null;

  // justAppeared = false; // Für Lava-Animation
  leaderboardTitles = [
    '🏆 Top Punkte mit 🃏',
    '🔥 Längste Streak',
    '🏆 Top Punkte ohne 🃏',
  ];
  currentLeaderboardIndex = 0;
currentLeaderboard: { username: string; value: string; profileImageUrl?: string }[] = [];
allLeaderboards: { username: string; value: string; profileImageUrl?: string }[][] = [];

  touchStartX = 0;

  buttonsDisabled = false;
  currentMultiplier: number = 1.0;
  cardMultiplier: any = 1.0;
  /**
   * Steuert, ob die Testzahl auf dem Zahlenstrahl angezeigt wird.
   * Wird beim Raten auf true gesetzt und nach kurzer Zeit wieder
   * auf false zurückgesetzt. Dies verhindert, dass die Testzahl
   * vorzeitig im DOM existiert und so via Entwicklertools sichtbar wird.
   */
  showTest = false;

  /**
   * Bestimmt, ob ein Marker unterhalb der Leiste platziert werden soll.
   * Um Überlappungen zu vermeiden, verschieben wir einen Marker nach
   * unten, wenn die Werte sehr nah beieinander liegen. Es wird
   * vorzugsweise der größere der beiden Zufallszahlen verschoben oder
   * die Testzahl, wenn sie sich nahe an einer der Zufallszahlen
   * befindet.
   *
   * @param value Der Zahlenwert des zu prüfenden Markers
   */
  shouldPlaceBelow(value: number): boolean {
    const threshold = 5; // Ab welcher Differenz Werte als überlappend gelten
    // Wenn Testzahl sichtbar ist und nahe an einer der Zufallszahlen liegt
    if (this.showTest && value === this.testNum) {
      return (
        Math.abs(this.testNum - this.num1) < threshold ||
        Math.abs(this.testNum - this.num2) < threshold
      );
    }
    // Prüfe nahe beieinander liegende Zufallszahlen und verschiebe den größeren Wert
    if (value === this.num2 && Math.abs(this.num1 - this.num2) < threshold) {
      return true;
    }
    return false;
  }

  topScores: any[] = [];
  constructor(
    private scoreService: ScoreService,
    public authService: AuthService,
    private router: Router,
    private http: HttpClient,
    public darkModeService: DarkModeService,
    private moneyService: MoneyService,
    private profileService: ProfileService,
    private cardsService: CardsService,
    private soundService: SoundsService
  ) {}

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
      },
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

  /**
   * Berechnet die Position einer Zahl auf einem Zahlenstrahl von 0 bis 100.
   * Der Rückgabewert ist ein Prozentwert für das CSS‑left‑Attribut. Werte
   * außerhalb des Bereichs [0,100] werden entsprechend an die Grenzen
   * angeglichen. Durch diese Methode können num1 und num2 relativ zueinander
   * positioniert werden, sodass kleine Werte links und große Werte rechts
   * erscheinen.
   * @param num Der zu positionierende Zahlenwert
   */
  getOffset(num: number): number {
    const clamped = Math.max(0, Math.min(num, 100));
    return clamped;
  }

  guess(answer: 'inside' | 'outside') {
    this.gameStarted = true;
    this.soundService.playSound('softClick.aac');
    const correct = this.isBetween() ? 'inside' : 'outside';
    const resultElement = document.querySelector(
      '.game-container'
    ) as HTMLElement;

    this.showTestNum();

    if (answer === correct) {
      this.consecutiveWins++;
      if (this.consecutiveWins > this.highestStreak) {
        this.highestStreak = this.consecutiveWins;
      }

      // Serien-Multiplikator bleibt sichtbar
      const seriesMultiplier =
        this.consecutiveWins >= 2 ? 1 + (this.consecutiveWins - 1) * 0.2 : 1.0;
      this.currentMultiplier = seriesMultiplier;

      // Gesamt-Multiplikator nur intern für Punkteberechnung
      const totalMultiplier = seriesMultiplier * this.cardMultiplier;

      const points = Math.round(1 * this.lives * totalMultiplier);

      this.score += points;
      this.money += this.lives;

      this.flashBackground(resultElement, 'rgb(177, 255, 168)');

      if (this.consecutiveWins % 5 === 0) {
        const intensity = Math.min(10 + this.consecutiveWins * 2, 50);
        this.rainComponent.emojiRain('🔥', intensity);
        this.soundService.playSound('fire.aac', 0.3); // Sound für Emoji-Regen abspielen
      }

      setTimeout(() => this.newRound(), 500);
    } else if (this.lives > 1) {
      this.lives--;
      this.consecutiveWins = 0;
      this.currentMultiplier = 1.0;
      this.flashBackground(resultElement, 'rgb(255, 168, 168)');
      this.soundService.playSound('damage.aac', 0.1); // Sound für falsche Antwort abspielen
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

  /**
   * Zeigt die Testzahl kurzzeitig an. Statt über CSS visibility zu arbeiten,
   * wird eine boolsche Variable verwendet, die ein *ngIf in der Vorlage
   * steuert. So wird der DOM-Knoten nur erzeugt, wenn die Testzahl
   * tatsächlich angezeigt werden soll. Nach Ablauf der Anzeigezeit wird
   * die Variable wieder zurückgesetzt und die Knöpfe reaktiviert.
   */
  showTestNum() {
    this.buttonsDisabled = true;
    this.showTest = true;
    // Nach 0.5 Sekunden Testzahl ausblenden und Buttons reaktivieren
    setTimeout(() => {
      this.showTest = false;
      this.buttonsDisabled = false;
    }, 500);
  }

  flashBackground(element: HTMLElement, color: string) {
    if (element) {
      console.log('Flash: ' + color + ' on ' + element.className);
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
    this.scoreService
      .updateTotalScore({ username, score: this.score })
      .subscribe({
        next: () => console.log('✅ total_score aktualisiert'),
        error: (err) => console.error('❌ Fehler beim total_score:', err),
      });

    // 💰 money aktualisieren
    this.moneyService.updateMoney({ username, amount: this.money }).subscribe({
      next: () => console.log('💰 Geld aktualisiert'),
      error: (err) => console.error('❌ Fehler beim Geld-Update:', err),
    });

    // ✅ Highscore prüfen
    this.scoreService.isHighscore(this.score).subscribe((res) => {
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

    this.scoreService
      .submitScore({
        username,
        score: this.score,
        consecutive_wins: this.highestStreak,
        money_per_round: this.money,
      })
      .subscribe(() => {
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
      },
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
      firstValueFrom(this.scoreService.getTopMoneyPerRound()),
    ]).then(([scores, streaks, money]) => {
      this.allLeaderboards = [
        scores.map((s) => ({
          username: s.username,
          value: `${s.score} Punkte`,
          profileImageUrl: s.profileImageUrl ?? 'assets/default-avatar.png'
        })),
        streaks.map((s) => ({
          username: s.username,
          value: `${s.consecutive_wins} 🔁`,
          profileImageUrl: s.profileImageUrl ?? 'assets/default-avatar.png'
        })), // ← geändert
        money.map((s) => ({
          username: s.username,
          value: `${s.money_per_round}€ 💰`,
          profileImageUrl: s.profileImageUrl ?? 'assets/default-avatar.png'
        })), // ← geändert
      ];
      this.setLeaderboard(0);
      this.isLoading = false;
    });
  }

  setLeaderboard(index: number) {
    this.currentLeaderboard = this.allLeaderboards[index] || [];
  }

  nextLeaderboard() {
    const nextIndex =
      (this.currentLeaderboardIndex + 1) % this.leaderboardTitles.length;
    this.setLeaderboard(nextIndex);
  }

  prevLeaderboard() {
    const prevIndex =
      (this.currentLeaderboardIndex - 1 + this.leaderboardTitles.length) %
      this.leaderboardTitles.length;
    this.setLeaderboard(prevIndex);
  }

  restart() {
    this.lives = 3;
    this.score = 0;
    this.money = 0;
    this.cardMultiplier = 1.0;
    this.cardMultiplierUsed = false;
    this.heartCardUsed = false;
    this.cardUsed = false;
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

  goToProfile(username?: string | null) {
    const u = username || this.selectedUsername;
    if (u) {
      this.router.navigate(['/profile', u]);
    } else {
      this.router.navigate(['/profile']);
    }
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
    this.http
      .post<{ unlocked: boolean; name: string }>(
        'https://outside-between.onrender.com/api/unlock',
        {
          userId: this.authService.getUserId(),
          name: name,
          description: this.getAchievementDescription(name),
        }
      )
      .subscribe({
        next: (res) => {
          console.log('SERVER-ANTWORT:', res);
          if (res.unlocked) {
            this.showAchievementMessage(
              `🎉 Erfolg freigeschaltet: ${res.name}`
            );
            console.log('✅ Achievement neu freigeschaltet:', res.name);
            this.rainComponent.emojiRain('🎖️');
            this.soundService.playSound('message.aac'); // Sound beim Freischalten des Achievements abspielen
          } else {
            console.log('ℹ️ Achievement war bereits freigeschaltet:', res.name);
          }
        },
        error: (err) => console.error('Fehler beim Unlock:', err),
      });
  }

  useSelectedCards() {
    if (this.selectedCard && this.selectedCard.multiplier !== -1) {
      this.useSelectedCard(); // bestehende Methode für Multikarte
    }
    if (
      (this.selectedHeartCard && this.selectedHeartCard.multiplier === -1) ||
      -2 ||
      -3
    ) {
      this.useHeartCard(); // bestehende Methode für ❤️
    }
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
      'Arbeitswoche 🛠️':
        'Du hast 5 mal richtig geraten ohne ein Leben zu verlieren',
      'Strategieprofi 🧭':
        'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren',
      'Magier 🪄': 'Du hast 20 mal richtig geraten ohne ein Leben zu verlieren',
      'Champion 🏆': 'Sei auf dem Leaderboard',
    };
    return descriptions[name] || 'Erfolg freigeschaltet';
  }

  toggleSidebar() {
    this.soundService.playSound('pop.aac'); // Sound beim Öffnen/Schließen der Sidebar abspielen
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarOpen) {
      this.loadAch();
    }
  }

  loadAch() {
    const username = this.authService.getUsername();
    if (!username) return; // Sicherheit: nicht einloggen -> abbrechen

    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.achAmount = stats.unlockedAchievements;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Statistiken', err);
      },
    });
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    const body = document.body;
    if (this.darkMode) {
      console.log('Dark Mode aktiviert');
      body.classList.add('dark-mode');
    } else {
      console.log('Dark Mode deaktiviert');
      body.classList.remove('dark-mode');
    }
  }

  showAchievementMessage(message: string) {
    this.achievementMessage = message;
    setTimeout(() => {
      this.achievementMessage = null;
    }, 3000); // 3 Sekunden sichtbar
  }

  getMedal(index: number): string {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `${index + 1}.`;
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

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].screenX;
    const deltaX = this.touchStartX - touchEndX;

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Nach links gewischt → nächstes Leaderboard
        this.nextLeaderboard();
      } else {
        // Nach rechts gewischt → vorheriges Leaderboard
        this.prevLeaderboard();
      }
    }
  }

  hasHeartCard(): boolean {
    return this.cards.some((c) => c.multiplier === -1 && c.amount > 0);
  }

  // Negative multipliers repräsentieren Herz-Karten. Alle Werte < 0 gehören dazu.
  get heartCards() {
    return this.cards.filter((c) => c.multiplier < 0);
  }

  // Multiplikator-Karten sind alle Karten mit multipliers >= 0.
  get multiplierCards() {
    return this.cards.filter((c) => c.multiplier >= 0);
  }

  useSelectedCard() {
    if (!this.selectedCard) return;

    const mult = this.selectedCard.multiplier;
    this.cardMultiplierUsed = true;
    this.cardUsed = true;

    this.cardMultiplier = mult;

    this.soundService.playSound('hardPop.aac', 0.6);

    this.cardsService.useCard(mult).subscribe({
      next: () => {
        this.selectedCard.amount--;
        if (this.selectedCard.amount <= 0) {
          this.cards = this.cards.filter((c) => c.multiplier !== mult);
          this.selectedCard = null;
        }
      },
      error: (err) => {
        console.error('Fehler beim Verwenden der Karte:', err);
      },
    });
  }

  useHeartCard() {
    if (!this.selectedHeartCard) return;

    // Die Anzahl der hinzuzufügenden Leben entspricht dem absoluten Wert des Multipliers
    const heartsToAdd = Math.abs(this.selectedHeartCard.multiplier);
    this.lives += heartsToAdd;
    this.heartCardUsed = true;
    this.cardUsed = true;
    this.soundService.playSound('hardPop.aac', 0.6);

    // Ausgewählte Herzkarte beim Backend einlösen
    this.cardsService.useCard(this.selectedHeartCard.multiplier).subscribe({
      next: () => {
        this.selectedHeartCard.amount--;
        if (this.selectedHeartCard.amount <= 0) {
          // Karte aus dem Array entfernen
          this.cards = this.cards.filter(
            (c) => c.multiplier !== this.selectedHeartCard.multiplier
          );
          this.selectedHeartCard = null;
        }
      },
      error: (err) => {
        console.error('Fehler beim Verwenden der Herzkarte:', err);
      },
    });
  }

  getHeartSpeed(): string {
    const livesLeft = this.lives;
    if (livesLeft >= 4) return '1.5s'; // entspannt
    if (livesLeft === 3) return '1.2s';
    if (livesLeft === 2) return '0.9s';
    if (livesLeft === 1) return '0.6s'; // Panik
    return '1.5s';
  }

avatar(url?: string | null, size = 32): string {
  if (!url) return 'assets/profile.png';
  return url.replace(
    '/upload/',
    `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`
  );
}

onAvatarError(ev: Event) {
  (ev.target as HTMLImageElement).src = 'assets/profile.png';
}
  
trackByUsername(i: number, item: any) { return item?.username ?? i; }
}
