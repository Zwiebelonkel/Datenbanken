import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardsService } from '../../services/cards.service';
import { MoneyService } from '../../services/money.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { LoaderComponent } from '../loader/loader.component';
import { SoundsService } from '../../services/sound.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-pack-opening',
  standalone: true,
  imports: [CommonModule, LoaderComponent, SidebarComponent],
  templateUrl: './pack-opening.component.html',
  styleUrls: ['./pack-opening.component.scss'],
})
export class PackOpeningComponent implements OnInit {
  packName: string = '';
  result: string = '';
  displayResult: string = '';
  reveal = false;
  packImagePath = 'assets/packs/basicOpen.png';
  showPack = true;
  packDropped = false;
  message = '';
  achievementMessage: string | null = null;  money: number = 0;
  username: string = '';
  isLoading = true;

  maxCards: number = 5;
  cardsRemaining: number = 0;
  drawnCards: string[] = [];

  lastCardText: string = '';
  lastCardOut = false;
  cardStack: string[] = [];

  type CardOutcome =
  | { type: 'multiplier'; value: string; chance: number }
  | { type: 'money'; value: number; chance: number }
  | { type: 'xp'; value: number; chance: number };


chances: Record<string, CardOutcome[]> = {
  Basic: [
    { type: 'multiplier', value: '1.2x', chance: 60 },
    { type: 'multiplier', value: '1.5x', chance: 20 },
    { type: 'multiplier', value: '2x', chance: 7.5 },
    { type: 'multiplier', value: '-1', chance: 7.5 },
    { type: 'money', value: 50, chance: 3 },
    { type: 'xp', value: 25, chance: 2 },
  ],
  Premium: [
    { type: 'multiplier', value: '1.5x', chance: 45 },
    { type: 'multiplier', value: '2x', chance: 20 },
    { type: 'multiplier', value: '5x', chance: 15 },
    { type: 'multiplier', value: '-1', chance: 13 },
    { type: 'multiplier', value: '-2', chance: 2 },
    { type: 'money', value: 100, chance: 3 },
    { type: 'xp', value: 50, chance: 2 },
  ],
  Ultra: [
    { type: 'multiplier', value: '2x', chance: 35 },
    { type: 'multiplier', value: '5x', chance: 30 },
    { type: 'multiplier', value: '10x', chance: 5 },
    { type: 'multiplier', value: '-1', chance: 18.5 },
    { type: 'multiplier', value: '-2', chance: 1 },
    { type: 'multiplier', value: '-3', chance: 0.5 },
    { type: 'money', value: 250, chance: 5 },
    { type: 'xp', value: 100, chance: 5 },
  ],
};


  packPrices: Record<string, number> = {
    Basic: 40,
    Premium: 120,
    Ultra: 360,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cardsService: CardsService,
    private moneyService: MoneyService,
    private authService: AuthService,
    private profileService: ProfileService,
    private soundService: SoundsService
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() || '';
    this.loadMoney();

    this.route.queryParams.subscribe((params) => {
      this.packName = params['pack'] || 'Basic';
      this.packImagePath = `assets/packs/${this.packName.toLowerCase()}Open.png`;
    });
  }

  loadMoney() {
    this.isLoading = true;
    this.profileService.getUserStats(this.username).subscribe({
      next: (stats) => {
        this.money = stats.money;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden der Statistiken:', err);
        this.isLoading = false;
      },
    });
  }

  dropCardPack() {
    if (this.packDropped) return;

    const price = this.packPrices[this.packName] || 0;

    if (this.money < price) {
      this.message = '❌ Nicht genug Geld!';
      this.router.navigate(['/card-shop']);
      return;
    }

    this.moneyService
      .updateMoney({ username: this.username, amount: -price })
      .subscribe({
        next: () => {
          this.money -= price;
          this.packDropped = true;
          this.message = '';
          this.cardsRemaining = this.maxCards;
          this.drawnCards = [];
          this.reveal = false;
          this.displayResult = '';
          this.cardStack = Array(this.maxCards).fill('🃏');
        },
        error: (err) => {
          console.error('❌ Fehler beim Geldabzug:', err);
          this.message = '❌ Kauf fehlgeschlagen!';
        },
      });
  }

  revealCard() {
    if (this.reveal || !this.packDropped || this.cardsRemaining <= 0) return;
    this.drawCard();
    this.reveal = true;
  }

  revealNextCard() {
    if (this.cardStack.length === 0 || !this.reveal || this.cardsRemaining <= 0)
      return;

    this.lastCardText = this.displayResult;
    this.lastCardOut = true;
    this.reveal = false;

    setTimeout(() => {
      this.cardStack.pop(); // oberste Karte entfernen
      this.drawCard(); // neue Karte ziehen
      this.reveal = true;
      this.lastCardOut = false;
    }, 300); // Warte, bis Fly-Away-Animation vorbei ist
  }

drawCard() {
  const pack = this.chances[this.packName];
  const rand = Math.random() * 100;
  let cumulative = 0;
  this.soundService.playSound('win.aac', 0.5);

  for (const entry of pack) {
    cumulative += entry.chance;
    if (rand <= cumulative) {
      if (entry.type === 'multiplier') {
        this.result = entry.value;
        const numericVal = parseFloat(this.result);

        if (!isNaN(numericVal) && numericVal < 0) {
          this.displayResult = `${Math.abs(numericVal)}❤️`;
        } else {
          this.displayResult = this.result;
        }

        // Nur Multiplier-Karten speichern
        this.cardsService.addCard(numericVal).subscribe({
          next: () => console.log('Karte gespeichert:', this.result),
          error: (err) =>
            console.error('❌ Fehler beim Speichern der Karte:', err),
        });

      } else if (entry.type === 'money') {
        this.displayResult = `💰 +${entry.value}`;
        this.moneyService
          .updateMoney({ username: this.username, amount: entry.value })
          .subscribe({
            next: () => {
              this.money += entry.value;
              console.log(`💰 +${entry.value} Geld gutgeschrieben`);
            },
            error: (err) =>
              console.error('❌ Fehler beim Hinzufügen von Geld:', err),
          });

      } else if (entry.type === 'xp') {
        this.displayResult = `⭐️ +${entry.value} XP`;
        this.profileService
          .addXP(this.username, entry.value)
          .subscribe({
            next: () =>
              console.log(`⭐️ +${entry.value} XP gutgeschrieben`),
            error: (err) =>
              console.error('❌ Fehler beim Hinzufügen von XP:', err),
          });
      }

      this.drawnCards.push(this.displayResult);
      this.cardsRemaining--;
      break;
    }
  }
}

  showAchievementMessage(message: string) {
    this.achievementMessage = message;
    setTimeout(() => {
      this.achievementMessage = null;
    }, 3000); // 3 Sekunden sichtbar
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
