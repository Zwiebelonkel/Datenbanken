import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit {
  @Input() page: string = '';
  showBackButton: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (this.page === '') {
      this.page = `👤 Willkommen ${this.authService.getUsername()}`;
    }

    // Logik: Wenn NICHT auf Hauptseite (z. B. /home), zeige Back-Button
    const currentUrl = this.router.url;
    const mainPages = ['/', '/home', '/dashboard'];
    this.showBackButton = !mainPages.includes(currentUrl);
  }

  goBack(): void {
    this.location.back(); // zurück zur vorherigen Seite
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
