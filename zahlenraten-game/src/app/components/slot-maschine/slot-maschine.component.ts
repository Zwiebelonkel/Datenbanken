import { Component, ViewChildren, QueryList, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ProfileService } from '../../services/profile.service';
import { ChatService } from '../../services/chat.service';
import { ReelComponent } from './reel/reel.component';
import { FormsModule } from '@angular/forms';
import { Renderer2 } from '@angular/core';

type SymbolData = { type: 'emoji' | 'image'; value: string };

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
    ReelComponent,
  ],
})
export class SlotMaschineComponent implements OnInit {
  reels = [0, 1, 2];
  symbols: SymbolData[] = [
    { type: 'emoji', value: '🍒' },
    { type: 'emoji', value: '🍋' },
    { type: 'emoji', value: '🔔' },
    { type: 'emoji', value: '💎' },
    { type: 'image', value: 'assets/logo.png' },
  ];

  results: SymbolData[] = [];

  message: string = '';
  isWinner: boolean = false;
  currentMoney: number = 0;
  username: string = '';
  betAmount: number = 100;
  isSpinning: boolean = false;
  isLoading: boolean = true;

  get spinCost() {
    return this.betAmount;
  }

  get winReward() {
    return this.betAmount * 10;
  }

  get resultString(): string {
    return this.results.map((r) => r.value).join(' | ');
  }

  @ViewChildren(ReelComponent) reelComponents!: QueryList<ReelComponent>;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private moneyService: MoneyService,
    private renderer: Renderer2,
    private chatService: ChatService,
    private achievementService: AchievementService,
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';
    this.loadMoney();
  }

  loadMoney() {
    this.isLoading = true;
    this.profileService.getUserStats(this.username).subscribe({
      next: (stats) => (this.currentMoney = stats.money),
      error: () => (this.message = 'Fehler beim Laden des Kontostands'),
    });
    this.isLoading = false;
  }
  spin() {
    this.isSpinning = true;
 //   this.unlockAch('Las Vegas', this.username)
    this.message = '';
    this.isWinner = false;

    if (this.currentMoney < this.spinCost) {
      this.message = '❌ Nicht genug Coins!';
      return;
    }

    this.currentMoney -= this.spinCost;
    this.moneyService
      .updateMoney({ username: this.username, amount: -this.spinCost })
      .subscribe({
        next: () => {
          this.results = [
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
          ];

          const spinDelay = 500; // ms zwischen Rollen starten
          const newResults: SymbolData[] = [];

          this.reelComponents.forEach((reel, i) => {
            setTimeout(() => {
              // Finales Symbol bestimmen
              const index = Math.floor(Math.random() * this.symbols.length);
              newResults[i] = this.symbols[index];
              reel.spin(newResults[i]); // Muss Objekt übergeben

              // Wenn letzte Rolle: nach ca 1 Sekunde Ergebnis prüfen
              if (i === this.reels.length - 1) {
                setTimeout(() => {
                  this.results = [...newResults];
                  if (this.isJackpot()) {
                    this.emojiRain('💸');
                    this.unlockAch('Lone Wolf', this.username)
                    this.moneyService
                      .updateMoney({
                        username: this.username,
                        amount: this.winReward,
                      })
                      .subscribe({
                        next: () => {
                          this.message = `🎉 Jackpot! Du hast ${this.winReward} Coins gewonnen!`;
                          this.isWinner = true;
                          this.loadMoney();

                          // Nachricht an den Chat senden
                          this.chatService
                            .sendMessage({
                              username: 'Info',
                              message: `${this.username} hat gerade einen Jackpot geknackt und ${this.winReward} gewonnen! 💸`,
                            })
                            .subscribe({
                              next: () => {
                                console.log('Nachricht erfolgreich gesendet!');
                              },
                              error: (err) => {
                                console.error(
                                  'Fehler beim Senden der Nachricht:',
                                  err
                                );
                              },
                            });
                        },
                        error: () =>
                          (this.message =
                            'Fehler beim Gutschreiben des Gewinns'),
                      });
                  } else {
                    this.message =
                      '🌀 Leider kein Gewinn. Versuche es nochmal!';
                    this.isWinner = false;
                    this.loadMoney();
                  }
                  this.isSpinning = false;
                }, 1100); // leicht länger als Reel spin Dauer
              }
            }, i * spinDelay);
          });
        },
        error: () => {
          this.message = '❌ Fehler beim Abziehen der Coins';
          this.isSpinning = false;
          this.loadMoney();
        },
      });
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

  unlockAch(name: string, user:string){
    this.achievementService.unlockAchievement(user, name)
  }

  isJackpot(): boolean {
    return (
      this.results.length === 3 &&
      this.results.every((s) => s === this.results[0])
    );
  }
}
