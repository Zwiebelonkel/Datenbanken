import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { ProfileService, UserStats } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-streak-indicator',
  templateUrl: './streak-indicator.component.html',
  styleUrls: ['./streak-indicator.component.scss'],
})
export class StreakIndicatorComponent implements OnChanges, OnInit {
  @Input() consecutiveWins: number = 0;

  @Output() streakCompleted = new EventEmitter<void>();

  streakNeeded: number = 15; // Default, bis DB-Wert geladen

  readonly circleRadius = 18;
  readonly circleCircumference = 2 * Math.PI * this.circleRadius;

  private lastCompletedAt: number = -1;

  username: string = '';

  constructor(
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';
    if (!this.username) {
      console.error('Kein Benutzername gefunden, streakNeeded nicht geladen');
      return;
    }

    this.profileService.getUserStats(this.username).subscribe({
      next: (userStats: UserStats) => {
        this.streakNeeded = userStats.streakNeeded ?? 15; // Default 15 falls undefined
      },
      error: (err) => {
        console.error('Fehler beim Laden von streakNeeded:', err);
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.streakNeeded) {
      // noch kein Wert, nix machen
      return;
    }

    const maxWins = this.streakNeeded;
    const fullCycles = Math.floor(this.consecutiveWins / maxWins);
    if (fullCycles > this.lastCompletedAt) {
      this.lastCompletedAt = fullCycles;
      this.streakCompleted.emit();
    }
  }

  get visibleProgress(): number {
    if (!this.streakNeeded || this.streakNeeded <= 0) return 0;
    return this.consecutiveWins % this.streakNeeded;
  }

  get strokeDashOffset(): number {
    if (!this.streakNeeded || this.streakNeeded <= 0) {
      return this.circleCircumference;
    }
    const progress = this.visibleProgress / this.streakNeeded;
    const offset = this.circleCircumference * (1 - progress);
    return offset;
  }
}
