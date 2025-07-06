import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../services/score.service';
import { CommonModule } from '@angular/common'; // für *ngIf, *ngFor, date
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { Router } from '@angular/router'; // Import Router
import { FormsModule } from '@angular/forms';   // für ngModel
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  imports: [CommonModule, FormsModule], // <- Wichtig! Hier die Module einbinden
})
export class GameComponent implements OnInit {
  num1 = 0;
  num2 = 0;
  testNum = 0;
  score = 0;
  lives = 3;
  hasPlayedYet: boolean = false;
  gameOver = false;
  isHighscore = false;
  topScores: any[] = [];
  constructor(private scoreService: ScoreService, public authService: AuthService, private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.newRound();
    this.loadHighscores();
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

    // Temporarily show the testNum
    this.showTestNum();

    if (answer === correct) {
      this.score += 1 * this.lives;
      this.flashBackground(resultElement, 'rgb(177, 255, 168)');
      setTimeout(() => this.newRound(), 1000); // Wait 1 second before starting a new round
    } else if (this.lives > 1) {
      this.lives--;
      this.flashBackground(resultElement, 'rgb(255, 168, 168)');
      setTimeout(() => this.newRound(), 1000); // Wait 1 second before ending the game
    } else {
      this.lives = 0;
      this.flashBackground(resultElement, 'rgb(255, 168, 168)');
      setTimeout(() => this.endGame(), 1000); // Wait 1 second before ending the game
    }
    this.checkForAchievements()
  }

  showTestNum() {
    const testNumElement = document.getElementById('finalNumber') as HTMLElement;
    if (testNumElement) {
      testNumElement.style.visibility = 'visible';
      setTimeout(() => {
        testNumElement.style.visibility = 'hidden';
      }, 1000); // Hide after 1 second
    }
  }

  flashBackground(element: HTMLElement, color: string) {
    if (element) {
      console.log("Flash: "+color + " on " + element.className);
      element.style.backgroundColor = color;
            setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000); // Reset background color after 0.5 seconds
    }
  }

  endGame() {
    this.gameOver = true;
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
    this.scoreService.getTopScores().subscribe(scores => {
      this.topScores = scores;
    });
  }

  restart() {
    this.lives = 3;
    this.score = 0;
    this.newRound();
  }

  logout() {
    this.authService.logout();
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

unlockAchievement(name: string) {
  this.http.post('http://localhost:3000/api/unlock', {
    userId: this.authService.getUserId(),
    name: name,
    description: this.getAchievementDescription(name)  // 👈 genau hier!
  }, { responseType: 'text' }) // 👈 wichtig für Fehlervermeidung
  .subscribe({
    next: () => console.log('Achievement unlocked:', name),
    error: (err) => console.error('Fehler beim Unlock:', err)
  });
}




checkForAchievements() {
  if (this.score >= 10) {
    console.log('Achievement unlocked: Glückspilz');
    this.unlockAchievement('Glückspilz');
  }
  if (!this.hasPlayedYet) {
    console.log('Achievement unlocked: First Game');
    this.unlockAchievement('First Game');
    this.hasPlayedYet = true;
  }
}

getAchievementDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'First Game': 'Dein erstes Spiel!',
    'Glückspilz': 'Du hast 100 Punkte erreicht!'
    // Weitere Achievements hier hinzufügen
  };
  return descriptions[name] || 'Erfolg freigeschaltet';
}


}
