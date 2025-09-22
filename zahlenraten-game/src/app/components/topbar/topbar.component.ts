import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class TopbarComponent implements OnInit, OnChanges {
  @Input() page: string = '';
  showBackButton = false;
  isWelcomeTitle = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (this.page === '') {
      this.page = `👤 Willkommen ${this.authService.getUsername()}`;
      this.isWelcomeTitle = true; // Auto-Willkommen → links
    } else {
      this.isWelcomeTitle = this.isWelcome(this.page);
    }

    // Back-Button nur nicht auf Hauptseiten
    const currentUrl = this.router.url;
    const mainPages = ['/', '/home', '/dashboard'];
    this.showBackButton = !mainPages.includes(currentUrl);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['page']) {
      this.isWelcomeTitle = this.isWelcome(this.page);
    }
  }

  private isWelcome(text: string): boolean {
    return /^👤\s*Willkommen\b/i.test((text || '').trim());
  }

  goBack(): void {
    this.location.back();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}