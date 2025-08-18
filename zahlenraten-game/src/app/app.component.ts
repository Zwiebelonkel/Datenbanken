import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FooterComponent } from './components/footer/footer.component';
import { ConsentDialogComponent } from './components/consent-dialog/consent-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, FooterComponent, ConsentDialogComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title: any;
  constructor(private auth: AuthService) {}

  logout() {
    this.auth.logout();
  }
}
