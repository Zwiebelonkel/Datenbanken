import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reel',
  imports: [CommonModule],
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  standalone: true
})
export class ReelComponent {
  @Input() symbols = [
  { type: 'emoji', value: '🍒' },
  { type: 'emoji', value: '🍋' },
  { type: 'emoji', value: '🔔' },
  { type: 'emoji', value: '💎' },
  { type: 'image', value: 'assets/logo.png' }
];
  @Input() finalSymbol: string = '❔';

currentSymbol: { type: 'emoji' | 'image'; value: string } | null = null;  spinning = false;
  private intervalId: any;

spin(finalSymbol: string) {
  this.spinning = true;

  this.intervalId = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * this.symbols.length);
    this.currentSymbol = this.symbols[randomIndex];
  }, 50);

  setTimeout(() => {
    clearInterval(this.intervalId);
    this.currentSymbol = finalSymbol;
    this.spinning = false;
  }, 900);
}

}
