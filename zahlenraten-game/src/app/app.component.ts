import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // für <router-outlet>

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet],  // <- Hier RouterOutlet einbinden
})
export class AppComponent {
  // dein Code
}
