import { Component } from '@angular/core';

@Component({
  selector: 'app-root',  // Der Selektor für die Komponente (wird in index.html verwendet)
  templateUrl: './app.component.html',  // Verweist auf die HTML-Datei
  styleUrls: ['./app.component.scss']  // Verweist auf die CSS-Datei
})
export class AppComponent {
  title = 'zahlenraten-game';  // Beispiel für eine Eigenschaft
}
