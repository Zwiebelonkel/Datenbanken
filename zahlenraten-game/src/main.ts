// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FirebaseService } from './app/services/firebase.service';
import { appConfig } from './app/app.config'; // Wichtig: verwende appConfig!

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...appConfig.providers!,
    importProvidersFrom(HttpClientModule),
    FirebaseService
  ]
});
