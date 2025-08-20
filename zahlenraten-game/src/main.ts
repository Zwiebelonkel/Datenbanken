import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app/app.routes'; // falls du Routing hast
import { FirebaseService } from './app/services/firebase.service'; // <--- hinzugefügt

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule),
    FirebaseService // Initialisiert Firebase automatisch beim App-Start
  ]
});
