import { Component, ViewChildren, QueryList, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ProfileService } from '../../services/profile.service';
import { ReelComponent } from './reel/reel.component';
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-slot-maschine',
  templateUrl: './slot-maschine.component.html',
  styleUrls: ['./slot-maschine.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    SidebarComponent,
    ReelComponent
  ]
})
export class SlotMaschineComponent implements OnInit {
  reels = [0, 1, 2];
symbols = [
  { type: 'emoji', value: '🍒' },
  { type: 'emoji', value: '🍋' },
  { type: 'emoji', value: '🔔' },
  { type: 'emoji', value: '💎' },
  { type: 'image', value: 'assets/logo.png' }
];  results: string[] = [];

  message: string = '';
  isWinner: boolean = false;
  currentMoney: number = 0;
  username: string = '';
  betAmount: number = 100;

  get spinCost() {
    return this.betAmount;
  }

  get winReward(){
    return this.betAmount*10
  }

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

  this.currentMoney -= this.spinCost;
  this.moneyService.updateMoney({ username: this.username, amount: -this.spinCost }).subscribe({
    next: () => {
      this.results = ['⏳', '⏳', '⏳']; // Startanzeige

      const spinDelay = 500; // ms zwischen Rollen starten
      const newResults: string[] = [];

      this.reelComponents.forEach((reel, i) => {
        setTimeout(() => {
          // Finales Symbol bestimmen
          const index = Math.floor(Math.random() * this.symbols.length);
          newResults[i] = this.symbols[index];

          // Reel drehen mit finalem Symbol
          reel.spin(newResults[i]);

          // Wenn letzte Rolle: nach ca 1 Sekunde Ergebnis prüfen
          if (i === this.reels.length - 1) {
            setTimeout(() => {
              this.results = [...newResults];
              if (this.isJackpot()) {
                this.moneyService.updateMoney({ username: this.username, amount: this.winReward }).subscribe({
                  next: () => {
                    this.message = `🎉 Jackpot! Du hast ${this.winReward} Coins gewonnen!`;
                    this.isWinner = true;
                    this.loadMoney();
                  },
                  error: () => this.message = 'Fehler beim Gutschreiben des Gewinns',
                });
              } else {
                this.message = '🌀 Leider kein Gewinn. Versuche es nochmal!';
                this.isWinner = false;
                this.loadMoney();
              }
            }, 1100); // leicht länger als Reel spin Dauer
          }
        }, i * spinDelay);
      });
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
