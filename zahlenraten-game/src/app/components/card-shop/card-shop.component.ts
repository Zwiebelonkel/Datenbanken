import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MoneyService } from "link";
import { ProfileService } from "link";
import { AuthService } from "link";

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-shop.component.html',
  styleUrls: ['./card-shop.component.scss']
})
export class CardShopComponent {
  message = '';

  cardPacks = [
    { name: 'Basic', price: 10, image: 'assets/packs/basic.png' },
    { name: 'Premium', price: 20, image: 'assets/packs/premium.png' },
    { name: 'Ultra', price: 30, image: 'assets/packs/ultra.png' }
  ];

ngOnInit(){
this.username = this.authService.getUsername();
this.loadMoney();
}

  constructor(private router: Router, private moneyService: MoneyService, private profileService: ProfileService, private authService: AuthService) {}

  buyPack(pack: any) {
    if (this.money < pack.price) {
      this.message = '❌ Nicht genug Geld!';
      return;

    this.moneyService.updateMoney({ username: this.username, amount: -pack.price }).subscribe({
      next: () => {
        this.loadMoney(); // 💰 neu laden!
      },
      error: err => console.error('❌ Fehler beim kaufen:', err)
    });
    this.message = '';
    this.router.navigate(['/pack-opening'], {
      queryParams: { pack: pack.name }
    });

    }



loadMoney() {
  this.profileService.getUserStats(this.username).subscribe({
    next: stats => {
      this.money = stats.money;
      this.isLoading = false;
    },
    error: err => {
      console.error('Fehler beim Laden der Statistiken', err);
      this.isLoading = false;
    }
  });
}


}