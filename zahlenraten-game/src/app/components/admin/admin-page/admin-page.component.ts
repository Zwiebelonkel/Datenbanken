import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // <--- hinzufügen
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../../../services/profile.service';
import { Router } from '@angular/router';
import { UserStats } from '../../../services/profile.service'; // Importiere UserStats
import { SidebarComponent } from '../../sidebar/sidebar.component';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'],
  standalone: true,
  imports: [CommonModule, SidebarComponent],
})
export class AdminPageComponent implements OnInit {
  users: any[] = [];
  scores: any[] = [];
  selectedStats: UserStats | null = null;
  selectedUser: string | null = null;
  availablePages = [
    { key: 'achievements', label: '🎖️ Erfolge', enabled: true },
    { key: 'profile', label: '👤 Profil', enabled: true },
    { key: 'slots', label: '🎰 Slots', enabled: true },
    { key: 'village', label: '🛖 Dorf', enabled: true },
    { key: 'clicker', label: '💰 Clicker', enabled: true },
    { key: 'shop', label: '🃏 Karten', enabled: true },
    { key: 'tutorial', label: '❓ Tutorial', enabled: true },
  ];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    // Hier vom Server die aktuellen Einstellungen laden
    this.http.get<any>('API_URL/admin/pages').subscribe((data) => {
      this.availablePages.forEach((page) => {
        if (data.pages && data.pages[page.key] !== undefined) {
          page.enabled = data.pages[page.key];
        }
      });
    });
    const role = this.authService.getRole()?.toLowerCase();
    if (role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    this.loadUsers();
    this.loadScores();
  }

  togglePage(key: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    // Optional UI-Optimismus:
    const old = this.availablePages.find((p) => p.key === key)?.enabled;
    this.setLocalEnabled(key, checked);

    this.http.put(`/api/admin/pages/${key}`, { enabled: checked }).subscribe({
      next: (res: any) => {
        // Wenn du vom Server das Mapping zurückbekommst, hier übernehmen:
        // this.applyServerPages(res.pages);
      },
      error: () => {
        // rollback bei Fehler
        this.setLocalEnabled(key, !!old);
      },
    });
  }

  private setLocalEnabled(key: string, enabled: boolean) {
    const p = this.availablePages.find((x) => x.key === key);
    if (p) p.enabled = enabled;
  }

  loadUsers() {
    this.http
      .get<any[]>('https://outside-between.onrender.com/api/users')
      .subscribe((data) => {
        const current = this.authService.getUsername();
        this.users = data.filter((u) => u.username !== current); // Admin ausblenden
      });
  }

  loadScores() {
    this.http
      .get<any[]>('https://outside-between.onrender.com/api/scores/all')
      .subscribe((data) => {
        this.scores = data;
      });
  }

  deleteUser(id: number) {
    this.http
      .delete(`https://outside-between.onrender.com/api/users/${id}`)
      .subscribe(() => {
        this.users = this.users.filter((user) => user.id !== id);
      });
  }

  showProfile(username: string) {
    this.profileService.getUserStats(username).subscribe(
      (stats) => {
        this.selectedStats = stats;
        this.selectedUser = username;
      },
      (error) => {
        console.error('Fehler beim Laden der Stats:', error);
      }
    );
  }

  deleteScore(id: number) {
    this.http
      .delete(`https://outside-between.onrender.com/api/scores/${id}`)
      .subscribe(() => {
        this.loadScores();
      });
  }
}
