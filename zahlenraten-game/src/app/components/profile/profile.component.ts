import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  totalScore = 0;
  totalGames = 0;
  unlockedAchievements = 0;

  constructor(private profileService: ProfileService, private authService: AuthService) {}

  ngOnInit(): void {
    const username = this.authService.getUsername();
    if (!username) return;

    this.profileService.getUserStats(username).subscribe(stats => {
      this.totalScore = stats.totalScore;
      this.totalGames = stats.totalGames;
      this.unlockedAchievements = stats.unlockedAchievements;
    });
  }
}
