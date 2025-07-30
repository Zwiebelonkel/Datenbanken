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
  styleUrls: ['./pack-opening.component.scss']
})
export class PackOpeningComponent implements OnInit {
  packName: string = '';
  result: string = '';
  displayResult: string = ''
  reveal = false;
  packImagePath = 'assets/packs/basicOpen.png';
  showPack = true;
  packDropped = false;
  message = '';
  money: number = 0;
  username: string = '';
  isLoading = true;

  /** Anzahl der Karten in einem Pack. Jede Packöffnung enthält mehrere
   * Karten, die nacheinander umgedreht werden können.
   */
  maxCards: number = 5;

  /**
   * Wie viele Karten im aktuellen Pack noch nicht aufgedeckt wurden. Dieses
   * Zählwerk wird beim Kauf eines Packs initialisiert und bei jedem Ziehen
   * dekrementiert.
   */
  cardsRemaining: number = 0;

  /**
   * Liste der bisher gezogenen Karten (Textdarstellung). Kann später für die
   * Anzeige der Ausbeute oder Debugging verwendet werden.
   */
  drawnCards: string[] = [];

  /**
   * Die Wahrscheinlichkeitstabellen für jede Packart. Negative Werte
   * kennzeichnen Herz‑Karten (Lebenspunkte), positive Multipliers sind klassische
   * Gewinnfaktoren. Die Summe der Chancen pro Pack sollte 100 ergeben.
   */
chances: Record<string, { multiplier: string; chance: number }[]> = {
  Basic: [
    { multiplier: '1.2x', chance: 65 },
    { multiplier: '1.5x', chance: 20 },
    { multiplier: '2x', chance: 7.5 },
    { multiplier: '-1', chance: 7.5 },
    { multiplier: '-2', chance: 0 },
    { multiplier: '-3', chance: 0 },
  ],
  Premium: [
    { multiplier: '1.5x', chance: 50 },
    { multiplier: '2x', chance: 20 },
    { multiplier: '5x', chance: 15 },
    { multiplier: '-1', chance: 13 },
    { multiplier: '-2', chance: 2 },
    { multiplier: '-3', chance: 0 },
  ],
  Ultra: [
    { multiplier: '2x', chance: 40 },
    { multiplier: '5x', chance: 35 },
    { multiplier: '10x', chance: 5 },
    { multiplier: '-1', chance: 18.5 },
    { multiplier: '-2', chance: 1 },
    { multiplier: '-3', chance: 0.5 },
  ]
};

  /**
   * Preise der einzelnen Packs. Der Hearts‑Pack wurde entfernt, da die
   * Herz‑Karten nun als negative Multipliers in den regulären Packs
   * enthalten sind.
   */
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
    const price = this.packPrices[this.packName] || 0;

    this.username = this.authService.getUsername() || '';
    this.loadMoney();

    this.route.queryParams.subscribe(params => {
      this.packName = params['pack'] || 'Basic';
      this.packImagePath = `assets/packs/${this.packName.toLowerCase()}Open.png`;
    });
        if (this.money < price) {
      this.message = '❌ Nicht genug Geld!';
      this.router.navigate(['/card-shop']);
      return;
    }
  }

  loadMoney() {
    this.isLoading = true;
    this.profileService.getUserStats(this.username).subscribe({
      next: stats => {
        this.money = stats.money;
        this.isLoading = false;
      },
      error: err => {
        console.error('❌ Fehler beim Laden der Statistiken:', err);
        this.isLoading = false;
      }
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

    // 💰 Geld abziehen
    this.moneyService.updateMoney({ username: this.username, amount: -price }).subscribe({
      next: () => {
        this.money -= price;
        this.packDropped = true;
        this.message = '';
        // Initialisiere den Kartenvorrat und setze den Flip-Status zurück
        this.cardsRemaining = this.maxCards;
        this.drawnCards = [];
        this.reveal = false;
        this.displayResult = '';
      },
      error: err => {
        console.error('❌ Fehler beim Geldabzug:', err);
        this.message = '❌ Kauf fehlgeschlagen!';
      }
    });
  }

  revealCard() {
    // Die erste Karte wird durch Klick auf die Karte aufgedeckt. Weitere Karten
    // werden über den "Nächste Karte"-Button aufgedeckt. Hat der Benutzer keine
    // Karten mehr oder ist bereits aufgedeckt, passiert nichts.
    if (this.reveal || !this.packDropped || this.cardsRemaining <= 0) return;
    this.drawCard();
    this.reveal = true;
  }

  /**
   * Dreht direkt die nächste Karte um. Wird von einem Button im Template
   * aufgerufen. Wenn keine Karten mehr übrig sind, wird nichts gemacht.
   */
  revealNextCard() {
    if (!this.packDropped || this.cardsRemaining <= 0) return;
    // Setze die Karte zurück zur Vorderseite, um den Flip-Effekt zu resetten
    this.reveal = false;
    // Ziehe eine neue Karte
    this.drawCard();
    // Zeige diese sofort auf der Rückseite
    this.reveal = true;
  }

drawCard() {
  const pack = this.chances[this.packName];
  const rand = Math.random() * 100;
  let cumulative = 0;
  this.soundService.playSound('win.aac', 0.5);

  for (const entry of pack) {
    cumulative += entry.chance;
    if (rand <= cumulative) {
      this.result = entry.multiplier;
      // Darstellung je nach Art der Karte (Herz-Karten haben negative Multipliers)
      const numericVal = parseFloat(this.result);
      if (!isNaN(numericVal) && numericVal < 0) {
        // Negative Zahlen stehen für Herz-Karten; zeige Anzahl Herzen
        this.displayResult = `${Math.abs(numericVal)}❤️`;
      } else {
        this.displayResult = this.result;
      }

      // 💾 Karte speichern (als Zahl)
      this.cardsService.addCard(numericVal).subscribe({
        next: () => console.log('Karte gespeichert:', this.result),
        error: err => console.error('❌ Fehler beim Speichern der Karte:', err)
      });

      // Füge die gezogene Karte zur Liste hinzu
      this.drawnCards.push(this.displayResult);
      // Verringere die Anzahl der verbleibenden Karten im Pack
      this.cardsRemaining--;
      break;
    }
  }
}

}
