import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-streak-indicator',
  templateUrl: './streak-indicator.component.html',
  styleUrls: ['./streak-indicator.component.scss']
})
export class StreakIndicatorComponent implements OnChanges {
  @Input() consecutiveWins: number = 0;
  @Output() streakCompleted = new EventEmitter<void>();

  readonly maxWins: number = 15;
  private lastCompletedAt: number = -1;

  ngOnChanges(changes: SimpleChanges): void {
    const fullCycles = Math.floor(this.consecutiveWins / this.maxWins);
    if (fullCycles > this.lastCompletedAt) {
      this.lastCompletedAt = fullCycles;
      this.streakCompleted.emit();
    }
  }

  get visibleProgress(): number {
    return this.consecutiveWins % this.maxWins;
  }

  get strokeDashOffset(): number {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = this.visibleProgress / this.maxWins;
    return circumference * (1 - progress);
  }
}
