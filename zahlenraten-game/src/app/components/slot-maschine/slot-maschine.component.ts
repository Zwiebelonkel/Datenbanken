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
import { CardsService } from '../../services/cards.service';

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
  cards: any = {};
  jokerActive: boolean = false;
 cardEffectActive = false;
  symbols: SymbolData[] = [
    { type: 'emoji', value: '🍒' },
    { type: 'emoji', value: '🍋' },
    { type: 'emoji', value: '🔔' },
    { type: 'emoji', value: '💎' },
    { type: 'image', value: 'assets/logo.png' },
  ];

  results: SymbolData[] = [];
  reels = [0, 1, 2];

  message: string = '';
  isWinner: boolean = false;
  currentMoney: number = 0;
  username: string = '';
  betAmount: number = 100;
  isSpinning: boolean = false;
  isLoading: boolean = true;
  gotLasVegas: boolean = false;
  achievementMessage: string | null = null;
  availableCards: any[] = [];
  currentLevel = 0;
  usedCardMultiplier: number | null = null;
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

  get hasJokerCard(): boolean {
    return this.availableCards.some(card => card.multiplier === 100 && card.amount > 0);
  }

  @ViewChildren(ReelComponent) reelComponents!: QueryList<ReelComponent>;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private moneyService: MoneyService,
    private chatService: ChatService,
    private achievementService: AchievementService,
    private cardsService: CardsService
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';
    this.loadMoney();
    this.profileService.getUserStats(this.username).subscribe((p) => {
      this.currentLevel = p.level ?? 0;
    });
    this.cardsService.getCards().subscribe(cards => {
 this.availableCards = cards;
 this.cards = cards.reduce((acc, card) => ({ ...acc, [card.multiplier]: card }), {});
    });
  }

  ngAfterViewInit() {}

  loadMoney() {
    this.isLoading = true;
    this.profileService.getUserStats(this.username).subscribe({
      next: (stats) => {
        this.currentMoney = stats.money;
        this.isLoading = false;
      },
      error: () => {
        this.message = 'Fehler beim Laden des Kontostands';
        this.isLoading = false;
      }
    });
  }
  


  useJoker() {
    const jokerCard = this.availableCards.find(card => card.multiplier === 100 && card.amount > 0);
    if (jokerCard && !this.jokerActive && !this.isSpinning) {
 this.useCardEffect(jokerCard);
    } else if (this.jokerActive) {
      this.message = 'ℹ️ Joker-Effekt ist bereits aktiv für die nächste Runde!';
    } else if (this.isSpinning) {
      this.jokerActive = true;
 this.message = `Joker-Karte benutzt! Die nächste Runde hat nur 2 Reihen.`;
    }
 else {
      this.message = '❌ Du hast keine Joker-Karte (-4x Multiplikator) verfügbar!';
    }
  }

 // Method to handle spin button click

  useCardEffect(card: any) {
    if (card.multiplier === 100 && card.amount > 0) {
      this.cardsService.useCard(card.multiplier).subscribe({
        next: () => {
 if (card.multiplier === 100) this.jokerActive = true;
          this.usedCardMultiplier = card.multiplier;
          // Update available cards after using one
 this.cardsService
            .getCards()
            .subscribe((cards) => (this.availableCards = cards));
          this.message = `Joker benutzt! Ein Symbol wird für eine Runde entfernt.`;
        },
        error: (err) => {
          console.error('❌ Fehler beim Verwenden der Karte:', err);
          this.message = '❌ Fehler beim Verwenden der Karte!';
 }
      });
    } else {
      this.message = '❌ Diese Karte kann nicht verwendet werden oder du hast keine mehr!';
    }
  }

  private originalSymbols: SymbolData[] = []; // To store the original symbols

  spin() {
    console.log('Spin function called');
    let currentReels = [0, 1, 2];
    if (this.jokerActive) {
      currentReels = [0, 1];
    }

    this.isSpinning = true;

    // Store original symbols before potential modification
    this.originalSymbols = [...this.symbols];

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
        // Geld wurde erfolgreich abgezogen, UI jetzt aktualisieren
        next: () => {
          // Geld wurde erfolgreich abgezogen, UI jetzt aktualisieren
          this.currentMoney -= this.spinCost;
          this.results = [
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
            { type: 'emoji', value: '⏳' },
          ];
          console.log('Money deducted successfully, starting spin animation');

          let currentSymbols = [...this.symbols];
          let removedSymbol: SymbolData | undefined;

          if (this.jokerActive && currentSymbols.length > 1) {
            const randomIndex = Math.floor(Math.random() * currentSymbols.length);
            removedSymbol = currentSymbols.splice(randomIndex, 1)[0];
          }

          const spinDelay = 500; // ms zwischen den Rollen starten
          const newResults: SymbolData[] = [];

          this.reelComponents.forEach((reel, i) => { // Use forEach with the query list
 // Temporarily remove the removed symbol for this reel's spin if the -4 card is used
            let symbolsForSpin = [...(this.jokerActive ? currentSymbols : this.symbols)]; // Use the modified symbols array if joker is active
            if (this.usedCardMultiplier === -4 && removedSymbol && i > 0) { // Don't remove for the first reel to ensure at least two symbols match
              const indexToRemove = symbolsForSpin.findIndex(s => s.value === removedSymbol?.value && s.type === removedSymbol?.type);
              if (indexToRemove !== -1) {
                symbolsForSpin.splice(indexToRemove, 1);
              }
            }

            setTimeout(() => {
              const index = Math.floor(Math.random() * symbolsForSpin.length);
              newResults[i] = symbolsForSpin[index];
              reel.spin(newResults[i]);

              if (i === currentReels.length - 1) { // Check against the active number of reels
                setTimeout(() => {
                  console.log('Spin animation finished, processing results');
                  this.results = [...newResults];
                  console.log('Spin results:', this.results);

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
                          this.jokerActive = false; // Reset joker after spin
                        },
                        error: (err) => {
                          this.message = 'Fehler beim Gutschreiben des Gewinns';
                          this.isSpinning = false;
                          console.error('Error crediting money:', err);
                          this.jokerActive = false; // Reset joker even on error
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
                    this.jokerActive = false; // Reset joker after spin
                  }

                  // Restore original symbols after spin if a symbol was removed
                  if (removedSymbol) {
                    this.symbols = [...this.originalSymbols];
                  }
                  console.log('Spin processing finished');
                }, 1100); // etwas länger als Reel spin Dauer
              }
            }, i * spinDelay);
          });
          console.log('Started reel spin timeouts');
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
    if (this.jokerActive) {
      // With the -4 card, a jackpot is 2 matching symbols
      return this.results.length >= 2 && this.results[0].value === this.results[1].value;
    }
    // Original jackpot condition (3 matching symbols)
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
