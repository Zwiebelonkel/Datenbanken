import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../../components/loader.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [CommonModule, LoaderComponent],
})
export class UsersComponent{

levelUsers: LevelUser[] = [];
  isLevelListOpen = false;
  loadingLevels = false;

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
