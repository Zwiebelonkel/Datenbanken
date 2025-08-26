import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ProfileService, UserStats } from '../../../services/profile.service';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { TopbarComponent } from '../../topbar/topbar.component';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
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
    { key: 'skillShop', label: '⬆️ Skills', enabled: true },
    { key: 'tutorial', label: '❓ Tutorial', enabled: true },
  ];

  // Tools UI State
  tool = {
    pattern: '',
    field: 'username' as 'username',
    inactiveDays: 0,
  };
  toolScore = { username: '' };
  adjust = {
    username: '',
    moneyDelta: null,
    xpDelta: null,
    levelSet: null as number | null,
  };
  previewCount: number | null = null;
  previewList: { username: string }[] = [];

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

    this.http
      .get<{ pages: Record<string, boolean> }>(`${this.baseUrl}/admin/pages`)
      .subscribe({
        next: (data) => this.applyServerPages(data.pages),
        error: (err) =>
          console.error('Fehler beim Laden der Seiten-Flags:', err),
      });

    this.loadUsers();
    this.loadScores();
  }

  // Seiten-Flags
  togglePage(key: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const old = this.availablePages.find((p) => p.key === key)?.enabled;
    this.setLocalEnabled(key, checked);

    this.http
      .put<{ pages: Record<string, boolean> }>(
        `${this.baseUrl}/admin/pages/${key}`,
        { enabled: checked }
      )
      .subscribe({
        next: (res) => this.applyServerPages(res.pages),
        error: (err) => {
          console.error('Fehler beim Speichern der Seite:', err);
          this.setLocalEnabled(key, !!old);
        },
      });
  }
  private setLocalEnabled(key: string, enabled: boolean) {
    const p = this.availablePages.find((x) => x.key === key);
    if (p) p.enabled = enabled;
  }
  private applyServerPages(pages: Record<string, boolean>) {
    this.availablePages.forEach((page) => {
      if (pages[page.key] !== undefined) page.enabled = !!pages[page.key];
    });
  }

  // Daten
  loadUsers() {
    this.http.get<any[]>(`${this.baseUrl}/users`).subscribe((data) => {
      const current = this.authService.getUsername();
      this.users = data.filter((u) => u.username !== current);
    });
  }
  loadScores() {
    this.http
      .get<any[]>(`${this.baseUrl}/scores/all`)
      .subscribe((data) => (this.scores = data));
  }

  // Aktionen
  deleteUser(id: number) {
    if (!confirm('Diesen Benutzer und alle abhängigen Daten löschen?')) return;
    this.http.delete(`${this.baseUrl}/users/${id}`).subscribe(() => {
      this.users = this.users.filter((user) => user.id !== id);
    });
  }

  showProfile(username: string) {
    if (this.selectedUser === username) {
      this.selectedUser = null;
      this.selectedStats = null;
      return;
    }
    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.selectedStats = stats;
        this.selectedUser = username;
      },
      error: (error) => console.error('Fehler beim Laden der Stats:', error),
    });
  }

  deleteScore(id: number) {
    if (!confirm('Diesen Score löschen?')) return;
    this.http
      .delete(`${this.baseUrl}/scores/${id}`)
      .subscribe(() => this.loadScores());
  }

  // --- Tools ---

  previewDelete() {
    this.previewCount = null;
    this.previewList = [];
    this.http
      .post<{ count: number; sample: { username: string }[] }>(
        `${this.baseUrl}/admin/tools/users/delete-preview`,
        { pattern: this.tool.pattern, inactiveDays: this.tool.inactiveDays }
      )
      .subscribe({
        next: (res) => {
          this.previewCount = res.count;
          this.previewList = res.sample ?? [];
        },
        error: (err) => console.error('Preview error:', err),
      });
  }

  executeDelete() {
    if (!this.previewCount) return;
    if (!confirm(`Wirklich ${this.previewCount} Nutzer löschen?`)) return;
    this.http
      .post<{ deleted: number; remainingWithPattern: number }>(
        `${this.baseUrl}/admin/tools/users/delete-exec`,
        { pattern: this.tool.pattern, inactiveDays: this.tool.inactiveDays }
      )
      .subscribe({
        next: (res) => {
          alert(
            `Gelöscht: ${res.deleted ?? 'n/a'} • Übrig mit Pattern: ${
              res.remainingWithPattern
            }`
          );
          this.previewCount = null;
          this.previewList = [];
          this.loadUsers();
        },
        error: (err) => console.error('Delete error:', err),
      });
  }

  deleteScoresForUser() {
    if (!this.toolScore.username) return;
    if (!confirm(`Alle Scores von ${this.toolScore.username} löschen?`)) return;
    this.http
      .delete<{ deleted: number }>(
        `${this.baseUrl}/admin/tools/scores/by-user/${encodeURIComponent(
          this.toolScore.username
        )}`
      )
      .subscribe({
        next: (res) => {
          alert(`Scores gelöscht: ${res.deleted ?? 'n/a'}`);
          this.loadScores();
        },
        error: (err) => console.error(err),
      });
  }

  adjustAccount() {
    const body: any = {
      username: this.adjust.username?.trim(),
    };
    if (!body.username) {
      alert('Username fehlt');
      return;
    }

    const addIfPresent = (
      key: 'moneyDelta' | 'xpDelta' | 'levelSet',
      raw: any
    ) => {
      if (raw !== null && raw !== undefined && raw !== '') {
        const n = Number(raw);
        if (Number.isFinite(n)) body[key] = n; // 0 ist erlaubt
      }
    };

    addIfPresent('moneyDelta', this.adjust.moneyDelta);
    addIfPresent('xpDelta', this.adjust.xpDelta);
    addIfPresent('levelSet', this.adjust.levelSet);

    this.http
      .post(`${this.baseUrl}/admin/tools/account/adjust`, body)
      .subscribe({
        next: () => alert('Aktualisiert'),
        error: (err) => console.error(err),
      });
  }

  async exportScoresCsv() {
    const token = this.authService.getToken(); // wo auch immer du ihn holst
    const url = `${this.baseUrl}/admin/tools/export/scores.csv`;

    this.http
      .get(url, {
        responseType: 'blob',
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      })
      .subscribe({
        next: (blob: Blob) => {
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = 'scores.csv';
          a.click();
          URL.revokeObjectURL(objectUrl);
        },
        error: (err) => {
          console.error('Export fehlgeschlagen', err);
          alert('Export fehlgeschlagen.');
        },
      });
  }

  async exportUsersCsv() {
    const token = this.authService.getToken(); // wo auch immer du ihn holst
    const url = `${this.baseUrl}/admin/tools/export/users.csv`;

    this.http
      .get(url, {
        responseType: 'blob',
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
      })
      .subscribe({
        next: (blob: Blob) => {
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = 'users.csv';
          a.click();
          URL.revokeObjectURL(objectUrl);
        },
        error: (err) => {
          console.error('Export fehlgeschlagen', err);
          alert('Export fehlgeschlagen.');
        },
      });
  }
}
