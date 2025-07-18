import { Component, OnInit, ViewEncapsulation  } from '@angular/core';
import { ScoreService } from '../../services/score.service';
import { MoneyService } from '../../services/money.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DarkModeService } from '../../services/dark.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None
})
export class GameComponent implements OnInit {
  num1 = 0;
  num2 = 0;
  testNum = 0;
  score = 0;
  money = 0;
  lives = 3;
  hasPlayedYet: boolean = false;
  gameOver = false;
  isHighscore = false;
  consecutiveWins = 0;
  darkMode = false;
  isLoading = true;
  sidebarOpen = false;
  achievementMessage: string | null = null;


  topScores: any[] = [];
  constructor(private scoreService: ScoreService, public authService: AuthService, private router: Router, private http: HttpClient, public darkModeService: DarkModeService, private moneyService: MoneyService) {}

  ngOnInit() {
    this.newRound();
    this.loadHighscores();
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
    const correct = this.isBetween() ? 'inside' : 'outside';
    const resultElement = document.querySelector('.game-container') as HTMLElement;

    this.showTestNum();

    if (answer === correct) {
      this.score += 1 * this.lives;
      this.money += 1 * this.lives;
      this.flashBackground(resultElement, 'rgb(177, 255, 168)');
      this.consecutiveWins++;

      setTimeout(() => this.newRound(), 500);
    } else if (this.lives > 1) {
      this.lives--;
      this.flashBackground(resultElement, 'rgb(255, 168, 168)');
      setTimeout(() => this.newRound(), 500);
    } else {
      this.consecutiveWins = 0;
      this.lives = 0;
      this.flashBackground(resultElement, 'rgb(255, 168, 168)');
      setTimeout(() => this.endGame(), 500);
    }
    this.checkForAchievements()
  }

  showTestNum() {
    const testNumElement = document.getElementById('finalNumber') as HTMLElement;
    if (testNumElement) {
      testNumElement.style.visibility = 'visible';
      setTimeout(() => {
        testNumElement.style.visibility = 'hidden';
      }, 500); // Hide
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
  const username = this.authService.getUsername();
  if (!username) {
    console.warn('Kein Benutzer eingeloggt – Score wird nicht gespeichert.');
    return;
  }

    this.scoreService.submitScore({ username, score: this.score }).subscribe(() => {

    this.loadHighscores();
    this.restart();
  });
}


loadHighscores() {
  this.isLoading = true;
  this.scoreService.getTopScores().subscribe(
    (scores) => {
      this.topScores = scores;
      this.isLoading = false;
    },
    (error) => {
      console.error('Fehler beim Laden der Highscores', error);
      this.isLoading = false;
    }
  );
}

  restart() {
    this.lives = 3;
    this.score = 0;
    this.money = 0;
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

unlockAchievement(name: string) {
  this.http.post('https://outside-between.onrender.com/api/unlock', {
    userId: this.authService.getUserId(),
    name: name,
    description: this.getAchievementDescription(name)
  }, { responseType: 'text' })
  .subscribe({
    next: () => console.log('Achievement unlocked:', name),
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
    'Gambler 🎲': 'Du hast 3 mal richtig geraten ohne ein Leben zu verlieren',
    'Arbeitswoche 🛠️': 'Du hast 5 mal richtig geraten ohne ein Leben zu verlieren',
    'Strategieprofi 🧭': 'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren',
    'Magier 🪄': 'Du hast 20 mal richtig geraten ohne ein Leben zu verlieren'
  };
  return descriptions[name] || 'Erfolg freigeschaltet';
}


toggleSidebar() {
  this.sidebarOpen = !this.sidebarOpen;
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
}
