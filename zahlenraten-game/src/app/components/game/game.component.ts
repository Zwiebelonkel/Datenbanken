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
import { UsersComponent } from '../users/users.component';
import { CardsService } from '../../services/cards.service';
import { SoundsService } from '../../services/sound.service';
import { firstValueFrom } from 'rxjs';
import { HostListener } from '@angular/core';
import { RainComponent } from '../rain/rain.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { PlayerBarComponent } from '../player-bar/player-bar.component';
import { StreakIndicatorComponent } from '../streak-indicator/streak-indicator.component';
import { ElementRef, AfterViewInit } from '@angular/core';
import { TutorialComponent } from '../tutorial/tutorial.component';
import { Title, Meta } from '@angular/platform-browser';


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
    TopbarComponent,
    ChatComponent,
    UsersComponent,
    RainComponent,
    PlayerBarComponent,
    StreakIndicatorComponent,
    TutorialComponent,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class GameComponent implements OnInit {
  @ViewChild('gameContainer') gameContainerRef!: ElementRef;
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
  currentLevel = 1;
  username: string = '';
  scoreMultiplier = 1; // aus DB
  monetaryMultiplier = 1; // aus DB
  profileMoney = 0;
  xpPercent: number | null = null; // optional für die Leiste

  tutorialTitle = 'Wie funktioniert das?';

  tutorialDescription = `
In „Outside Between“ testest du dein Glück und dein Gespür für Zahlen! Das Ziel des Spiels ist einfach: Du musst vorhersagen, ob eine zufällig generierte Zahl zwischen zwei anderen Zahlen liegt oder außerhalb davon.

Du startest mit 3 Leben und sammelst Punkte sowie In-Game-Währung, wenn du richtig liegst. Für jede richtige Antwort wächst dein Multiplikator, der dir mehr Punkte und Geld bringt. Verlierst du, verlierst du ein Leben. Das Spiel endet, wenn alle Leben aufgebraucht sind.

Neben dem Spiel gibt es spannende Community-Features: Speichere deine Highscores, vergleiche dich mit anderen Spielern auf der Rangliste, chatte mit Freunden und sammle besondere Karten, die dir Vorteile verschaffen.

Das Spiel ist einfach zu verstehen, macht aber durch taktische Entscheidungen und verschiedene Karteneinsätze richtig Spaß – perfekt für alle, die Casual-Games mit sozialer Komponente lieben. Viel Glück!
`;

  private baseScoreAccum = 0;
  private baseMoneyAccum = 0;

  leaderboardTitles = [
    '🏆 Top Punkte mit 🃏',
    '🔥 Längste Streak',
    '🏆 Top Punkte ohne 🃏',
  ];
  currentLeaderboardIndex = 0;
  currentLeaderboard: {
    username: string;
    value: string;
    profileImageUrl?: string;
  }[] = [];
  allLeaderboards: {
    username: string;
    value: string;
    profileImageUrl?: string;
  }[][] = [];

  touchStartX = 0;

  buttonsDisabled = false;
  currentMultiplier: number = 1.0;
  cardMultiplier: any = 1.0;
  showTest = false;

  ngAfterViewInit() {
    // Direkt beim Start die Anfangsintensität setzen
    this.setGlowIntensity(0);
  }

  shouldPlaceBelow(value: number): boolean {
    const threshold = 5;
    if (this.showTest && value === this.testNum) {
      return (
        Math.abs(this.testNum - this.num1) < threshold ||
        Math.abs(this.testNum - this.num2) < threshold
      );
    }
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
    private soundService: SoundsService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit() {
    this.setSeoTags()
    // 🔹 Immer ausführbar
    this.newRound();
    this.loadLeaderboards();

    // 🔹 Username vom AuthService holen
    this.username = this.authService.getUsername() ?? '';

    if (this.username) {
      // Nur wenn eingeloggt: Karten + Profil laden
      this.loadCards();
      this.profileService.getUserStats(this.username).subscribe({
        next: (p) => {
          this.currentLevel = p.level ?? 0;
          this.scoreMultiplier = p.scoreMultiplier ?? 1;
          this.monetaryMultiplier = p.monetaryMultiplier ?? 1;

          // ⬇️ NEU: Basisgeld + (optional) XP% übernehmen
          this.profileMoney = p.money ?? 0;
          this.xpPercent =
            typeof p.xpPercent === 'number'
              ? Math.max(0, Math.min(100, Math.floor(p.xpPercent)))
              : null;
        },
        error: (err) => console.error('❌ getUserStats fehlgeschlagen', err),
      });
    } else {
      console.log('⚠️ Gastmodus');
    }
  }

  setSeoTags(): void {
    this.titleService.setTitle('CardCore - MainPage - Outside Between');
  
    this.metaService.updateTag({ name: 'description', content: 'Outside Between / CardCore ist ein fesselndes Zahlen-Game für deinen Browser. Errate, ob die nächste Zahl zwischen oder außerhalb der vorherigen liegt!' });
  
    this.metaService.updateTag({ property: 'og:title', content: 'CardCore - MainPage - Outside Between' });
  
    this.metaService.updateTag({ property: 'og:description', content: 'Outside Between / CardCore ist ein fesselndes Zahlen-Game für deinen Browser. Errate, ob die nächste Zahl zwischen oder außerhalb der vorherigen liegt!' });
  
    this.metaService.updateTag({ name: 'keywords', content: 'Karten, CardCore, WebGame, Glück, Sozial, Hauptseite'});
  }

  avatar(url?: string | null, size = 32): string {
    if (!url) return 'assets/profile.png';
    return url.replace(
      '/upload/',
      `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`
    );
  }

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
      this.setGlowIntensity(this.consecutiveWins);
      if (this.consecutiveWins > this.highestStreak) {
        this.highestStreak = this.consecutiveWins;
      }

      // Serien-Multiplikator (sichtbar im UI)
      const seriesMultiplier =
        this.consecutiveWins >= 2 ? 1 + (this.consecutiveWins - 1) * 0.2 : 1.0;
      this.currentMultiplier = seriesMultiplier;

      // Nur gameinterne Multis (Serie * Karte) fließen in den *Basis-Score*
      const totalMultiplier = seriesMultiplier * this.cardMultiplier;

      // ---- BASISWERTE (für Server) ----
      const baseScoreRound = Math.round(1 * this.lives * totalMultiplier);
      const baseMoneyRound = this.lives;

      // Accumulatoren für den Server
      this.baseScoreAccum += baseScoreRound;
      this.baseMoneyAccum += baseMoneyRound;

      // ---- UI-WERTE (geboostet, nur Anzeige) ----
      const shownPoints = Math.round(
        baseScoreRound * (this.scoreMultiplier ?? 1)
      );
      const shownCash = Math.round(
        baseMoneyRound * (this.monetaryMultiplier ?? 1)
      );

      this.score += shownPoints;
      this.money += shownCash;

      this.flashBackground(resultElement, 'success');

      if (this.consecutiveWins % 5 === 0) {
        const intensity = Math.min(10 + this.consecutiveWins * 2, 50);
        this.rainComponent.emojiRain('🔥', intensity);
        this.soundService.playSound('fire.aac', 0.3);
      }

      setTimeout(() => this.newRound(), 500);
    } else if (this.lives > 1) {
      this.lives--;
      this.consecutiveWins = 0;
      this.setGlowIntensity(0);
      this.currentMultiplier = 1.0;
      this.flashBackground(resultElement, 'error');
      this.soundService.playSound('damage.aac', 0.1);
      setTimeout(() => this.newRound(), 500);
    } else {
      // this.gameOver = true;
      this.soundService.playSound('end.aac', 0.2);
      this.consecutiveWins = 0;
      this.currentMultiplier = 1.0;
      this.lives = 0;
      this.flashBackground(resultElement, 'error');
      setTimeout(() => this.endGame(), 500);
    }

    this.checkForAchievements();
  }

  showTestNum() {
    this.buttonsDisabled = true;
    this.showTest = true;
    setTimeout(() => {
      this.showTest = false;
      this.buttonsDisabled = false;
    }, 500);
  }

  flashBackground(element: HTMLElement, type: 'success' | 'error') {
    if (!element) return;

    // richtige Variable ziehen
    const varName = type === 'success' ? '--flash-success' : '--flash-error';
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();

    element.style.transition = 'background-color 0.3s ease';
    element.style.backgroundColor = color;

    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 500);
  }

  private endHandled = false; // ⬅️ Feld in der Klasse ergänzen

  endGame() {
    // Einmal-Guard (unabhängig von gameOver)
    if (this.endHandled) return;
    this.setGlowIntensity(0);

    this.endHandled = true;

    const username = this.authService.getUsername();
    if (!username) {
      console.warn('Kein Benutzer eingeloggt – Score wird nicht gespeichert.');
      this.gameStarted = false;
      this.gameOver = true;
      return;
    }

    this.gameStarted = false;
    this.gameOver = true;

    // Snapshot sichern
    const baseToSend = this.baseMoneyAccum;

    if (baseToSend > 0) {
      this.moneyService
        .updateMoney({ username, amount: baseToSend })
        .subscribe({
          next: (res: any) => {
            // ✅ Server-Wahrheit übernehmen, falls vorhanden
            if (res && typeof res.money === 'number') {
              this.profileMoney = res.money;
            } else {
              // Fallback (falls Backend noch kein money zurückgibt)
              const credited = Math.round(
                baseToSend * (this.monetaryMultiplier ?? 1)
              );
              this.profileMoney += credited;
            }
            // Rundengewinn-Delta nullen, damit die Anzeige passt
            this.money = 0;
            // Runde-spezifische Accus optional zurücksetzen
            // this.baseMoneyAccum = 0;
            // this.baseScoreAccum = 0;
          },
          error: (err) => console.error('[endGame] updateMoney ERROR:', err),
        });
    } else {
    }

    // ⭐ XP lokal
    const xpFromLocal = Math.floor(this.baseScoreAccum / 5);
    if (xpFromLocal > 0) this.addXp(xpFromLocal);
  }

  // GameComponent
  submitScore() {
    this.soundService.playSound('hardPop.aac', 0.6);

    const username = this.authService.getUsername();
    if (!username) {
      console.warn(
        '⚠️ Kein Benutzer eingeloggt – Score wird nicht gespeichert.'
      );
      return;
    }

    // Snapshots der Accumulatoren sichern (werden nach Submit genullt)
    const baseScoreToSend = this.baseScoreAccum;
    const baseMoneyPRToSend = this.baseMoneyAccum;
    const wins = this.highestStreak;

    this.scoreService
      .submitScore({
        username,
        baseScore: baseScoreToSend,
        baseMoneyPerRound: baseMoneyPRToSend,
        consecutive_wins: wins,
      })
      .subscribe({
        next: (res) => {
          const finalScore = res?.score ?? 0;

          // Accus erst NACH erfolgreichem Submit zurücksetzen
          this.baseScoreAccum = 0;
          this.baseMoneyAccum = 0;

          // Highscore-Check
          this.scoreService.isHighscore(finalScore).subscribe({
            next: (hs) => {
              this.isHighscore = hs.isHighscore;
              if (hs.isHighscore) this.unlockAchievement('Champion 🏆');
            },
            error: (err) => console.error('❌ Highscore-Check Fehler:', err),
          });

          this.loadLeaderboards();
          this.restart();
        },
        error: (err) => {
          console.error('❌ Fehler beim Score-Submit:', err);
        },
      });
  }

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
          profileImageUrl: s.profileImageUrl ?? 'assets/profile.png',
        })),
        streaks.map((s) => ({
          username: s.username,
          value: `${s.consecutive_wins} 🔁`,
          profileImageUrl: s.profileImageUrl ?? 'assets/profile.png',
        })), // ← geändert
        money.map((s) => ({
          username: s.username,
          value: `${s.money_per_round}€ 💰`,
          profileImageUrl: s.profileImageUrl ?? 'assets/profile.png',
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

  get previewScore(): number {
    return Math.round(this.baseScoreAccum * (this.scoreMultiplier ?? 1));
  }
  get previewMoney(): number {
    return Math.round(this.baseMoneyAccum * (this.monetaryMultiplier ?? 1));
  }

  prevLeaderboard() {
    const prevIndex =
      (this.currentLeaderboardIndex - 1 + this.leaderboardTitles.length) %
      this.leaderboardTitles.length;
    this.setLeaderboard(prevIndex);
  }

  restart() {
    this.endHandled = false;
    this.lives = 3;
    this.score = 0;
    this.money = 0;
    this.baseMoneyAccum = 0;
    this.baseScoreAccum = 0;
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
    if (!this.authService.isLoggedIn()) return;
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
          if (res.unlocked) {
            this.showAchievementMessage(
              `🎉 Erfolg freigeschaltet: ${res.name}`
            );
            this.rainComponent.emojiRain('🎖️');
            this.addXp(20);
            this.soundService.playSound('message.aac'); // Sound beim Freischalten des Achievements abspielen
          } else {
          }
        },
        error: (err) => console.error('Fehler beim Unlock:', err),
      });
  }

  levelUp(newLevel: number) {
    this.achievementMessage = `🎉 Level up! Neues Level: ${newLevel}`;
    setTimeout(() => {
      this.achievementMessage = null;
    }, 3000); // Toast nach 3 Sek. ausblenden
  }

  addXp(amount: number) {
    const user = this.authService.getUsername();
    if (!user) return;

    const prevLevel = this.currentLevel;

    this.profileService.addXp(user, amount).subscribe({
      next: (res) => {
        if (res.level > prevLevel) {
          this.levelUp(res.level);
        }
        this.currentLevel = res.level;
      },
      error: (err) => console.error('❌ XP-Update fehlgeschlagen', err),
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
      body.classList.add('dark-mode');
    } else {
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

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].screenX;
    const deltaX = this.touchStartX - touchEndX;

    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        this.nextLeaderboard();
      } else {
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

    const heartsToAdd = Math.abs(this.selectedHeartCard.multiplier);
    this.lives += heartsToAdd;
    this.heartCardUsed = true;
    this.cardUsed = true;
    this.soundService.playSound('hardPop.aac', 0.6);

    this.cardsService.useCard(this.selectedHeartCard.multiplier).subscribe({
      next: () => {
        this.selectedHeartCard.amount--;
        if (this.selectedHeartCard.amount <= 0) {
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

  onAvatarError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/profile.png';
  }

  trackByUsername(i: number, item: any) {
    return item?.username ?? i;
  }

  handleStreakCompleted() {
    if (!this.gameStarted) return;
    this.lives += 1;
  }

  getHeartSpeed(): string {
    const livesLeft = this.lives;
    if (livesLeft >= 4) return '1.5s'; // entspannt
    if (livesLeft === 3) return '1.2s';
    if (livesLeft === 2) return '0.9s';
    if (livesLeft === 1) return '0.6s'; // Panik
    return '1.5s';
  }

  setGlowIntensity(consecutiveWins: number) {
    const maxWins = 15;
    const intensity = Math.min(consecutiveWins / maxWins, 1).toFixed(2);
    // const intensity = '0.5';
    const intensityNum = parseFloat(intensity);

    if (intensityNum > 0) {
      this.gameContainerRef.nativeElement.classList.add('glow');
      this.gameContainerRef.nativeElement.classList.remove('no-glow');
    } else {
      this.gameContainerRef.nativeElement.classList.remove('glow');
      this.gameContainerRef.nativeElement.classList.add('no-glow');
    }

    if (this.gameContainerRef?.nativeElement) {
      this.gameContainerRef.nativeElement.style.setProperty(
        '--intensity',
        intensity
      );
      console.log('Intensität: ' + intensity);
    }
  }
}
