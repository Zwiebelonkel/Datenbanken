import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy {
  private baseUrl = 'https://outside-between.onrender.com/api';

  sidebarOpen = false;
  achAmount = 0;
  pageSettings: Record<string, boolean> = {};

  // gecachte Auth-Infos (verhindert viel Aufruf-Overhead im Template)
  isLoggedIn = false;
  role = '';

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private http: HttpClient,
    private eRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Auth einmal cachen; wenn dein AuthService Events/Observables hat,
    // hier gern darauf subscriben und Werte aktualisieren.
    this.isLoggedIn = this.authService.isLoggedIn();
    this.role = this.authService.getRole()?.toLowerCase() ?? '';

    // Feature-Flags laden
    this.http
      .get<{ pages: Record<string, boolean> }>(`${this.baseUrl}/pages`)
      .subscribe({
        next: (data) => (this.pageSettings = data.pages || {}),
        error: (err) =>
          console.error('Seiten-Flags konnten nicht geladen werden:', err),
      });
  }

  ngOnDestroy(): void {
    // nichts – HostListener wird von Angular aufgeräumt
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = this.eRef.nativeElement.contains(target);
    const toggleClicked = target.closest('.sidebar-toggle');
    if (!clickedInside && !toggleClicked && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  isPageEnabled(pageKey: string): boolean {
    if (this.isAdmin()) return true;
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
    if (this.sidebarOpen && this.isLoggedIn) this.loadAch();
  }

  // Navigation
  goToAchievements() { this.router.navigate(['/achievements']); this.sidebarOpen = false; }
  goToProfile()      { this.router.navigate(['/profile']);      this.sidebarOpen = false; }
  howToPlay()        { this.router.navigate(['/how-to-play']);  this.sidebarOpen = false; }
  goToClicker()      { this.router.navigate(['/clicker']);      this.sidebarOpen = false; }
  goToVillage()      { this.router.navigate(['/village']);      this.sidebarOpen = false; }
  shop()             { this.router.navigate(['/card-shop']);    this.sidebarOpen = false; }
  skillShop()        { this.router.navigate(['/skill-shop']);   this.sidebarOpen = false; }
  goToAdmin()        { this.router.navigate(['/admin']);        this.sidebarOpen = false; }
  goToSlots()        { this.router.navigate(['/slot-maschine']);this.sidebarOpen = false; }
  goToLogin()        { this.router.navigate(['/login']); }
  goHome()           { this.router.navigate(['/']); }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }

  logout() {
    this.router.navigate(['/login']);
    this.sidebarOpen = false;
  }
}