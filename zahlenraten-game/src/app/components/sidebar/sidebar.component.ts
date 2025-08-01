import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  sidebarOpen = false;
  achAmount = 0;

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadAch();
    }
  }

  loadAch() {
    const username = this.authService.getUsername();
    if (!username) return; // Sicherheit: nicht einloggen -> abbrechen

    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.achAmount = stats.unlockedAchievements;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Statistiken', err);
      },
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

  shop() {
    this.router.navigate(['/card-shop']);
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

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
