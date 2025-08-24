// src/app/components/player-bar/player-bar.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.scss'],
})
export class PlayerBarComponent implements OnInit {
  @Input() moneyDelta = 0;
  @Input() totalMoneyOverride: number | null = null; // ⬅️ WICHTIG

  isLoggedIn = false;
  username = '';
  baseMoney = 0;
  level = 1;
  xpPercent: number | null = null;

  constructor(private auth: AuthService, private profile: ProfileService) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    this.username = this.auth.getUsername() ?? '';
    if (!this.isLoggedIn || !this.username) return;

    this.profile.getUserStats(this.username).subscribe({
      next: (p) => {
        this.baseMoney = p.money ?? 0;
        this.level = p.level ?? 1;
        this.xpPercent =
          typeof p.xpPercent === 'number'
            ? Math.max(0, Math.min(100, Math.floor(p.xpPercent)))
            : null;
      },
      error: (err) => console.error('PlayerBar getUserStats error', err),
    });
  }

  get totalMoney(): number {
    if (
      this.totalMoneyOverride !== null &&
      this.totalMoneyOverride !== undefined
    ) {
      return this.totalMoneyOverride;
    }
    return (this.baseMoney ?? 0) + (this.moneyDelta ?? 0);
  }
}
