import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../services/score.service';
import { CommonModule } from '@angular/common'; // für *ngIf, *ngFor, date
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { Router } from '@angular/router'; // Import Router
import { FormsModule } from '@angular/forms';   // für ngModel

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
  username = '';
  gameOver = false;
  isHighscore = false;
  topScores: any[] = [];
  constructor(private scoreService: ScoreService, private authService: AuthService, private router: Router) {}

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
      this.score++;
      this.flashBackground(resultElement, 'green');
      setTimeout(() => this.newRound(), 1000); // Wait 1 second before starting a new round
    } else {
      this.flashBackground(resultElement, 'red');
      setTimeout(() => this.endGame(), 1000); // Wait 1 second before ending the game
    }
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
      console.log("Flash: "+color + "on " + element.className);
      element.style.backgroundColor = color + ' !important';
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
    this.scoreService.submitScore({ username: this.username, score: this.score }).subscribe(() => {
      this.loadHighscores();
      this.restart()
    });
  }

  loadHighscores() {
    this.scoreService.getTopScores().subscribe(scores => {
      this.topScores = scores;
    });
  }

  restart() {
    this.score = 0;
    this.newRound();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
}
