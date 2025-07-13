import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { DarkModeService } from './services/dark.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService, private darkModeService: DarkModeService) {}

  ngOnInit(): void {
    this.darkModeService.applyDarkMode();
  }

  logout() {
    this.auth.logout();
  }

  toggleDarkMode() {
    this.darkModeService.toggleDarkMode();
  }
}
