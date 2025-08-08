import { Component, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ProfileService } from '../../services/profile.service';
import { ReelComponent } from './reel/reel.component';

@Component({
  selector: 'app-slot-maschine',
  templateUrl: './slot-maschine.component.html',
  styleUrls: ['./slot-maschine.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SidebarComponent,
    ReelComponent
  ]
})
export class SlotMaschineComponent {
  reels = [0, 1, 2]; // Drei Rollen
  symbols = ['🍒', '🍋', '🔔', '💎', '🍀'];
  results: string[] = [];

  // Zugriff auf Kindkomponenten (Reels)
  @ViewChildren(ReelComponent) reelComponents!: QueryList<ReelComponent>;

  constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private moneyService: MoneyService,
  ) {}

  spin() {
    // 1. Animation bei allen Reels starten
    this.reelComponents.forEach(reel => reel.spin());

    // 2. Ergebnis nach Animation setzen (z. B. 1000ms)
    setTimeout(() => {
      this.results = this.reels.map(() => {
        const index = Math.floor(Math.random() * this.symbols.length);
        return this.symbols[index];
      });
    }, 1000); // gleiche Dauer wie Reel-Animation
  }
}
