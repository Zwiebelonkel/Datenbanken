import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  standalone: true
})
export class ReelComponent {
  @Input() symbols: string[] = ['🍒', '🍋', '🔔', '💎', '{ name: 'logo', src: 'assets/logo.png' }'];
  @Input() finalSymbol: string = '❔';

  currentSymbol: string = '{ name: 'logo', src: 'assets/logo.png' }';
  spinning = false;
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
