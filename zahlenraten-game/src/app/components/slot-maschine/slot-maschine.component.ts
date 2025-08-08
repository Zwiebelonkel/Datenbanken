// slot-machine.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-slot-machine',
  templateUrl: './slot-machine.component.html',
  styleUrls: ['./slot-machine.component.scss']
})
export class SlotMachineComponent {
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
