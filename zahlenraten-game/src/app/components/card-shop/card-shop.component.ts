import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MoneyService } from '../../services/money.service';      // ← Pfad anpassen!
import { ProfileService } from '../../services/profile.service';    // ← Pfad anpassen!
import { AuthService } from '../../services/auth.service';       // ← Pfad anpassen!

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-shop.component.html',
  styleUrls: ['./card-shop.component.scss']
})
export class CardShopComponent implements OnInit {
  money: number = 0;
  username: string = '';
  isLoading = false;
  message = '';

  cardPacks = [
    { name: 'Basic', price: 10, image: 'assets/packs/basic.png' },
    { name: 'Premium', price: 20, image: 'assets/packs/premium.png' },
    { name: 'Ultra', price: 30, image: 'assets/packs/ultra.png' }
  ];

  constructor(
    private router: Router,
    private moneyService: MoneyService,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername();
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
    if (this.money < pack.price) {
      this.message = '❌ Nicht genug Geld!';
      return;
    }

    this.moneyService.updateMoney({ username: this.username, amount: -pack.price }).subscribe({
      next: () => {
        this.message = '';
        this.loadMoney(); // 💰 aktualisieren
        this.router.navigate(['/pack-opening'], {
          queryParams: { pack: pack.name }
        });
      },
      error: err => {
        console.error('❌ Fehler beim Kaufen:', err);
        this.message = '❌ Kauf fehlgeschlagen!';
      }
    });
  }
}