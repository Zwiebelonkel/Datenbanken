import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { LoaderComponent } from '../loader/loader.component';
import { LevelsService, LevelUser } from '../../services/levels.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [CommonModule, LoaderComponent],
})
export class UsersComponent {
  constructor(
    private router: Router,
    private http: HttpClient,
    private profileService: ProfileService,
    private levelsService: LevelsService
  ) {}

  levelUsers: LevelUser[] = [];
  isLevelListOpen = false;
  loadingLevels = false;
  selectedUsername: string | null = null;

  // 🔢 Pagination
  page = 1;
  pageSize = 10;

  // Getter für berechnete Indizes
  get startIndex(): number {
    return (this.page - 1) * this.pageSize;
  }
  get endIndex(): number {
    // 1-basiert zum Anzeigen; in slice nutzen wir 0-basiert
    return Math.min(this.page * this.pageSize, this.levelUsers.length);
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.levelUsers.length / this.pageSize));
  }

  // Die aktuelle Seite
  get paginatedUsers(): LevelUser[] {
    return this.levelUsers.slice(this.startIndex, this.startIndex + this.pageSize);
  }

  ngOnInit() {
    // bewusst leer: wir laden erst beim Aufklappen
  }

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

    if (this.isLevelListOpen && this.levelUsers.length === 0) {
      this.loadingLevels = true;
      this.levelsService.load().subscribe({
        next: (users) => {
          this.levelUsers = users ?? [];
          this.loadingLevels = false;
          // Reset auf Seite 1, falls vorher etwas anderes gesetzt war
          this.page = 1;
        },
        error: (err) => {
          console.error('❌ Fehler beim Laden der Level-Liste:', err);
          this.loadingLevels = false;
        },
      });
    }
  }

  // 🔁 Pagination-Steuerung
  nextPage() {
    if (this.page < this.totalPages) this.page++;
  }
  prevPage() {
    if (this.page > 1) this.page--;
  }
  goToPage(p: number) {
    this.page = Math.min(Math.max(1, p), this.totalPages);
  }
}