// slot-machine.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ProfileService } from '../../services/profile.service';


@Component({
  selector: 'app-slot-maschine',
  templateUrl: './slot-maschine.component.html',
  styleUrls: ['./slot-maschine.component.scss'],
  standalone: true,
  imports: [CommonModule, LoaderComponent, SidebarComponent],
})
export class SlotMaschineComponent {
  reels = [0, 1, 2]; // Drei Rollen
  symbols = ['🍒', '🍋', '🔔', '💎', '🍀'];
  results: string[] = [];

    constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private moneyService: MoneyService,
  ) {}

  spin() {
    this.results = this.reels.map(() => {
      const index = Math.floor(Math.random() * this.symbols.length);
      return this.symbols[index];
    });
  }
}
