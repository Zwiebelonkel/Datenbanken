import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ProfileService, UserStats } from '../../../services/profile.service';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../sidebar/sidebar.component';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'],
  standalone: true,
  imports: [CommonModule, SidebarComponent],
})
export class AdminPageComponent implements OnInit {
  private baseUrl = 'https://outside-between.onrender.com/api';

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
    const role = this.authService.getRole()?.toLowerCase();
    if (role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }

    // Seiten-Flags laden (Admin-Endpoint, benötigt Token)
    const headers = this.buildAuthHeaders();
    this.http
      .get<{ pages: Record<string, boolean> }>(`${this.baseUrl}/admin/pages`, {
        headers,
      })
      .subscribe({
        next: (data) => this.applyServerPages(data.pages),
        error: (err) => {
          console.error('Fehler beim Laden der Seiten-Flags:', err);
          // Optional: Fallback – nichts tun => Defaults bleiben true
        },
      });

    this.loadUsers();
    this.loadScores();
  }

  togglePage(key: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;

    // Optimistisches UI-Update
    const old = this.availablePages.find((p) => p.key === key)?.enabled;
    this.setLocalEnabled(key, checked);

    const headers = this.buildAuthHeaders();
    this.http
      .put<{ pages: Record<string, boolean> }>(
        `${this.baseUrl}/admin/pages/${key}`,
        { enabled: checked },
        { headers }
      )
      .subscribe({
        next: (res) => this.applyServerPages(res.pages),
        error: (err) => {
          console.error('Fehler beim Speichern der Seite:', err);
          // Rollback bei Fehler
          this.setLocalEnabled(key, !!old);
        },
      });
  }

  private buildAuthHeaders(): HttpHeaders {
    // Falls dein AuthService eine getToken() hat, nutze die:
    const token =
      (this.authService as any).getToken?.() ||
      localStorage.getItem('token') ||
      '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private setLocalEnabled(key: string, enabled: boolean) {
    const p = this.availablePages.find((x) => x.key === key);
    if (p) p.enabled = enabled;
  }

  private applyServerPages(pages: Record<string, boolean>) {
    this.availablePages.forEach((page) => {
      if (pages[page.key] !== undefined) {
        page.enabled = !!pages[page.key];
      }
    });
  }

  loadUsers() {
    this.http.get<any[]>(`${this.baseUrl}/users`).subscribe((data) => {
      const current = this.authService.getUsername();
      this.users = data.filter((u) => u.username !== current); // Admin ausblenden
    });
  }

  loadScores() {
    this.http
      .get<any[]>(`${this.baseUrl}/scores/all`)
      .subscribe((data) => (this.scores = data));
  }

  deleteUser(id: number) {
    this.http
      .delete(`${this.baseUrl}/users/${id}`)
      .subscribe(
        () => (this.users = this.users.filter((user) => user.id !== id))
      );
  }

  showProfile(username: string) {
    // Wenn derselbe Benutzer erneut angeklickt wird → schließen
    if (this.selectedUser === username) {
      this.selectedUser = null;
      this.selectedStats = null;
      return;
    }

    // Sonst laden wir die neuen Stats
    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.selectedStats = stats;
        this.selectedUser = username;
      },
      error: (error) => console.error('Fehler beim Laden der Stats:', error),
    });
  }

  deleteScore(id: number) {
    this.http
      .delete(`${this.baseUrl}/scores/${id}`)
      .subscribe(() => this.loadScores());
  }
}
