import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MoneyService } from '../../services/money.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { SoundsService } from '../../services/sound.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ModelViewerComponent } from '../view/view.component';
import { TutorialComponent } from '../tutorial/tutorial.component';

type CardOutcome =
  | { type: 'multiplier'; value: string; chance: number }
  | { type: 'money'; value: number; chance: number }
  | { type: 'xp'; value: number; chance: number };

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SidebarComponent,
    TopbarComponent,
    ModelViewerComponent,
    TutorialComponent,
  ],
  templateUrl: './card-shop.component.html',
  styleUrls: ['./card-shop.component.scss'],
})
export class CardShopComponent implements OnInit {
  money: number = 0;
  username: string = '';
  isLoading = false;
  message = '';
  tutorialTitle = 'Wie funktioniert das?';
  tutorialDescription =
    'Im Card-Shop kannst du verschiedene Kartenpakete kaufen. Jedes Kartenpaket enthält 5 Karten, die du vor dem Spiel einsetzen kannst. Jedes Kartenpaket hat unterschiedliche Chancen auf verschiedene Belohnungen. Nach dem Kauf, wirst du zu einer speziellen Seite weitergeleitet, auf der du dein Kartenpaket öffnen und deine Belohnungen sehen kannst. Viel Glück!';

  cardPacks = [
    {
      name: 'Basic',
      price: 40,
      image: 'assets/packs/basic.png',
      model: 'assets/models/goodPack1.glb',
    },
    {
      name: 'Premium',
      price: 120,
      image: 'assets/packs/premium.png',
      model: 'assets/models/goodPack2.glb',
    },
    {
      name: 'Ultra',
      price: 360,
      image: 'assets/packs/ultra.png',
      model: 'assets/models/goodPack3.glb',
    },
  ];

  chances: Record<string, CardOutcome[]> = {
    Basic: [
      { type: 'multiplier', value: '1.2x', chance: 50 },
      { type: 'multiplier', value: '1.5x', chance: 15 },
      { type: 'multiplier', value: '2x', chance: 5 },
      { type: 'multiplier', value: '-1', chance: 5 },
      { type: 'money', value: 50, chance: 15 }, // Erhöht
      { type: 'xp', value: 25, chance: 10 }, // Erhöht
    ],
    Premium: [
      { type: 'multiplier', value: '1.5x', chance: 35 },
      { type: 'multiplier', value: '2x', chance: 15 },
      { type: 'multiplier', value: '5x', chance: 10 },
      { type: 'multiplier', value: '-1', chance: 10 },
      { type: 'multiplier', value: '-2', chance: 5 },
      { type: 'money', value: 100, chance: 15 }, // Erhöht
      { type: 'xp', value: 50, chance: 10 }, // Erhöht
    ],
    Ultra: [
      { type: 'multiplier', value: '2x', chance: 25 },
      { type: 'multiplier', value: '5x', chance: 20 },
      { type: 'multiplier', value: '10x', chance: 3 },
      { type: 'multiplier', value: '-1', chance: 15 },
      { type: 'multiplier', value: '-2', chance: 5 },
      { type: 'multiplier', value: '-3', chance: 1.5 },
      { type: 'money', value: 150, chance: 15 }, // Erhöht
      { type: 'xp', value: 100, chance: 15 }, // Erhöht
    ],
  };

  constructor(
    private router: Router,
    private moneyService: MoneyService,
    private profileService: ProfileService,
    private authService: AuthService,
    private soundService: SoundsService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';
    this.loadMoney();
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

  buyPack(pack: any) {
    this.soundService.playSound('coin.aac'); // Sound beim Kauf abspielen
    this.router.navigate(['/pack-opening'], {
      queryParams: { pack: pack.name },
    });
  }
}
