import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // für <router-outlet>

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet],  // <- Hier RouterOutlet einbinden
})
export class AppComponent {
  title(title: any) {
    throw new Error('Method not implemented.');
  }
  // dein Code
}
