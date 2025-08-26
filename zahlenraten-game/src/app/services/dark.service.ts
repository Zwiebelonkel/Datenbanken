import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DarkModeService {
  private darkModeEnabled = false;

  isDarkMode(): boolean {
    return this.darkModeEnabled;
  }

  toggleDarkMode(): void {
    this.darkModeEnabled = !this.darkModeEnabled;
    document.body.classList.toggle('dark-mode', this.darkModeEnabled);
  }

  setDarkMode(enabled: boolean): void {
    this.darkModeEnabled = enabled;
    document.body.classList.toggle('dark-mode', enabled);
  }
}
