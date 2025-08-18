import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { LoaderComponent } from '../loader/loader.component'; // Import LoaderComponentimport { LevelService } from ''
import { LevelsService, LevelUser } from '../../services/levels.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [CommonModule, LoaderComponent],
})
export class UsersComponent{

  constructor(
    private router: Router,
    private http: HttpClient,
    private profileService: ProfileService,
    private levelsService: LevelsService
  ){}

  levelUsers: LevelUser[] = [];
  isLevelListOpen = false;
  loadingLevels = false;
  selectedUsername: string | null = null;

  avatar(url?: string | null, size = 32): string {
    if (!url) return 'assets/profile.png';
    return url.replace(
      '/upload/',
      `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`
    );
  }

  onAvatarError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/profile.png';
  }

  trackByUsername(i: number, item: any) {
    return item?.username ?? i;
  }

    goToProfile(username?: string | null) {
    const u = username || this.selectedUsername;
    if (u) {
      this.router.navigate(['/profile', u]);
    } else {
      this.router.navigate(['/profile']);
    }
  }

toggleLevelList() {
  this.isLevelListOpen = !this.isLevelListOpen;

  // Erst laden, wenn geöffnet und Daten noch nicht da
  if (this.isLevelListOpen && this.levelUsers.length === 0) {
    this.loadingLevels = true;
    this.levelsService.load().subscribe({
      next: (users) => {
        this.levelUsers = users;
        this.loadingLevels = false;
      },
      error: (err) => {
        console.error("❌ Fehler beim Laden der Level-Liste:", err);
        this.loadingLevels = false;
      }
    });
  }
}
}
