import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DarkModeService {
  private enabled: boolean = false;

  constructor() {
    const saved = localStorage.getItem('darkMode');
    this.enabled = saved === 'true';
    this.applyDarkMode();
  }

  toggleDarkMode() {
    this.enabled = !this.enabled;
    localStorage.setItem('darkMode', String(this.enabled));
    this.applyDarkMode();
  }
  isDarkMode() {
    return this.enabled;
  }

  applyDarkMode() {
    if (this.enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}
