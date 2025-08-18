import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  imports: [CommonModule],
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit {
  @Input() page: string = '';

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.page === '') {
      this.page = `👤 Willkommen ${this.authService.getUsername()}`;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
