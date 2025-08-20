// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withScrollPositionRestoration } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withScrollPositionRestoration('enabled') // Scrollt automatisch zu (0, 0) nach Navigation
    ),
  ],
};
