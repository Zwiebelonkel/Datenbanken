import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MoneyService } from '../../services/money.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { SoundsService } from '../../services/sound.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [CommonModule, LoaderComponent, SidebarComponent],
  templateUrl: './card-shop.component.html',
  styleUrls: ['./card-shop.component.scss']
})
export class CardShopComponent implements OnInit {
  money: number = 0;
  username: string = '';
  isLoading = false;
  message = '';

  cardPacks = [
    { name: 'Basic', price: 40, image: 'assets/packs/basic.png' },
    { name: 'Premium', price: 120, image: 'assets/packs/premium.png' },
    { name: 'Ultra', price: 360, image: 'assets/packs/ultra.png' }
    ,
    // Neues Pack speziell für Herz‑Karten
    // { name: 'Hearts', price: 200, image: 'assets/packs/hearts.png' }
  ];

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

buyPack(pack: any) {
  this.soundService.playSound('coin.aac'); // Sound beim Kauf abspielen
  this.router.navigate(['/pack-opening'], {
    queryParams: { pack: pack.name }
  });
}
}