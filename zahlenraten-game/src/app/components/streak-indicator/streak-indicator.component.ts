// streak-indicator.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-streak-indicator',
  templateUrl: './streak-indicator.component.html',
  styleUrls: ['./streak-indicator.component.scss']
})
export class StreakIndicatorComponent {
  @Input() consecutiveWins: number = 0;

  readonly maxWins: number = 15;

  get strokeDashOffset(): number {
    const radius = 45; // Must match SVG
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(this.consecutiveWins, this.maxWins) / this.maxWins;
    return circumference * (1 - progress);
  }
}
