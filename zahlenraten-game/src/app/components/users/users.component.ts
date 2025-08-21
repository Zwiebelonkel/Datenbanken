import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoaderComponent } from '../loader/loader.component';
import { LevelsService, LevelUser, LevelsResponse } from '../../services/levels.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [CommonModule, LoaderComponent],
})
export class UsersComponent {
  Math = Math;
  
  constructor(
    private router: Router,
    private levelsService: LevelsService
  ) {}

  // Daten
  levelUsers: LevelUser[] = [];
  isLevelListOpen = false;
  loadingLevels = false;
  selectedUsername: string | null = null;

  // 🔢 Pagination (serverseitig)
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;
  hasPrev = false;
  hasNext = false;

  ngOnInit() {
    // wir laden erst beim Aufklappen
  }

  // --- UI Helfer ---
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
    this.router.navigate(u ? ['/profile', u] : ['/profile']);
  }

  // --- Öffnen / Laden ---
  toggleLevelList() {
    this.isLevelListOpen = !this.isLevelListOpen;

    if (this.isLevelListOpen && this.levelUsers.length === 0) {
      this.loadPage(1);
    }
  }

  // --- Page Loader ---
  private setFromResponse(res: LevelsResponse) {
    this.levelUsers = res.users ?? [];
    this.page = res.page;
    this.pageSize = res.limit;
    this.total = res.total;
    this.totalPages = Math.max(1, res.totalPages);
    this.hasPrev = !!res.hasPrev;
    this.hasNext = !!res.hasNext;
  }

  loadPage(p: number, force = false) {
    this.loadingLevels = true;
    this.levelsService.load(p, this.pageSize, force).subscribe({
      next: (res) => {
        this.setFromResponse(res);
        this.loadingLevels = false;
        // Optional: nächste Seite schon mal vorladen
        this.levelsService.prefetchNext(res.page, res.limit, res.totalPages);
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden der Level-Liste:', err);
        this.loadingLevels = false;
      },
    });
  }

  // --- Pagination-Buttons ---
  nextPage() {
    if (this.hasNext) this.loadPage(this.page + 1);
  }
  prevPage() {
    if (this.hasPrev) this.loadPage(this.page - 1);
  }
  goToPage(p: number) {
    const target = Math.min(Math.max(1, p), this.totalPages);
    this.loadPage(target);
  }
}
