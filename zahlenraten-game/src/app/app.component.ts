import {
  Component,
  OnInit,
  AfterViewInit,
  ViewContainerRef,
  ComponentRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FooterComponent } from './components/footer/footer.component';
import { ConsentDialogComponent } from './components/consent-dialog/consent-dialog.component';
import { OfflineComponent } from './components/offline/offline.component';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, FooterComponent, OfflineComponent, CommonModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, AfterViewInit {
  isBootstrapping = true;
  isOffline = false;

  private vcr = inject(ViewContainerRef);
  private consentDialogRef: ComponentRef<ConsentDialogComponent> | null = null;

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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.showConsentDialog();
    }, 100);
  }

  showConsentDialog() {
    if (!localStorage.getItem('cookieConsent')) {
      this.consentDialogRef = this.vcr.createComponent(ConsentDialogComponent);
    }
  }

  logout() {
    this.auth.logout();
  }
}
