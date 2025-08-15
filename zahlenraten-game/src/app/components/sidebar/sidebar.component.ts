import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  imports: [CommonModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  private baseUrl = 'https://outside-between.onrender.com/api';

  sidebarOpen = false;
  achAmount = 0;
  pageSettings: Record<string, boolean> = {}; // Flags vom Server

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.http
      .get<{ pages: Record<string, boolean> }>(`${this.baseUrl}/pages`)
      .subscribe({
        next: (data) => (this.pageSettings = data.pages || {}),
        error: (err) => {
          console.error('Seiten-Flags konnten nicht geladen werden:', err);
          // Fallback: pageSettings bleibt leer => Buttons standardmäßig sichtbar
        },
      });
  }

  isAdmin(): boolean {
    return this.authService.getRole()?.toLowerCase() === 'admin';
  }

  isPageEnabled(pageKey: string): boolean {
    // Admin darf immer alles
    if (this.isAdmin()) return true;
    // sonst nach Flags
    return this.pageSettings[pageKey] !== false;
  }

  private loadAch() {
    const username = this.authService.getUsername();
    if (!username) return;
    this.profileService.getUserStats(username).subscribe({
      next: (stats) => (this.achAmount = stats.unlockedAchievements),
      error: (err) => console.error('Fehler beim Laden der Statistiken', err),
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarOpen) this.loadAch();
  }

  goToAchievements() {
    this.router.navigate(['/achievements']);
    this.sidebarOpen = false;
  }
  goToProfile() {
    this.router.navigate(['/profile']);
    this.sidebarOpen = false;
  }
  howToPlay() {
    this.router.navigate(['/how-to-play']);
    this.sidebarOpen = false;
  }
  goToClicker() {
    this.router.navigate(['/clicker']);
    this.sidebarOpen = false;
  }
  goToVillage() {
    this.router.navigate(['/village']);
    this.sidebarOpen = false;
  }
  shop() {
    this.router.navigate(['/card-shop']);
    this.sidebarOpen = false;
  }
  skillShop() {
    this.router.navigate(['/skill-shop']);
    this.sidebarOpen = false;
  }
  
  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }
  logout() {
    this.router.navigate(['/login']);
    this.sidebarOpen = false;
  }
  goToAdmin() {
    this.router.navigate(['/admin']);
    this.sidebarOpen = false;
  }
  goToSlots() {
    this.router.navigate(['/slot-maschine']);
    this.sidebarOpen = false;
  }
  goToLogin() {
    this.router.navigate(['/login']);
  }
  goHome() {
    this.router.navigate(['/']);
  }
}
