import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-shop',
  standalone: true,
  imports: [CommonModule],  // ✅ wichtig für *ngFor und *ngIf
  templateUrl: './card-shop.component.html',
  styleUrls: ['./card-shop.component.scss']
})

export class CardShopComponent {
  money = 30; // ← später dynamisch laden
  message = '';

cardPacks = [
  { name: 'Basic', price: 10, image: 'assets/packs/basic.png' },
  { name: 'Premium', price: 20, image: 'assets/packs/premium.png' },
  { name: 'Ultra', price: 30, image: 'assets/packs/ultra.png' }
];

  constructor(private router: Router) {}

  buyPack(pack: any) {
    if (this.money < pack.price) {
      this.message = '❌ Nicht genug Geld!';
      return;
    }

    this.message = '';
    // ggf. Geld abziehen hier oder beim Öffnen
    this.router.navigate(['/pack-opening'], { queryParams: { pack: pack.name } });
  }
}