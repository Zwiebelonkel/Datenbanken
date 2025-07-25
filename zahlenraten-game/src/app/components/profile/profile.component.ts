import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
  totalScore = 0;
  totalGames = 0;
  unlockedAchievements = 0;
  username: string = '';
  currentPassword = '';
  newPassword = '';
  repeatPassword = '';
  pwChangeMsg = '';
  pwChangeSuccess = false;
  isLoading = true;
  money = 0;
  highscore = 0;



  constructor(private profileService: ProfileService, private authService: AuthService, private http: HttpClient) {}

ngOnInit(): void {
  const username = this.authService.getUsername();
  this.username = username || '';
  if (!username) return;

  this.profileService.getUserStats(username).subscribe({
    next: stats => {
      this.totalScore = stats.totalScore;
      this.totalGames = stats.totalGames;
      this.unlockedAchievements = stats.unlockedAchievements;
      this.money = stats.money; // 💰 Geld übernehmen
      this.highscore = stats.highscore;
      this.isLoading = false;
    },
    error: err => {
      console.error('Fehler beim Laden der Statistiken', err);
      this.isLoading = false;
    }
  });
}

changePassword() {
  if (this.newPassword !== this.repeatPassword) {
    this.pwChangeSuccess = false;
    this.pwChangeMsg = '❌ Passwörter stimmen nicht überein';
    return;
  }

  this.http.patch('https://outside-between.onrender.com/api/users/password', {
    username: this.authService.getUsername(),
    currentPassword: this.currentPassword,
    newPassword: this.newPassword
  }, { responseType: 'text' }).subscribe({
    next: () => {
      this.pwChangeSuccess = true;
      this.pwChangeMsg = '✅ Passwort geändert';
    },
    error: (err) => {
      this.pwChangeSuccess = false;
      this.pwChangeMsg = err.error?.message || '❌ Fehler bei Änderung';
    }
  });
}


}
