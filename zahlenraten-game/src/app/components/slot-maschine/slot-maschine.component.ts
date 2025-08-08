// slot-machine.component.ts
import { Component } from '@angular/core';

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

  spin() {
    this.results = this.reels.map(() => {
      const index = Math.floor(Math.random() * this.symbols.length);
      return this.symbols[index];
    });
  }
}
