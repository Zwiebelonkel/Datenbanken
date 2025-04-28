import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../services/score.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
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

  constructor(private scoreService: ScoreService) {}

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
    if (answer === correct) {
      this.score++;
      this.newRound();
    } else {
      this.endGame();
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
}
