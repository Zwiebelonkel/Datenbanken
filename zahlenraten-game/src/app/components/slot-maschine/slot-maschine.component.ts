import {
  Component,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AchievementService } from '../../services/achievement.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ProfileService } from '../../services/profile.service';
import { ChatService } from '../../services/chat.service';
import { ReelComponent } from './reel/reel.component';
import { FormsModule } from '@angular/forms';
import { RainComponent } from '../rain/rain.component';
import { TutorialComponent } from '../tutorial/tutorial.component';

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
    RainComponent,
    SidebarComponent,
    TopbarComponent,
    ReelComponent,
    TutorialComponent,
  ],
})
export class SlotMaschineComponent implements OnInit, AfterViewInit {
  @ViewChild('rain') rainComponent!: RainComponent;
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
  gotLasVegas: boolean = false;
  achievementMessage: string | null = null;
  currentLevel = 0;
  tutorialTitle = 'Wie funktioniert das?';
  tutorialDescription =
    'Hier kannst du dein Glück herrausfordern und eine beliebige Menge an Geld setzten. Falls alle Symbole übereinstimmen, gewinnst du das 15-fache deines Einsatzes!';

  get spinCost() {
    return this.betAmount;
  }

  get winReward() {
    return this.betAmount * 15;
  }

  get resultString(): string {
    return this.results.map((r) => r.value).join(' | ');
  }

  @ViewChildren(ReelComponent) reelComponents!: QueryList<ReelComponent>;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private moneyService: MoneyService,
    private chatService: ChatService,
    private achievementService: AchievementService
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';
    this.loadMoney();
    this.profileService.getUserStats(this.username).subscribe((p) => {
      this.currentLevel = p.level ?? 0;
    });
  }

  ngAfterViewInit() {}

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
    if (!this.gotLasVegas) {
      this.unlockAch('Las Vegas 🎰');
      this.gotLasVegas = true;
    }
    this.message = '';
    this.isWinner = false;

    if (this.currentMoney < this.spinCost) {
      this.message = '❌ Nicht genug Coins!';
      this.isSpinning = false; // Status zurücksetzen, da kein Spin möglich
      return;
    }

    // Geld abziehen via Service (asynchron)
    this.moneyService
      .updateMoney({ username: this.username, amount: -this.spinCost })
      .subscribe({
        next: () => {
          // Geld wurde erfolgreich abgezogen, UI jetzt aktualisieren
          this.currentMoney -= this.spinCost;
          this.results = [
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
          ];

          const spinDelay = 500; // ms zwischen den Rollen starten
          const newResults: SymbolData[] = [];

          this.reelComponents.forEach((reel, i) => {
            setTimeout(() => {
              const index = Math.floor(Math.random() * this.symbols.length);
              newResults[i] = this.symbols[index];
              reel.spin(newResults[i]);

              if (i === this.reelComponents.length - 1) {
                setTimeout(() => {
                  this.results = [...newResults];

                  if (this.isJackpot()) {
                    this.addXp(this.winReward / 10);
                    this.rainComponent.emojiRain('💸');
                    this.unlockAch('Lone Wolf 🐺');

                    // Nachricht an den Chat senden
                    this.chatService
                      .sendMessage({
                        username: 'Info',
                        message: `${this.username} hat gerade einen Jackpot geknackt und ${this.winReward} 💸 gewonnen! `,
                      })
                      .subscribe({
                        next: () => {},
                        error: (err) => {
                          console.error(
                            'Fehler beim Senden der Nachricht:',
                            err
                          );
                        },
                      });

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
                          this.isSpinning = false;
                        },
                        error: () => {
                          this.message = 'Fehler beim Gutschreiben des Gewinns';
                          this.isSpinning = false;
                        },
                      });
                  } else {
                    this.addXp(this.betAmount / 10);
                    this.rainComponent.emojiRain('🌀');
                    this.message =
                      '🌀 Leider kein Gewinn. Versuche es nochmal!';
                    this.isWinner = false;
                    this.loadMoney();
                    this.isSpinning = false;
                  }
                }, 1100); // etwas länger als Reel spin Dauer
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

  unlockAch(name: string) {
    this.achievementService.unlockAchievement(name).subscribe({
      next: (res) => {
        if (res.unlocked) {
          this.showAchievementMessage(`🎉 Erfolg freigeschaltet: ${res.name}`);
          this.rainComponent.emojiRain('🎖️');
          this.addXp(20);
        } else {
          // optional: Info anzeigen, dass bereits freigeschaltet
          // this.showAchievementMessage(`Schon freigeschaltet: ${res.name}`);
        }
      },
      error: (err) => console.error('❌ Fehler beim Unlock:', err),
    });
  }

  showAchievementMessage(message: string) {
    this.achievementMessage = message;
    setTimeout(() => {
      this.achievementMessage = null;
    }, 3000); // 3 Sekunden sichtbar
  }

  isJackpot(): boolean {
    return (
      this.results.length === 3 &&
      this.results.every((s) => s === this.results[0])
    );
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
}
