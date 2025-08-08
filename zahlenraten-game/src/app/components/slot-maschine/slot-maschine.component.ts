import { Component, ViewChildren, QueryList, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ProfileService } from '../../services/profile.service';
import { ReelComponent } from './reel/reel.component';

@Component({
  selector: 'app-slot-maschine',
  templateUrl: './slot-maschine.component.html',
  styleUrls: ['./slot-maschine.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SidebarComponent,
    ReelComponent
  ]
})
export class SlotMaschineComponent implements OnInit {
  reels = [0, 1, 2];
  symbols = ['🍒', '🍋', '🔔', '💎', '🍀'];
  results: string[] = [];

  message: string = '';
  isWinner: boolean = false;
  currentMoney: number = 0;
  username: string = '';

  readonly spinCost = 10;
  readonly winReward = 50;

  @ViewChildren(ReelComponent) reelComponents!: QueryList<ReelComponent>;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private moneyService: MoneyService,
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';
    this.loadMoney();
  }

  loadMoney() {
    this.profileService.getUserStats(this.username).subscribe({
      next: (stats) => this.currentMoney = stats.money,
      error: () => this.message = 'Fehler beim Laden des Kontostands',
    });
  }

  spin() {
    this.message = '';
    this.isWinner = false;

    if (this.currentMoney < this.spinCost) {
      this.message = '❌ Nicht genug Coins!';
      return;
    }

    // Lokalen Kontostand vorübergehend abziehen
    this.currentMoney -= this.spinCost;

    // Backend updaten
    this.moneyService.updateMoney({ username: this.username, amount: -this.spinCost }).subscribe({
      next: () => {
        this.reelComponents.forEach(reel => reel.spin());

        setTimeout(() => {
          this.results = this.reels.map(() => {
            const index = Math.floor(Math.random() * this.symbols.length);
            return this.symbols[index];
          });

          // Gewinn prüfen
          if (this.isJackpot()) {
            this.moneyService.updateMoney({ username: this.username, amount: this.winReward }).subscribe({
              next: () => {
                this.message = `🎉 Jackpot! Du hast ${this.winReward} Coins gewonnen!`;
                this.isWinner = true;
                this.loadMoney(); // Kontostand neu laden
              },
              error: () => this.message = 'Fehler beim Gutschreiben des Gewinns',
            });
          } else {
            this.message = '🌀 Leider kein Gewinn. Versuche es nochmal!';
            this.loadMoney(); // auch hier Kontostand refreshen
          }
        }, 1000);
      },
      error: () => {
        this.message = '❌ Fehler beim Abziehen der Coins';
        this.loadMoney();
      }
    });
  }

  isJackpot(): boolean {
    return this.results.length === 3 &&
      this.results.every(s => s === this.results[0]);
  }
}
