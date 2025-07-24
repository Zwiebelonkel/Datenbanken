import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MoneyService } from '../../services/money.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { SoundsService } from '../../services/sound.service';

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
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
  ];

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