import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FooterComponent } from './components/footer/footer.component';
import { ConsentDialogComponent } from './components/consent-dialog/consent-dialog.component';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, FooterComponent, ConsentDialogComponent, CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  isBootstrapping = true;

  constructor(
    private auth: AuthService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    this.auth.ensureAuth().subscribe({
      next: (_ok: boolean) => (this.isBootstrapping = false),
      error: () => (this.isBootstrapping = false),
    });
  }

  logout() {
    this.auth.logout();
  }
}