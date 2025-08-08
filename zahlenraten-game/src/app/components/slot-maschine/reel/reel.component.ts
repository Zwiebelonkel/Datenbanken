import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  standalone: true
})
export class ReelComponent {
  @Input() symbols: string[] = ['🍒', '🍋', '🔔', '💎', '🍀'];
  @Input() finalSymbol: string = '❔';

  currentSymbol: string = '❔';
  spinning = false;
  private intervalId: any;

  spin() {
    this.spinning = true;
    
    // Schnelles Symbolwechsel-Intervall starten (z.B. alle 50ms)
    this.intervalId = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.symbols.length);
      this.currentSymbol = this.symbols[randomIndex];
    }, 50);

    // Nach 1 Sekunde Spin beenden, finale Symbol setzen
    setTimeout(() => {
      clearInterval(this.intervalId);
      this.currentSymbol = this.finalSymbol;
      this.spinning = false;
    }, 1000);
  }
}
