import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  standalone: true
})
export class ReelComponent {
  @Input() symbol: string = '❔';

  spinning = false;

  spin() {
    this.spinning = true;
    setTimeout(() => {
      this.spinning = false;
    }, 1000); // Dauer der Animation in ms
  }
}
