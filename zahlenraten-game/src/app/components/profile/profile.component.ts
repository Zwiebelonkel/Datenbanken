import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, SidebarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
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
  level = 1;
  xp = 0;
  profileImage: string = 'assets/profile.png'; // Standardbild
  isOwnProfile = false;
  xpThreshold = 100;
  xpPercent = 0;

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const paramUser = params.get('username');
      const selfUser = this.authService.getUsername() || '';
      this.username = (paramUser || selfUser).trim();

      // ✅ Besitzer-Flag setzen
      this.isOwnProfile = !!selfUser && selfUser === this.username;

      if (!this.username) {
        this.isLoading = false;
        return;
      }
      this.loadUserStats(this.username);
    });
  }

addXp(amount: number) {
  this.profileService.addXp(this.username, amount).subscribe({
    next: (res) => {
      console.log(`✅ ${amount} XP zu ${this.username} hinzugefügt`);
      console.log('Neuer Level:', res.level, 'XP:', res.xp);
      console.log("Response: {res}");

      // Optional: Werte im UI aktualisieren
      this.level = res.level;
      this.xp = res.xp;
      this.xpThreshold = res.xpThreshold;
      this.xpPercent = Math.min((this.xp / this.xpThreshold) * 100, 100);
    },
    error: (err) => {
      console.error('❌ Fehler beim Hinzufügen von XP:', err);
    }
  });
}

  
  private loadUserStats(user: string) {
    this.isLoading = true;
    this.profileService.getUserStats(user).subscribe({
      next: (stats) => {
        this.totalScore = stats.totalScore;
        this.totalGames = stats.totalGames;
        this.unlockedAchievements = stats.unlockedAchievements;
        this.money = stats.money;
        this.highscore = stats.highscore;
        this.profileImage = stats.profileImageUrl || this.profileImage;
        this.xp = stats.xp;
        this.level = stats.level;

        this.isLoading = false;
        this.xpPercent = Math.min((this.xp / this.xpThreshold) * 100, 100);

      },
      error: (err) => {
        console.error('Fehler beim Laden der Statistiken', err);
        this.isLoading = false;
      },
    });
  }

  // Passwort ändern (nur eigenes Profil sinnvoll)
  changePassword() {
    if (this.newPassword !== this.repeatPassword) {
      this.pwChangeSuccess = false;
      this.pwChangeMsg = '❌ Passwörter stimmen nicht überein';
      return;
    }

    this.http
      .patch(
        'https://outside-between.onrender.com/api/users/password',
        {
          username: this.authService.getUsername(),
          currentPassword: this.currentPassword,
          newPassword: this.newPassword,
        },
        { responseType: 'text' }
      )
      .subscribe({
        next: () => {
          this.pwChangeSuccess = true;
          this.pwChangeMsg = '✅ Passwort geändert';
        },
        error: (err) => {
          this.pwChangeSuccess = false;
          this.pwChangeMsg = err.error?.message || '❌ Fehler bei Änderung';
        },
      });
  }

  // Profilbild auswählen
  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) this.uploadProfileImage(file);
  }

      onImgError(){
      this.profileImage = 'assets/profile.png';
    }

  getXpProgress(): number {
  const threshold = 100; // 100 XP = Balken voll
  return Math.min((this.xp / threshold) * 100, 100);
}

uploadProfileImage(file: File) {
  const selfUser = this.authService.getUsername();
  if (!selfUser || selfUser !== this.username) {
    console.warn('Upload nur für das eigene Profil erlaubt.');
    return;
  }

  // Progress-Logik
  const formData = new FormData();
  formData.append('profileImage', file, file.name);

  this.isUploading = true; // Setze isUploading auf true, wenn der Upload beginnt

  this.profileService.uploadProfileImage(formData, this.username).subscribe({
    next: (event: any) => {
      switch (event.type) {
        case HttpEventType.UploadProgress:
          if (event.total) {
            this.uploadProgress = Math.round((100 * event.loaded) / event.total); // Berechne den Fortschritt
          }
          break;
        case HttpEventType.Response:
          this.profileImage = event.body.profileImageUrl; // Update das Profilbild, wenn der Upload abgeschlossen ist
          break;
      }
    },
    error: (err) => {
      console.error('Fehler beim Hochladen des Bildes', err);
      this.isUploading = false; // Setze isUploading auf false im Fehlerfall
    },
    complete: () => {
      this.isUploading = false; // Setze isUploading auf false, wenn der Upload abgeschlossen ist
    }
  });
}

}
